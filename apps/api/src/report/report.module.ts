import { Module } from '@nestjs/common';
import { MiniMaxModule } from '../minimax/minimax.module';
import { ReportService } from './report.service';

@Module({
  imports: [MiniMaxModule],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
