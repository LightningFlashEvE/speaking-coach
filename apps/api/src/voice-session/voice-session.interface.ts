export interface VoiceSession {
  sessionId: string;
  ws: any; // WebSocket connection to frontend
  minimaxWs?: any; // WebSocket connection to MiniMax
  scenarioId: string;
  userLevel: string;
  state: string;
  transcript: Array<{ role: string; text: string; isFinal: boolean }>;
}

export interface MiniMaxMessage {
  type: string;
  [key: string]: any;
}
