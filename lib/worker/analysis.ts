// AI 분석 worker.
// 서버리스(Vercel)에서는 응답 반환 후 인스턴스가 정지되어 setInterval/백그라운드
// 타이머가 멈춘다. 그래서 타이머로 진행률을 올리지 않고, 폴링(GET)이 들어올 때마다
// started_at 이후 경과 시간을 기준으로 진행률을 전진시키는 방식으로 동작한다.

import { findRun, updateRun, findBrand, listCompetitors } from "../db";
import type { AnalysisRun } from "../types";

const STEP_THRESHOLDS = [0, 0.05, 0.1, 0.75, 0.85, 0.95, 1.0];

// 시뮬레이션 총 소요 시간(ms). expected_responses에 비례하되 6~20초로 제한.
function simDurationMs(expected: number): number {
  return Math.min(20000, Math.max(6000, expected * 8));
}

// 분석 시작 — 별도 타이머를 쓰지 않는다(진행은 advanceRun이 폴링 시 처리).
// 시그니처는 호출부 호환을 위해 유지.
export function startAnalysisWorker(_run_id: string) {
  /* no-op: 진행률은 advanceRun()이 폴링 시점에 계산한다 */
}

// 취소 시 호출되던 함수 — 타이머가 없으므로 no-op (호출부 호환 유지).
export function stopAnalysisWorker(_run_id: string) {
  /* no-op */
}

// 경과 시간 기준으로 run의 진행률을 전진시키고, 완료 시 점수를 계산한다.
// GET 핸들러에서 응답을 만들기 전에 호출한다.
export function advanceRun(run_id: string): AnalysisRun | null {
  const run = findRun(run_id);
  if (!run) return null;
  if (run.status === "succeeded" || run.status === "failed" || run.status === "cancelled") {
    return run;
  }

  const startedMs = new Date(run.started_at).getTime();
  const duration = simDurationMs(run.expected_responses);
  const elapsed = Number.isFinite(startedMs) ? Date.now() - startedMs : duration;
  const percent = Math.max(0, Math.min(1, elapsed / duration));

  if (percent >= 1) {
    const scored = computeMockScores(run.brand_id);
    return updateRun(run_id, {
      total_responses_collected: run.expected_responses,
      current_step: 6,
      ...scored,
      status: "succeeded",
      completed_at: new Date().toISOString(),
    });
  }

  let current_step = 0;
  for (let i = STEP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (percent >= STEP_THRESHOLDS[i]) {
      current_step = i;
      break;
    }
  }

  return updateRun(run_id, {
    status: "running",
    total_responses_collected: Math.floor(percent * run.expected_responses),
    current_step,
  });
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
