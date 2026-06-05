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

// 데모 시드는 제거됨. 빈 스토어로 시작하며 실제 데이터는 런타임에 생성된다.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function seed(_store: Store) {}

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
