// 사용자/인증 데이터 액세스 — 회원가입/로그인/비밀번호 재설정에서만 사용.
// Supabase가 설정돼 있으면 실제 테이블에 영속화하고, 아니면 in-memory mock 스토어를 쓴다.
// 데모 계정(demo@vibecheck.app)은 항상 mock 시드에서 제공된다.

import { uuid } from "../uuid";
import type { Subscription, User } from "../types";
import { getStore } from "./mock";
import { getSupabase, isSupabaseConfigured } from "./supabase";

// ───────── mock 구현 ─────────

function mockFindUserByEmail(email: string): User | null {
  const store = getStore();
  for (const user of store.users.values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) return user;
  }
  return null;
}

function mockCreateUser(input: { email: string; name: string; password_hash: string }): User {
  const store = getStore();
  const user: User = {
    user_id: uuid(),
    email: input.email,
    name: input.name,
    password_hash: input.password_hash,
    created_at: new Date().toISOString(),
  };
  store.users.set(user.user_id, user);

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

function mockGetActiveSubscription(user_id: string): Subscription | null {
  const store = getStore();
  for (const sub of store.subscriptions.values()) {
    if (sub.user_id === user_id && sub.status === "active") return sub;
  }
  return null;
}

function mockUpdatePassword(email: string, password_hash: string): boolean {
  const user = mockFindUserByEmail(email);
  if (!user) return false;
  user.password_hash = password_hash;
  return true;
}

// ───────── Supabase 구현 ─────────

type UserRow = {
  user_id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
};

function rowToUser(r: UserRow): User {
  return {
    user_id: r.user_id,
    email: r.email,
    name: r.name,
    password_hash: r.password_hash,
    created_at: r.created_at,
  };
}

async function sbFindUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToUser(data as UserRow) : null;
}

async function sbCreateUser(input: {
  email: string;
  name: string;
  password_hash: string;
}): Promise<User> {
  const row: UserRow = {
    user_id: uuid(),
    email: input.email,
    name: input.name,
    password_hash: input.password_hash,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await getSupabase()
    .from("users")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToUser(data as UserRow);
}

async function sbUpdatePassword(email: string, password_hash: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("users")
    .update({ password_hash })
    .eq("email", email)
    .select("user_id");
  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}

// ───────── 공개 API (라우트 핸들러에서 사용) ─────────

export async function findUserByEmail(email: string): Promise<User | null> {
  const lower = email.trim().toLowerCase();
  if (isSupabaseConfigured()) return sbFindUserByEmail(lower);
  return mockFindUserByEmail(lower);
}

export async function createUser(input: {
  email: string;
  name: string;
  password_hash: string;
}): Promise<User> {
  const normalized = { ...input, email: input.email.trim().toLowerCase() };
  if (isSupabaseConfigured()) return sbCreateUser(normalized);
  return mockCreateUser(normalized);
}

export async function getActiveSubscription(user_id: string): Promise<Subscription | null> {
  const m = mockGetActiveSubscription(user_id);
  if (m) return m;
  // Supabase 유저는 별도 구독 테이블 없이 기본 free 플랜으로 표시
  return {
    subscription_id: "free-default",
    user_id,
    plan_name: "free",
    status: "active",
    started_at: new Date().toISOString(),
    ended_at: null,
  };
}

export async function updateUserPassword(
  email: string,
  password_hash: string
): Promise<boolean> {
  const lower = email.trim().toLowerCase();
  if (isSupabaseConfigured()) return sbUpdatePassword(lower, password_hash);
  return mockUpdatePassword(lower, password_hash);
}
