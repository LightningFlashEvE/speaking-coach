import { Module } from '@nestjs/common';
import { MiniMaxChatProvider } from './minimax-chat.provider';
import { MiniMaxRealtimeProvider } from './minimax-realtime.provider';
import { RealtimeTestService } from './realtime-test.service';

@Module({
  providers: [
    MiniMaxChatProvider,
    MiniMaxRealtimeProvider,
    RealtimeTestService,
  ],
  exports: [MiniMaxChatProvider, MiniMaxRealtimeProvider, RealtimeTestService],
})
export class MiniMaxModule {}
