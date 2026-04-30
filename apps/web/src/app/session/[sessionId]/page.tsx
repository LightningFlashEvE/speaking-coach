'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getScenarioById, Scenario } from '@speaking-coach/shared';
import { FaComments, FaLightbulb, FaMicrophone, FaPaperPlane, FaStop } from 'react-icons/fa';
import { endSession as endSessionRequest, getSession } from '@/lib/api';
import { usePcmRecorder } from '@/hooks/usePcmRecorder';
import { useVoiceSession } from '@/hooks/useVoiceSession';

const stateLabels = {
  idle: '准备连接',
  connecting: '连接中',
  listening: '等待你的回复',
  user_speaking: '你正在表达',
  thinking: 'AI 思考中',
  ai_speaking: 'AI 回复中',
  ended: '练习已结束',
  error: '连接异常',
};

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [input, setInput] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const {
    state,
    transcript,
    error,
    isConnected,
    connect,
    startSession,
    sendTextMessage,
    sendPcmChunk,
    requestHint,
    endSession,
    close,
  } = useVoiceSession(sessionId);
  
  const {
    isRecording,
    hasPermission,
    error: recorderError,
    startRecording,
    stopRecording,
  } = usePcmRecorder();

  const canSend = isConnected && state !== 'thinking' && state !== 'ended';
  const statusLabel = isRecording ? stateLabels.user_speaking : stateLabels[state] ?? state;

  useEffect(() => {
    void getSession(sessionId)
      .then((session) => {
        const selectedScenario = getScenarioById(session.scenarioId);
        if (!selectedScenario) {
          setPageError('未找到当前练习场景。');
          return;
        }
        setScenario(selectedScenario);
        connect();
      })
      .catch(() => setPageError('会话加载失败，请确认后端服务已启动。'));
  }, [connect, sessionId]);

  useEffect(() => {
    if (!scenario || !isConnected || startedRef.current) {
      return;
    }

    startedRef.current = true;
    startSession(scenario.id, scenario.level);
  }, [isConnected, scenario, startSession]);

  const targetExpressions = useMemo(() => scenario?.targetExpressions.slice(0, 3) ?? [], [scenario]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text) {
      return;
    }

    if (sendTextMessage(text)) {
      setInput('');
    }
  }

  async function handleEndSession() {
    stopRecording();
    endSession();
    close();
    await endSessionRequest(sessionId, transcript);
    router.push(`/report/${sessionId}`);
  }

  async function handleToggleRecording() {
    if (isRecording) {
      stopRecording();
      return;
    }

    await startRecording({
      onChunk: (base64Chunk) => {
        sendPcmChunk(base64Chunk);
      },
    });
  }

  if (pageError || !scenario) {
    return (
      <main className="min-h-screen bg-[var(--color-canvas)] p-6">
        <div className="content-card mx-auto mt-16 max-w-xl text-center">
          <p className="text-title-md mb-5 text-[var(--color-error)]">
            {pageError ?? '加载中...'}
          </p>
          {pageError && (
            <button className="btn-primary" onClick={() => router.push('/')}>
              返回首页
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] p-4 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="space-y-6">
          <section className="feature-card feature-card-lavender">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-caption-uppercase mb-2 opacity-70">PRACTICE ROOM</p>
                <h1 className="text-title-lg text-[var(--color-ink)]">{scenario.title}</h1>
              </div>
              <span className="badge-pill">{scenario.level}</span>
            </div>
            <p className="text-body-sm mb-6 text-[var(--color-body)]">{scenario.subtitle}</p>
            <p className="text-title-sm mb-2 text-[var(--color-ink)]">目标</p>
            <p className="text-body-sm text-[var(--color-body)]">{scenario.goal}</p>
          </section>

          <section className="content-card">
            <p className="text-caption-uppercase mb-3 text-[var(--color-muted)]">USEFUL EXPRESSIONS</p>
            <div className="space-y-3">
              {targetExpressions.map((expression) => (
                <div key={expression} className="rounded-[var(--rounded-md)] bg-[var(--color-surface-card)] p-3 text-body-sm text-[var(--color-ink)]">
                  {expression}
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="content-card flex min-h-[680px] flex-col">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-caption text-[var(--color-muted)]">Session state</p>
              <h2 className="text-title-lg text-[var(--color-ink)]">{statusLabel}</h2>
            </div>
            <button className="btn-secondary" onClick={() => void handleEndSession()}>
              <FaStop className="mr-2" />
              结束练习
            </button>
          </div>

          <div className="mb-6 flex justify-center">
            <div
              className={`flex h-32 w-32 items-center justify-center rounded-full text-white ${
                isRecording
                  ? 'animate-pulse bg-[var(--color-brand-coral)]'
                  : 'bg-[var(--color-brand-pink)]'
              }`}
            >
              {isRecording ? (
                <FaMicrophone className="text-5xl" />
              ) : (
                <FaComments className="text-5xl" />
              )}
            </div>
          </div>

          <div className="mb-4 grid gap-3 rounded-[var(--rounded-lg)] bg-[var(--color-surface-soft)] p-4 md:grid-cols-2">
            <div>
              <p className="text-caption text-[var(--color-muted)]">麦克风</p>
              <p className="text-title-sm text-[var(--color-ink)]">
                {isRecording ? '录音中' : hasPermission ? '已授权' : '未开始'}
              </p>
            </div>
            <div>
              <p className="text-caption text-[var(--color-muted)]">音频格式</p>
              <p className="text-title-sm text-[var(--color-ink)]">PCM 16kHz</p>
            </div>
          </div>

          {(error || pageError || recorderError) && (
            <div className="mb-4 rounded-[var(--rounded-md)] bg-red-50 p-3 text-body-sm text-[var(--color-error)]">
              {recorderError ?? error ?? pageError}
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto rounded-[var(--rounded-lg)] bg-[var(--color-surface-soft)] p-4">
            {transcript.length === 0 ? (
              <p className="py-10 text-center text-body-sm text-[var(--color-muted)]">
                AI 开场白会显示在这里。用下方输入框开始文字练习。
              </p>
            ) : (
              transcript.map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.text}`}
                  className={`max-w-[82%] rounded-[var(--rounded-lg)] p-4 ${
                    message.role === 'user'
                      ? 'ml-auto bg-[var(--color-brand-peach)]'
                      : 'bg-[var(--color-canvas)]'
                  }`}
                >
                  <p className="text-caption mb-1 text-[var(--color-muted)]">
                    {message.role === 'user' ? '你' : scenario.role}
                  </p>
                  <p className="text-body-md text-[var(--color-ink)]">{message.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className={isRecording ? 'btn-primary' : 'btn-secondary'}
              onClick={() => void handleToggleRecording()}
              disabled={!canSend && !isRecording}
              style={isRecording ? { backgroundColor: 'var(--color-brand-coral)' } : undefined}
            >
              {isRecording ? <FaStop className="mr-2" /> : <FaMicrophone className="mr-2" />}
              {isRecording ? '停止录音' : '开始录音'}
            </button>
            <button className="btn-secondary" onClick={requestHint} disabled={!canSend}>
              <FaLightbulb className="mr-2" />
              提示
            </button>
          </div>

          <form className="mt-4 flex gap-3" onSubmit={handleSubmit}>
            <input
              className="text-input min-w-0 flex-1"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入英文回复..."
              disabled={!canSend}
            />
            <button className="btn-primary" disabled={!canSend || input.trim().length === 0}>
              <FaPaperPlane className="mr-2" />
              发送
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
