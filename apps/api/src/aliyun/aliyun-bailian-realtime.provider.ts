import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';
import { RealtimeVoiceProvider } from '@speaking-coach/shared';

// ──────────────────────────────────────────────
// Internal types
// ──────────────────────────────────────────────

type RealtimeEvent = {
  type?: string;
  [key: string]: unknown;
};

export type AliyunSpikeResult = {
  connected: boolean;
  receivedEventTypes: string[];
  assistantText: string;
};

type AliyunSpikeOptions = {
  text: string;
  timeoutMs?: number;
};

// ──────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────

@Injectable()
export class AliyunBailianRealtimeProvider implements RealtimeVoiceProvider {
  private readonly logger = new Logger(AliyunBailianRealtimeProvider.name);

  private ws: WebSocket | null = null;
  private audioCallback?: (audio: Buffer, mimeType: string) => void;
  private transcriptCallback?: (message: {
    role: 'user' | 'assistant';
    text: string;
    isFinal: boolean;
  }) => void;
  private errorCallback?: (error: Error) => void;

  private currentAssistantText = '';
  private currentUserText = '';

  /**
   * Backend-only spike: connect to Aliyun Bailian Realtime, send a text
   * event, wait for a response, then close. No audio, no frontend involved.
   */
  async runTextConnectionSpike(
    options: AliyunSpikeOptions,
  ): Promise<AliyunSpikeResult> {
    const apiKey = process.env.ALIYUN_DASHSCOPE_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        'ALIYUN_DASHSCOPE_API_KEY is not configured. Please fill it in .env',
      );
    }

    const model =
      process.env.ALIYUN_REALTIME_MODEL ?? 'qwen3.5-omni-flash-realtime';
    const region = process.env.ALIYUN_REALTIME_REGION ?? 'cn-beijing';
    const url = this.buildWsUrl(model, region);
    const timeoutMs = options.timeoutMs ?? 30000;

    this.logger.log(`Connecting to Aliyun Bailian Realtime: ${url}`);

    return new Promise<AliyunSpikeResult>((resolve, reject) => {
      const receivedEventTypes: string[] = [];
      const assistantTextParts: string[] = [];
      let settled = false;
      let ws: WebSocket | null = null;

      const finish = (result: AliyunSpikeResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        ws?.close();
        resolve(result);
      };

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        ws?.close();
        reject(error);
      };

      const timeoutHandle = setTimeout(() => {
        // If we timed out but received some text, treat it as success
        const text = assistantTextParts.join('').trim();
        if (text) {
          finish({ connected: true, receivedEventTypes, assistantText: text });
        } else {
          fail(
            new Error(
              `Aliyun Bailian spike timed out after ${timeoutMs}ms. ` +
                `Received events: [${receivedEventTypes.join(', ')}]`,
            ),
          );
        }
      }, timeoutMs);

      ws = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      ws.on('open', () => {
        this.logger.log('Aliyun Bailian Realtime WebSocket connected ✅');

        // Step 1: configure session (text + audio modalities, manual VAD)
        this.sendJson(ws, {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions:
              'You are a concise English speaking coach. Reply in one short sentence.',
            input_audio_format: process.env.ALIYUN_AUDIO_INPUT_FORMAT ?? 'pcm',
            output_audio_format:
              process.env.ALIYUN_AUDIO_OUTPUT_FORMAT ?? 'mp3',
            // manual mode: no server-side VAD — we commit turns explicitly
            turn_detection: null,
          },
        });

        // Step 2: insert a user text message
        this.sendJson(ws, {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: options.text,
              },
            ],
          },
        });

        // Step 3: trigger model response (text only for spike)
        this.sendJson(ws, {
          type: 'response.create',
          response: {
            modalities: ['text'],
          },
        });
      });

      ws.on('message', (data) => {
        const event = this.parseEvent(data);
        const eventType = event.type ?? 'unknown';
        receivedEventTypes.push(eventType);
        this.logger.log(`[aliyun_event] type=${eventType}`);

        // Collect any text delta
        const delta = this.extractTextDelta(event);
        if (delta) {
          assistantTextParts.push(delta);
          this.logger.log(`[aliyun_text_delta] "${delta}"`);
        }

        if (this.isErrorEvent(event)) {
          const msg = this.safeStringify(event);
          this.logger.error(`[aliyun_error] ${msg}`);
          fail(new Error(`Aliyun Bailian error event: ${msg}`));
          return;
        }

        if (this.isResponseDoneEvent(event)) {
          const text = assistantTextParts.join('').trim();
          this.logger.log(`[aliyun_response_done] assistantText="${text}"`);
          finish({ connected: true, receivedEventTypes, assistantText: text });
        }
      });

      ws.on('error', (error) => {
        this.logger.error(
          `Aliyun WebSocket error: ${error instanceof Error ? error.message : String(error)}`,
        );
        fail(error instanceof Error ? error : new Error(String(error)));
      });

      ws.on('close', (code, reason) => {
        this.logger.log(
          `Aliyun WebSocket closed code=${code} reason=${reason.toString()}`,
        );
        if (!settled) {
          const text = assistantTextParts.join('').trim();
          if (text) {
            finish({
              connected: true,
              receivedEventTypes,
              assistantText: text,
            });
          } else {
            fail(
              new Error(
                `Aliyun WebSocket closed unexpectedly (code=${code}) before receiving a response. ` +
                  `Events so far: [${receivedEventTypes.join(', ')}]`,
              ),
            );
          }
        }
      });
    });
  }

  // ──────────────────────────────────────────────
  // RealtimeVoiceProvider Implementation
  // ──────────────────────────────────────────────

  async connect(options: {
    scenarioPrompt: string;
    openingLine: string;
    userLevel: string;
  }): Promise<void> {
    const apiKey = process.env.ALIYUN_DASHSCOPE_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ALIYUN_DASHSCOPE_API_KEY is not configured.');
    }

    const model =
      process.env.ALIYUN_REALTIME_MODEL ?? 'qwen3.5-omni-flash-realtime';
    const region = process.env.ALIYUN_REALTIME_REGION ?? 'cn-beijing';
    const url = this.buildWsUrl(model, region);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      this.ws.on('open', () => {
        this.logger.log('Aliyun Realtime WS connected for active session');

        this.sendJson(this.ws!, {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: options.scenarioPrompt,
            input_audio_format: process.env.ALIYUN_AUDIO_INPUT_FORMAT ?? 'pcm',
            output_audio_format:
              process.env.ALIYUN_AUDIO_OUTPUT_FORMAT ?? 'mp3',
            turn_detection: null, // manual VAD
          },
        });

        resolve();
      });

      this.ws.on('message', (data) => this.handleWsMessage(data));

      this.ws.on('error', (err) => {
        this.logger.error('Aliyun WS error:', err);
        if (this.errorCallback) this.errorCallback(err);
        reject(err);
      });

      this.ws.on('close', (code, reason) => {
        this.logger.log(
          `Aliyun WS closed code=${code} reason=${reason.toString()}`,
        );
      });
    });
  }

  sendAudio(data: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Append audio
    this.sendJson(this.ws, {
      type: 'input_audio_buffer.append',
      audio: data.toString('base64'),
    });

    // For manual mode, we also need to trigger commit and response manually after user stops speaking.
    // However, since we receive discrete chunks, the client usually sends `end_session` or we need a way
    // to know when the chunk ends. If the client sends discrete chunks and expects an immediate response,
    // we can commit immediately. Let's assume each sendAudio is a complete chunk for MVP,
    // or we expose a commit method. For DashScope, if turn_detection is null, we must send commit.
    this.sendJson(this.ws, {
      type: 'input_audio_buffer.commit',
    });
    this.sendJson(this.ws, {
      type: 'response.create',
    });
  }

  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.sendJson(this.ws, {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    this.sendJson(this.ws, {
      type: 'response.create',
    });
  }

  onAudio(callback: (audio: Buffer, mimeType: string) => void): void {
    this.audioCallback = callback;
  }

  onTranscript(
    callback: (message: {
      role: 'user' | 'assistant';
      text: string;
      isFinal: boolean;
    }) => void,
  ): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  close(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    return Promise.resolve();
  }

  private handleWsMessage(data: WebSocket.RawData) {
    const event = this.parseEvent(data);

    // Handle Audio Output
    if (
      event.type === 'response.audio.delta' &&
      typeof event.delta === 'string'
    ) {
      if (this.audioCallback) {
        // Aliyun output defaults to mp3 or pcm based on session config
        const mimeType =
          process.env.ALIYUN_AUDIO_OUTPUT_FORMAT === 'pcm'
            ? 'audio/pcm'
            : 'audio/mpeg';
        this.audioCallback(Buffer.from(event.delta, 'base64'), mimeType);
      }
    }

    // Handle Assistant Transcript
    if (
      event.type === 'response.audio_transcript.delta' ||
      event.type === 'response.text.delta'
    ) {
      const delta = this.extractTextDelta(event);
      if (delta) {
        this.currentAssistantText += delta;
        if (this.transcriptCallback) {
          this.transcriptCallback({
            role: 'assistant',
            text: this.currentAssistantText,
            isFinal: false,
          });
        }
      }
    }

    if (this.isResponseDoneEvent(event)) {
      if (this.transcriptCallback && this.currentAssistantText) {
        this.transcriptCallback({
          role: 'assistant',
          text: this.currentAssistantText,
          isFinal: true,
        });
        this.currentAssistantText = '';
      }
    }

    // Handle User Transcript (if sending audio and Aliyun transcribes it)
    if (
      event.type === 'conversation.item.input_audio_transcription.delta' &&
      typeof event.delta === 'string'
    ) {
      this.currentUserText += event.delta;
      if (this.transcriptCallback) {
        this.transcriptCallback({
          role: 'user',
          text: this.currentUserText,
          isFinal: false,
        });
      }
    }

    if (
      event.type === 'conversation.item.input_audio_transcription.completed'
    ) {
      if (this.transcriptCallback && this.currentUserText) {
        this.transcriptCallback({
          role: 'user',
          text: this.currentUserText,
          isFinal: true,
        });
        this.currentUserText = '';
      }
    }

    if (this.isErrorEvent(event)) {
      if (this.errorCallback) {
        this.errorCallback(new Error(this.safeStringify(event)));
      }
    }
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  private buildWsUrl(model: string, region: string): string {
    // China regions use dashscope.aliyuncs.com; international uses dashscope-intl
    const host = region.startsWith('cn-')
      ? 'dashscope.aliyuncs.com'
      : 'dashscope-intl.aliyuncs.com';
    return `wss://${host}/api-ws/v1/realtime?model=${encodeURIComponent(model)}`;
  }

  private sendJson(ws: WebSocket, event: RealtimeEvent): void {
    const json = JSON.stringify(event);
    ws.send(json);
    this.logger.log(`[aliyun_send] type=${event.type ?? 'unknown'}`);
  }

  private parseEvent(data: WebSocket.RawData): RealtimeEvent {
    try {
      const str = this.rawDataToString(data);
      const parsed = JSON.parse(str) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as RealtimeEvent;
      }
    } catch {
      return { type: 'invalid_json' };
    }
    return { type: 'unknown' };
  }

  private rawDataToString(data: WebSocket.RawData): string {
    if (typeof data === 'string') return data;
    if (Buffer.isBuffer(data)) return data.toString('utf8');
    if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
    return Buffer.from(data).toString('utf8');
  }

  private extractTextDelta(event: RealtimeEvent): string {
    // response.audio_transcript.delta / response.text.delta
    if (typeof event.delta === 'string') return event.delta;
    if (typeof event.text === 'string') return event.text;

    const response = event.response;
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      if (typeof r['output_text'] === 'string') return r['output_text'];
    }
    return '';
  }

  private isErrorEvent(event: RealtimeEvent): boolean {
    return event.type === 'error' || event.type === 'response.error';
  }

  private isResponseDoneEvent(event: RealtimeEvent): boolean {
    return (
      event.type === 'response.done' ||
      event.type === 'response.output_text.done' ||
      event.type === 'response.text.done' ||
      event.type === 'response.audio_transcript.done'
    );
  }

  private safeStringify(event: RealtimeEvent): string {
    return JSON.stringify(event).slice(0, 800);
  }
}
