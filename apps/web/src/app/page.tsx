'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Scenario } from '@speaking-coach/shared';
import { FaBriefcase, FaCoffee, FaComments, FaHotel, FaPlane, FaUtensils } from 'react-icons/fa';
import { createSession, getScenarios } from '@/lib/api';

const iconMap = {
  plane: FaPlane,
  coffee: FaCoffee,
  hotel: FaHotel,
  restaurant: FaUtensils,
  briefcase: FaBriefcase,
  chat: FaComments,
};

const cardColors = [
  'feature-card-pink',
  'feature-card-teal',
  'feature-card-lavender',
  'feature-card-peach',
  'feature-card-ochre',
  'feature-card-cream',
] as const;

export default function Home() {
  const [scenarios, setScenarios] = useState<
    Array<Omit<Scenario, 'systemPrompt' | 'targetExpressions'>>
  >([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    void getScenarios()
      .then(setScenarios)
      .catch(() => setError('场景加载失败，请确认后端服务已启动。'));
  }, []);

  async function handleStart(scenario: Omit<Scenario, 'systemPrompt' | 'targetExpressions'>) {
    setLoadingId(scenario.id);
    setError(null);

    try {
      const session = await createSession({
        scenarioId: scenario.id,
        level: scenario.level,
      });
      router.push(`/session/${session.sessionId}`);
    } catch {
      setError('创建练习会话失败，请稍后再试。');
      setLoadingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)]">
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="text-caption-uppercase mb-5 text-[var(--color-muted)]">
              TEXT MVP PRACTICE
            </p>
            <h1 className="text-display-lg md:text-display-xl mb-6 text-[var(--color-ink)]">
              AI Speaking Coach
            </h1>
            <p className="text-title-md max-w-2xl text-[var(--color-body)]">
              为中文母语者设计的英语口语陪练。选择一个真实场景，先用文字完成可用练习流程。
            </p>
            {error && <p className="mt-6 text-body-sm text-[var(--color-error)]">{error}</p>}
          </div>
          <div className="rounded-[var(--rounded-xl)] bg-[var(--color-surface-soft)] p-8">
            <div className="rounded-[var(--rounded-lg)] bg-[var(--color-canvas)] p-5">
              <p className="text-caption text-[var(--color-muted)]">AI partner</p>
              <p className="text-title-md mt-3 text-[var(--color-ink)]">
                Good afternoon. What would you like to practice today?
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-caption-uppercase text-[var(--color-muted)]">SCENARIOS</p>
              <h2 className="text-display-sm mt-2 text-[var(--color-ink)]">选择练习场景</h2>
            </div>
            <span className="badge-pill">约 5 分钟</span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((scenario, index) => {
              const Icon = iconMap[scenario.icon as keyof typeof iconMap] ?? FaComments;
              const colorClass = cardColors[index % cardColors.length];
              const loading = loadingId === scenario.id;

              return (
                <article key={scenario.id} className={`feature-card ${colorClass}`}>
                  <div className="mb-8 flex items-center justify-between">
                    <Icon className="text-4xl" />
                    <span className="badge-pill">{scenario.level}</span>
                  </div>
                  <h3 className="text-title-lg mb-2">{scenario.title}</h3>
                  <p className="text-body-sm mb-8 opacity-80">{scenario.subtitle}</p>
                  <button
                    className="btn-on-color w-full"
                    disabled={loadingId !== null}
                    onClick={() => void handleStart(scenario)}
                  >
                    {loading ? '创建中...' : '开始练习'}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
