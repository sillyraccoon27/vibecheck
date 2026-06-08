// 데이터 액세스 레이어 — Route Handler/UI는 이 모듈만 import.
// Supabase 키가 있으면 Supabase에 영속화하고, 없으면 in-memory mock으로 동작한다.
// (서버리스에서 in-memory는 인스턴스 간 공유되지 않으므로 배포 시 Supabase 필요)
//
// 모든 함수는 async — 호출부는 await 해야 한다.

import { uuid } from "../uuid";
import type {
  AnalysisRun,
  Brand,
  BrandLink,
  Competitor,
} from "../types";
import { DEFAULT_STEPS, getStore } from "./mock";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export function backendKind(): "supabase" | "mock" {
  return isSupabaseConfigured() ? "supabase" : "mock";
}

const sb = () => getSupabase();

// numeric 컬럼은 드라이버에 따라 string으로 올 수 있어 정규화한다.
function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rowToRun(r: any): AnalysisRun {
  return {
    run_id: r.run_id,
    brand_id: r.brand_id,
    status: r.status,
    total_questions_sampled: r.total_questions_sampled ?? 0,
    total_responses_collected: r.total_responses_collected ?? 0,
    expected_responses: r.expected_responses ?? 0,
    visibility_score: num(r.visibility_score),
    ranking_score: num(r.ranking_score),
    stability_score: num(r.stability_score),
    image_match_score: num(r.image_match_score),
    accuracy_score: num(r.accuracy_score),
    competitor_pressure_score: num(r.competitor_pressure_score),
    total_score: num(r.total_score),
    started_at: r.started_at,
    completed_at: r.completed_at ?? null,
    current_step: r.current_step ?? 0,
    steps: Array.isArray(r.steps) ? r.steps : DEFAULT_STEPS,
  };
}

// ───────── Brands ─────────

export async function listBrandsByUser(user_id: string): Promise<Brand[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb()
      .from("brands")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Brand[];
  }
  const store = getStore();
  return Array.from(store.brands.values())
    .filter((b) => b.user_id === user_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function findBrand(brand_id: string): Promise<Brand | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb()
      .from("brands")
      .select("*")
      .eq("brand_id", brand_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Brand) ?? null;
  }
  return getStore().brands.get(brand_id) ?? null;
}

export async function createBrand(
  input: Omit<Brand, "brand_id" | "created_at" | "updated_at">
): Promise<Brand> {
  const now = new Date().toISOString();
  const brand: Brand = { ...input, brand_id: uuid(), created_at: now, updated_at: now };
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from("brands").insert(brand).select("*").single();
    if (error) throw new Error(error.message);
    return data as Brand;
  }
  getStore().brands.set(brand.brand_id, brand);
  return brand;
}

export async function deleteBrand(brand_id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    // 하위 테이블은 on delete cascade로 함께 삭제됨
    const { error } = await sb().from("brands").delete().eq("brand_id", brand_id);
    if (error) throw new Error(error.message);
    return true;
  }
  const store = getStore();
  if (!store.brands.has(brand_id)) return false;
  store.brands.delete(brand_id);
  for (const [id, link] of store.brandLinks) if (link.brand_id === brand_id) store.brandLinks.delete(id);
  for (const [id, c] of store.competitors) if (c.brand_id === brand_id) store.competitors.delete(id);
  for (const [id, r] of store.analysisRuns) if (r.brand_id === brand_id) store.analysisRuns.delete(id);
  store.latestRunByBrand.delete(brand_id);
  return true;
}

// ───────── BrandLinks ─────────

export async function listBrandLinks(brand_id: string): Promise<BrandLink[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from("brand_links").select("*").eq("brand_id", brand_id);
    if (error) throw new Error(error.message);
    return (data ?? []) as BrandLink[];
  }
  return Array.from(getStore().brandLinks.values()).filter((l) => l.brand_id === brand_id);
}

export async function createBrandLink(
  input: Omit<BrandLink, "link_id" | "created_at">
): Promise<BrandLink> {
  const link: BrandLink = { ...input, link_id: uuid(), created_at: new Date().toISOString() };
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from("brand_links").insert(link).select("*").single();
    if (error) throw new Error(error.message);
    return data as BrandLink;
  }
  getStore().brandLinks.set(link.link_id, link);
  return link;
}

// ───────── Competitors ─────────

export async function listCompetitors(brand_id: string): Promise<Competitor[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from("competitors").select("*").eq("brand_id", brand_id);
    if (error) throw new Error(error.message);
    return (data ?? []) as Competitor[];
  }
  return Array.from(getStore().competitors.values()).filter((c) => c.brand_id === brand_id);
}

export async function createCompetitor(
  input: Omit<Competitor, "competitor_id" | "created_at">
): Promise<Competitor> {
  const c: Competitor = { ...input, competitor_id: uuid(), created_at: new Date().toISOString() };
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from("competitors").insert(c).select("*").single();
    if (error) throw new Error(error.message);
    return data as Competitor;
  }
  getStore().competitors.set(c.competitor_id, c);
  return c;
}

// ───────── Analysis Runs ─────────

export async function findRun(run_id: string): Promise<AnalysisRun | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb()
      .from("analysis_runs")
      .select("*")
      .eq("run_id", run_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToRun(data) : null;
  }
  return getStore().analysisRuns.get(run_id) ?? null;
}

export async function findLatestRunForBrand(brand_id: string): Promise<AnalysisRun | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb()
      .from("analysis_runs")
      .select("*")
      .eq("brand_id", brand_id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToRun(data) : null;
  }
  const store = getStore();
  const id = store.latestRunByBrand.get(brand_id);
  return id ? store.analysisRuns.get(id) ?? null : null;
}

export async function findActiveRunForBrand(brand_id: string): Promise<AnalysisRun | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb()
      .from("analysis_runs")
      .select("*")
      .eq("brand_id", brand_id)
      .in("status", ["pending", "running"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToRun(data) : null;
  }
  for (const r of getStore().analysisRuns.values()) {
    if (r.brand_id === brand_id && (r.status === "pending" || r.status === "running")) return r;
  }
  return null;
}

export async function createRun(input: {
  brand_id: string;
  sample_size: number;
  repeat_count: number;
}): Promise<AnalysisRun> {
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
  if (isSupabaseConfigured()) {
    const { data, error } = await sb().from("analysis_runs").insert(run).select("*").single();
    if (error) throw new Error(error.message);
    return rowToRun(data);
  }
  const store = getStore();
  store.analysisRuns.set(run.run_id, run);
  store.latestRunByBrand.set(run.brand_id, run.run_id);
  return run;
}

export async function updateRun(
  run_id: string,
  patch: Partial<AnalysisRun>
): Promise<AnalysisRun | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await sb()
      .from("analysis_runs")
      .update(patch)
      .eq("run_id", run_id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToRun(data) : null;
  }
  const store = getStore();
  const run = store.analysisRuns.get(run_id);
  if (!run) return null;
  Object.assign(run, patch);
  return run;
}
