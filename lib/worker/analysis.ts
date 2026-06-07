// AI 분석 워커
// Gemini: 질문 생성(20개×5회) → 답변 수집(10개×10회)
// Groq:   질문 생성(20개×5회) → 답변 수집(10개×10회)
// API 키가 없으면 mock 시뮬레이션으로 fallback

import { findRun, updateRun, findBrand } from "../db";
import { isGeminiConfigured, generateQuestions as geminiQ, getAnswers as geminiA } from "../ai/gemini";
import { isGroqConfigured, generateQuestions as groqQ, getAnswers as groqA } from "../ai/groq";

const QUESTION_BATCH = 20; // 한 번에 생성할 질문 수
const QUESTION_ROUNDS = 5; // 몇 번 생성할지 → 총 100개
const ANSWER_BATCH = 10;   // 한 번에 답변받을 질문 수

const STEPS = [
  "Gemini 질문 생성",
  "Groq 질문 생성",
  "Gemini 답변 수집",
  "Groq 답변 수집",
  "점수 계산",
  "결과 저장",
];

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

type QA = { question: string; answer: string };

function computeScores(
  brandName: string,
  desiredImage: string,
  geminiAnswers: QA[],
  groqAnswers: QA[]
) {
  const all = [...geminiAnswers, ...groqAnswers];
  const total = all.length || 1;
  const nameLower = brandName.toLowerCase();

  // 가시성: 브랜드가 언급된 응답 비율
  const mentioned = all.filter((r) => r.answer.toLowerCase().includes(nameLower));
  const visibility_score = clamp(round1((mentioned.length / total) * 100));

  // 순위: 언급 위치 (앞쪽 언급 = 높은 점수)
  const rankings = mentioned.map((r) => {
    const idx = r.answer.toLowerCase().indexOf(nameLower);
    return (1 - idx / r.answer.length) * 100;
  });
  const ranking_score = clamp(
    round1(rankings.length ? rankings.reduce((a, b) => a + b, 0) / rankings.length : 0)
  );

  // 안정성: Gemini와 Groq 언급률 차이가 적을수록 높음
  const gRate = geminiAnswers.length
    ? geminiAnswers.filter((r) => r.answer.toLowerCase().includes(nameLower)).length / geminiAnswers.length
    : 0;
  const lRate = groqAnswers.length
    ? groqAnswers.filter((r) => r.answer.toLowerCase().includes(nameLower)).length / groqAnswers.length
    : 0;
  const stability_score = clamp(round1((1 - Math.abs(gRate - lRate)) * 100));

  // 이미지 일치: desired_image 키워드가 응답에 등장하는 비율
  const desiredKws = desiredImage.split(/[,\s]+/).map((k) => k.trim().toLowerCase()).filter(Boolean);
  let image_match_score = 50;
  if (desiredKws.length > 0) {
    const kwHits = desiredKws.map(
      (kw) => all.filter((r) => r.answer.toLowerCase().includes(kw)).length
    );
    const avgHit = kwHits.reduce((a, b) => a + b, 0) / kwHits.length;
    image_match_score = clamp(round1((avgHit / total) * 100));
  }

  // 정확도: 브랜드 언급 시 일관성 (단순 추정)
  const accuracy_score = clamp(round1(mentioned.length > 0 ? 60 + (mentioned.length / total) * 35 : 30));

  // 경쟁 압력: 브랜드 미언급 응답 비율 (경쟁사가 대신 언급됨을 간접 측정)
  const competitor_pressure_score = clamp(round1(100 - (mentioned.length / total) * 60));

  const total_score = round1(
    visibility_score * 0.25 +
    ranking_score * 0.2 +
    stability_score * 0.15 +
    image_match_score * 0.2 +
    accuracy_score * 0.1 +
    competitor_pressure_score * 0.1
  );

  return {
    visibility_score,
    ranking_score,
    stability_score,
    image_match_score,
    accuracy_score,
    competitor_pressure_score,
    total_score,
  };
}

// ── 실제 AI 워커 ──────────────────────────────────────────────

async function runRealAnalysis(run_id: string) {
  const brand = findBrand(findRun(run_id)!.brand_id);
  if (!brand) throw new Error("브랜드를 찾을 수 없습니다.");

  let collected = 0;

  // Step 0: Gemini 질문 생성
  updateRun(run_id, { current_step: 0, steps: STEPS });
  const geminiQuestions: string[] = [];
  for (let i = 0; i < QUESTION_ROUNDS; i++) {
    const qs = await geminiQ(brand, QUESTION_BATCH);
    geminiQuestions.push(...qs);
    await delay(1200);
  }

  // Step 1: Groq 질문 생성
  updateRun(run_id, { current_step: 1 });
  const groqQuestions: string[] = [];
  for (let i = 0; i < QUESTION_ROUNDS; i++) {
    const qs = await groqQ(brand, QUESTION_BATCH);
    groqQuestions.push(...qs);
    await delay(600);
  }

  // Step 2: Gemini 답변 수집
  updateRun(run_id, { current_step: 2 });
  const geminiAnswers: QA[] = [];
  for (let i = 0; i < geminiQuestions.length; i += ANSWER_BATCH) {
    const batch = geminiQuestions.slice(i, i + ANSWER_BATCH);
    const answers = await geminiA(batch, brand);
    geminiAnswers.push(...answers);
    collected += answers.length;
    updateRun(run_id, { total_responses_collected: collected });
    await delay(1200);
  }

  // Step 3: Groq 답변 수집
  updateRun(run_id, { current_step: 3 });
  const groqAnswers: QA[] = [];
  for (let i = 0; i < groqQuestions.length; i += ANSWER_BATCH) {
    const batch = groqQuestions.slice(i, i + ANSWER_BATCH);
    const answers = await groqA(batch, brand);
    groqAnswers.push(...answers);
    collected += answers.length;
    updateRun(run_id, { total_responses_collected: collected });
    await delay(600);
  }

  // Step 4: 점수 계산
  updateRun(run_id, { current_step: 4 });
  const scores = computeScores(brand.brand_name, brand.desired_image, geminiAnswers, groqAnswers);

  // Step 5: 결과 저장
  updateRun(run_id, {
    current_step: 5,
    status: "succeeded",
    completed_at: new Date().toISOString(),
    total_responses_collected: collected,
    ...scores,
  });
}

// ── Mock 시뮬레이션 (API 키 없을 때) ─────────────────────────

const mockTimers = new Map<string, NodeJS.Timeout>();
const STEP_THRESHOLDS = [0, 0.05, 0.1, 0.5, 0.75, 0.9, 1.0];

function runMockSimulation(run_id: string) {
  if (mockTimers.has(run_id)) return;

  const tick = () => {
    const run = findRun(run_id);
    if (!run || ["cancelled", "failed", "succeeded"].includes(run.status)) {
      stopMock(run_id);
      return;
    }
    if (run.status === "pending") updateRun(run_id, { status: "running", steps: STEPS });

    const inc = Math.max(10, Math.floor(run.expected_responses * 0.03));
    const next = Math.min(run.expected_responses, run.total_responses_collected + inc);
    const pct = next / run.expected_responses;

    let current_step = run.current_step;
    for (let i = STEP_THRESHOLDS.length - 1; i >= 0; i--) {
      if (pct >= STEP_THRESHOLDS[i]) { current_step = i; break; }
    }

    if (next >= run.expected_responses) {
      const brand = findBrand(run.brand_id);
      const scores = computeScores(brand?.brand_name ?? "", brand?.desired_image ?? "", [], []);
      // mock 점수는 랜덤으로 덮어씀
      const mockScores = computeMockScores(run.brand_id);
      updateRun(run_id, {
        total_responses_collected: next,
        current_step: 5,
        ...mockScores,
        status: "succeeded",
        completed_at: new Date().toISOString(),
      });
      void scores; // suppress unused warning
      stopMock(run_id);
    } else {
      updateRun(run_id, { total_responses_collected: next, current_step });
    }
  };

  const t = setInterval(tick, 1500);
  mockTimers.set(run_id, t);
}

function stopMock(run_id: string) {
  const t = mockTimers.get(run_id);
  if (t) { clearInterval(t); mockTimers.delete(run_id); }
}

function computeMockScores(brand_id: string) {
  const brand = findBrand(brand_id);
  const desiredKws = (brand?.desired_image ?? "").split(/[,\s]+/).filter(Boolean);
  const visibility = clamp(35 + Math.random() * 55);
  const ranking = clamp(40 + Math.random() * 50);
  const stability = clamp(60 + Math.random() * 35);
  const image_match = clamp(desiredKws.length ? 30 + Math.random() * 55 : 25);
  const accuracy = clamp(70 + Math.random() * 28);
  const competitor_pressure = clamp(50 + Math.random() * 40);
  return {
    visibility_score: round1(visibility),
    ranking_score: round1(ranking),
    stability_score: round1(stability),
    image_match_score: round1(image_match),
    accuracy_score: round1(accuracy),
    competitor_pressure_score: round1(competitor_pressure),
    total_score: round1(
      visibility * 0.25 + ranking * 0.2 + stability * 0.15 +
      image_match * 0.2 + accuracy * 0.1 + competitor_pressure * 0.1
    ),
  };
}

// ── 공개 API ─────────────────────────────────────────────────

export function startAnalysisWorker(run_id: string) {
  const run = findRun(run_id);
  if (!run) return;

  updateRun(run_id, { status: "running", steps: STEPS, current_step: 0 });

  const useReal = isGeminiConfigured() && isGroqConfigured();

  if (useReal) {
    runRealAnalysis(run_id).catch((e) => {
      console.error("[analysis worker]", e);
      updateRun(run_id, { status: "failed", completed_at: new Date().toISOString() });
    });
  } else {
    console.warn("[analysis worker] API 키 없음 → mock 시뮬레이션 실행");
    runMockSimulation(run_id);
  }
}

export function stopAnalysisWorker(run_id: string) {
  stopMock(run_id);
}
