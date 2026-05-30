// Supabase 어댑터. NEXT_PUBLIC_SUPABASE_URL/ANON_KEY가 세팅돼 있어야 사용된다.
// 현재는 클라이언트 인스턴스만 잡아두고, 실제 쿼리는 mock.ts 시드 데이터로 fallback 한다.
// (Supabase 테이블/스키마가 준비되면 이 어댑터의 함수들을 채워서 mock 대신 사용한다.)

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  cached = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cached;
}
