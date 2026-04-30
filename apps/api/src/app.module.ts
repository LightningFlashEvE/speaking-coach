import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScenarioModule } from './scenario/scenario.module';
import { SessionModule } from './session/session.module';
import { PrismaModule } from './prisma/prisma.module';
import { VoiceSessionModule } from './voice-session/voice-session.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env', 'apps/api/.env'],
    }),
    ScenarioModule,
    SessionModule,
    PrismaModule,
    VoiceSessionModule,
    ReportModule,
  ],
})
export class AppModule {}
