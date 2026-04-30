import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PracticeReport, TranscriptEntry } from '@speaking-coach/shared';
import { ReportService } from '../report/report.service';
import { SessionService } from './session.service';

@Controller('api/sessions')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly reportService: ReportService,
  ) {}

  @Post()
  async createSession(@Body() body: { scenarioId: string; level: string }) {
    const session = await this.sessionService.createSession(
      body.scenarioId,
      body.level,
    );

    return {
      sessionId: session.id,
      scenarioId: session.scenarioId,
    };
  }

  @Get(':sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  @Patch(':sessionId/end')
  async endSession(
    @Param('sessionId') sessionId: string,
    @Body()
    body: { transcriptJson?: TranscriptEntry[]; reportJson?: PracticeReport },
  ) {
    const existingSession = await this.sessionService.getSession(sessionId);
    if (!existingSession) {
      throw new NotFoundException('Session not found');
    }

    const transcriptJson =
      body.transcriptJson && body.transcriptJson.length > 0
        ? body.transcriptJson
        : await this.sessionService.getTranscript(sessionId);
    const reportJson =
      body.reportJson ??
      (await this.reportService.generateReport(transcriptJson));

    return this.sessionService.endSession(
      sessionId,
      transcriptJson,
      reportJson,
    );
  }

  @Get(':sessionId/report')
  async getReport(@Param('sessionId') sessionId: string) {
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.reportJson) {
      return session.reportJson;
    }

    const transcript = await this.sessionService.getTranscript(sessionId);
    const report = await this.reportService.generateReport(transcript);
    await this.sessionService.endSession(sessionId, transcript, report);
    return report;
  }
}
