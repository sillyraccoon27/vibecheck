// 메모리 기반 mock store. Supabase 키가 없으면 자동으로 사용된다.
// Next.js dev server에서 HMR 시 모듈이 다시 평가될 수 있으므로 globalThis에 매단다.

import { uuid } from "../uuid";
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

function seed(store: Store) {
  const now = new Date().toISOString();

  // 데모 유저 — 로그인 화면에서 "데모로 둘러보기" 버튼이 이 계정으로 들어간다.
  const demoUser: User = {
    user_id: "demo-user-id",
    email: "demo@vibecheck.app",
    name: "Demo User",
    password_hash: "demo",
    created_at: now,
  };
  store.users.set(demoUser.user_id, demoUser);

  const sub: Subscription = {
    subscription_id: uuid(),
    user_id: demoUser.user_id,
    plan_name: "pro",
    status: "active",
    started_at: now,
    ended_at: null,
  };
  store.subscriptions.set(sub.subscription_id, sub);

  // 데모 브랜드 6개 — 와이어프레임 home.pen 채우기용
  const seeds: Array<Partial<Brand> & { brand_name: string; category: string; region: string }> = [
    {
      brand_name: "베이직코스메틱",
      category: "cosmetics",
      region: "서울 강남",
      description: "감성적인 미니멀 화장품 브랜드",
      desired_image: "미니멀, 감성적인, 친환경, 고급스러운",
      target_customer: "20~30대 여성",
    },
    {
      brand_name: "코쿤브랜드",
      category: "interior",
      region: "서울 마포",
      description: "1인 가구를 위한 가구 브랜드",
      desired_image: "아늑한, 따뜻한, 합리적인, 모던한",
      target_customer: "1인 가구 20~40대",
    },
    {
      brand_name: "이로한",
      category: "food",
      region: "서울 종로",
      description: "건강한 한식 도시락 브랜드",
      desired_image: "건강한, 정갈한, 한식, 신선한",
      target_customer: "직장인 30~50대",
    },
    {
      brand_name: "디저트하우스",
      category: "cafe",
      region: "서울 성수동",
      description: "수제 디저트 전문 카페",
      desired_image: "달콤한, 트렌디한, 인스타용, 디저트",
      target_customer: "20대 여성",
    },
    {
      brand_name: "그래픽랩",
      category: "saas",
      region: "온라인",
      description: "디자이너용 협업 툴",
      desired_image: "혁신적, 빠른, 직관적, 협업",
      target_customer: "디자이너, 스타트업",
    },
    {
      brand_name: "굿모홈",
      category: "interior",
      region: "서울 송파",
      description: "스마트홈 가전 브랜드",
      desired_image: "스마트, 편리한, 미래적, 신뢰",
      target_customer: "30~40대 가정",
    },
  ];

  for (const s of seeds) {
    const brand_id = uuid();
    const brand: Brand = {
      brand_id,
      user_id: demoUser.user_id,
      brand_name: s.brand_name,
      category: s.category,
      region: s.region,
      description: s.description ?? "",
      desired_image: s.desired_image ?? "",
      target_customer: s.target_customer ?? "",
      created_at: now,
      updated_at: now,
    };
    store.brands.set(brand_id, brand);

    // 미리 완료된 분석 run 1건 (앞 5개만 — 마지막은 "분석 안 함" 상태)
    if (s.brand_name !== "굿모홈" && s.brand_name !== "디저트하우스") {
      const run = buildSeededCompletedRun(brand_id, s.desired_image ?? "");
      store.analysisRuns.set(run.run_id, run);
      store.latestRunByBrand.set(brand_id, run.run_id);
    } else if (s.brand_name === "디저트하우스") {
      // 진행 중인 run 하나
      const run = buildSeededRunningRun(brand_id);
      store.analysisRuns.set(run.run_id, run);
      store.latestRunByBrand.set(brand_id, run.run_id);
    }
  }
}

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
