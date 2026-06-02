"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Store = {
  id: string;
  name: string;
  branch: string;
  distance_m: number;
  scores: {
    atmosphere: number;
    menu: number;
    price: number;
    service: number;
    location: number;
    cleanliness: number;
  };
  total: number;
  status: "영업중" | "곧 영업종료" | "영업종료";
};

type Recommendation = {
  id: string;
  name: string;
  category: string;
  distance_m: number;
  reason: string;
};

// 데모 데이터 생성 — 실제로는 Naver Local Search + LLM 응답으로 대체된다.
function mockStores(query: string): Store[] {
  const brand = query || "스타벅스";
  const branches = [
    "강남대로점",
    "역삼역점",
    "선릉역점",
    "강남파이낸스점",
    "교보타워점",
  ];
  return branches.map((b, i) => {
    const seed = (brand.length + i * 7) % 13;
    const base = 88 - i * 4 - (seed % 3);
    const jitter = (k: number) => Math.max(55, Math.min(98, base + ((seed * k) % 12) - 5));
    const scores = {
      atmosphere: jitter(2),
      menu: jitter(3),
      price: jitter(5) - 8,
      service: jitter(7),
      location: jitter(11) + 4,
      cleanliness: jitter(13),
    };
    const total =
      Math.round(
        (scores.atmosphere * 0.2 +
          scores.menu * 0.2 +
          scores.price * 0.15 +
          scores.service * 0.2 +
          scores.location * 0.15 +
          scores.cleanliness * 0.1) *
          10
      ) / 10;
    return {
      id: `s${i}`,
      name: brand,
      branch: b,
      distance_m: 80 + i * 130 + (seed % 50),
      scores,
      total,
      status: i === 4 ? "곧 영업종료" : "영업중",
    } as Store;
  });
}

function mockRecommendations(query: string): Recommendation[] {
  // 카테고리 추론(매우 단순) — 실제로는 LLM이 매장 카테고리 보고 골라준다
  const isCoffee = /(스타벅스|투썸|이디야|커피|카페|할리스|메가|컴포즈)/.test(query);
  if (isCoffee) {
    return [
      {
        id: "r1",
        name: "블루보틀 강남",
        category: "스페셜티 카페",
        distance_m: 380,
        reason: "원두 퀄리티와 분위기 모두 인근 1티어. 작업하기 좋은 좌석 배치.",
      },
      {
        id: "r2",
        name: "프릳츠 강남점",
        category: "스페셜티 카페",
        distance_m: 520,
        reason: "디저트가 강점. 검색하신 매장보다 메뉴 다양성 점수가 12점 높음.",
      },
      {
        id: "r3",
        name: "온더보더 강남",
        category: "멕시칸 레스토랑",
        distance_m: 240,
        reason: "카페 다음 식사 옵션. 점심 시간 대기 짧고 가성비 평가 높음.",
      },
      {
        id: "r4",
        name: "스시조 강남",
        category: "일식 / 스시",
        distance_m: 460,
        reason: "오마카세 입문자에게 자주 추천되는 곳. AI 응답 빈도 상위 5%.",
      },
    ];
  }
  return [
    {
      id: "r1",
      name: "도산공원 비스트로",
      category: "양식 / 와인바",
      distance_m: 410,
      reason: "유사한 톤의 매장 중 분위기 점수 최상위. 디너 예약 권장.",
    },
    {
      id: "r2",
      name: "한남동 면옥",
      category: "한식 / 면 요리",
      distance_m: 620,
      reason: "검색하신 매장과 가격대 비슷, 서비스 점수 +9 높음.",
    },
    {
      id: "r3",
      name: "이태원 라멘노미세",
      category: "일식 / 라멘",
      distance_m: 540,
      reason: "혼밥 친화적이고 점심 회전이 빠름. AI 추천 빈도 상위 10%.",
    },
    {
      id: "r4",
      name: "성수동 베이커리 카페",
      category: "베이커리 카페",
      distance_m: 1100,
      reason: "디저트·커피 모두 균형. 식사 후 코스로 자주 함께 추천됨.",
    },
  ];
}

function mockEvaluation(query: string, store: Store): string[] {
  const brand = store.name;
  return [
    `${brand} ${store.branch}은(는) AI가 ${query} 키워드 응답 중 인근 5개 매장 가운데 총점 ${store.total}점으로 가장 높게 평가했습니다. 위치 접근성과 메뉴 다양성이 강점으로 자주 언급되며, 가격대는 인근 평균 대비 살짝 부담된다는 평이 반복됩니다.`,
    `분위기 측면에서는 좌석 간격과 조명 톤에 대한 긍정 응답이 다수입니다. 다만 평일 점심·저녁 피크 타임 혼잡도가 단점으로 지적되며, AI 응답 12건 중 4건이 "조용히 작업하기는 어렵다"는 코멘트를 남겼습니다.`,
    `메뉴 평가는 시즌 한정 음료의 회전이 빠르다는 점에서 호평을 받았습니다. 추천 메뉴는 "돌체 라떼"와 "콜드브루 플로트"로, 응답 빈도 상위 2개 항목입니다. 가격대 점수가 65점으로 다른 항목 대비 낮으며, 인근 동일 카테고리 매장 평균(72점)을 밑돕니다.`,
    `서비스는 직원 응대에 대한 긍정 응답이 84점으로 양호한 편이지만, 주문 대기 시간이 길다는 응답이 일부 있어 피크 타임 인력 보강이 개선 포인트로 제시됩니다.`,
  ];
}

const SCORE_LABELS: Record<keyof Store["scores"], string> = {
  atmosphere: "분위기",
  menu: "메뉴",
  price: "가격",
  service: "서비스",
  location: "위치",
  cleanliness: "청결도",
};

export function SearchClient({ query }: { query: string }) {
  const router = useRouter();
  const [q, setQ] = useState(query);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locLabel, setLocLabel] = useState<string>("위치 확인 중...");

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocLabel("위치 권한을 사용할 수 없습니다 (강남 기준 표시)");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLabel(`내 위치 (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
      },
      () => setLocLabel("위치 권한 거절됨 — 강남 기준으로 표시"),
      { timeout: 4000 }
    );
  }, []);

  const stores = useMemo(() => mockStores(query), [query]);
  const recs = useMemo(() => mockRecommendations(query), [query]);
  const [selectedId, setSelectedId] = useState<string>(stores[0]?.id ?? "");
  const selected = stores.find((s) => s.id === selectedId) ?? stores[0];
  const evalLines = useMemo(() => (selected ? mockEvaluation(query, selected) : []), [query, selected]);
  const sorted = [...stores].sort((a, b) => b.total - a.total);
  const selectedRank = sorted.findIndex((s) => s.id === selected?.id) + 1;

  function submit(value: string) {
    const v = value.trim();
    if (!v) return;
    router.push(`/search?q=${encodeURIComponent(v)}`);
  }

  if (!query) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold text-ink">검색어를 입력하세요</h1>
        <p className="mt-2 text-sm text-ink-muted">예: 스타벅스, 투썸플레이스, 맥도날드</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(q);
          }}
          className="mt-6 flex items-center gap-2 rounded-2xl border border-canvas-border bg-white px-4 py-3 shadow-card focus-within:border-ink"
        >
          <input
            className="flex-1 bg-transparent text-base focus:outline-none"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="브랜드명"
          />
          <button type="submit" className="btn-primary">
            검색
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="mb-2 flex items-center gap-2 rounded-2xl border border-canvas-border bg-white px-4 py-3 shadow-card focus-within:border-ink"
      >
        <input
          className="flex-1 bg-transparent text-base focus:outline-none"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          다시 검색
        </button>
      </form>
      <p className="mb-8 inline-flex items-center gap-2 rounded-full border border-canvas-border bg-white px-3 py-1 text-xs text-ink-muted">
        <span>📍</span>
        {locLabel}
      </p>

      <div className="rounded-md border border-warning/40 bg-warning/5 px-4 py-2.5 text-xs text-warning mb-8">
        ⚠ 데모 데이터입니다. 실제 매장 검색·평가는 Naver Local Search + LLM API 키 연결 후 활성화됩니다.
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr] mb-10">
        <div className="card overflow-hidden">
          <div className="border-b border-canvas-border bg-canvas px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-medium text-ink">
              근처 <span className="text-ink-muted">"{query}"</span> 검색 결과 · {stores.length}건
            </div>
            <span className="chip">Naver Map · 연결 예정</span>
          </div>
          <div
            className="relative h-[360px] bg-canvas"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          >
            <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-success shadow-pop" />
            <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-success/40 bg-success/10" />
            {stores.map((s, i) => {
              const angles = [40, 110, 180, 250, 320];
              const r = 90 + i * 14;
              const a = (angles[i] * Math.PI) / 180;
              const x = 50 + (Math.cos(a) * r) / 6;
              const y = 50 + (Math.sin(a) * r) / 6;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 px-2 py-0.5 text-[10px] font-semibold shadow-card transition ${
                    s.id === selected?.id
                      ? "border-ink bg-ink text-white"
                      : "border-white bg-white text-ink"
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {i + 1}
                </button>
              );
            })}
            <div className="absolute bottom-3 left-3 text-[10px] text-ink-subtle">
              📍 현재 위치 · 반경 ~1km
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {stores.map((s, i) => {
            const active = s.id === selected?.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`group flex items-start gap-3 rounded-xl border bg-white p-3 text-left transition ${
                  active ? "border-ink shadow-card" : "border-canvas-border hover:border-ink/60"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    active ? "bg-ink text-white" : "bg-canvas text-ink-muted"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-ink">
                      {s.name} <span className="font-normal text-ink-muted">{s.branch}</span>
                    </div>
                    <div className="shrink-0 text-xs font-bold text-ink">{s.total}</div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-subtle">
                    <span>{s.distance_m}m</span>
                    <span>·</span>
                    <span className={s.status === "영업중" ? "text-success" : "text-warning"}>
                      ● {s.status}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selected && (
        <section className="card mb-10 p-6">
          <div className="mb-1 text-xs font-semibold tracking-wider text-ink-subtle">
            AI 종합 평가 · 인근 매장 {selectedRank}위 / {stores.length}
          </div>
          <h2 className="text-2xl font-bold text-ink">
            {selected.name} <span className="text-ink-muted">{selected.branch}</span>
          </h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-ink-muted">
            <span>총점</span>
            <span className="text-2xl font-bold text-ink">{selected.total}</span>
            <span className="text-ink-subtle">/100</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(Object.keys(selected.scores) as (keyof Store["scores"])[]).map((k) => (
              <div key={k} className="rounded-lg border border-canvas-border bg-canvas px-3 py-2.5">
                <div className="text-[10px] font-semibold tracking-wider text-ink-subtle">
                  {SCORE_LABELS[k]}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-ink">{selected.scores[k]}</span>
                  <span className="text-[10px] text-ink-subtle">/100</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-canvas-border">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: `${selected.scores[k]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink-muted">
            {evalLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </section>
      )}

      <section className="card mb-10 p-6">
        <div className="mb-1 text-xs font-semibold tracking-wider text-ink-subtle">
          RANKING · 인근 5개 매장 비교
        </div>
        <h2 className="mb-5 text-lg font-bold text-ink">
          근처 매장과의 순위 비교
        </h2>
        <div className="space-y-3">
          {sorted.map((s, i) => {
            const isSelected = s.id === selected?.id;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-ink text-white" : "bg-canvas text-ink-muted"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="w-44 shrink-0 truncate text-sm">
                  <span className="font-medium text-ink">{s.name}</span>{" "}
                  <span className="text-ink-muted">{s.branch}</span>
                  {isSelected && (
                    <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">
                      검색 매장
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-canvas">
                    <div
                      className={`h-full rounded-full ${isSelected ? "bg-ink" : "bg-ink-subtle/60"}`}
                      style={{ width: `${s.total}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 shrink-0 text-right text-sm font-bold text-ink">{s.total}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-1 text-xs font-semibold tracking-wider text-ink-subtle">
          AI RECOMMENDATIONS · 근처에서 함께 가볼 만한 곳
        </div>
        <h2 className="mb-5 text-lg font-bold text-ink">AI 추천 매장</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recs.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="chip">{r.category}</span>
                <span className="text-[10px] text-ink-subtle">{r.distance_m}m</span>
              </div>
              <h3 className="text-sm font-semibold text-ink">{r.name}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{r.reason}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
