// 데이터 액세스 레이어 — Route Handler/UI는 이 모듈만 import.
// 현재는 in-memory mock 위에 동작. Supabase 키가 들어오면 supabase.ts 어댑터로 라우팅하도록 확장한다.

import { uuid } from "../uuid";
import type {
  AnalysisRun,
  Brand,
  BrandLink,
  Competitor,
  Subscription,
  User,
} from "../types";
import { DEFAULT_STEPS, getStore } from "./mock";
import { isSupabaseConfigured } from "./supabase";

export function backendKind(): "supabase" | "mock" {
  return isSupabaseConfigured() ? "supabase" : "mock";
}

// 현재는 두 경로 모두 mock store를 사용한다.
// Supabase 스키마/마이그레이션이 준비되면 backendKind() 분기 안에서 실제 쿼리로 교체한다.

// ───────── Users / Auth ─────────

export function findUserByEmail(email: string): User | null {
  const store = getStore();
  for (const user of store.users.values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) return user;
  }
  return null;
}

export function findUserById(user_id: string): User | null {
  return getStore().users.get(user_id) ?? null;
}

export function createUser(input: {
  email: string;
  name: string;
  password_hash: string;
}): User {
  const store = getStore();
  const user: User = {
    user_id: uuid(),
    email: input.email,
    name: input.name,
    password_hash: input.password_hash,
    created_at: new Date().toISOString(),
  };
  store.users.set(user.user_id, user);

  // free 플랜 자동 부여
  const sub: Subscription = {
    subscription_id: uuid(),
    user_id: user.user_id,
    plan_name: "free",
    status: "active",
    started_at: new Date().toISOString(),
    ended_at: null,
  };
  store.subscriptions.set(sub.subscription_id, sub);

  return user;
}

export function getActiveSubscription(user_id: string): Subscription | null {
  const store = getStore();
  for (const sub of store.subscriptions.values()) {
    if (sub.user_id === user_id && sub.status === "active") return sub;
  }
  return null;
}

// ───────── Brands ─────────

export function listBrandsByUser(user_id: string): Brand[] {
  const store = getStore();
  return Array.from(store.brands.values())
    .filter((b) => b.user_id === user_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function findBrand(brand_id: string): Brand | null {
  return getStore().brands.get(brand_id) ?? null;
}

export function createBrand(input: Omit<Brand, "brand_id" | "created_at" | "updated_at">): Brand {
  const now = new Date().toISOString();
  const brand: Brand = {
    ...input,
    brand_id: uuid(),
    created_at: now,
    updated_at: now,
  };
  getStore().brands.set(brand.brand_id, brand);
  return brand;
}

export function deleteBrand(brand_id: string): boolean {
  const store = getStore();
  if (!store.brands.has(brand_id)) return false;
  store.brands.delete(brand_id);
  // 하위 리소스 cascade
  for (const [id, link] of store.brandLinks) if (link.brand_id === brand_id) store.brandLinks.delete(id);
  for (const [id, c] of store.competitors) if (c.brand_id === brand_id) store.competitors.delete(id);
  for (const [id, r] of store.analysisRuns) if (r.brand_id === brand_id) store.analysisRuns.delete(id);
  store.latestRunByBrand.delete(brand_id);
  return true;
}

// ───────── BrandLinks ─────────

export function listBrandLinks(brand_id: string): BrandLink[] {
  return Array.from(getStore().brandLinks.values()).filter((l) => l.brand_id === brand_id);
}

export function createBrandLink(input: Omit<BrandLink, "link_id" | "created_at">): BrandLink {
  const link: BrandLink = {
    ...input,
    link_id: uuid(),
    created_at: new Date().toISOString(),
  };
  getStore().brandLinks.set(link.link_id, link);
  return link;
}

// ───────── Competitors ─────────

export function listCompetitors(brand_id: string): Competitor[] {
  return Array.from(getStore().competitors.values()).filter((c) => c.brand_id === brand_id);
}

export function createCompetitor(
  input: Omit<Competitor, "competitor_id" | "created_at">
): Competitor {
  const c: Competitor = {
    ...input,
    competitor_id: uuid(),
    created_at: new Date().toISOString(),
  };
  getStore().competitors.set(c.competitor_id, c);
  return c;
}

// ───────── Analysis Runs ─────────

export function findRun(run_id: string): AnalysisRun | null {
  return getStore().analysisRuns.get(run_id) ?? null;
}

export function findLatestRunForBrand(brand_id: string): AnalysisRun | null {
  const store = getStore();
  const id = store.latestRunByBrand.get(brand_id);
  return id ? store.analysisRuns.get(id) ?? null : null;
}

export function findActiveRunForBrand(brand_id: string): AnalysisRun | null {
  for (const r of getStore().analysisRuns.values()) {
    if (r.brand_id === brand_id && (r.status === "pending" || r.status === "running")) return r;
  }
  return null;
}

export function createRun(input: {
  brand_id: string;
  sample_size: number;
  repeat_count: number;
}): AnalysisRun {
  const now = new Date().toISOString();
  const run: AnalysisRun = {
    run_id: uuid(),
    brand_id: input.brand_id,
    status: "pending",
    total_questions_sampled: input.sample_size,
    total_responses_collected: 0,
    expected_responses: input.sample_size * input.repeat_count,
    visibility_score: null,
    ranking_score: null,
    stability_score: null,
    image_match_score: null,
    accuracy_score: null,
    competitor_pressure_score: null,
    total_score: null,
    started_at: now,
    completed_at: null,
    current_step: 0,
    steps: DEFAULT_STEPS,
  };
  const store = getStore();
  store.analysisRuns.set(run.run_id, run);
  store.latestRunByBrand.set(run.brand_id, run.run_id);
  return run;
}

export function updateRun(run_id: string, patch: Partial<AnalysisRun>): AnalysisRun | null {
  const store = getStore();
  const run = store.analysisRuns.get(run_id);
  if (!run) return null;
  Object.assign(run, patch);
  return run;
}
