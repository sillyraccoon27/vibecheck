import { NextRequest } from "next/server";
import { findUserByEmail, createUser } from "@/lib/db";
import { errors, ok } from "@/lib/api-response";
import { setSession } from "@/lib/auth";

// 데모 모드: 입력한 이메일이 존재하면 그 계정으로 로그인,
// 없으면 즉석에서 계정을 만들고 로그인시킨다. (실제 비밀번호 검증은 Supabase Auth로 이관 예정)
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return errors.validation("JSON 본문이 필요합니다.");
  }
  const email = body.email?.trim();
  const password = body.password ?? "";
  if (!email) return errors.validation("이메일을 입력하세요.");

  let user = findUserByEmail(email);
  if (!user) {
    user = createUser({
      email,
      name: email.split("@")[0],
      password_hash: password,
    });
  }
  setSession(user.user_id);
  return ok({
    user_id: user.user_id,
    email: user.email,
    name: user.name,
  });
}
