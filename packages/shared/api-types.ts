export interface CreateSessionRequest {
  scenarioId: string;
  level: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  scenarioId: string;
}

export interface SessionResponse {
  id: string;
  scenarioId: string;
  userLevel: string;
  startedAt: string;
  endedAt?: string;
  transcriptJson?: TranscriptEntry[];
  reportJson?: PracticeReportData;
  messages: MessageData[];
}

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
}

export interface MessageData {
  id: string;
  sessionId: string;
  role: string;
  text: string;
  isFinal: boolean;
  createdAt: string;
}

export interface PracticeReportData {
  overallScore: number;
  summaryZh: string;
  topMistakes: Array<{
    original: string;
    corrected: string;
    explanationZh: string;
  }>;
  recommendedExpressions: string[];
  nextPracticeSuggestion: string;
}