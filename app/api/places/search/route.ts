import { NextRequest } from "next/server";
import { errors, ok } from "@/lib/api-response";

// 네이버 검색(Local Search) API 프록시.
// 키는 developers.naver.com 에서 발급 (NCP 지도 키와 별개).
// 키가 없으면 source: "mock" 으로 응답해 클라이언트가 데모 데이터로 폴백한다.
export type Place = {
  id: string;
  title: string; // 태그 제거된 매장명 (예: "스타벅스 강남R점")
  category: string; // 예: "카페,디저트>카페"
  address: string;
  road_address: string;
  telephone: string;
  link: string;
  lat: number;
  lng: number;
};

// 응답 title의 <b> 태그와 HTML 엔티티 제거
function cleanTitle(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// 같은 매장의 부속 POI(주차장·입구·옥외 등)를 나타내는 접미사 — 대표 항목 선정에 사용
const SUB_POI = /(주차장|주차|발렛|입구|출입구|정문|후문|옥외|앞|광장|타워|스퀘어)\s*$|_/;

// 매장명에서 브랜드(첫 공백 앞)를 추출해 묶음 키로 쓴다.
function brandKey(title: string): string {
  const sp = title.indexOf(" ");
  return (sp > 0 ? title.slice(0, sp) : title).replace(/\s+/g, "");
}

// 두 좌표 사이 거리(m) — 하버사인
function distM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 같은 브랜드 + 매우 가까운 좌표(≈60m)면 같은 매장의 중복 POI로 보고 대표 1개만 남긴다.
function dedupePlaces(places: Place[]): Place[] {
  const DUP_RADIUS_M = 60;
  const kept: Place[] = [];
  for (const p of places) {
    const dupIdx = kept.findIndex(
      (k) => brandKey(k.title) === brandKey(p.title) && distM(k, p) < DUP_RADIUS_M
    );
    if (dupIdx === -1) {
      kept.push(p);
      continue;
    }
    // 이미 같은 매장이 있으면, 부속 POI 같은 이름(주차장/입구 등)이 아닌 쪽을 대표로 유지
    const existing = kept[dupIdx];
    if (SUB_POI.test(existing.title) && !SUB_POI.test(p.title)) {
      kept[dupIdx] = p;
    }
  }
  return kept;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim() ?? "";
  const region = req.nextUrl.searchParams.get("region")?.trim() ?? "";
  if (!query) {
    return errors.validation("query 파라미터가 필요합니다.");
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return ok({ source: "mock" as const, places: [] as Place[] });
  }

  // 좌표 기반 필터가 없는 API라서 지역명을 검색어에 합쳐 주변 매장을 유도한다.
  const q = region ? `${region} ${query}` : query;
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(q)}&display=5&sort=random`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      next: { revalidate: 600 },
    });
  } catch (e) {
    return errors.server(e);
  }
  if (!res.ok) {
    return errors.server(new Error(`Naver Local Search 응답 오류 (${res.status})`));
  }

  const data: {
    items?: {
      title: string;
      link: string;
      category: string;
      telephone: string;
      address: string;
      roadAddress: string;
      mapx: string;
      mapy: string;
    }[];
  } = await res.json();

  const places: Place[] = (data.items ?? [])
    .map((item, i) => ({
      id: `p${i}`,
      title: cleanTitle(item.title),
      category: item.category ?? "",
      address: item.address ?? "",
      road_address: item.roadAddress ?? "",
      telephone: item.telephone ?? "",
      link: item.link ?? "",
      // mapx/mapy는 WGS84 경도/위도 × 10^7 정수 (2023-05 이후 KATECH → WGS84로 변경됨)
      lng: Number(item.mapx) / 1e7,
      lat: Number(item.mapy) / 1e7,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat !== 0);

  return ok({ source: "naver" as const, places: dedupePlaces(places) });
}
