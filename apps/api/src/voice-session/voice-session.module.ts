import { Module } from '@nestjs/common';
import { VoiceSessionService } from './voice-session.service';
import { ScenarioModule } from '../scenario/scenario.module';
import { SessionModule } from '../session/session.module';
import { MiniMaxModule } from '../minimax/minimax.module';

@Module({
  imports: [ScenarioModule, SessionModule, MiniMaxModule],
  providers: [VoiceSessionService],
  exports: [VoiceSessionService],
})
export class VoiceSessionModule {}
