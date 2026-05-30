import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findBrand, findRun, updateRun } from "@/lib/db";
import { errors, ok } from "@/lib/api-response";
import { stopAnalysisWorker } from "@/lib/worker/analysis";

export async function POST(
  _req: NextRequest,
  { params }: { params: { run_id: string } }
) {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();

  const run = findRun(params.run_id);
  if (!run) return errors.notFound("RUN_NOT_FOUND", "해당 분석을 찾을 수 없습니다.");
  const brand = findBrand(run.brand_id);
  if (!brand || brand.user_id !== user.user_id) return errors.forbidden();

  if (run.status !== "pending" && run.status !== "running") {
    return errors.conflict("RUN_ALREADY_FINISHED", "이미 종료된 분석입니다.");
  }

  stopAnalysisWorker(run.run_id);
  const updated = updateRun(run.run_id, {
    status: "cancelled",
    completed_at: new Date().toISOString(),
  });

  return ok({ run_id: run.run_id, status: updated?.status ?? "cancelled" });
}
