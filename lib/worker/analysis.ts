// AI 분석 worker stub.
// 실제로는 Inngest/QStash가 호출하지만, MVP에서는 in-process setInterval로 진행률을 시뮬레이션한다.

import { findRun, updateRun, findBrand, listCompetitors } from "../db";

// run_id → timer 참조 (중복 시작 방지)
const timers = new Map<string, NodeJS.Timeout>();

const STEP_THRESHOLDS = [0, 0.05, 0.1, 0.75, 0.85, 0.95, 1.0];

export function startAnalysisWorker(run_id: string) {
  if (timers.has(run_id)) return;

  const tick = () => {
    const run = findRun(run_id);
    if (!run) {
      stopAnalysisWorker(run_id);
      return;
    }
    if (run.status === "cancelled" || run.status === "failed" || run.status === "succeeded") {
      stopAnalysisWorker(run_id);
      return;
    }

    if (run.status === "pending") {
      updateRun(run_id, { status: "running" });
    }

    // 한 틱마다 expected_responses의 ~3%씩 응답을 모았다고 가정.
    const inc = Math.max(20, Math.floor(run.expected_responses * 0.03));
    const next = Math.min(run.expected_responses, run.total_responses_collected + inc);
    const percent = next / run.expected_responses;

    // step 진행
    let current_step = run.current_step;
    for (let i = STEP_THRESHOLDS.length - 1; i >= 0; i--) {
      if (percent >= STEP_THRESHOLDS[i]) {
        current_step = i;
        break;
      }
    }

    if (next >= run.expected_responses) {
      const scored = computeMockScores(run.brand_id);
      updateRun(run_id, {
        total_responses_collected: next,
        current_step: 6,
        ...scored,
        status: "succeeded",
        completed_at: new Date().toISOString(),
      });
      stopAnalysisWorker(run_id);
    } else {
      updateRun(run_id, {
        total_responses_collected: next,
        current_step,
      });
    }
  };

  // 1.5초마다 진행 — 1500 응답 기준 약 1.5분 시뮬레이션
  const t = setInterval(tick, 1500);
  timers.set(run_id, t);
}

export function stopAnalysisWorker(run_id: string) {
  const t = timers.get(run_id);
  if (t) {
    clearInterval(t);
    timers.delete(run_id);
  }
}

function computeMockScores(brand_id: string) {
  const brand = findBrand(brand_id);
  const desiredKeywords = (brand?.desired_image ?? "")
    .split(/[,\s]+/)
    .filter(Boolean);
  const competitorCount = listCompetitors(brand_id).length;

  const visibility = clamp(35 + Math.random() * 55, 0, 100);
  const ranking = clamp(40 + Math.random() * 50, 0, 100);
  const stability = clamp(60 + Math.random() * 35, 0, 100);
  const image_match = clamp(
    desiredKeywords.length ? 30 + Math.random() * 55 : 25,
    0,
    100
  );
  const accuracy = clamp(70 + Math.random() * 28, 0, 100);
  const competitor_pressure = clamp(
    60 - competitorCount * 5 + Math.random() * 35,
    0,
    100
  );

  const total =
    visibility * 0.25 +
    ranking * 0.2 +
    stability * 0.15 +
    image_match * 0.2 +
    accuracy * 0.1 +
    competitor_pressure * 0.1;

  return {
    visibility_score: round1(visibility),
    ranking_score: round1(ranking),
    stability_score: round1(stability),
    image_match_score: round1(image_match),
    accuracy_score: round1(accuracy),
    competitor_pressure_score: round1(competitor_pressure),
    total_score: round1(total),
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
