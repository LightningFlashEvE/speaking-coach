import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prismaService: PrismaService) {}

  async createSession(scenarioId: string, userLevel: string) {
    return this.prismaService.prisma.practiceSession.create({
      data: {
        scenarioId,
        userLevel,
      },
    });
  }

  async getSession(sessionId: string) {
    return this.prismaService.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });
  }

  async endSession(sessionId: string, transcriptJson: any, reportJson: any) {
    return this.prismaService.prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        transcriptJson,
        reportJson,
      },
    });
  }

  async addMessage(sessionId: string, role: string, text: string, isFinal: boolean = true) {
    return this.prismaService.prisma.message.create({
      data: {
        sessionId,
        role,
        text,
        isFinal,
      },
    });
  }
}
