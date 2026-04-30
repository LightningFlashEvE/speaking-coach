import { Injectable, Logger } from '@nestjs/common';
import { MiniMaxRealtimeProvider } from './minimax-realtime.provider';

@Injectable()
export class RealtimeTestService {
  private readonly logger = new Logger(RealtimeTestService.name);

  constructor(private readonly realtimeProvider: MiniMaxRealtimeProvider) {}

  async runTextOnlyTest() {
    const result = await this.realtimeProvider.runTextConnectionTest({
      text: 'Hello, please reply with one short greeting.',
    });

    this.logger.log(
      `MiniMax Realtime text test succeeded. events=${result.receivedEventTypes.join(',')} assistantTextLength=${result.assistantText.length}`,
    );

    return result;
  }
}
