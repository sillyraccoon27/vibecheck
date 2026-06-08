import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findBrand, listCompetitors } from "@/lib/db";
import { advanceRun } from "@/lib/worker/analysis";
import { errors, ok } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: { run_id: string } }
) {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();

  // 대시보드 직접 진입 시에도 진행률을 전진시켜 완료 상태를 보장한다.
  const run = advanceRun(params.run_id);
  if (!run) return errors.notFound("RUN_NOT_FOUND", "해당 분석을 찾을 수 없습니다.");
  const brand = findBrand(run.brand_id);
  if (!brand || brand.user_id !== user.user_id) return errors.forbidden();

  if (run.status !== "succeeded") {
    return errors.business("RUN_NOT_FINISHED", "분석이 아직 완료되지 않았습니다.");
  }

  const desired = brand.desired_image
    .split(/[,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const perceived = ["트렌디한", "감성적인", "데이트", "디저트", "주말", "인스타용"]
    .filter(() => Math.random() > 0.4)
    .slice(0, 4);

  const matched = desired.filter((k) => perceived.includes(k));
  const gap = desired.filter((k) => !perceived.includes(k));

  const competitors = listCompetitors(brand.brand_id);
  const competitorPool =
    competitors.length > 0
      ? competitors.map((c) => c.competitor_name)
      : ["A카페", "B카페", "C카페", "D카페"];

  const dashboard = {
    run_id: run.run_id,
    brand_id: run.brand_id,
    scores: {
      visibility_score: run.visibility_score ?? 0,
      ranking_score: run.ranking_score ?? 0,
      stability_score: run.stability_score ?? 0,
      image_match_score: run.image_match_score ?? 0,
      accuracy_score: run.accuracy_score ?? 0,
      competitor_pressure_score: run.competitor_pressure_score ?? 0,
      total_score: run.total_score ?? 0,
    },
    by_category: [
      { category: "region_recommendation", exposure_rate: 0.62, avg_mention_rank: 2.8 },
      { category: "purpose_recommendation", exposure_rate: 0.71, avg_mention_rank: 2.3 },
      { category: "atmosphere_recommendation", exposure_rate: 0.55, avg_mention_rank: 3.1 },
      { category: "comparison", exposure_rate: 0.34, avg_mention_rank: 4.2 },
      { category: "review_summary", exposure_rate: 0.48, avg_mention_rank: 2.9 },
    ],
    competitors: {
      top_co_mentioned: competitorPool.slice(0, 3).map((name, i) => ({
        competitor_name: name,
        co_mention_rate: round2(0.45 - i * 0.08),
      })),
      outranking_us: competitorPool.slice(0, 2).map((name, i) => ({
        competitor_name: name,
        outrank_rate: round2(0.32 - i * 0.05),
      })),
      our_weak_keywords: ["콘센트", "1인석"],
    },
    image: {
      desired,
      perceived_by_ai: perceived,
      match_score: round2(matched.length / Math.max(desired.length, 1)),
      gap_keywords: gap,
    },
    accuracy: {
      score: run.accuracy_score ?? 0,
      mismatches: [
        {
          fact_type: "business_hours",
          official_value: "10:00~22:00",
          ai_value: "11:00~21:00",
          severity: "medium",
        },
      ],
      missing: ["주차 가능 여부"],
    },
    confidence: {
      reliability_label: "high",
      avg_confidence_score: 0.78,
      unstable_categories: ["comparison", "negative"],
    },
    trend: {
      previous_run_id: null,
      visibility_score_delta: 0,
      ranking_score_delta: 0,
      total_score_delta: 0,
      new_competitors: [],
      lost_keywords: [],
      gained_keywords: [],
    },
  };

  return ok(dashboard);
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}
