"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartAnalysisButton({ brand_id }: { brand_id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/${brand_id}/analysis-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_size: 500, repeat_count: 3 }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error?.message || "분석 시작 실패");
      router.push(`/brands/${brand_id}/analysis/${j.data.run_id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={start} disabled={loading} className="btn-primary">
      {loading ? "분석 시작 중..." : "분석 시작"}
    </button>
  );
}
