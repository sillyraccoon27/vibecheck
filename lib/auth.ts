// 쿠키 기반 세션. 형식: vc_session=<JSON {user_id,email,name}>
// 세션 쿠키에 식별 정보를 담아 getCurrentUser가 DB 조회 없이 동작하도록 한다.
// (서버리스 환경에서 mock 스토어가 초기화돼도 로그인 상태가 유지된다.)
// 실제 비밀번호 검증/영속화는 lib/db/users.ts(Supabase) 가 담당.

import { cookies } from "next/headers";
import type { User } from "./types";

export const SESSION_COOKIE = "vc_session";

type SessionPayload = { user_id: string; email: string; name: string };

export function getCurrentUser(): User | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<SessionPayload>;
    if (!s.user_id || !s.email) return null;
    return {
      user_id: s.user_id,
      email: s.email,
      name: s.name ?? s.email,
      created_at: "",
    };
  } catch {
    // 구버전 쿠키(plain user_id 문자열)는 무효화 → 재로그인 유도
    return null;
  }
}

export function setSession(user: { user_id: string; email: string; name: string }) {
  const payload: SessionPayload = {
    user_id: user.user_id,
    email: user.email,
    name: user.name,
  };
  cookies().set({
    name: SESSION_COOKIE,
    value: JSON.stringify(payload),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}
