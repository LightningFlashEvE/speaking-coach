import type {
  CreateSessionRequest,
  CreateSessionResponse,
  GetReportResponse,
  Scenario,
  SessionResponse,
  TranscriptEntry,
} from '@speaking-coach/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7539';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getScenarios() {
  return request<Array<Omit<Scenario, 'systemPrompt' | 'targetExpressions'>>>('/api/scenarios');
}

export function createSession(payload: CreateSessionRequest) {
  return request<CreateSessionResponse>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getSession(sessionId: string) {
  return request<SessionResponse>(`/api/sessions/${sessionId}`);
}

export function endSession(sessionId: string, transcriptJson: TranscriptEntry[]) {
  return request<SessionResponse>(`/api/sessions/${sessionId}/end`, {
    method: 'PATCH',
    body: JSON.stringify({ transcriptJson }),
  });
}

export function getReport(sessionId: string) {
  return request<GetReportResponse>(`/api/sessions/${sessionId}/report`);
}
