import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server as WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { WebSocket } from 'ws';
import { ScenarioService } from '../scenario/scenario.service';
import { SessionService } from '../session/session.service';
import { Scenario } from '@speaking-coach/shared';
import { MiniMaxProvider } from '../minimax/minimax.provider';

@Injectable()
export class VoiceSessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VoiceSessionService.name);
  private wss: WebSocketServer;
  private sessions: Map<string, any> = new Map();
  private miniMaxProviders: Map<string, MiniMaxProvider> = new Map();

  constructor(
    private readonly scenarioService: ScenarioService,
    private readonly sessionService: SessionService,
  ) {}

  onModuleInit() {
    // WebSocket server will be initialized when HTTP server is ready
  }

  onModuleDestroy() {
    if (this.wss) {
      this.wss.close();
    }
    // 断开所有 MiniMax 连接
    this.miniMaxProviders.forEach(provider => provider.disconnect());
  }

  initialize(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const pathname = request.url;

      if (pathname?.startsWith('/ws/voice-sessions/')) {
        const sessionId = pathname.split('/').pop();

        if (!sessionId) {
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request, sessionId);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, request: any, sessionId: string) => {
      this.handleConnection(ws, sessionId);
    });

    this.logger.log('WebSocket server initialized on path: /ws/voice-sessions/:sessionId');
  }

  private async handleConnection(ws: WebSocket, sessionId: string) {
    this.logger.log(`New WebSocket connection for session: ${sessionId}`);

    // 验证 session 是否存在
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      ws.close();
      return;
    }

    const voiceSession = {
      sessionId,
      ws,
      scenarioId: session.scenarioId,
      userLevel: session.userLevel,
      state: 'idle',
      transcript: [],
    };

    this.sessions.set(sessionId, voiceSession);

    ws.on('message', async (data) => {
      await this.handleMessage(sessionId, data);
    });

    ws.on('close', () => {
      this.handleDisconnect(sessionId);
    });

    ws.send(JSON.stringify({ type: 'state', state: 'idle' }));
  }

  private async handleMessage(sessionId: string, data: any) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'start_session':
          await this.startSession(session, message.scenarioId, message.level);
          break;
        case 'audio_chunk':
          await this.handleAudioChunk(sessionId, message.data, message.mimeType);
          break;
        case 'end_session':
          await this.endSession(sessionId);
          break;
        case 'hint':
          await this.sendHint(session);
          break;
        case 'text_message':
          await this.handleTextMessage(session, message.text);
          break;
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      session.ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
    }
  }

  private async startSession(session: any, scenarioId: string, level: string) {
    const scenario = this.scenarioService.getScenarioById(scenarioId);
    if (!scenario) {
      session.ws.send(JSON.stringify({ type: 'error', message: 'Scenario not found' }));
      return;
    }

    session.state = 'connecting';
    session.ws.send(JSON.stringify({ type: 'state', state: 'connecting' }));

    // TODO: 连接 MiniMax Realtime API
    // 这里创建 MiniMax Provider 并连接
    try {
      const miniMax = new MiniMaxProvider(
        process.env.MINIMAX_API_KEY || '',
        process.env.MINIMAX_REALTIME_MODEL || 'abab6.5s-chat'
      );

      // 监听 MiniMax 返回的音频和文本
      miniMax.on('audio', (audioData: any) => {
        session.ws.send(JSON.stringify({
          type: 'ai_audio',
          data: audioData.data, // 需要 base64 编码
          mimeType: audioData.mimeType,
        }));
      });

      miniMax.on('transcript', (transcript: any) => {
        session.ws.send(JSON.stringify({
          type: 'transcript',
          role: transcript.role,
          text: transcript.text,
          isFinal: transcript.isFinal,
        }));
        session.transcript.push(transcript);
      });

      miniMax.on('error', (error: Error) => {
        this.logger.error('MiniMax error:', error);
        session.ws.send(JSON.stringify({ type: 'error', message: 'MiniMax error' }));
      });

      await miniMax.connect(scenario.systemPrompt, scenario.openingLine);

      this.miniMaxProviders.set(session.sessionId, miniMax);

      session.state = 'listening';
      session.ws.send(JSON.stringify({ type: 'state', state: 'listening' }));
      session.ws.send(
        JSON.stringify({
          type: 'transcript',
          role: 'assistant',
          text: scenario.openingLine,
          isFinal: true,
        }),
      );
      session.transcript.push({ role: 'assistant', text: scenario.openingLine, isFinal: true });
    } catch (error) {
      this.logger.error('Failed to connect to MiniMax:', error);
      session.ws.send(JSON.stringify({ type: 'error', message: 'Failed to connect to AI' }));
    }
  }

  private async handleAudioChunk(sessionId: string, data: string, mimeType: string) {
    const miniMax = this.miniMaxProviders.get(sessionId);
    if (!miniMax) {
      this.logger.warn(`No MiniMax connection for session ${sessionId}`);
      return;
    }

    // 将 base64 音频数据转换为 Buffer，然后发送到 MiniMax
    const audioBuffer = Buffer.from(data, 'base64');
    miniMax.sendAudio(audioBuffer, mimeType);
  }

  private async handleTextMessage(session: any, text: string) {
    session.transcript.push({ role: 'user', text, isFinal: true });
    session.ws.send(
      JSON.stringify({
        type: 'transcript',
        role: 'user',
        text,
        isFinal: true,
      }),
    );

    // 发送到 MiniMax（如果支持文本输入）
    const miniMax = this.miniMaxProviders.get(session.sessionId);
    if (miniMax) {
      miniMax.sendText(text);
    } else {
      // 简单的回显（用于测试）
      const response = `You said: ${text}`;
      session.transcript.push({ role: 'assistant', text: response, isFinal: true });
      session.ws.send(
        JSON.stringify({
          type: 'transcript',
          role: 'assistant',
          text: response,
          isFinal: true,
        }),
      );
    }
  }

  private async sendHint(session: any) {
    session.ws.send(
      JSON.stringify({
        type: 'transcript',
        role: 'assistant',
        text: 'Hint: Try to answer naturally and keep it simple.',
        isFinal: true,
      }),
    );
  }

  private async endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'ended';
    session.ws.send(JSON.stringify({ type: 'state', state: 'ended' }));

    // 断开 MiniMax 连接
    const miniMax = this.miniMaxProviders.get(sessionId);
    if (miniMax) {
      await miniMax.disconnect();
      this.miniMaxProviders.delete(sessionId);
    }

    // 保存 transcript 到数据库
    await this.sessionService.endSession(sessionId, session.transcript, null);

    session.ws.close();
    this.sessions.delete(sessionId);
  }

  private handleDisconnect(sessionId: string) {
    this.logger.log(`WebSocket disconnected for session: ${sessionId}`);
    // 清理 MiniMax 连接
    const miniMax = this.miniMaxProviders.get(sessionId);
    if (miniMax) {
      miniMax.disconnect();
      this.miniMaxProviders.delete(sessionId);
    }
    this.sessions.delete(sessionId);
  }
}

  onModuleDestroy() {
    if (this.wss) {
      this.wss.close();
    }
  }

  initialize(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const pathname = request.url;

      if (pathname?.startsWith('/ws/voice-sessions/')) {
        const sessionId = pathname.split('/').pop();

        if (!sessionId) {
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request, sessionId);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, request: any, sessionId: string) => {
      this.handleConnection(ws, sessionId);
    });

    this.logger.log('WebSocket server initialized on path: /ws/voice-sessions/:sessionId');
  }

  private async handleConnection(ws: WebSocket, sessionId: string) {
    this.logger.log(`New WebSocket connection for session: ${sessionId}`);

    // Verify session exists
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      ws.close();
      return;
    }

    const voiceSession = {
      sessionId,
      ws,
      scenarioId: session.scenarioId,
      userLevel: session.userLevel,
      state: 'idle',
      transcript: [],
    };

    this.sessions.set(sessionId, voiceSession);

    ws.on('message', async (data) => {
      await this.handleMessage(sessionId, data);
    });

    ws.on('close', () => {
      this.handleDisconnect(sessionId);
    });

    ws.send(JSON.stringify({ type: 'state', state: 'idle' }));
  }

  private async handleMessage(sessionId: string, data: any) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'start_session':
          await this.startSession(session, message.scenarioId, message.level);
          break;
        case 'audio_chunk':
          await this.handleAudioChunk(session, message.data, message.mimeType);
          break;
        case 'end_session':
          await this.endSession(sessionId);
          break;
        case 'hint':
          await this.sendHint(session);
          break;
        case 'text_message':
          await this.handleTextMessage(session, message.text);
          break;
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      session.ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
    }
  }

  private async startSession(session: any, scenarioId: string, level: string) {
    const scenario = this.scenarioService.getScenarioById(scenarioId);
    if (!scenario) {
      session.ws.send(JSON.stringify({ type: 'error', message: 'Scenario not found' }));
      return;
    }

    session.state = 'connecting';
    session.ws.send(JSON.stringify({ type: 'state', state: 'connecting' }));

    // TODO: Connect to MiniMax Realtime API
    // For now, just send the opening line
    session.state = 'listening';
    session.ws.send(JSON.stringify({ type: 'state', state: 'listening' }));
    session.ws.send(
      JSON.stringify({
        type: 'transcript',
        role: 'assistant',
        text: scenario.openingLine,
        isFinal: true,
      }),
    );

    session.transcript.push({ role: 'assistant', text: scenario.openingLine, isFinal: true });
  }

  private async handleAudioChunk(session: any, data: string, mimeType: string) {
    // TODO: Forward audio to MiniMax
    this.logger.log(`Received audio chunk: ${data.length} bytes, mimeType: ${mimeType}`);
  }

  private async handleTextMessage(session: any, text: string) {
    session.transcript.push({ role: 'user', text, isFinal: true });
    session.ws.send(
      JSON.stringify({
        type: 'transcript',
        role: 'user',
        text,
        isFinal: true,
      }),
    );

    // Simple echo for now - will be replaced with MiniMax
    const response = `You said: ${text}`;
    session.transcript.push({ role: 'assistant', text: response, isFinal: true });
    session.ws.send(
      JSON.stringify({
        type: 'transcript',
        role: 'assistant',
        text: response,
        isFinal: true,
      }),
    );
  }

  private async sendHint(session: any) {
    session.ws.send(
      JSON.stringify({
        type: 'transcript',
        role: 'assistant',
        text: 'Hint: Try to answer naturally and keep it simple.',
        isFinal: true,
      }),
    );
  }

  private async endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'ended';
    session.ws.send(JSON.stringify({ type: 'state', state: 'ended' }));

    // Save transcript to database
    await this.sessionService.endSession(sessionId, session.transcript, null);

    session.ws.close();
    this.sessions.delete(sessionId);
  }

  private handleDisconnect(sessionId: string) {
    this.logger.log(`WebSocket disconnected for session: ${sessionId}`);
    this.sessions.delete(sessionId);
  }
}
