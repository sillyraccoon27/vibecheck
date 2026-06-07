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

  return ok({ source: "naver" as const, places });
}
