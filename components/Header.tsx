import Link from "next/link";
import { Logo } from "./Logo";

export function Header({ userName }: { userName?: string | null }) {
  return (
    <header className="border-b border-canvas-border bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/brands" className="block">
          <Logo />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/brands" className="text-ink-muted hover:text-ink">
            도움말
          </Link>
          <Link href="/brands" className="text-ink-muted hover:text-ink">
            알림 받기
          </Link>
          {userName ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-canvas border border-canvas-border flex items-center justify-center text-xs font-medium text-ink-soft">
                {userName[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:block text-ink-soft">{userName}</span>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="text-xs text-ink-subtle hover:text-ink">
                  로그아웃
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="btn-primary">로그인</Link>
          )}
        </div>
      </div>
    </header>
  );
}
