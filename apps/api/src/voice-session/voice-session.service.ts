import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Server as HttpServer } from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import {
  ClientToServerMessage,
  ServerToClientMessage,
  TranscriptEntry,
  VoiceSessionState,
} from '@speaking-coach/shared';
import { MiniMaxChatProvider } from '../minimax/minimax-chat.provider';
import { ScenarioService } from '../scenario/scenario.service';
import { SessionService } from '../session/session.service';
import { AliyunBailianRealtimeProvider } from '../aliyun/aliyun-bailian-realtime.provider';
import { RealtimeVoiceProvider } from '@speaking-coach/shared';

type ActiveVoiceSession = {
  sessionId: string;
  ws: WebSocket;
  scenarioId: string;
  userLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  state: VoiceSessionState;
  transcript: TranscriptEntry[];
  realtimeProvider?: RealtimeVoiceProvider;
};

@Injectable()
export class VoiceSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(VoiceSessionService.name);
  private wss?: WebSocketServer;
  private readonly sessions = new Map<string, ActiveVoiceSession>();
  private readonly audioStateTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly scenarioService: ScenarioService,
    private readonly sessionService: SessionService,
    private readonly miniMaxChatProvider: MiniMaxChatProvider,
  ) {}

  onModuleDestroy() {
    this.audioStateTimers.forEach((timer) => clearTimeout(timer));
    this.audioStateTimers.clear();
    this.wss?.close();
  }

  initialize(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const pathname = request.url;

      if (!pathname?.startsWith('/ws/voice-sessions/')) {
        socket.destroy();
        return;
      }

      const sessionId = pathname.split('/').pop();
      if (!sessionId) {
        socket.destroy();
        return;
      }

      this.wss?.handleUpgrade(request, socket, head, (ws) => {
        this.wss?.emit('connection', ws, sessionId);
      });
    });

    this.wss.on('connection', (ws: WebSocket, sessionId: string) => {
      void this.handleConnection(ws, sessionId);
    });

    this.logger.log(
      'WebSocket server initialized on path: /ws/voice-sessions/:sessionId',
    );
  }

  private async handleConnection(ws: WebSocket, sessionId: string) {
    this.logger.log(`New WebSocket connection for session: ${sessionId}`);
    const pendingMessages: RawData[] = [];
    let isReady = false;

    ws.on('message', (data) => {
      if (!isReady) {
        pendingMessages.push(data);
        return;
      }

      void this.handleMessage(sessionId, data);
    });

    const practiceSession = await this.sessionService.getSession(sessionId);
    if (!practiceSession) {
      this.send(ws, { type: 'error', message: 'Session not found' });
      ws.close();
      return;
    }

    const activeSession: ActiveVoiceSession = {
      sessionId,
      ws,
      scenarioId: practiceSession.scenarioId,
      userLevel: this.normalizeLevel(practiceSession.userLevel),
      state: 'idle',
      transcript: await this.sessionService.getTranscript(sessionId),
    };

    this.sessions.set(sessionId, activeSession);
    isReady = true;

    ws.on('close', () => {
      this.clearAudioStateTimer(sessionId);
      this.sessions.delete(sessionId);
      this.logger.log(`WebSocket disconnected for session: ${sessionId}`);
    });

    this.send(ws, { type: 'state', state: 'idle' });
    for (const message of pendingMessages) {
      void this.handleMessage(sessionId, message);
    }
  }

  private async handleMessage(sessionId: string, data: RawData) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      const message = JSON.parse(
        this.rawDataToString(data),
      ) as ClientToServerMessage;

      switch (message.type) {
        case 'start_session':
          await this.startSession(session, message.scenarioId, message.level);
          break;
        case 'text_message':
          await this.handleTextMessage(session, message.text);
          break;
        case 'hint':
          await this.handleHint(session);
          break;
        case 'end_session':
          await this.endSession(session);
          break;
        case 'audio_chunk':
          this.handleAudioChunk(session, message.data, message.mimeType);
          break;
      }
    } catch (error) {
      this.logger.error('Error handling WebSocket message', error);
      this.send(session.ws, {
        type: 'error',
        message: 'Failed to process message',
      });
    }
  }

  private async startSession(
    session: ActiveVoiceSession,
    scenarioId: string,
    level: ActiveVoiceSession['userLevel'],
  ) {
    const scenario = this.scenarioService.getScenarioById(scenarioId);
    if (!scenario) {
      this.send(session.ws, { type: 'error', message: 'Scenario not found' });
      return;
    }

    session.scenarioId = scenarioId;
    session.userLevel = level;
    session.state = 'listening';
    this.send(session.ws, {
      type: 'session_started',
      sessionId: session.sessionId,
    });
    this.send(session.ws, { type: 'state', state: 'listening' });

    if (session.transcript.length === 0) {
      await this.appendTranscript(session, {
        role: 'assistant',
        text: scenario.openingLine,
        isFinal: true,
      });
    }

    if (process.env.VOICE_MODE === 'realtime_voice') {
      try {
        const provider = new AliyunBailianRealtimeProvider();
        session.realtimeProvider = provider;

        provider.onAudio((audio, mimeType) => {
          this.send(session.ws, {
            type: 'ai_audio',
            data: audio.toString('base64'),
            mimeType,
          });
        });

        provider.onTranscript((msg) => {
          if (msg.isFinal) {
            void this.appendTranscript(session, msg).then(() => {
              if (msg.role === 'assistant') {
                session.state = 'listening';
                this.send(session.ws, { type: 'state', state: 'listening' });
              }
            });
          }
        });

        provider.onError((err) => {
          this.logger.error(
            `RealtimeProvider error for session ${session.sessionId}:`,
            err,
          );
        });

        await provider.connect({
          scenarioPrompt: scenario.systemPrompt,
          openingLine: scenario.openingLine,
          userLevel: level,
        });

        this.logger.log(
          `Realtime provider connected for session ${session.sessionId}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to connect realtime provider for session ${session.sessionId}`,
          err,
        );
        this.send(session.ws, {
          type: 'error',
          message: 'Voice connection failed',
        });
      }
    }
  }

  private async handleTextMessage(session: ActiveVoiceSession, text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    await this.appendTranscript(session, {
      role: 'user',
      text: trimmed,
      isFinal: true,
    });

    const scenario = this.scenarioService.getScenarioById(session.scenarioId);
    session.state = 'thinking';
    this.send(session.ws, { type: 'state', state: 'thinking' });

    const assistantText = await this.miniMaxChatProvider.createChatCompletion([
      {
        role: 'system',
        content:
          scenario?.systemPrompt ??
          'You are a friendly English speaking partner. Keep replies short.',
      },
      ...session.transcript.map((entry) => ({
        role: entry.role,
        content: entry.text,
      })),
    ]);

    session.state = 'ai_speaking';
    this.send(session.ws, { type: 'state', state: 'ai_speaking' });
    await this.appendTranscript(session, {
      role: 'assistant',
      text: assistantText,
      isFinal: true,
    });

    session.state = 'listening';
    this.send(session.ws, { type: 'state', state: 'listening' });
  }

  private async handleHint(session: ActiveVoiceSession) {
    const scenario = this.scenarioService.getScenarioById(session.scenarioId);
    const hint = scenario?.targetExpressions[0]
      ? `Hint: Try this expression: "${scenario.targetExpressions[0]}"`
      : 'Hint: Try one short sentence first.';

    await this.appendTranscript(session, {
      role: 'assistant',
      text: hint,
      isFinal: true,
    });
  }

  private async endSession(session: ActiveVoiceSession) {
    this.clearAudioStateTimer(session.sessionId);
    if (session.realtimeProvider) {
      await session.realtimeProvider.close();
    }
    session.state = 'ended';
    this.send(session.ws, { type: 'state', state: 'ended' });
    await this.sessionService.endSession(
      session.sessionId,
      session.transcript,
      null,
    );
    session.ws.close();
    this.sessions.delete(session.sessionId);
  }

  private handleAudioChunk(
    session: ActiveVoiceSession,
    data: string,
    mimeType: string,
  ) {
    const decoded = this.decodeAudioChunk(data);
    if (!decoded) {
      this.logger.warn(
        `[audio_chunk] invalid session=${session.sessionId} mimeType=${mimeType} timestamp=${new Date().toISOString()}`,
      );
      session.state = 'error';
      this.send(session.ws, {
        type: 'state',
        state: 'error',
      });
      this.send(session.ws, {
        type: 'error',
        message: 'Invalid audio chunk',
      });
      return;
    }

    session.state = 'user_speaking';
    this.send(session.ws, { type: 'state', state: 'user_speaking' });
    this.logger.log(
      `[audio_chunk] session=${session.sessionId} mimeType=${mimeType} size=${decoded.length} bytes timestamp=${new Date().toISOString()}`,
    );

    if (session.realtimeProvider) {
      session.realtimeProvider.sendAudio(decoded, mimeType);
    } else {
      this.scheduleAudioIdleState(session);
    }
  }

  private async appendTranscript(
    session: ActiveVoiceSession,
    entry: TranscriptEntry,
  ) {
    session.transcript.push(entry);
    await this.sessionService.addMessage(
      session.sessionId,
      entry.role,
      entry.text,
      entry.isFinal,
    );
    this.send(session.ws, {
      type: 'transcript',
      role: entry.role,
      text: entry.text,
      isFinal: entry.isFinal,
    });
  }

  private send(ws: WebSocket, message: ServerToClientMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private rawDataToString(data: RawData): string {
    if (typeof data === 'string') {
      return data;
    }

    if (Buffer.isBuffer(data)) {
      return data.toString('utf8');
    }

    if (Array.isArray(data)) {
      return Buffer.concat(data).toString('utf8');
    }

    return Buffer.from(data).toString('utf8');
  }

  private decodeAudioChunk(data: string): Buffer | null {
    const normalized = data.trim();

    if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
      return null;
    }

    try {
      const decoded = Buffer.from(normalized, 'base64');
      return decoded.length > 0 ? decoded : null;
    } catch {
      return null;
    }
  }

  private scheduleAudioIdleState(session: ActiveVoiceSession) {
    this.clearAudioStateTimer(session.sessionId);

    const timer = setTimeout(() => {
      if (!this.sessions.has(session.sessionId) || session.state === 'ended') {
        return;
      }

      session.state = 'thinking';
      this.send(session.ws, { type: 'state', state: 'thinking' });

      const listeningTimer = setTimeout(() => {
        if (
          !this.sessions.has(session.sessionId) ||
          session.state === 'ended'
        ) {
          return;
        }

        session.state = 'listening';
        this.send(session.ws, { type: 'state', state: 'listening' });
        this.audioStateTimers.delete(session.sessionId);
      }, 300);

      this.audioStateTimers.set(session.sessionId, listeningTimer);
    }, 900);

    this.audioStateTimers.set(session.sessionId, timer);
  }

  private clearAudioStateTimer(sessionId: string) {
    const timer = this.audioStateTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.audioStateTimers.delete(sessionId);
    }
  }

  private normalizeLevel(level: string): ActiveVoiceSession['userLevel'] {
    if (['A1', 'A2', 'B1', 'B2', 'C1'].includes(level)) {
      return level as ActiveVoiceSession['userLevel'];
    }

    return 'A2';
  }
}
