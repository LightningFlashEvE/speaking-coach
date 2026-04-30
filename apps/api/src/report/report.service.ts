import { Injectable, Logger } from '@nestjs/common';
import { PracticeReport, TranscriptEntry } from '@speaking-coach/shared';
import { MiniMaxChatProvider } from '../minimax/minimax-chat.provider';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly miniMaxChatProvider: MiniMaxChatProvider) {}

  async generateReport(transcript: TranscriptEntry[]): Promise<PracticeReport> {
    if (transcript.filter((entry) => entry.role === 'user').length === 0) {
      return {
        overallScore: 40,
        summaryZh:
          '这次练习的发言内容还不多，建议下次先用一两句完整英文回答问题。',
        topMistakes: [],
        recommendedExpressions: [
          'Could you repeat that, please?',
          'Let me think for a second.',
          'I would like to...',
        ],
        nextPracticeSuggestion:
          '下次尝试至少回答 3 个问题，每次用一句完整英文表达。',
      };
    }

    const raw = await this.miniMaxChatProvider.createChatCompletion(
      [
        {
          role: 'system',
          content: `You are an English speaking coach for Chinese native speakers.

Return ONLY valid JSON. Do not include markdown.

The JSON schema:
{
  "overallScore": number,
  "summaryZh": string,
  "topMistakes": [
    {
      "original": string,
      "corrected": string,
      "explanationZh": string
    }
  ],
  "recommendedExpressions": string[],
  "nextPracticeSuggestion": string
}

Rules:
1. overallScore must be between 0 and 100.
2. summaryZh must be in Chinese.
3. topMistakes should include 3 to 5 important mistakes when enough data exists.
4. recommendedExpressions should include 3 to 6 useful expressions.
5. Focus on spoken English, naturalness, grammar, vocabulary, and scenario completion.
6. Keep the tone encouraging.`,
        },
        {
          role: 'user',
          content: JSON.stringify(transcript),
        },
      ],
      { temperature: 0.2, maxTokens: 900 },
    );

    try {
      return this.normalizeReport(JSON.parse(raw) as Partial<PracticeReport>);
    } catch {
      this.logger.warn(
        `Invalid report JSON from MiniMax/mock: ${raw.slice(0, 500)}`,
      );
      return this.createMockReport(transcript);
    }
  }

  private normalizeReport(report: Partial<PracticeReport>): PracticeReport {
    return {
      overallScore: Math.min(
        100,
        Math.max(0, Number(report.overallScore ?? 72)),
      ),
      summaryZh:
        report.summaryZh ??
        '这次练习完成得不错，表达方向清楚。继续练习完整句和更自然的场景表达。',
      topMistakes: Array.isArray(report.topMistakes)
        ? report.topMistakes.slice(0, 5)
        : [],
      recommendedExpressions: Array.isArray(report.recommendedExpressions)
        ? report.recommendedExpressions.slice(0, 6)
        : [
            'I would like to...',
            'Could you help me with...?',
            'That sounds good.',
          ],
      nextPracticeSuggestion:
        report.nextPracticeSuggestion ??
        '下次练习时，尝试多补充一个原因或细节。',
    };
  }

  private createMockReport(transcript: TranscriptEntry[]): PracticeReport {
    const userText =
      transcript.find((entry) => entry.role === 'user')?.text ??
      'I want coffee.';

    return {
      overallScore: 76,
      summaryZh:
        '你已经能用英文完成基本回应，表达比较清楚。下一步可以练习更完整、更自然的句子。',
      topMistakes: [
        {
          original: userText,
          corrected: userText.trim().endsWith('.') ? userText : `${userText}.`,
          explanationZh: '口语中句子可以更完整，注意结尾和礼貌表达。',
        },
      ],
      recommendedExpressions: [
        'I would like to...',
        'Could you please...?',
        'That works for me.',
        'Let me think for a second.',
      ],
      nextPracticeSuggestion:
        '再选择同一个场景练一次，尝试每次回答都补充一个具体细节。',
    };
  }
}
