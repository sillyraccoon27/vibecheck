import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import { findBrand, findLatestRunForBrand, listBrandLinks, listCompetitors } from "@/lib/db";
import { StartAnalysisButton } from "./StartAnalysisButton";

export const dynamic = "force-dynamic";

export default async function BrandDetailPage({ params }: { params: { brand_id: string } }) {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  const brand = await findBrand(params.brand_id);
  if (!brand || brand.user_id !== user.user_id) redirect("/brands");

  const [links, competitors, latest] = await Promise.all([
    listBrandLinks(brand.brand_id),
    listCompetitors(brand.brand_id),
    findLatestRunForBrand(brand.brand_id),
  ]);

  return (
    <div className="min-h-screen bg-canvas">
      <Header userName={user.name} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/brands" className="text-sm text-ink-muted hover:text-ink">← 내 브랜드</Link>

        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink">{brand.brand_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <span className="chip">{brand.category}</span>
              <span className="chip">{brand.region}</span>
              {brand.target_customer && <span className="chip">타깃: {brand.target_customer}</span>}
            </div>
          </div>
          {latest && latest.status === "succeeded" ? (
            <Link href={`/brands/${brand.brand_id}/dashboard/${latest.run_id}`} className="btn-primary">
              대시보드 보기
            </Link>
          ) : latest && (latest.status === "running" || latest.status === "pending") ? (
            <Link href={`/brands/${brand.brand_id}/analysis/${latest.run_id}`} className="btn-primary">
              진행 상태 보기
            </Link>
          ) : (
            <StartAnalysisButton brand_id={brand.brand_id} />
          )}
        </div>

        {brand.description && (
          <p className="mt-4 text-sm text-ink-muted">{brand.description}</p>
        )}

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="card p-6">
            <h2 className="text-sm font-semibold text-ink">원하는 브랜드 이미지</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(brand.desired_image || "").split(/,/).map((k) => k.trim()).filter(Boolean).map((k) => (
                <span key={k} className="chip">{k}</span>
              ))}
              {!brand.desired_image && <span className="text-sm text-ink-subtle">지정 안 함</span>}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-sm font-semibold text-ink">브랜드 링크 ({links.length})</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {links.length === 0 && <li className="text-ink-subtle">등록된 링크가 없습니다.</li>}
              {links.map((l) => (
                <li key={l.link_id} className="flex items-center gap-2">
                  <span className="chip">{l.link_type}</span>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-ink truncate">
                    {l.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6 md:col-span-2">
            <h2 className="text-sm font-semibold text-ink">경쟁 브랜드 ({competitors.length})</h2>
            {competitors.length === 0 ? (
              <p className="mt-3 text-sm text-ink-subtle">등록된 경쟁사가 없습니다.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {competitors.map((c) => (
                  <li key={c.competitor_id} className="rounded-lg border border-canvas-border p-3">
                    <div className="text-sm font-medium text-ink">{c.competitor_name}</div>
                    <div className="text-xs text-ink-subtle">{c.category} · {c.region}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
