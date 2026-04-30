import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';

type RealtimeEvent = {
  type?: string;
  [key: string]: unknown;
};

type RealtimeTextTestResult = {
  connected: boolean;
  receivedEventTypes: string[];
  assistantText: string;
};

type RealtimeTextTestOptions = {
  text: string;
  timeoutMs?: number;
};

@Injectable()
export class MiniMaxRealtimeProvider {
  private readonly logger = new Logger(MiniMaxRealtimeProvider.name);

  async runTextConnectionTest(
    options: RealtimeTextTestOptions,
  ): Promise<RealtimeTextTestResult> {
    const apiKey = process.env.MINIMAX_API_KEY?.trim();
    if (!apiKey || apiKey === 'your_minimax_api_key_here') {
      throw new Error('MINIMAX_API_KEY is not configured');
    }

    const model = process.env.MINIMAX_REALTIME_MODEL ?? 'abab6.5s-chat';
    const url = this.buildRealtimeUrl(
      process.env.MINIMAX_REALTIME_URL ??
        'wss://api.minimax.chat/ws/v1/realtime',
      model,
    );
    const timeoutMs = options.timeoutMs ?? 20000;

    return new Promise<RealtimeTextTestResult>((resolve, reject) => {
      const receivedEventTypes: string[] = [];
      const assistantTextParts: string[] = [];
      let settled = false;
      let ws: WebSocket | null = null;

      const finish = (result: RealtimeTextTestResult) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        ws?.close();
        resolve(result);
      };

      const fail = (error: Error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        ws?.close();
        reject(error);
      };

      const timeout = setTimeout(() => {
        fail(
          new Error(
            `MiniMax Realtime text test timed out after ${timeoutMs}ms. Received events: ${receivedEventTypes.join(', ')}`,
          ),
        );
      }, timeoutMs);

      ws = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      ws.on('open', () => {
        this.logger.log('MiniMax Realtime WebSocket connected');
        this.sendJson(ws, {
          type: 'session.update',
          session: {
            model,
            modalities: ['text'],
            instructions:
              'You are a concise English speaking coach. Reply in one short sentence.',
          },
        });
        this.sendJson(ws, {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            status: 'completed',
            content: [
              {
                type: 'input_text',
                text: options.text,
              },
            ],
          },
        });
        this.sendJson(ws, {
          type: 'response.create',
          response: {
            modalities: ['text'],
            instructions: 'Answer briefly in English.',
          },
        });
      });

      ws.on('message', (data) => {
        const event = this.parseEvent(data);
        const eventType = event.type ?? 'unknown';
        receivedEventTypes.push(eventType);
        this.logger.log(`[realtime_event] type=${eventType}`);

        const textDelta = this.extractTextDelta(event);
        if (textDelta) {
          assistantTextParts.push(textDelta);
        }

        if (this.isErrorEvent(event)) {
          fail(
            new Error(
              `MiniMax Realtime error event: ${this.safeStringify(event)}`,
            ),
          );
          return;
        }

        if (
          this.isResponseDoneEvent(event) &&
          assistantTextParts.join('').trim()
        ) {
          finish({
            connected: true,
            receivedEventTypes,
            assistantText: assistantTextParts.join('').trim(),
          });
        }
      });

      ws.on('error', (error) => {
        fail(error instanceof Error ? error : new Error(String(error)));
      });

      ws.on('close', (code, reason) => {
        this.logger.log(
          `MiniMax Realtime WebSocket closed code=${code} reason=${reason.toString()}`,
        );

        if (!settled && assistantTextParts.join('').trim()) {
          finish({
            connected: true,
            receivedEventTypes,
            assistantText: assistantTextParts.join('').trim(),
          });
        }
      });
    });
  }

  private buildRealtimeUrl(baseUrl: string, model: string) {
    const url = new URL(baseUrl);
    if (!url.searchParams.has('model')) {
      url.searchParams.set('model', model);
    }
    return url.toString();
  }

  private sendJson(ws: WebSocket, event: RealtimeEvent) {
    ws.send(JSON.stringify(event));
    this.logger.log(`[realtime_send] type=${event.type ?? 'unknown'}`);
  }

  private parseEvent(data: WebSocket.RawData): RealtimeEvent {
    try {
      const parsed = JSON.parse(this.rawDataToString(data)) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as RealtimeEvent;
      }
    } catch {
      return { type: 'invalid_json' };
    }

    return { type: 'unknown' };
  }

  private rawDataToString(data: WebSocket.RawData): string {
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

  private extractTextDelta(event: RealtimeEvent) {
    const delta = event.delta;
    if (typeof delta === 'string') {
      return delta;
    }

    const text = event.text;
    if (typeof text === 'string') {
      return text;
    }

    const response = event.response;
    if (response && typeof response === 'object' && 'output_text' in response) {
      const outputText = response.output_text;
      if (typeof outputText === 'string') {
        return outputText;
      }
    }

    return '';
  }

  private isErrorEvent(event: RealtimeEvent) {
    return event.type === 'error' || event.type === 'response.error';
  }

  private isResponseDoneEvent(event: RealtimeEvent) {
    return (
      event.type === 'response.done' ||
      event.type === 'response.output_text.done' ||
      event.type === 'response.text.done'
    );
  }

  private safeStringify(event: RealtimeEvent) {
    return JSON.stringify(event).slice(0, 800);
  }
}
