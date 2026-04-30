'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { GetReportResponse } from '@speaking-coach/shared';
import { getReport } from '@/lib/api';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [report, setReport] = useState<GetReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getReport(sessionId)
      .then(setReport)
      .catch(() => setError('练习报告加载失败。'));
  }, [sessionId]);

  if (error || !report) {
    return (
      <main className="min-h-screen bg-[var(--color-canvas)] p-6">
        <div className="content-card mx-auto mt-16 max-w-xl text-center">
          <p className={`text-title-md mb-5 ${error ? 'text-[var(--color-error)]' : 'text-[var(--color-muted)]'}`}>
            {error ?? '正在生成练习报告...'}
          </p>
          {error && (
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
      <div className="mx-auto max-w-5xl">
        <section className="feature-card feature-card-peach mb-8 text-center">
          <p className="text-caption-uppercase mb-4 opacity-70">PRACTICE REPORT</p>
          <h1 className="text-display-sm mb-6 text-[var(--color-ink)]">这次练习完成得不错</h1>
          <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-[var(--color-canvas)]">
            <span className="text-display-md text-[var(--color-ink)]">{report.overallScore}</span>
          </div>
          <p className="text-title-sm mt-4 text-[var(--color-body)]">综合得分</p>
          <p className="text-body-md mx-auto mt-5 max-w-2xl text-[var(--color-body)]">
            {report.summaryZh}
          </p>
        </section>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <ScoreCard label="流利度" value={report.fluencyScore ?? report.overallScore} />
          <ScoreCard label="语法" value={report.grammarScore ?? report.overallScore} />
          <ScoreCard label="词汇" value={report.vocabularyScore ?? report.overallScore} />
        </div>

        <section className="content-card mb-8">
          <h2 className="text-title-lg mb-5 text-[var(--color-ink)]">重点纠正</h2>
          <div className="space-y-4">
            {report.topMistakes.length === 0 ? (
              <p className="text-body-sm text-[var(--color-muted)]">
                这次发言内容较少，暂时没有具体错误。下次可以多说几句，报告会更有针对性。
              </p>
            ) : (
              report.topMistakes.map((mistake, index) => (
                <div key={`${mistake.original}-${index}`} className="rounded-[var(--rounded-lg)] bg-[var(--color-surface-card)] p-4">
                  <p className="text-caption mb-1 text-[var(--color-muted)]">原句</p>
                  <p className="text-body-md mb-3 text-[var(--color-ink)]">{mistake.original}</p>
                  <p className="text-caption mb-1 text-[var(--color-muted)]">建议表达</p>
                  <p className="text-body-md mb-3 text-[var(--color-ink)]">{mistake.corrected}</p>
                  <p className="text-body-sm text-[var(--color-body)]">{mistake.explanationZh}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="content-card mb-8">
          <h2 className="text-title-lg mb-5 text-[var(--color-ink)]">推荐表达</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {report.recommendedExpressions.map((expression) => (
              <div key={expression} className="rounded-[var(--rounded-md)] bg-[var(--color-brand-mint)] p-3 text-body-sm text-[var(--color-ink)]">
                {expression}
              </div>
            ))}
          </div>
          <p className="text-body-md mt-6 text-[var(--color-body)]">
            {report.nextPracticeSuggestion}
          </p>
        </section>

        <div className="flex flex-wrap justify-center gap-4">
          <button className="btn-secondary" onClick={() => router.push('/')}>
            选择其他场景
          </button>
          <button className="btn-primary" onClick={() => router.push('/')}>
            再练一次
          </button>
        </div>
      </div>
    </main>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="content-card text-center">
      <p className="text-caption mb-2 text-[var(--color-muted)]">{label}</p>
      <p className="text-title-lg text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
