import { NextRequest } from "next/server";
import { findUserByEmail, updateUserPassword } from "@/lib/db/users";
import { errors, ok } from "@/lib/api-response";

// 간이 비밀번호 재설정. 이메일 인증(토큰 메일) 없이 가입된 이메일 + 새 비밀번호로 즉시 변경한다.
// 데모용 흐름이며, 실서비스에서는 메일 토큰 검증 단계를 추가해야 한다.
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
    return errors.validation("이메일과 새 비밀번호를 입력하세요.");
  }
  if (password.length < 4) {
    return errors.validation("비밀번호는 4자 이상이어야 합니다.");
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return errors.validation("가입되지 않은 이메일입니다.");
  }

  const updated = await updateUserPassword(email, password);
  if (!updated) {
    return errors.business("RESET_FAILED", "비밀번호를 변경할 수 없는 계정입니다.");
  }

  return ok({ email: user.email });
}
