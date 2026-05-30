import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { BrandCard } from "@/components/BrandCard";
import { getCurrentUser } from "@/lib/auth";
import { listBrandsByUser, findLatestRunForBrand } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function BrandsPage() {
  const user = getCurrentUser();
  if (!user) redirect("/login");

  const brands = listBrandsByUser(user.user_id);
  const items = brands.map((b) => {
    const run = findLatestRunForBrand(b.brand_id);
    return {
      ...b,
      latest_run: run
        ? {
            run_id: run.run_id,
            status: run.status,
            total_score: run.total_score,
            completed_at: run.completed_at,
          }
        : null,
    };
  });

  return (
    <div className="min-h-screen bg-canvas">
      <Header userName={user.name} />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">내 브랜드</h1>
            <p className="mt-1 text-sm text-ink-muted">
              등록된 브랜드의 AI 노출과 인식 점수를 확인하세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input className="input w-72" placeholder="브랜드 검색…" />
            <Link href="/brands/new" className="btn-primary whitespace-nowrap">
              + 브랜드 등록
            </Link>
          </div>
        </div>

        <div className="mt-6 flex gap-3 border-b border-canvas-border">
          <Tab active>전체</Tab>
          <Tab>분석 완료</Tab>
          <Tab>진행 중</Tab>
          <div className="ml-auto pb-3 text-sm text-ink-subtle">최근 등록 순</div>
        </div>

        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => (
              <BrandCard key={b.brand_id} brand={b} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Tab({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`pb-3 text-sm font-medium ${
        active
          ? "border-b-2 border-ink text-ink"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 card flex flex-col items-center justify-center py-20 text-center">
      <div className="h-20 w-28 rounded-xl bg-canvas border border-canvas-border flex items-center justify-center text-ink-subtle">
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect x="2" y="2" width="44" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
          <circle cx="14" cy="16" r="3" fill="currentColor" />
          <circle cx="24" cy="16" r="3" fill="currentColor" opacity="0.5" />
          <circle cx="34" cy="16" r="3" fill="currentColor" opacity="0.25" />
        </svg>
      </div>
      <h2 className="mt-6 text-xl font-bold text-ink">아직 등록된 브랜드가 없어요</h2>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        첫 브랜드를 등록하고 AI가 이 브랜드를 어떻게 인식하고 있는지, 어떤 단어로 설명하는지 확인해보세요.
      </p>
      <Link href="/brands/new" className="btn-primary mt-6">
        + 첫 브랜드 등록하기
      </Link>
      <ul className="mt-10 grid grid-cols-3 gap-8 text-xs text-ink-subtle">
        <li className="text-center"><div className="font-medium text-ink-soft">1. 정보 입력하기</div></li>
        <li className="text-center"><div className="font-medium text-ink-soft">2. 자동 분석 실행</div></li>
        <li className="text-center"><div className="font-medium text-ink-soft">3. 점수 보기</div></li>
      </ul>
    </div>
  );
}
