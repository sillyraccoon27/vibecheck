// 쿠키 기반 mock 세션. 형식: vc_session=<user_id>
// 실제로는 Supabase Auth의 access_token으로 대체된다.

import { cookies } from "next/headers";
import { findUserById } from "./db";
import type { User } from "./types";

export const SESSION_COOKIE = "vc_session";

export function getCurrentUser(): User | null {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  return findUserById(sid);
}

export function setSession(user_id: string) {
  cookies().set({
    name: SESSION_COOKIE,
    value: user_id,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}
