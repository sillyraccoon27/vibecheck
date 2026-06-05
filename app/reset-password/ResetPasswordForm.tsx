"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error?.message || "변경 실패");
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
        ✓ 비밀번호가 변경되었습니다. 잠시 후 로그인 화면으로 이동합니다.
      </div>
    );
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
        <label className="label">새 비밀번호</label>
        <input
          type="password"
          required
          className="input"
          placeholder="4자 이상"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label className="label">새 비밀번호 확인</label>
        <input
          type="password"
          required
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && <div className="text-xs text-danger">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
