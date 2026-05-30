export function ScoreCard({
  label,
  score,
  hint,
}: {
  label: string;
  score: number | null;
  hint?: string;
}) {
  const display = score === null ? "—" : score.toFixed(1);
  const color =
    score === null
      ? "text-ink-subtle"
      : score >= 70
      ? "text-success"
      : score >= 40
      ? "text-warning"
      : "text-danger";
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-ink-subtle">
        {label}
      </div>
      <div className={`mt-2 text-4xl font-bold ${color}`}>{display}</div>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

export const SCORE_META: Array<{
  key:
    | "visibility_score"
    | "ranking_score"
    | "stability_score"
    | "image_match_score"
    | "accuracy_score"
    | "competitor_pressure_score";
  label: string;
  hint: string;
}> = [
  { key: "visibility_score", label: "노출률", hint: "AI가 우리를 얼마나 자주 언급하는지" },
  { key: "ranking_score", label: "순위", hint: "언급될 때 몇 번째로 등장하는지" },
  { key: "stability_score", label: "안정성", hint: "반복 질의에 일관된 응답인지" },
  { key: "image_match_score", label: "이미지 일치", hint: "원하는 이미지와 AI 인식 일치도" },
  { key: "accuracy_score", label: "정확도", hint: "공식 정보와 AI 응답의 차이" },
  { key: "competitor_pressure_score", label: "경쟁 압박", hint: "경쟁사가 우리보다 위인지" },
];
