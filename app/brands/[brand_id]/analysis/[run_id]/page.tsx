import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import { findBrand, findRun } from "@/lib/db";
import { AnalysisProgress } from "./AnalysisProgress";

export const dynamic = "force-dynamic";

export default function AnalysisProgressPage({
  params,
}: {
  params: { brand_id: string; run_id: string };
}) {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  const run = findRun(params.run_id);
  const brand = run ? findBrand(run.brand_id) : null;
  if (!run || !brand || brand.user_id !== user.user_id) redirect("/brands");

  return (
    <div className="min-h-screen bg-canvas">
      <Header userName={user.name} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between text-sm">
          <div className="text-ink-subtle">
            <span className="font-medium text-ink-soft">{brand.brand_name}</span>
            <span className="mx-2">·</span>분석 #{params.run_id.slice(0, 8)}
          </div>
        </div>
        <AnalysisProgress brand_id={brand.brand_id} run_id={run.run_id} />
      </main>
    </div>
  );
}
