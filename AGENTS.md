# AGENTS.md

## Project Overview

Speaking Coach is a Web MVP for AI English speaking practice.

Users choose a real-life English speaking scenario, enter a practice room, speak or type with an AI role-play partner, and receive a short practice report after the session.

This project is currently Web-only. Do not build iOS features in this phase.

The product is designed primarily for Chinese native speakers who want to practice spoken English.

---

## Current Project Status

### Completed

The following features are already implemented and working:

- Next.js Web frontend with homepage, session page, and report page
- NestJS backend with modular architecture
- pnpm monorepo (apps/api, apps/web, packages/shared)
- 6 English practice scenarios defined in packages/shared/scenarios.ts
- Text fallback practice flow via WebSocket (text_message → MiniMax Chat → transcript)
- WebSocket session management in voice-session/
- Transcript display during session
- End session and report generation (MiniMax Chat API)
- MediaRecorder microphone recording: browser records audio, chunks sent to backend log pipeline
- MiniMax Realtime backend text-event spike (backend-only, connects via MINIMAX_REALTIME_URL, sends text events, not yet connected to frontend audio)

### Not Yet Implemented

The following are explicitly out of scope until further instruction:

- True realtime voice conversation (user audio → AI audio → browser playback)
- Frontend audio routing to a realtime voice model
- AI realtime audio playback in browser
- Aliyun Bailian RealtimeVoiceProvider (next implementation target)
- RealtimeVoiceProvider abstraction / Provider Router / Factory

---

## Realtime Voice Direction Change

### Previous Route: MiniMax Realtime

MiniMax Realtime was the original plan. A backend-only text-event spike exists. It is currently blocked by MiniMax quota (`usage limit exceeded`).

MiniMax Realtime is **not** the primary realtime route going forward.

Do **not** delete the existing MiniMax Realtime spike code. Keep it for reference. Do **not** attempt to extend it or fix the quota issue.

### New Primary Route: Aliyun Bailian / DashScope

Primary realtime voice provider going forward:

- **Provider**: Aliyun Bailian / DashScope
- **Model**: `qwen3.5-omni-flash-realtime`
- **Mode**: manual (not auto-detect)
- **Input audio format**: PCM first
- **Output audio format**: MP3 if available
- **First target scenario**: airport_immigration

Implementation plan:

1. Create `RealtimeVoiceProvider` abstract interface (backend)
2. Implement `AliyunBailianRealtimeProvider`
3. Write Aliyun Realtime backend-only connection spike and test script
4. Add Aliyun environment variables
5. Wire frontend audio into Aliyun provider (later phase, not now)

**Current task is backend-only spike. Do not touch frontend audio yet.**

---

## What MiniMax Is Still Used For

MiniMax Chat Provider is retained and must not be removed:

- Text fallback conversation during session
- Practice report generation
- Correction summaries

MiniMax-related files to keep:

- `apps/api/src/minimax/minimax-chat.provider.ts`
- `apps/api/src/minimax/minimax-realtime.provider.ts` (spike reference, do not extend)
- All report generation code in `apps/api/src/report/`

---

## Product Goal

Build the MVP flow first:

1. User opens the homepage.
2. User chooses one speaking scenario.
3. System creates a practice session.
4. User enters `/session/[sessionId]`.
5. User can practice with text fallback first.
6. Then add microphone recording and realtime voice.
7. Transcript is displayed during the session.
8. User ends the practice.
9. Backend generates a short practice report.
10. User views `/report/[sessionId]`.

The MVP should prioritize a complete usable flow over perfect realtime voice latency.

---

## Core Product Rules

- The role-play conversation should be mainly in English.
- The user is a Chinese native speaker.
- Practice reports should be written in Chinese.
- Correction explanations should be written in Chinese.
- The AI coach should be encouraging, concise, and practical.
- Do not make the product feel like an exam system.
- Do not over-correct during live conversation.
- Detailed correction should happen mostly in the final report.
- Keep each AI role-play response short and natural.
- Ask one question at a time during role-play.

---

## Tech Stack

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- WebSocket
- MediaRecorder initially
- Web Audio API / AudioWorklet later if needed

Backend:

- NestJS
- TypeScript
- `ws` for WebSocket
- Prisma
- SQLite for development
- PostgreSQL for production later
- MiniMax Chat API for text fallback and report generation
- Aliyun Bailian / DashScope for realtime voice (new primary route)
- MiniMax Realtime spike kept for reference only

Package manager:

- pnpm

Node:

- Use Node.js >= 22 and < 25.
- Use pnpm >= 9.

---

## Required Project Structure

Target structure:

```text
speaking-coach/
├─ apps/
│  ├─ web/
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ page.tsx
│  │  │  │  ├─ session/
│  │  │  │  │  └─ [sessionId]/
│  │  │  │  │     └─ page.tsx
│  │  │  │  └─ report/
│  │  │  │     └─ [sessionId]/
│  │  │  │        └─ page.tsx
│  │  │  ├─ components/
│  │  │  ├─ hooks/
│  │  │  └─ lib/
│  │
│  └─ api/
│     ├─ src/
│     │  ├─ scenario/
│     │  ├─ session/
│     │  ├─ voice-session/
│     │  ├─ minimax/
│     │  ├─ aliyun/           ← new: Aliyun Bailian provider
│     │  ├─ report/
│     │  └─ prisma/
│     └─ prisma/
│        └─ schema.prisma
│
├─ packages/
│  └─ shared/
│     ├─ index.ts
│     ├─ types.ts
│     ├─ api-types.ts
│     └─ scenarios.ts
│
├─ AGENTS.md
├─ DESIGN-clay.md
├─ README.md
├─ .env.example
├─ package.json
└─ pnpm-workspace.yaml
```

If apps/web is missing or incomplete, create it before implementing advanced backend features.

---

## UI Design Direction

Use DESIGN-clay.md as the visual reference.

Visual direction:

- Clay-inspired
- Warm cream canvas
- Clean and premium
- Large rounded cards
- Soft colorful scenario cards
- Organic shapes
- Friendly AI coach feeling
- Clear visual hierarchy
- Mobile responsive
- Polished but lightweight

Avoid:

- Dark neon cyberpunk
- Generic education dashboard
- Plain chatbot-only layout
- Heavy blue enterprise SaaS look
- Crowded navigation
- Overly technical interface

The voice session page should feel like a private AI speaking room, not a normal chat app.

---

## MVP Pages

Build only these pages first:

### 1. Homepage

Route: `/`

Purpose:

- Show scenario cards.
- Let user choose a practice scenario.
- Create a session when a scenario is clicked.

### 2. Practice Room

Route: `/session/[sessionId]`

Purpose:

- Show the selected scenario.
- Show session state.
- Show transcript.
- Support text fallback first.
- Support voice recording later.
- Allow user to end the session.

### 3. Report Page

Route: `/report/[sessionId]`

Purpose:

- Show the practice report.
- Show score, corrections, and recommended expressions.
- Let user practice again or choose another scene.

Do not build these in the first MVP:

- Login
- Pricing
- Subscription
- Admin dashboard
- iOS app
- Complex analytics
- Social sharing
- Multi-language settings

---

## Scenarios

Scenarios live in: `packages/shared/scenarios.ts`

Initial scenarios:

- airport_immigration
- coffee_order
- hotel_checkin
- restaurant_order
- job_interview
- daily_chat

When adding or editing scenarios, preserve this shape:

```ts
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
```

Scenario prompts should:

- Define the AI role clearly.
- Define the user's speaking goal.
- Keep the AI inside the selected scenario.
- Make the AI ask one question at a time.
- Keep responses short and natural.
- Correct only major mistakes during live conversation.
- Save detailed feedback for the final report.

---

## Homepage Requirements

The homepage should show six scenario cards.

Each card should include:

- Icon
- Title
- Short description
- Level badge
- Estimated practice time
- Start button

Clicking a card should:

1. Call `POST /api/sessions`.
2. Create a new practice session.
3. Navigate to `/session/[sessionId]`.

---

## Practice Room Requirements

The practice room should include:

- Scenario title
- Difficulty level
- Current session state
- Central voice orb
- Transcript panel
- Text input fallback
- Hint button
- End Practice button
- Mute button, if voice playback is implemented

Supported session states:

```ts
export type VoiceSessionState =
  | "idle"
  | "connecting"
  | "listening"
  | "user_speaking"
  | "thinking"
  | "ai_speaking"
  | "ended"
  | "error";
```

Implementation priority:

1. Text fallback mode
2. Transcript display
3. End session
4. Report generation
5. Microphone recording
6. Aliyun Bailian realtime voice (new primary route)
7. AI audio playback

Do not block the whole MVP on realtime voice issues.

---

## Report Page Requirements

The report page should include:

- Encouraging title
- Overall score
- Fluency score, if available
- Grammar score, if available
- Vocabulary score, if available
- Correction cards
- Recommended expressions
- Practice again button
- Choose another scene button

Reports should be encouraging, concise, and useful.

Do not make feedback harsh or overly academic.

---

## API Contracts

Shared API and WebSocket types must live in:

- `packages/shared/api-types.ts`
- `packages/shared/types.ts`

Do not duplicate request and response types separately in frontend and backend.

Required HTTP APIs:

- `GET /api/scenarios`
- `POST /api/sessions`
- `GET /api/sessions/:sessionId`
- `PATCH /api/sessions/:sessionId/end`
- `GET /api/sessions/:sessionId/report`

If `GET /api/sessions/:sessionId/report` does not exist yet, add it when implementing report generation.

---

## WebSocket Contract

Frontend connects to: `/ws/voice-sessions/:sessionId`

Client to server messages:

```ts
export type ClientToServerMessage =
  | {
      type: "start_session";
      scenarioId: string;
      level: "A1" | "A2" | "B1" | "B2" | "C1";
    }
  | {
      type: "text_message";
      text: string;
    }
  | {
      type: "audio_chunk";
      data: string;
      mimeType: string;
    }
  | {
      type: "end_session";
    }
  | {
      type: "hint";
    };
```

Server to client messages:

```ts
export type ServerToClientMessage =
  | {
      type: "session_started";
      sessionId: string;
    }
  | {
      type: "state";
      state:
        | "idle"
        | "connecting"
        | "listening"
        | "user_speaking"
        | "thinking"
        | "ai_speaking"
        | "ended"
        | "error";
    }
  | {
      type: "transcript";
      role: "user" | "assistant";
      text: string;
      isFinal: boolean;
    }
  | {
      type: "ai_audio";
      data: string;
      mimeType: string;
    }
  | {
      type: "correction";
      original: string;
      corrected: string;
      explanationZh: string;
    }
  | {
      type: "error";
      message: string;
    };
```

When a session starts successfully, backend should send:

```json
{ "type": "session_started", "sessionId": "..." }
```

---

## MiniMax Integration Plan

Use separate providers.

Do not mix text chat, realtime voice, and TTS in one provider.

### 1. MiniMax Chat Provider

File: `apps/api/src/minimax/minimax-chat.provider.ts`

Use this for:

- Text fallback
- Practice report generation
- Correction summaries
- Future expression recommendations

Use the MiniMax OpenAI-compatible Chat API.

Environment variables:

```
MINIMAX_API_KEY=
MINIMAX_CHAT_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_CHAT_MODEL=MiniMax-M2.7
MINIMAX_CHAT_FAST_MODEL=MiniMax-M2.7-highspeed
MINIMAX_CHAT_TIMEOUT_MS=8000
```

The chat provider should expose methods like:

```ts
export interface MiniMaxChatProvider {
  createChatCompletion(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}
```

Use low temperature for report generation.

### 2. MiniMax Realtime Provider (Spike Reference — Do Not Extend)

File: `apps/api/src/minimax/minimax-realtime.provider.ts`

Status: **Blocked by MiniMax quota. Keep for reference. Do not extend.**

Environment variables (keep in .env.example for reference, optional):

```
MINIMAX_REALTIME_URL=wss://api.minimax.chat/ws/v1/realtime
MINIMAX_REALTIME_MODEL=abab6.5s-chat
```

### 3. Existing MiniMax Provider

If there is already a `minimax.provider.ts` file, inspect what it actually does.

If it only supports text, rename or replace it to avoid confusion.

Recommended provider names:

- `minimax-chat.provider.ts`
- `minimax-realtime.provider.ts`

---

## Aliyun Bailian Realtime Provider Plan

This is the new primary realtime voice route.

### Provider Interface

All realtime voice providers must implement:

```ts
export interface RealtimeVoiceProvider {
  connect(options: {
    scenarioPrompt: string;
    openingLine: string;
    userLevel: string;
  }): Promise<void>;

  sendAudio(data: Buffer, mimeType?: string): void;

  sendText?(text: string): void;

  onAudio(callback: (audio: Buffer, mimeType: string) => void): void;

  onTranscript(
    callback: (message: {
      role: "user" | "assistant";
      text: string;
      isFinal: boolean;
    }) => void
  ): void;

  onError(callback: (error: Error) => void): void;

  close(): Promise<void>;
}
```

### AliyunBailianRealtimeProvider

File: `apps/api/src/aliyun/aliyun-bailian-realtime.provider.ts`

Target model: `qwen3.5-omni-flash-realtime`

Configuration:

```
ALIYUN_DASHSCOPE_API_KEY=
ALIYUN_REALTIME_MODEL=qwen3.5-omni-flash-realtime
ALIYUN_REALTIME_REGION=cn-beijing
ALIYUN_AUDIO_INPUT_FORMAT=pcm
ALIYUN_AUDIO_OUTPUT_FORMAT=mp3
ALIYUN_DIALOG_MODE=manual
```

Implementation notes:

- Use manual dialog mode first.
- PCM audio input first; WebM/Opus conversion comes later if needed.
- MP3 output preferred; fall back to whatever the model returns.
- First target scenario for testing: `airport_immigration`.

### Backend-Only Spike (Current Task)

Before connecting frontend audio, implement a backend-only Aliyun spike:

1. Connect to Aliyun Bailian Realtime WebSocket using `ALIYUN_DASHSCOPE_API_KEY`.
2. Send a text event (no audio yet).
3. Receive and log any response events.
4. Confirm connection succeeds and events are received.
5. Add a test script analogous to the existing MiniMax realtime spike:
   - File: `apps/api/src/aliyun/aliyun-realtime-spike.ts`
   - Script: `pnpm --filter api aliyun:spike`

Do not connect frontend audio until this spike passes.

---

## Environment Variables

Never expose Aliyun or MiniMax keys to frontend code.

Backend `.env`:

```env
PORT=7539
DATABASE_URL="file:./dev.db"

# Voice mode config
VOICE_MODE=realtime_voice
REALTIME_PROVIDER=aliyun_bailian

# Aliyun Bailian / DashScope — primary realtime voice provider
ALIYUN_DASHSCOPE_API_KEY=
ALIYUN_REALTIME_MODEL=qwen3.5-omni-flash-realtime
ALIYUN_REALTIME_REGION=cn-beijing
ALIYUN_AUDIO_INPUT_FORMAT=pcm
ALIYUN_AUDIO_OUTPUT_FORMAT=mp3
ALIYUN_DIALOG_MODE=manual

# MiniMax Chat — text fallback and report generation
MINIMAX_API_KEY=
MINIMAX_CHAT_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_CHAT_MODEL=MiniMax-M2.7
MINIMAX_CHAT_FAST_MODEL=MiniMax-M2.7-highspeed
MINIMAX_CHAT_TIMEOUT_MS=8000

# MiniMax Realtime — spike reference only, blocked by quota
MINIMAX_REALTIME_URL=wss://api.minimax.chat/ws/v1/realtime
MINIMAX_REALTIME_MODEL=abab6.5s-chat
```

Frontend `.env.local` or root env:

```env
NEXT_PUBLIC_API_URL=http://localhost:7539
NEXT_PUBLIC_WS_URL=ws://localhost:7539
```

Rules:

- Never commit `.env`.
- Keep `.env.example` updated.
- Only frontend-safe values may use `NEXT_PUBLIC_`.
- Never put `ALIYUN_DASHSCOPE_API_KEY` or `MINIMAX_API_KEY` in frontend code.
- Never log full API keys.
- Do not hardcode secrets.

---

## Database Rules

Prisma schema lives at: `apps/api/prisma/schema.prisma`

Current expected models:

- `PracticeSession`
- `Message`

Suggested initial Prisma schema:

```prisma
model PracticeSession {
  id             String    @id @default(cuid())
  scenarioId     String
  userLevel      String
  startedAt      DateTime  @default(now())
  endedAt        DateTime?
  transcriptJson Json?
  reportJson     Json?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  messages       Message[]
}

model Message {
  id        String   @id @default(cuid())
  sessionId String
  role      String
  text      String
  isFinal   Boolean  @default(true)
  createdAt DateTime @default(now())

  session   PracticeSession @relation(fields: [sessionId], references: [id])
}
```

Schema changes are allowed during MVP development, but every schema change must include:

- Prisma migration
- Updated shared types if needed
- Updated README or API documentation if behavior changes

Do not silently change database fields without updating code and docs.

---

## Report Generation

Report output must follow this shape:

```ts
export type PracticeReport = {
  overallScore: number;
  fluencyScore?: number;
  grammarScore?: number;
  vocabularyScore?: number;
  summaryZh: string;
  topMistakes: Array<{
    original: string;
    corrected: string;
    explanationZh: string;
  }>;
  recommendedExpressions: string[];
  nextPracticeSuggestion: string;
};
```

Report generation rules:

- Output Chinese explanation.
- Keep tone encouraging.
- Include 3 to 5 important mistakes.
- Include 3 to 6 recommended expressions.
- Focus on spoken English, naturalness, grammar, vocabulary, and scenario completion.
- If the user barely said anything, generate a gentle report explaining that there was not enough speech data.
- If model returns invalid JSON, log raw output and return a safe fallback error.
- Do not crash the session ending flow because of report JSON parse failure.

Suggested system prompt for report generation:

```
You are an English speaking coach for Chinese native speakers.

You will receive a transcript from an English speaking practice session.

Return ONLY valid JSON. Do not include markdown. Do not include explanations outside JSON.

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
3. topMistakes should include 3 to 5 important mistakes.
4. recommendedExpressions should include 3 to 6 useful expressions.
5. Focus on spoken English, naturalness, grammar, vocabulary, and scenario completion.
6. Keep the tone encouraging.
```

---

## Text Fallback Strategy

Text fallback is required and must remain working at all times.

Flow:

1. User types text in the practice room.
2. Frontend sends `text_message` over WebSocket.
3. Backend sends user text to MiniMax Chat Provider.
4. Assistant returns text response.
5. Backend sends `transcript` event to frontend.
6. Transcript updates.
7. User can end session.
8. Report generation still works.

Do not block the whole MVP on realtime voice issues.

---

## Voice Implementation Strategy

Implement voice after text fallback works.

New voice implementation order (Aliyun Bailian route):

1. Backend-only Aliyun spike (current task)
2. Browser microphone permission
3. Frontend captures PCM audio via Web Audio API / AudioWorklet
4. Frontend sends `audio_chunk` (PCM, base64) over WebSocket
5. Backend forwards PCM audio to Aliyun Bailian Realtime
6. Backend receives assistant audio (MP3 or PCM)
7. Backend sends `ai_audio` to frontend
8. Frontend plays assistant audio
9. Transcript continues to display

MediaRecorder output (WebM/Opus) is **not** directly compatible with Aliyun PCM input. Do not use raw MediaRecorder chunks for the realtime provider. Use Web Audio API PCM capture instead.

Do not over-engineer audio in the first version.

---

## Development Priority

Use this priority order.

### Phase 1–4: COMPLETE ✅

- App runs with `pnpm dev`
- Homepage with six scenario cards
- Session page
- Report page
- WebSocket text message
- MiniMax Chat reply
- Transcript display
- End session
- Report generation

### Phase 5: Realtime Voice (In Progress)

#### Step 5a: Backend Aliyun Spike (current task)

- [ ] Add Aliyun env variables to `.env.example`
- [ ] Create `RealtimeVoiceProvider` interface in `packages/shared/types.ts`
- [ ] Implement `AliyunBailianRealtimeProvider`
- [ ] Write spike script `apps/api/src/aliyun/aliyun-realtime-spike.ts`
- [ ] Add `pnpm --filter api aliyun:spike` script
- [ ] Spike passes: backend connects to Aliyun, sends text event, receives events

#### Step 5b: Frontend PCM Audio (after 5a passes)

- [ ] Browser requests microphone permission
- [ ] Frontend captures PCM via AudioWorklet
- [ ] Frontend sends PCM audio_chunk messages over WebSocket
- [ ] Backend receives PCM audio and forwards to Aliyun Bailian Realtime
- [ ] Backend receives AI audio response
- [ ] Backend sends `ai_audio` to frontend
- [ ] Frontend plays AI audio
- [ ] Transcript continues to work

---

## Coding Rules

General:

- Use TypeScript.
- Use ES Module import, not `require`.
- Keep functions small.
- Keep provider-specific logic isolated.
- Do not hardcode API URLs.
- Use shared types from `packages/shared`.
- Do not duplicate API types across frontend and backend.
- Prefer clear names over clever abstractions.
- Keep MVP simple.

Frontend:

- Use React function components.
- Use Tailwind CSS.
- Use shadcn/ui where appropriate.
- Reusable hooks go in `apps/web/src/hooks`.
- API helpers go in `apps/web/src/lib`.
- Components go in `apps/web/src/components`.
- Keep UI responsive.
- Keep loading and error states visible.
- Avoid building unnecessary pages.

Backend:

- Use NestJS modules.
- Keep scenario logic in `scenario/`.
- Keep session logic in `session/`.
- Keep WebSocket logic in `voice-session/`.
- Keep MiniMax provider logic in `minimax/`.
- Keep Aliyun provider logic in `aliyun/`.
- Keep report generation in `report/`.
- Validate session existence before accepting WebSocket events.
- Log backend errors clearly.
- Never expose secrets.
- Keep provider-specific protocol details inside provider classes.

---

## Error Handling Rules

Frontend should show readable error messages for:

- Failed API request
- Failed WebSocket connection
- Microphone permission denied
- Session not found
- Report generation failed
- Voice provider unavailable

Backend should log:

- MiniMax API errors
- Aliyun API errors
- WebSocket connection errors
- Report JSON parsing errors
- Database errors
- Invalid session IDs

Do not expose internal stack traces to frontend users.

---

## Security Rules

- Aliyun and MiniMax API keys must stay on backend only.
- Never commit `.env`.
- Never print full API keys in logs.
- Validate session IDs.
- Do not accept arbitrary file uploads in MVP.
- Do not add authentication unless explicitly requested.
- Use HTTPS in production because microphone permissions require secure contexts in modern browsers.

---

## Deployment Notes

Development:

- SQLite is acceptable.
- Local backend can run on port 7539.
- Local frontend can run on Next.js default port.

Production or public testing:

- Use PostgreSQL if multiple users will test.
- Configure WebSocket-compatible hosting.
- Configure HTTPS.
- Configure CORS carefully.
- Keep frontend and backend environment variables separate.

Suggested deployment options:

- Frontend: Vercel, Netlify, or same VPS as backend
- Backend: Railway, Render, Fly.io, or VPS
- Database: PostgreSQL

For China-focused access, prefer a domestic VPS such as Alibaba Cloud or Tencent Cloud.

---

## Acceptance Criteria

### Text MVP (Complete ✅)

- Homepage displays six scenario cards.
- Clicking a scenario creates a session.
- Session page opens successfully.
- Text fallback works through WebSocket.
- Transcript displays user and assistant messages.
- User can end a session.
- Report page displays score, corrections, and recommended expressions.
- MiniMax API key is not exposed in frontend.
- `pnpm build` passes.
- `pnpm lint` passes or has documented known issues.

### Aliyun Bailian Realtime Spike

- Backend connects to Aliyun Bailian Realtime WebSocket.
- Backend sends a text event.
- Backend receives and logs response events.
- `pnpm --filter api aliyun:spike` runs without crash.
- No API key is logged to console.

### Full Realtime Voice (Future)

- Browser requests microphone permission.
- Frontend sends PCM audio chunks to backend.
- Backend forwards audio to Aliyun Bailian Realtime.
- Assistant audio is returned and played in browser.
- Transcript continues to work.

---

## Non-Goals for MVP

Do not implement these unless explicitly requested:

- iOS app
- User accounts
- Payment
- Subscription
- Admin dashboard
- Advanced analytics
- Social sharing
- Complex learning path
- Full course system
- Multi-tenant architecture
- Voice cloning
- Custom teacher avatars

---

## Important Instructions for AI Agents

Before making changes:

1. Read this file.
2. Inspect the existing project structure.
3. Do not assume missing folders exist.
4. Do not assume MiniMax Realtime voice is working — it is blocked by quota.
5. Do not assume Aliyun Bailian realtime is implemented — it is the next task.
6. Prefer completing text fallback MVP before touching voice.
7. Keep the project simple and shippable.
8. Keep DESIGN-clay.md as the visual design reference.
9. Keep all API keys backend-only.
10. Do not remove MiniMax Chat provider or report generation.
11. Do not implement iOS, login, payment, or admin dashboard.