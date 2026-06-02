"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = ["스타벅스", "투썸플레이스", "이디야", "맥도날드"];

export function LandingSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="flex items-center gap-2 rounded-2xl border border-canvas-border bg-white px-4 py-3 shadow-card focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="shrink-0 text-ink-subtle">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="브랜드명을 입력하세요"
          className="flex-1 bg-transparent text-base text-ink placeholder:text-ink-subtle focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-soft"
        >
          검색
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-ink-subtle">
        <span>예시:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQ(s);
              submit(s);
            }}
            className="rounded-full border border-canvas-border bg-white px-3 py-1 text-ink-muted transition hover:border-ink hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
