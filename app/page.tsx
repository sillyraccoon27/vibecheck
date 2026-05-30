import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function HomePage() {
  const session = cookies().get("vc_session")?.value;
  if (session) {
    redirect("/brands");
  }
  redirect("/login");
}
