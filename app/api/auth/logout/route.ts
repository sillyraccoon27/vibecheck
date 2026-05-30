import { clearSession } from "@/lib/auth";
import { ok } from "@/lib/api-response";

export async function POST() {
  clearSession();
  return ok({ logged_out: true });
}
