import { NextRequest } from "next/server";
import { findUserByEmail } from "@/lib/db/users";
import { errors, ok } from "@/lib/api-response";
import { setSession } from "@/lib/auth";

// 이메일이 가입돼 있고 비밀번호가 일치하면 로그인.
// 미가입 이메일은 회원가입으로 안내. (실제 비밀번호 검증은 Supabase Auth로 이관 예정)
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return errors.validation("JSON 본문이 필요합니다.");
  }
  const email = body.email?.trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return errors.validation("이메일과 비밀번호를 입력하세요.");
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return errors.validation("가입되지 않은 이메일입니다. 먼저 회원가입을 해주세요.");
  }
  if (user.password_hash !== password) {
    return errors.validation("비밀번호가 일치하지 않습니다.");
  }
  setSession({ user_id: user.user_id, email: user.email, name: user.name });
  return ok({
    user_id: user.user_id,
    email: user.email,
    name: user.name,
  });
}
