import { Controller, Post, Body, Param, Get, Patch } from '@nestjs/common';
import { SessionService } from './session.service';

@Controller('api/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  async createSession(@Body() body: { scenarioId: string; level: string }) {
    const session = await this.sessionService.createSession(body.scenarioId, body.level);
    return {
      sessionId: session.id,
      scenarioId: session.scenarioId,
    };
  }

  @Get(':sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    return this.sessionService.getSession(sessionId);
  }

  @Patch(':sessionId/end')
  async endSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { transcriptJson?: any; reportJson?: any },
  ) {
    return this.sessionService.endSession(sessionId, body.transcriptJson, body.reportJson);
  }
}
