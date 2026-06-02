"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error?.message || "가입 실패");
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "가입 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label className="label">이름</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
      </div>
      <div>
        <label className="label">이메일</label>
        <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </div>
      <div>
        <label className="label">비밀번호</label>
        <input type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" />
      </div>
      <div>
        <label className="label">비밀번호 확인</label>
        <input type="password" className="input" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <div className="text-xs text-danger">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "가입 중..." : "가입하기"}
      </button>
    </form>
  );
}
