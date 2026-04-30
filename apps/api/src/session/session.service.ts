import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TranscriptEntry } from '@speaking-coach/shared';
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
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async endSession(
    sessionId: string,
    transcriptJson: unknown,
    reportJson: unknown,
  ) {
    return this.prismaService.prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        transcriptJson: transcriptJson as Prisma.InputJsonValue,
        reportJson: reportJson as Prisma.InputJsonValue,
      },
    });
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    text: string,
    isFinal = true,
  ) {
    return this.prismaService.prisma.message.create({
      data: {
        sessionId,
        role,
        text,
        isFinal,
      },
    });
  }

  async getTranscript(sessionId: string): Promise<TranscriptEntry[]> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return [];
    }

    if (
      Array.isArray(session.transcriptJson) &&
      session.transcriptJson.length > 0
    ) {
      return session.transcriptJson as unknown as TranscriptEntry[];
    }

    return session.messages.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      text: message.text,
      isFinal: message.isFinal,
    }));
  }
}
