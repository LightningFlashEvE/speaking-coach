import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScenarioModule } from './scenario/scenario.module';
import { SessionModule } from './session/session.module';
import { PrismaModule } from './prisma/prisma.module';
import { VoiceSessionModule } from './voice-session/voice-session.module';

@Module({
  imports: [ScenarioModule, SessionModule, PrismaModule, VoiceSessionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
