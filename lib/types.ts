// 도메인 타입 — API 명세 v2 기준 (snake_case)

export type Uuid = string;

export type SubscriptionPlan = "free" | "pro" | "business";

export interface User {
  user_id: Uuid;
  email: string;
  name: string;
  password_hash?: string;
  created_at: string;
}

export interface Subscription {
  subscription_id: Uuid;
  user_id: Uuid;
  plan_name: SubscriptionPlan;
  status: "active" | "expired" | "cancelled";
  started_at: string;
  ended_at: string | null;
}

export interface Brand {
  brand_id: Uuid;
  user_id: Uuid;
  brand_name: string;
  category: string;
  region: string;
  description: string;
  desired_image: string;
  target_customer: string;
  created_at: string;
  updated_at: string;
}

export type BrandLinkType =
  | "website"
  | "instagram"
  | "naver_place"
  | "google_map"
  | "youtube"
  | "other";

export interface BrandLink {
  link_id: Uuid;
  brand_id: Uuid;
  link_type: BrandLinkType;
  url: string;
  created_at: string;
}

export interface Competitor {
  competitor_id: Uuid;
  brand_id: Uuid;
  competitor_name: string;
  category: string;
  region: string;
  url: string;
  created_at: string;
}

export type RunStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface AnalysisRun {
  run_id: Uuid;
  brand_id: Uuid;
  status: RunStatus;
  total_questions_sampled: number;
  total_responses_collected: number;
  expected_responses: number;
  visibility_score: number | null;
  ranking_score: number | null;
  stability_score: number | null;
  image_match_score: number | null;
  accuracy_score: number | null;
  competitor_pressure_score: number | null;
  total_score: number | null;
  started_at: string;
  completed_at: string | null;
  // worker step tracking (UI용)
  current_step: number;
  steps: string[];
}

export interface DashboardData {
  run_id: Uuid;
  brand_id: Uuid;
  scores: {
    visibility_score: number;
    ranking_score: number;
    stability_score: number;
    image_match_score: number;
    accuracy_score: number;
    competitor_pressure_score: number;
    total_score: number;
  };
  by_category: { category: string; exposure_rate: number; avg_mention_rank: number }[];
  competitors: {
    top_co_mentioned: { competitor_name: string; co_mention_rate: number }[];
    outranking_us: { competitor_name: string; outrank_rate: number }[];
    our_weak_keywords: string[];
  };
  image: {
    desired: string[];
    perceived_by_ai: string[];
    match_score: number;
    gap_keywords: string[];
  };
  accuracy: {
    score: number;
    mismatches: { fact_type: string; official_value: string; ai_value: string; severity: string }[];
    missing: string[];
  };
  confidence: {
    reliability_label: "high" | "medium" | "low";
    avg_confidence_score: number;
    unstable_categories: string[];
  };
  trend: {
    previous_run_id: Uuid | null;
    visibility_score_delta: number;
    ranking_score_delta: number;
    total_score_delta: number;
    new_competitors: string[];
    lost_keywords: string[];
    gained_keywords: string[];
  };
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;
