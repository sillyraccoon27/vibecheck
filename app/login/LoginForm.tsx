"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error?.message || "로그인 실패");
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin() {
    setLoading(true);
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo@vibecheck.app", password: "demo" }),
      });
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label className="label">이메일</label>
        <input
          type="email"
          required
          className="input"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="label">
          비밀번호
          <span className="float-right text-xs font-normal text-ink-subtle hover:text-ink cursor-pointer">
            비밀번호 찾기
          </span>
        </label>
        <input
          type="password"
          required
          className="input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <div className="text-xs text-danger">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "로그인 중..." : "로그인"}
      </button>
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-canvas-border" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-canvas-card px-2 text-ink-subtle">or</span></div>
      </div>
      <button type="button" onClick={demoLogin} className="btn-secondary w-full">
        데모 계정으로 둘러보기
      </button>
    </form>
  );
}
