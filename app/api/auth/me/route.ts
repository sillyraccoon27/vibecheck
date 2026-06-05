import { getCurrentUser } from "@/lib/auth";
import { findUserByEmail, getActiveSubscription } from "@/lib/db/users";
import { errors, ok } from "@/lib/api-response";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();
  // 쿠키 세션에는 가입일이 없으므로 저장소에서 실제 레코드를 조회해 보강한다.
  const full = await findUserByEmail(user.email);
  const sub = await getActiveSubscription(user.user_id);
  return ok({
    user_id: user.user_id,
    email: user.email,
    name: user.name,
    created_at: full?.created_at ?? user.created_at,
    current_subscription: sub,
  });
}
