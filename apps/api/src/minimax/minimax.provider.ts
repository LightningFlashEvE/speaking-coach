import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';

export interface MiniMaxTranscript {
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
}

export class MiniMaxProvider extends EventEmitter {
  private client: Anthropic | null = null;
  private messages: Anthropic.MessageParam[] = [];
  private isConnected = false;
  private model = 'MiniMax-M2.7';

  constructor(
    private readonly apiKey: string,
    model?: string,
  ) {
    super();
    if (model) {
      this.model = model;
    }
  }

  async connect(systemPrompt: string, openingLine: string): Promise<void> {
    try {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        baseURL: 'https://api.minimaxi.com/anthropic',
      });

      this.messages = [
        { role: 'user', content: systemPrompt },
      ];

      this.isConnected = true;
      this.emit('connected');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [],
      });

      const text = this.extractText(response);
      if (text) {
        this.emit('transcript', { role: 'assistant', text, isFinal: true } as MiniMaxTranscript);
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async sendText(text: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to MiniMax');
    }

    try {
      this.messages.push({ role: 'user', content: text });

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: this.messages,
        stream: true,
      });

      let fullText = '';
      for await (const chunk of response) {
        const text = this.extractTextFromChunk(chunk);
        if (text) {
          fullText += text;
          this.emit('transcript', { role: 'assistant', text: fullText, isFinal: false } as MiniMaxTranscript);
        }
      }

      this.messages.push({ role: 'assistant', content: fullText });

      this.emit('transcript', { role: 'assistant', text: fullText, isFinal: true } as MiniMaxTranscript);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  sendAudio(audioData: Buffer, mimeType: string): void {
    if (!this.isConnected) {
      throw new Error('Not connected to MiniMax');
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.client = null;
    this.messages = [];
  }

  private extractText(response: Anthropic.Message): string {
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    return textBlocks.map(b => b.text).join('');
  }

  private extractTextFromChunk(chunk: Anthropic.MessageStreamEvent): string {
    if (chunk.type === 'content_block_delta') {
      if (chunk.delta.type === 'text_delta') {
        return chunk.delta.text;
      }
    }
    return '';
  }
}