import { NextRequest } from "next/server";
import { findUserByEmail, createUser } from "@/lib/db";
import { created, errors } from "@/lib/api-response";
import { setSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return errors.validation("JSON 본문이 필요합니다.");
  }
  const email = body.email?.trim();
  const name = body.name?.trim() ?? "";
  const password = body.password ?? "";
  if (!email || !name || !password) {
    return errors.validation("이름, 이메일, 비밀번호는 필수입니다.");
  }
  if (findUserByEmail(email)) {
    return errors.conflict("EMAIL_DUPLICATED", "이미 가입된 이메일입니다.");
  }
  const user = createUser({ email, name, password_hash: password });
  setSession(user.user_id);
  return created({
    user_id: user.user_id,
    email: user.email,
    name: user.name,
  });
}
