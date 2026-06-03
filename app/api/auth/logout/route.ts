import { clearSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function POST() {
  clearSession();
  redirect("/");
}
