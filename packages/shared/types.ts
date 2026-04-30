// WebSocket 消息类型
export type VoiceSessionState =
  | "idle"
  | "connecting"
  | "listening"
  | "user_speaking"
  | "thinking"
  | "ai_speaking"
  | "ended"
  | "error";

// 前端发送给后端的消息
export type ClientToServerMessage =
  | {
      type: "start_session";
      scenarioId: string;
      level: "A1" | "A2" | "B1" | "B2" | "C1";
    }
  | {
      type: "audio_chunk";
      data: string; // base64 编码的音频数据
      mimeType: string;
    }
  | {
      type: "end_session";
    }
  | {
      type: "hint";
    }
  | {
      type: "text_message";
      text: string;
    };

// 后端发送给前端的消息
export type ServerToClientMessage =
  | {
      type: "session_started";
      sessionId: string;
    }
  | {
      type: "ai_audio";
      data: string; // base64 编码的音频数据
      mimeType: string;
    }
  | {
      type: "transcript";
      role: "user" | "assistant";
      text: string;
      isFinal: boolean;
    }
  | {
      type: "correction";
      original: string;
      corrected: string;
      explanationZh: string;
    }
  | {
      type: "state";
      state: VoiceSessionState;
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "text_message";
      text: string;
    };

// 场景配置类型
export type Scenario = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  role: string;
  goal: string;
  openingLine: string;
  systemPrompt: string;
  targetExpressions: string[];
  isPremium?: boolean;
};

// 练习会话类型
export type PracticeSession = {
  id: string;
  scenarioId: string;
  userLevel: string;
  startedAt: string;
  endedAt?: string;
  transcriptJson?: any;
  reportJson?: any;
};

// 消息类型
export type Message = {
  id: string;
  sessionId: string;
  role: string;
  text: string;
  isFinal: boolean;
  createdAt: string;
};

// 练习报告类型
export type PracticeReport = {
  overallScore: number;
  summaryZh: string;
  topMistakes: Array<{
    original: string;
    corrected: string;
    explanationZh: string;
  }>;
  recommendedExpressions: string[];
  nextPracticeSuggestion: string;
};
