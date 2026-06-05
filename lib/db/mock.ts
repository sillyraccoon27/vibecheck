// 메모리 기반 mock store. Supabase 키가 없으면 자동으로 사용된다.
// Next.js dev server에서 HMR 시 모듈이 다시 평가될 수 있으므로 globalThis에 매단다.

import type {
  AnalysisRun,
  Brand,
  BrandLink,
  Competitor,
  Subscription,
  User,
} from "../types";

type Store = {
  users: Map<string, User>;
  subscriptions: Map<string, Subscription>;
  brands: Map<string, Brand>;
  brandLinks: Map<string, BrandLink>;
  competitors: Map<string, Competitor>;
  analysisRuns: Map<string, AnalysisRun>;
  // user_id → 가장 최근 run_id (브랜드별)
  latestRunByBrand: Map<string, string>;
};

const g = globalThis as unknown as { __VIBECHECK_STORE__?: Store };

function freshStore(): Store {
  return {
    users: new Map(),
    subscriptions: new Map(),
    brands: new Map(),
    brandLinks: new Map(),
    competitors: new Map(),
    analysisRuns: new Map(),
    latestRunByBrand: new Map(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function seed(_store: Store) {}

function buildSeededCompletedRun(brand_id: string, _desired_image: string): AnalysisRun {
  const now = new Date();
  const started = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const completed = new Date(now.getTime() - 1 * 60 * 1000).toISOString();
  const visibility = 30 + Math.random() * 60;
  const ranking = 40 + Math.random() * 50;
  const stability = 60 + Math.random() * 30;
  const image_match = 30 + Math.random() * 50;
  const accuracy = 70 + Math.random() * 30;
  const competitor_pressure = 40 + Math.random() * 50;
  const total =
    visibility * 0.25 +
    ranking * 0.2 +
    stability * 0.15 +
    image_match * 0.2 +
    accuracy * 0.1 +
    competitor_pressure * 0.1;
  return {
    run_id: uuid(),
    brand_id,
    status: "succeeded",
    total_questions_sampled: 500,
    total_responses_collected: 1500,
    expected_responses: 1500,
    visibility_score: round1(visibility),
    ranking_score: round1(ranking),
    stability_score: round1(stability),
    image_match_score: round1(image_match),
    accuracy_score: round1(accuracy),
    competitor_pressure_score: round1(competitor_pressure),
    total_score: round1(total),
    started_at: started,
    completed_at: completed,
    current_step: 6,
    steps: DEFAULT_STEPS,
  };
}

function buildSeededRunningRun(brand_id: string): AnalysisRun {
  const started = new Date().toISOString();
  return {
    run_id: uuid(),
    brand_id,
    status: "running",
    total_questions_sampled: 500,
    total_responses_collected: 820,
    expected_responses: 1500,
    visibility_score: null,
    ranking_score: null,
    stability_score: null,
    image_match_score: null,
    accuracy_score: null,
    competitor_pressure_score: null,
    total_score: null,
    started_at: started,
    completed_at: null,
    current_step: 3,
    steps: DEFAULT_STEPS,
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export const DEFAULT_STEPS = [
  "질문 풀 생성",
  "샘플링",
  "AI 응답 수집",
  "응답 분석",
  "점수 계산",
  "결과 저장",
];

export function getStore(): Store {
  if (!g.__VIBECHECK_STORE__) {
    const store = freshStore();
    seed(store);
    g.__VIBECHECK_STORE__ = store;
  }
  return g.__VIBECHECK_STORE__;
}
