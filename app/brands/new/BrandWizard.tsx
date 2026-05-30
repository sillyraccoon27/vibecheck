"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Step1 = {
  brand_name: string;
  category: string;
  region: string;
  description: string;
  desired_image: string[];
  target_customer: string;
};
type Link = { link_type: string; url: string };
type Competitor = { competitor_name: string; category: string; region: string; url: string };

const CATEGORIES = ["cafe", "cosmetics", "interior", "food", "saas", "fashion", "other"];
const DESIRED_PRESETS = ["조용한", "감성적인", "혼자 가기 좋은", "트렌디한", "친환경", "프리미엄", "합리적인", "혁신적"];

export function BrandWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [s1, setS1] = useState<Step1>({
    brand_name: "",
    category: "",
    region: "",
    description: "",
    desired_image: [],
    target_customer: "",
  });
  const [links, setLinks] = useState<Link[]>([
    { link_type: "website", url: "" },
    { link_type: "instagram", url: "" },
    { link_type: "naver_place", url: "" },
  ]);
  const [competitors, setCompetitors] = useState<Competitor[]>([
    { competitor_name: "", category: "", region: "", url: "" },
    { competitor_name: "", category: "", region: "", url: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitAll() {
    setSubmitting(true);
    setError(null);
    try {
      // 1) 브랜드 생성
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...s1,
          desired_image: s1.desired_image.join(", "),
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error?.message ?? "등록 실패");
      const brand_id = j.data.brand_id;

      // 2) 링크 (있는 것만)
      for (const link of links) {
        if (link.url.trim()) {
          await fetch(`/api/brands/${brand_id}/links`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(link),
          });
        }
      }
      // 3) 경쟁자 (이름 있는 것만)
      for (const c of competitors) {
        if (c.competitor_name.trim()) {
          await fetch(`/api/brands/${brand_id}/competitors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(c),
          });
        }
      }
      // 4) 분석 실행 시작
      const runRes = await fetch(`/api/brands/${brand_id}/analysis-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_size: 500, repeat_count: 3 }),
      });
      const runJ = await runRes.json();
      if (!runJ.ok) throw new Error(runJ.error?.message ?? "분석 시작 실패");

      router.push(`/brands/${brand_id}/analysis/${runJ.data.run_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-10 lg:grid-cols-[260px_1fr]">
      <aside className="card p-5 self-start">
        <h3 className="text-sm font-semibold text-ink">브랜드를 등록하고 분석을 시작해보세요</h3>
        <ol className="mt-6 space-y-4">
          {[
            { n: 1, label: "기본 정보", sub: "브랜드의 핵심을 입력해요" },
            { n: 2, label: "브랜드 링크", sub: "Website, Instagram, Naver Place" },
            { n: 3, label: "경쟁 브랜드", sub: "비교할 브랜드를 추가해요" },
          ].map((it) => (
            <li key={it.n} className="flex gap-3">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step >= it.n ? "bg-ink text-white" : "bg-canvas border border-canvas-border text-ink-subtle"
              }`}>
                {it.n}
              </span>
              <div>
                <div className={`text-sm font-medium ${step === it.n ? "text-ink" : "text-ink-muted"}`}>{it.label}</div>
                <div className="text-xs text-ink-subtle">{it.sub}</div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8 rounded-lg bg-canvas border border-canvas-border p-3 text-xs text-ink-muted">
          모든 정보는 비공개로 저장되며 AI 분석에만 사용됩니다.
        </div>
      </aside>

      <section className="card p-8">
        {step === 1 && <Step1Form s1={s1} setS1={setS1} onNext={() => setStep(2)} />}
        {step === 2 && (
          <Step2Form
            links={links}
            setLinks={setLinks}
            onPrev={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3Form
            competitors={competitors}
            setCompetitors={setCompetitors}
            onPrev={() => setStep(2)}
            onSubmit={submitAll}
            submitting={submitting}
          />
        )}
        {error && <div className="mt-4 text-sm text-danger">{error}</div>}
      </section>
    </div>
  );
}

function Step1Form({
  s1,
  setS1,
  onNext,
}: {
  s1: Step1;
  setS1: (s: Step1) => void;
  onNext: () => void;
}) {
  const canNext = s1.brand_name.trim() && s1.category && s1.region.trim();
  function togglePreset(p: string) {
    setS1({
      ...s1,
      desired_image: s1.desired_image.includes(p)
        ? s1.desired_image.filter((x) => x !== p)
        : [...s1.desired_image, p],
    });
  }
  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">브랜드 기본 정보</h2>
      <p className="mt-1 text-sm text-ink-muted">AI 분석을 위한 정확한 브랜드 정보를 입력해 주세요.</p>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div>
          <label className="label">브랜드명</label>
          <input className="input" value={s1.brand_name} onChange={(e) => setS1({ ...s1, brand_name: e.target.value })} placeholder="예: 무드하우스 카페" />
        </div>
        <div>
          <label className="label">카테고리</label>
          <select className="input" value={s1.category} onChange={(e) => setS1({ ...s1, category: e.target.value })}>
            <option value="">카테고리 선택</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">지역</label>
          <input className="input" value={s1.region} onChange={(e) => setS1({ ...s1, region: e.target.value })} placeholder="서울 성수동" />
        </div>
        <div>
          <label className="label">타깃 고객</label>
          <input className="input" value={s1.target_customer} onChange={(e) => setS1({ ...s1, target_customer: e.target.value })} placeholder="혼자 작업하는 20~30대" />
        </div>
      </div>

      <div className="mt-4">
        <label className="label">브랜드 설명</label>
        <textarea className="input min-h-[80px]" value={s1.description} onChange={(e) => setS1({ ...s1, description: e.target.value })} placeholder="브랜드를 한 문장으로 소개해주세요." />
      </div>

      <div className="mt-4">
        <label className="label">원하는 브랜드 이미지 <span className="text-ink-subtle">(여러 개 선택)</span></label>
        <div className="flex flex-wrap gap-2">
          {DESIRED_PRESETS.map((p) => {
            const on = s1.desired_image.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePreset(p)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  on
                    ? "bg-ink text-white"
                    : "bg-canvas border border-canvas-border text-ink-muted hover:bg-white"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <button className="btn-primary" disabled={!canNext} onClick={onNext}>
          다음 단계로 →
        </button>
      </div>
    </div>
  );
}

function Step2Form({
  links,
  setLinks,
  onPrev,
  onNext,
}: {
  links: Link[];
  setLinks: (l: Link[]) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">브랜드 링크</h2>
      <p className="mt-1 text-sm text-ink-muted">분석 정확도를 높여주는 링크를 입력해주세요 (선택).</p>

      <div className="mt-8 space-y-3">
        {links.map((link, i) => (
          <div key={i} className="grid grid-cols-[160px_1fr_40px] gap-3">
            <select
              className="input"
              value={link.link_type}
              onChange={(e) => {
                const next = [...links];
                next[i] = { ...next[i], link_type: e.target.value };
                setLinks(next);
              }}
            >
              {["website", "instagram", "naver_place", "google_map", "youtube", "other"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              className="input"
              value={link.url}
              placeholder="https://"
              onChange={(e) => {
                const next = [...links];
                next[i] = { ...next[i], url: e.target.value };
                setLinks(next);
              }}
            />
            <button
              type="button"
              onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
              className="text-ink-subtle hover:text-danger"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLinks([...links, { link_type: "website", url: "" }])}
          className="btn-secondary w-full"
        >
          + 링크 추가
        </button>
      </div>

      <div className="mt-10 flex justify-between">
        <button className="btn-secondary" onClick={onPrev}>← 이전</button>
        <button className="btn-primary" onClick={onNext}>다음 단계로 →</button>
      </div>
    </div>
  );
}

function Step3Form({
  competitors,
  setCompetitors,
  onPrev,
  onSubmit,
  submitting,
}: {
  competitors: Competitor[];
  setCompetitors: (c: Competitor[]) => void;
  onPrev: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">경쟁 브랜드</h2>
      <p className="mt-1 text-sm text-ink-muted">비교 분석에 포함할 경쟁사를 추가해주세요 (선택).</p>

      <div className="mt-8 space-y-3">
        {competitors.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_40px] gap-3">
            <input className="input" placeholder="브랜드명" value={c.competitor_name} onChange={(e) => {
              const next = [...competitors]; next[i] = { ...next[i], competitor_name: e.target.value }; setCompetitors(next);
            }} />
            <input className="input" placeholder="카테고리" value={c.category} onChange={(e) => {
              const next = [...competitors]; next[i] = { ...next[i], category: e.target.value }; setCompetitors(next);
            }} />
            <input className="input" placeholder="지역" value={c.region} onChange={(e) => {
              const next = [...competitors]; next[i] = { ...next[i], region: e.target.value }; setCompetitors(next);
            }} />
            <input className="input" placeholder="URL" value={c.url} onChange={(e) => {
              const next = [...competitors]; next[i] = { ...next[i], url: e.target.value }; setCompetitors(next);
            }} />
            <button type="button" onClick={() => setCompetitors(competitors.filter((_, idx) => idx !== i))}
              className="text-ink-subtle hover:text-danger">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => setCompetitors([...competitors, { competitor_name: "", category: "", region: "", url: "" }])}
          className="btn-secondary w-full">+ 경쟁사 추가</button>
      </div>

      <div className="mt-6 rounded-lg bg-canvas border border-canvas-border p-3 text-sm text-ink-muted">
        💡 등록 직후 자동으로 분석이 시작됩니다. 약 1~2분 정도 소요됩니다.
      </div>

      <div className="mt-8 flex justify-between">
        <button className="btn-secondary" onClick={onPrev}>← 이전</button>
        <button className="btn-primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? "분석 시작 중..." : "분석 시작 →"}
        </button>
      </div>
    </div>
  );
}
