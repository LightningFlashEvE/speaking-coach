import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [PrismaModule, ReportModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
