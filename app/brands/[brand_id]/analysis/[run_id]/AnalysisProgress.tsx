"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressRing } from "@/components/ProgressRing";

type RunSnapshot = {
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  total_responses_collected: number;
  expected_responses: number;
  total_questions_sampled: number;
  progress: { percent: number };
  steps: string[];
  current_step: number;
};

export function AnalysisProgress({
  brand_id,
  run_id,
}: {
  brand_id: string;
  run_id: string;
}) {
  const router = useRouter();
  const [snap, setSnap] = useState<RunSnapshot | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch(`/api/analysis-runs/${run_id}`, { cache: "no-store" });
        const j = await res.json();
        if (!alive) return;
        if (j.ok) {
          setSnap(j.data);
          if (j.data.status === "succeeded") {
            // 잠깐 100% 보여주고 대시보드로 이동
            setTimeout(() => router.push(`/brands/${brand_id}/dashboard/${run_id}`), 800);
          }
        }
      } catch {}
    }
    poll();
    const id = setInterval(poll, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [run_id, brand_id, router]);

  async function cancel() {
    if (!confirm("분석을 취소할까요?")) return;
    setCancelling(true);
    try {
      await fetch(`/api/analysis-runs/${run_id}/cancel`, { method: "POST" });
      router.push(`/brands/${brand_id}`);
    } finally {
      setCancelling(false);
    }
  }

  if (!snap) {
    return <div className="mt-12 text-center text-ink-muted">불러오는 중...</div>;
  }

  const percent = snap.progress.percent;
  const isRunning = snap.status === "pending" || snap.status === "running";
  const isCancelled = snap.status === "cancelled";
  const isFailed = snap.status === "failed";

  return (
    <div className="mt-8 card p-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink">
          {isCancelled ? "취소된 분석" : isFailed ? "분석 실패" : snap.status === "succeeded" ? "분석 완료!" : "분석 진행 중"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {snap.total_questions_sampled}개의 질문을 AI에게 반복 질의 중입니다.
        </p>
      </div>

      <div className="mt-10 flex flex-col items-center gap-10 md:flex-row md:justify-around">
        <ProgressRing percent={percent} />

        <ol className="flex-1 space-y-3 max-w-md">
          {snap.steps.map((s, i) => {
            const done = i < snap.current_step;
            const active = i === snap.current_step && isRunning;
            return (
              <li
                key={i}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  active ? "border-ink bg-canvas" : done ? "border-canvas-border" : "border-canvas-border opacity-60"
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  done ? "bg-success text-white" : active ? "bg-ink text-white animate-pulse" : "bg-canvas border border-canvas-border text-ink-subtle"
                }`}>
                  {done ? "✓" : i + 1}
                </span>
                <span className={`text-sm ${active ? "font-medium text-ink" : "text-ink-muted"}`}>{s}</span>
                {active && <span className="ml-auto text-xs text-ink-subtle">진행 중</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-10 border-t border-canvas-border pt-6 text-center text-sm text-ink-muted">
        지금까지 <span className="font-semibold text-ink">{snap.total_responses_collected.toLocaleString()}</span>
        {" / "}
        <span>{snap.expected_responses.toLocaleString()}</span> 응답을 수집했습니다.
      </div>

      {isRunning && (
        <div className="mt-6 flex justify-center">
          <button className="btn-secondary" onClick={cancel} disabled={cancelling}>
            {cancelling ? "취소 중..." : "분석 취소"}
          </button>
        </div>
      )}
    </div>
  );
}
