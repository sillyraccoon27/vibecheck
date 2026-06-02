import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LandingMenu } from "../_components/LandingMenu";
import { SearchClient } from "./SearchClient";

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const user = getCurrentUser();
  const query = searchParams.q?.trim() ?? "";

  return (
    <main className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between border-b border-canvas-border bg-white px-6 py-4 sm:px-8">
        <LandingMenu />
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-canvas-border bg-white text-xs">
            ◆
          </span>
          Vibecheck
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/brands" className="btn-secondary">
                내 브랜드
              </Link>
              <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white sm:flex">
                {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase() ?? "U"}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                로그인
              </Link>
              <Link href="/signup" className="btn-primary">
                회원가입
              </Link>
            </>
          )}
        </div>
      </header>

      <SearchClient query={query} />
    </main>
  );
}
