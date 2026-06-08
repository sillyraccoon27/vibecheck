import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import { findBrand } from "@/lib/db";
import { AnalysisProgress } from "./AnalysisProgress";

export const dynamic = "force-dynamic";

export default async function AnalysisProgressPage({
  params,
}: {
  params: { brand_id: string; run_id: string };
}) {
  const user = getCurrentUser();
  if (!user) redirect("/login");

  // 브랜드 소유권만 서버에서 확인. run 진행 상태는 클라이언트 polling(AnalysisProgress)에서 처리한다.
  const brand = await findBrand(params.brand_id);
  if (brand && brand.user_id !== user.user_id) redirect("/brands");

  return (
    <div className="min-h-screen bg-canvas">
      <Header userName={user.name} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between text-sm">
          <div className="text-ink-subtle">
            <span className="font-medium text-ink-soft">{brand?.brand_name ?? "브랜드"}</span>
            <span className="mx-2">·</span>분석 #{params.run_id.slice(0, 8)}
          </div>
        </div>
        <AnalysisProgress brand_id={params.brand_id} run_id={params.run_id} />
      </main>
    </div>
  );
}
