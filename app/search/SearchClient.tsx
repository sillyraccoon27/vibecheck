"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NaverMap, hasNaverMapKey, type MapMarker } from "@/components/NaverMap";
import type { Place } from "@/app/api/places/search/route";
import {
  CUSTOM_REGION_ID,
  DEFAULT_REGION,
  REGIONS,
  REGION_STORAGE_KEY,
  findRegion,
  loadRegion,
  serializeRegion,
  type Region,
} from "@/lib/regions";

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
  // Naver Local Search 실데이터일 때만 채워지는 필드
  lat?: number;
  lng?: number;
  address?: string;
  category?: string;
  link?: string;
};

// Gemini 평가 결과 (서버 /api/places/evaluate 응답 항목)
type StoreEval = {
  id: string;
  scores: Store["scores"];
  total: number;
  details: string[];
};

type Recommendation = {
  id: string;
  name: string;
  category: string;
  distance_m: number;
  reason: string;
};

// AI 평가 점수는 아직 데모(결정론적 의사난수) — LLM 연동 시 대체된다.
function pseudoScores(seedText: string, rank: number) {
  const seed = (seedText.length + rank * 7) % 13;
  const base = 88 - rank * 4 - (seed % 3);
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
  return { seed, scores, total };
}

// 두 좌표 사이 거리(m) — 하버사인 공식
function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Naver Local Search 실데이터 → Store (평가 점수는 아직 데모)
function storesFromPlaces(places: Place[], region: Region): Store[] {
  return places.map((p, i) => {
    const { scores, total } = pseudoScores(p.title, i);
    // 매장명에서 브랜드/지점 분리 (첫 공백 기준, 예: "스타벅스 강남R점")
    const sp = p.title.indexOf(" ");
    const name = sp > 0 ? p.title.slice(0, sp) : p.title;
    const branch = sp > 0 ? p.title.slice(sp + 1) : "";
    return {
      id: p.id,
      name,
      branch,
      distance_m: distanceM(region, p),
      scores,
      total,
      status: "영업중" as const,
      lat: p.lat,
      lng: p.lng,
      address: p.road_address || p.address,
      category: p.category.split(">").pop() ?? "",
      link: p.link,
    };
  });
}

// 데모 데이터 생성 — 검색 API 키가 없을 때의 폴백.
function mockStores(query: string, region: Region): Store[] {
  const brand = query || "스타벅스";
  const branches = [
    `${region.short}역점`,
    `${region.short}중앙로점`,
    `${region.short}사거리점`,
    `${region.short}타워점`,
    `${region.short}1호점`,
  ];
  return branches.map((b, i) => {
    const { seed, scores, total } = pseudoScores(brand + region.short, i);
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

  // 사용자가 직접 설정한 기준 지역 — localStorage에 저장되어 유지된다.
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  useEffect(() => {
    setRegion(loadRegion(localStorage.getItem(REGION_STORAGE_KEY)));
  }, []);

  function changeRegion(id: string) {
    const r = findRegion(id);
    setRegion(r);
    localStorage.setItem(REGION_STORAGE_KEY, serializeRegion(r));
    setCustomOpen(false);
    setCustomStatus("idle");
  }

  // 직접 입력 지역 — 지역명을 Local Search로 조회해 좌표를 얻는다.
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customStatus, setCustomStatus] = useState<"idle" | "loading" | "error">("idle");

  async function applyCustomRegion() {
    const label = customText.trim();
    if (!label || customStatus === "loading") return;
    setCustomStatus("loading");
    try {
      const res = await fetch(`/api/places/search?query=${encodeURIComponent(label)}`);
      const body = await res.json();
      const places: Place[] =
        body?.ok && body.data?.source === "naver" ? body.data.places : [];
      if (places.length === 0) {
        setCustomStatus("error");
        return;
      }
      // 검색 결과 좌표의 평균을 지역 중심으로 사용
      const lat = places.reduce((s, p) => s + p.lat, 0) / places.length;
      const lng = places.reduce((s, p) => s + p.lng, 0) / places.length;
      const r: Region = { id: CUSTOM_REGION_ID, label, short: label, lat, lng };
      setRegion(r);
      localStorage.setItem(REGION_STORAGE_KEY, serializeRegion(r));
      setCustomOpen(false);
      setCustomText("");
      setCustomStatus("idle");
    } catch {
      setCustomStatus("error");
    }
  }

  // Naver Local Search 실데이터 — 키가 없거나 결과가 없으면 null 유지(데모 폴백)
  const [livePlaces, setLivePlaces] = useState<Place[] | null>(null);
  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const url = `/api/places/search?query=${encodeURIComponent(query)}&region=${encodeURIComponent(region.short)}`;
    fetch(url)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        const places: Place[] =
          body?.ok && body.data?.source === "naver" ? body.data.places : [];
        setLivePlaces(places.length > 0 ? places : null);
      })
      .catch(() => {
        if (!cancelled) setLivePlaces(null);
      });
    return () => {
      cancelled = true;
    };
  }, [query, region]);

  const isLive = livePlaces !== null;
  const baseStores = useMemo(
    () => (livePlaces ? storesFromPlaces(livePlaces, region) : mockStores(query, region)),
    [livePlaces, query, region]
  );

  // Gemini 평가 결과 (id → 평가). 키가 없거나 실패하면 비어 있어 데모 점수로 폴백한다.
  const [evals, setEvals] = useState<Record<string, StoreEval>>({});
  const [aiEvaluated, setAiEvaluated] = useState(false);
  useEffect(() => {
    if (baseStores.length === 0) {
      setEvals({});
      setAiEvaluated(false);
      return;
    }
    let cancelled = false;
    const payload = {
      query,
      stores: baseStores.map((s) => ({
        id: s.id,
        name: s.name,
        branch: s.branch,
        address: s.address ?? "",
        category: s.category ?? "",
      })),
    };
    fetch("/api/places/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (body?.ok && body.data?.source === "gemini") {
          const map: Record<string, StoreEval> = {};
          for (const e of body.data.evaluations as StoreEval[]) map[e.id] = e;
          setEvals(map);
          setAiEvaluated(true);
        } else {
          setEvals({});
          setAiEvaluated(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvals({});
          setAiEvaluated(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [baseStores, query]);

  // 실데이터 평가가 있으면 점수/총점을 덮어쓰고, 없으면 데모 점수를 그대로 둔다.
  const stores = useMemo(
    () =>
      baseStores.map((s) => {
        const e = evals[s.id];
        return e ? { ...s, scores: e.scores, total: e.total } : s;
      }),
    [baseStores, evals]
  );

  const recs = useMemo(() => mockRecommendations(query), [query]);
  const [selectedId, setSelectedId] = useState<string>(stores[0]?.id ?? "");
  const selected = stores.find((s) => s.id === selectedId) ?? stores[0];
  const evalLines = useMemo(() => {
    if (!selected) return [];
    const e = evals[selected.id];
    if (e && e.details.length > 0) return e.details;
    return mockEvaluation(query, selected);
  }, [query, selected, evals]);
  const sorted = [...stores].sort((a, b) => b.total - a.total);
  const selectedRank = sorted.findIndex((s) => s.id === selected?.id) + 1;

  // 매장 마커 좌표 — 실데이터면 실제 좌표, 데모면 기준 지역 주변에 결정론적으로 배치
  const markers = useMemo<MapMarker[]>(() => {
    const angles = [40, 110, 180, 250, 320];
    return stores.map((s, i) => {
      let lat = s.lat;
      let lng = s.lng;
      if (lat == null || lng == null) {
        const a = (angles[i % angles.length] * Math.PI) / 180;
        lat = region.lat + (Math.sin(a) * s.distance_m) / 111320;
        lng =
          region.lng +
          (Math.cos(a) * s.distance_m) /
            (111320 * Math.cos((region.lat * Math.PI) / 180));
      }
      return {
        id: s.id,
        lat,
        lng,
        label: String(i + 1),
        selected: s.id === selected?.id,
      };
    });
  }, [stores, region, selected?.id]);

  function submit(value: string) {
    const v = value.trim();
    if (!v) return;
    router.push(`/search?q=${encodeURIComponent(v)}`);
  }

  const regionSelector = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 rounded-full border border-canvas-border bg-white px-3 py-1.5 text-xs text-ink-muted shadow-card">
        <span>📍</span>
        <span className="font-medium text-ink">기준 지역</span>
        <select
          value={region.id}
          onChange={(e) => changeRegion(e.target.value)}
          className="cursor-pointer bg-transparent text-xs font-semibold text-ink focus:outline-none"
        >
          {region.id === CUSTOM_REGION_ID && (
            <option value={CUSTOM_REGION_ID}>{region.label}</option>
          )}
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => {
          setCustomOpen((v) => !v);
          setCustomStatus("idle");
        }}
        className="rounded-full border border-canvas-border bg-white px-3 py-1.5 text-xs font-medium text-ink-muted shadow-card transition hover:border-ink hover:text-ink"
      >
        직접 입력
      </button>
      {customOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyCustomRegion();
          }}
          className="inline-flex items-center gap-2 rounded-full border border-canvas-border bg-white px-3 py-1 text-xs shadow-card focus-within:border-ink"
        >
          <input
            autoFocus
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              setCustomStatus("idle");
            }}
            placeholder="동/역/지역명 (예: 안암동, 판교역)"
            className="w-44 bg-transparent py-0.5 focus:outline-none"
          />
          <button
            type="submit"
            disabled={customStatus === "loading"}
            className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {customStatus === "loading" ? "찾는 중…" : "설정"}
          </button>
        </form>
      )}
      {customOpen && customStatus === "error" && (
        <span className="text-xs text-warning">
          지역을 찾지 못했어요. 다른 이름으로 시도해 보세요.
        </span>
      )}
    </div>
  );

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
        <div className="mt-4 flex flex-col items-center gap-2">
          {regionSelector}
          <p className="text-xs text-ink-subtle">
            설정한 지역 주변의 매장을 검색합니다
          </p>
        </div>
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
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {regionSelector}
        <span className="text-xs text-ink-subtle">
          설정한 지역 주변으로 검색 결과를 보여드립니다
        </span>
      </div>

      {aiEvaluated ? (
        <div className="rounded-md border border-success/40 bg-success/5 px-4 py-2.5 text-xs text-success mb-8">
          ✓ 매장 정보는 네이버 검색, AI 평가 점수는 Gemini 실데이터입니다.
        </div>
      ) : isLive ? (
        <div className="rounded-md border border-success/40 bg-success/5 px-4 py-2.5 text-xs text-success mb-8">
          ✓ 매장 정보는 네이버 검색 실데이터입니다. AI 평가 점수는 데모이며 Gemini API 연결 후 활성화됩니다.
        </div>
      ) : (
        <div className="rounded-md border border-warning/40 bg-warning/5 px-4 py-2.5 text-xs text-warning mb-8">
          ⚠ 데모 데이터입니다. 실제 매장 검색·평가는 Naver Local Search + Gemini API 키 연결 후 활성화됩니다.
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr] mb-10">
        <div className="card overflow-hidden">
          <div className="border-b border-canvas-border bg-canvas px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-medium text-ink">
              {region.label} 주변 <span className="text-ink-muted">"{query}"</span> 검색 결과 · {stores.length}건
            </div>
            <span className="chip">{hasNaverMapKey ? "Naver Map" : "Naver Map · 키 설정 필요"}</span>
          </div>
          <NaverMap
            center={{ lat: region.lat, lng: region.lng }}
            markers={markers}
            onSelect={setSelectedId}
            fallback={
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
                  📍 {region.label} 기준 · 반경 ~1km
                </div>
              </div>
            }
          />
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
                    {s.category ? (
                      <span>{s.category}</span>
                    ) : (
                      <span className={s.status === "영업중" ? "text-success" : "text-warning"}>
                        ● {s.status}
                      </span>
                    )}
                  </div>
                  {s.address && (
                    <div className="mt-0.5 truncate text-[11px] text-ink-subtle">{s.address}</div>
                  )}
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
          {selected.address && (
            <p className="mt-1 text-xs text-ink-subtle">
              {selected.address}
              {selected.link && (
                <>
                  {" · "}
                  <a
                    href={selected.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-ink"
                  >
                    홈페이지
                  </a>
                </>
              )}
            </p>
          )}
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
