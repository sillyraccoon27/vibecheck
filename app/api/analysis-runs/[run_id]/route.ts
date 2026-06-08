import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findBrand } from "@/lib/db";
import { advanceRun } from "@/lib/worker/analysis";
import { errors, ok } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: { run_id: string } }
) {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();

  // 폴링 시점에 경과 시간 기준으로 진행률을 전진시킨다(서버리스에서 타이머 대체).
  const run = await advanceRun(params.run_id);
  if (!run) return errors.notFound("RUN_NOT_FOUND", "해당 분석을 찾을 수 없습니다.");
  const brand = await findBrand(run.brand_id);
  if (!brand || brand.user_id !== user.user_id) return errors.forbidden();

  const percent =
    run.expected_responses > 0
      ? Math.round((run.total_responses_collected / run.expected_responses) * 1000) / 10
      : 0;

  return ok({
    run_id: run.run_id,
    brand_id: run.brand_id,
    status: run.status,
    total_questions_sampled: run.total_questions_sampled,
    total_responses_collected: run.total_responses_collected,
    expected_responses: run.expected_responses,
    visibility_score: run.visibility_score,
    ranking_score: run.ranking_score,
    stability_score: run.stability_score,
    image_match_score: run.image_match_score,
    accuracy_score: run.accuracy_score,
    competitor_pressure_score: run.competitor_pressure_score,
    total_score: run.total_score,
    started_at: run.started_at,
    completed_at: run.completed_at,
    progress: {
      completed_responses: run.total_responses_collected,
      expected_responses: run.expected_responses,
      percent,
    },
    steps: run.steps,
    current_step: run.current_step,
  });
}
