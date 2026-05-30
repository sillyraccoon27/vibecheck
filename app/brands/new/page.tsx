import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import { BrandWizard } from "./BrandWizard";

export const dynamic = "force-dynamic";

export default function NewBrandPage() {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen bg-canvas">
      <Header userName={user.name} />
      <BrandWizard />
    </div>
  );
}
