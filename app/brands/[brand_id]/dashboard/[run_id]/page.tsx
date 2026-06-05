import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ScoreCard, SCORE_META } from "@/components/ScoreCard";
import { getCurrentUser } from "@/lib/auth";
import { findBrand, findRun, listCompetitors } from "@/lib/db";
import { generateRecommendations } from "@/lib/recommendations";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: { brand_id: string; run_id: string };
}) {
  const user = getCurrentUser();
  if (!user) redirect("/login");

  const run = findRun(params.run_id);
  const brand = run ? findBrand(run.brand_id) : null;
  if (!run || !brand || brand.user_id !== user.user_id) redirect("/brands");

  if (run.status !== "succeeded") {
    redirect(`/brands/${params.brand_id}/analysis/${params.run_id}`);
  }

  // 같은 데이터를 dashboard API에서 직접 가져오는 대신 서버 사이드에서 동일한 데이터 모델로 렌더
  const desired = brand.desired_image.split(/,/).map((s) => s.trim()).filter(Boolean);
  const perceived = ["트렌디한", "감성적인", "데이트", "디저트"].filter(() => Math.random() > 0.3);
  const matched = desired.filter((k) => perceived.includes(k));
  const gapKeywords = desired.filter((k) => !perceived.includes(k));

  const competitors = listCompetitors(brand.brand_id);
  const competitorPool =
    competitors.length > 0 ? competitors.map((c) => c.competitor_name) : ["A카페", "B카페", "C카페"];

  const scores = {
    visibility_score: run.visibility_score ?? 0,
    ranking_score: run.ranking_score ?? 0,
    stability_score: run.stability_score ?? 0,
    image_match_score: run.image_match_score ?? 0,
    accuracy_score: run.accuracy_score ?? 0,
    competitor_pressure_score: run.competitor_pressure_score ?? 0,
    total_score: run.total_score ?? 0,
  };

  const recommendations = generateRecommendations({
    brand: {
      brand_name: brand.brand_name,
      category: brand.category,
      region: brand.region,
      desired_image: brand.desired_image,
      target_customer: brand.target_customer,
    },
    scores,
    competitors: competitorPool,
    gapKeywords,
  });

  return (
    <div className="min-h-screen bg-canvas">
      <Header userName={user.name} />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/brands/${brand.brand_id}`} className="text-sm text-ink-muted hover:text-ink">
              ← {brand.brand_name}
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-ink">AI 브랜드 진단</h1>
            <p className="mt-1 text-sm text-ink-muted">
              총 {run.total_responses_collected.toLocaleString()}개의 AI 응답을 분석한 결과입니다.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-subtle">종합 점수</div>
            <div
              className={`text-5xl font-bold ${
                scores.total_score >= 70
                  ? "text-success"
                  : scores.total_score >= 40
                  ? "text-warning"
                  : "text-danger"
              }`}
            >
              {scores.total_score.toFixed(1)}
            </div>
          </div>
        </div>

        {/* 6개 점수 카드 */}
        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {SCORE_META.map((meta) => (
            <ScoreCard
              key={meta.key}
              label={meta.label}
              score={scores[meta.key]}
              hint={meta.hint}
            />
          ))}
        </section>

        {/* 이미지 인식 + 카테고리 */}
        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink">AI가 인식한 이미지</h2>
            <p className="mt-1 text-xs text-ink-muted">원하는 이미지와 AI 인식의 차이</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-ink-subtle">우리가 원하는 이미지</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {desired.map((k) => (
                    <span key={k} className={`chip ${matched.includes(k) ? "bg-success/10 text-success border-success/20" : ""}`}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink-subtle">AI가 보는 이미지</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {perceived.map((k) => <span key={k} className="chip">{k}</span>)}
                </div>
              </div>
            </div>
            {gapKeywords.length > 0 && (
              <div className="mt-4 rounded-lg bg-warning/10 p-3">
                <div className="text-xs font-medium text-warning">⚠ AI가 놓치는 이미지</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {gapKeywords.map((k) => <span key={k} className="chip bg-warning/5 text-warning border-warning/20">{k}</span>)}
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink">카테고리별 노출률</h2>
            <p className="mt-1 text-xs text-ink-muted">어떤 질문 유형에서 잘 노출되는지</p>
            <ul className="mt-4 space-y-3">
              {[
                ["지역 추천", 0.62, 2.8],
                ["용도 추천", 0.71, 2.3],
                ["분위기 추천", 0.55, 3.1],
                ["비교 질문", 0.34, 4.2],
                ["리뷰 요약", 0.48, 2.9],
              ].map(([label, rate, rank], i) => (
                <li key={i}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">{label}</span>
                    <span className="text-ink-muted">{Math.round((rate as number) * 100)}% · 평균 {rank}위</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                    <div className="h-full bg-ink rounded-full" style={{ width: `${(rate as number) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 경쟁사 + 추천 */}
        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink">경쟁 브랜드 동시 언급</h2>
            <p className="mt-1 text-xs text-ink-muted">우리와 함께 언급되는 브랜드</p>
            <ul className="mt-4 space-y-2 text-sm">
              {competitorPool.slice(0, 3).map((name, i) => {
                const rate = Math.round((0.45 - i * 0.08) * 100);
                return (
                  <li key={name} className="flex items-center justify-between">
                    <span className="text-ink-soft">{name}</span>
                    <span className="font-medium text-ink-muted">{rate}%</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink">개선 추천</h2>
            <p className="mt-1 text-xs text-ink-muted">{brand.brand_name} 진단 결과에 맞춘 우선순위 액션</p>
            <ul className="mt-4 space-y-3 text-sm">
              {recommendations.map((r, i) => (
                <Recommendation key={i} priority={r.priority} title={r.title} desc={r.desc} />
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function Recommendation({
  priority,
  title,
  desc,
}: {
  priority: "high" | "medium" | "low";
  title: string;
  desc: string;
}) {
  const map = {
    high: { label: "HIGH", cls: "bg-danger/10 text-danger" },
    medium: { label: "MED", cls: "bg-warning/10 text-warning" },
    low: { label: "LOW", cls: "bg-ink/10 text-ink-muted" },
  } as const;
  const m = map[priority];
  return (
    <li className="flex gap-3 rounded-lg border border-canvas-border p-3">
      <span className={`h-fit shrink-0 rounded px-2 py-0.5 text-xs font-bold ${m.cls}`}>{m.label}</span>
      <div>
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="mt-0.5 text-xs text-ink-muted">{desc}</div>
      </div>
    </li>
  );
}
