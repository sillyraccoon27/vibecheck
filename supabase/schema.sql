-- Vibecheck 영속화 스키마
-- Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.
--
-- 회원가입/로그인뿐 아니라 브랜드·분석 데이터까지 Supabase에 저장합니다.
-- (서버리스 환경에서 in-memory 스토어는 인스턴스 간 공유되지 않아 영속화 필요)
--
-- 비밀번호는 현재 평문으로 저장됩니다(데모 수준). 실서비스 전환 시
-- Supabase Auth 또는 서버측 해시(bcrypt/scrypt)로 교체하세요.

create table if not exists public.users (
  user_id       uuid primary key,
  email         text not null unique,
  name          text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- 이메일 조회 성능
create index if not exists users_email_idx on public.users (email);

-- ───────── 브랜드 ─────────
create table if not exists public.brands (
  brand_id        uuid primary key,
  user_id         uuid not null,
  brand_name      text not null,
  category        text not null,
  region          text not null,
  description     text not null default '',
  desired_image   text not null default '',
  target_customer text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists brands_user_idx on public.brands (user_id);

-- ───────── 브랜드 링크 ─────────
create table if not exists public.brand_links (
  link_id    uuid primary key,
  brand_id   uuid not null references public.brands(brand_id) on delete cascade,
  link_type  text not null,
  url        text not null,
  created_at timestamptz not null default now()
);
create index if not exists brand_links_brand_idx on public.brand_links (brand_id);

-- ───────── 경쟁사 ─────────
create table if not exists public.competitors (
  competitor_id   uuid primary key,
  brand_id        uuid not null references public.brands(brand_id) on delete cascade,
  competitor_name text not null,
  category        text not null default '',
  region          text not null default '',
  url             text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists competitors_brand_idx on public.competitors (brand_id);

-- ───────── 분석 실행 ─────────
create table if not exists public.analysis_runs (
  run_id                    uuid primary key,
  brand_id                  uuid not null references public.brands(brand_id) on delete cascade,
  status                    text not null default 'pending',
  total_questions_sampled   integer not null default 0,
  total_responses_collected integer not null default 0,
  expected_responses        integer not null default 0,
  visibility_score          numeric,
  ranking_score             numeric,
  stability_score           numeric,
  image_match_score         numeric,
  accuracy_score            numeric,
  competitor_pressure_score numeric,
  total_score               numeric,
  started_at                timestamptz not null default now(),
  completed_at              timestamptz,
  current_step              integer not null default 0,
  steps                     jsonb not null default '[]'::jsonb
);
create index if not exists analysis_runs_brand_idx on public.analysis_runs (brand_id);
create index if not exists analysis_runs_started_idx on public.analysis_runs (brand_id, started_at desc);

-- 서버에서 service_role 키로만 접근하므로 RLS를 켜고 정책은 두지 않는다.
-- (service_role 키는 RLS를 우회하므로 정상 동작하며, anon 키로는 접근 불가)
alter table public.users enable row level security;
alter table public.brands enable row level security;
alter table public.brand_links enable row level security;
alter table public.competitors enable row level security;
alter table public.analysis_runs enable row level security;
