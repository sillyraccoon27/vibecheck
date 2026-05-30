import { getCurrentUser } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/db";
import { errors, ok } from "@/lib/api-response";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();
  const sub = getActiveSubscription(user.user_id);
  return ok({
    user_id: user.user_id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
    current_subscription: sub,
  });
}
