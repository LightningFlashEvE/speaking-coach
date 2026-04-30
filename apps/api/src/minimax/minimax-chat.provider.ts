import { Injectable, Logger } from '@nestjs/common';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

@Injectable()
export class MiniMaxChatProvider {
  private readonly logger = new Logger(MiniMaxChatProvider.name);

  async createChatCompletion(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<string> {
    const apiKey = process.env.MINIMAX_API_KEY?.trim();

    if (!apiKey || apiKey === 'your_minimax_api_key_here') {
      return this.createMockReply(messages);
    }

    const baseUrl =
      process.env.MINIMAX_CHAT_BASE_URL?.replace(/\/$/, '') ??
      'https://api.minimaxi.com/v1';
    const model =
      options.model ??
      process.env.MINIMAX_CHAT_MODEL ??
      process.env.MINIMAX_MODEL ??
      'MiniMax-M2.7';

    const timeoutMs = Number(process.env.MINIMAX_CHAT_TIMEOUT_MS ?? 8000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.maxTokens ?? 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `MiniMax Chat API failed: ${response.status} ${errorText.slice(0, 300)}`,
        );
        return this.createMockReply(messages);
      }

      const data = (await response.json()) as OpenAIChatResponse;
      const text = data.choices?.[0]?.message?.content?.trim();

      if (!text) {
        this.logger.warn('MiniMax Chat API returned an empty response');
        return this.createMockReply(messages);
      }

      return text;
    } catch (error) {
      this.logger.error('MiniMax Chat API request failed', error);
      return this.createMockReply(messages);
    } finally {
      clearTimeout(timeout);
    }
  }

  private createMockReply(messages: ChatMessage[]): string {
    const lastUser = [...messages]
      .reverse()
      .find((message) => message.role === 'user');
    const text = lastUser?.content.toLowerCase() ?? '';

    if (text.includes('hint')) {
      return 'Try one short sentence first. For example: "I would like a coffee, please."';
    }

    return "Nice. Let's keep it natural. Could you tell me one more detail?";
  }
}
