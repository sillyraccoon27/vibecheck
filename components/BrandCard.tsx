import Link from "next/link";

type LatestRun = {
  run_id: string;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  total_score: number | null;
  completed_at: string | null;
} | null;

export function BrandCard({
  brand,
}: {
  brand: {
    brand_id: string;
    brand_name: string;
    category: string;
    region: string;
    latest_run: LatestRun;
  };
}) {
  const run = brand.latest_run;
  const score = run?.total_score;
  const status = run?.status ?? "not_started";

  const scoreColor =
    score == null
      ? "text-ink-subtle"
      : score >= 70
      ? "text-success"
      : score >= 40
      ? "text-warning"
      : "text-danger";

  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-semibold text-ink">{brand.brand_name}</div>
          <div className="mt-1 text-xs text-ink-subtle">
            {brand.category} · {brand.region}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-5">
        {status === "succeeded" && score != null ? (
          <>
            <div className={`text-3xl font-bold ${scoreColor}`}>{score.toFixed(1)}</div>
            <div className="mt-1 text-xs text-ink-subtle">100점 만점 종합 점수</div>
            <ScoreBar score={score} />
          </>
        ) : status === "running" || status === "pending" ? (
          <>
            <div className="text-lg font-semibold text-ink-soft">분석 진행 중</div>
            <div className="mt-1 text-xs text-ink-subtle">결과 준비 중</div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-ink-soft">아직 분석 안 함</div>
            <div className="mt-1 text-xs text-ink-subtle">분석을 실행해보세요</div>
          </>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        {status === "succeeded" && run ? (
          <Link
            href={`/brands/${brand.brand_id}/dashboard/${run.run_id}`}
            className="btn-secondary flex-1"
          >
            대시보드 보기
          </Link>
        ) : status === "running" || status === "pending" ? (
          <Link
            href={`/brands/${brand.brand_id}/analysis/${run!.run_id}`}
            className="btn-secondary flex-1"
          >
            진행 상태 보기
          </Link>
        ) : (
          <Link href={`/brands/${brand.brand_id}`} className="btn-primary flex-1">
            분석 시작
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    succeeded: { label: "완료", cls: "bg-success/10 text-success" },
    running: { label: "Running", cls: "bg-warning/10 text-warning" },
    pending: { label: "대기", cls: "bg-warning/10 text-warning" },
    cancelled: { label: "취소됨", cls: "bg-ink/10 text-ink-muted" },
    failed: { label: "실패", cls: "bg-danger/10 text-danger" },
    not_started: { label: "신규", cls: "bg-canvas text-ink-muted border border-canvas-border" },
  };
  const m = map[status] ?? map.not_started;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-success" : score >= 40 ? "bg-warning" : "bg-danger";
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(100, score)}%` }}
      />
    </div>
  );
}
