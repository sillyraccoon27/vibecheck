import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createRun, findActiveRunForBrand, findBrand } from "@/lib/db";
import { accepted, errors } from "@/lib/api-response";
import { startAnalysisWorker } from "@/lib/worker/analysis";

export async function POST(
  req: NextRequest,
  { params }: { params: { brand_id: string } }
) {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();

  const brand = await findBrand(params.brand_id);
  if (!brand) return errors.notFound("BRAND_NOT_FOUND", "해당 브랜드를 찾을 수 없습니다.");
  if (brand.user_id !== user.user_id) return errors.forbidden();

  const existing = await findActiveRunForBrand(brand.brand_id);
  if (existing) {
    return errors.conflict("RUN_ALREADY_IN_PROGRESS", "이미 진행 중인 분석이 있습니다.");
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* body 없어도 기본값 사용 */
  }
  const sample_size = Math.max(50, Math.min(2000, Number(body.sample_size) || 500));
  const repeat_count = Math.max(1, Math.min(5, Number(body.repeat_count) || 3));

  const run = await createRun({
    brand_id: brand.brand_id,
    sample_size,
    repeat_count,
  });

  // worker stub 비동기 시작 (실서비스에서는 Inngest enqueue)
  startAnalysisWorker(run.run_id);

  return accepted({
    run_id: run.run_id,
    brand_id: run.brand_id,
    status: run.status,
    total_questions_sampled: run.total_questions_sampled,
    total_responses_collected: 0,
    expected_responses: run.expected_responses,
    started_at: run.started_at,
    completed_at: null,
    estimated_seconds: Math.ceil(run.expected_responses * 0.1),
  });
}
