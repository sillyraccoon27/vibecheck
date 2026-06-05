-- Vibecheck 인증 영속화용 스키마
-- Supabase 프로젝트의 SQL Editor에 붙여넣어 실행하세요.
--
-- 이 앱은 회원가입/로그인/비밀번호 재설정만 Supabase에 저장합니다.
-- (브랜드/분석 데이터는 데모용 in-memory mock 스토어를 사용)
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

-- 서버에서 service_role 키로만 접근하므로 RLS를 켜고 정책은 두지 않는다.
-- (service_role 키는 RLS를 우회하므로 정상 동작하며, anon 키로는 접근 불가)
alter table public.users enable row level security;
