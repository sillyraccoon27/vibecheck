"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { label: string; href: string; desc?: string };

const ITEMS: Item[] = [
  { label: "내 브랜드", href: "/brands", desc: "등록된 브랜드 분석 보기" },
  { label: "새 브랜드 등록", href: "/brands/new", desc: "3단계 온보딩" },
  { label: "소개 / 사용방법", href: "/?guide=1", desc: "Vibecheck이 어떻게 동작하는지" },
  { label: "도움말", href: "/?help=1", desc: "FAQ · 문의하기" },
];

export function LandingMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 열기"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-canvas-border bg-white text-ink-soft transition hover:bg-canvas"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[320px] flex-col gap-2 border-r border-canvas-border bg-white p-6 shadow-pop">
            <div className="flex items-center justify-between pb-4">
              <span className="text-sm font-semibold tracking-wide text-ink-subtle">MENU</span>
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-canvas"
              >
                ×
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {ITEMS.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="group flex flex-col gap-0.5 rounded-lg px-3 py-3 transition hover:bg-canvas"
                >
                  <span className="text-sm font-medium text-ink">{it.label}</span>
                  {it.desc && <span className="text-xs text-ink-subtle">{it.desc}</span>}
                </Link>
              ))}
            </nav>
            <div className="mt-auto rounded-lg border border-canvas-border bg-canvas p-4 text-xs leading-relaxed text-ink-muted">
              둘러보기 모드에서는 샘플 분석 결과를 보여드려요.<br />
              실제 분석은 로그인 후 이용 가능합니다.
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
