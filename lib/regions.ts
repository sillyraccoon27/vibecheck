// 검색 기준 지역 — 사용자가 직접 선택하고, 선택값은 localStorage에 저장된다.
export type Region = {
  id: string;
  label: string; // 표시용 (예: "서울 강남역")
  short: string; // 지점명 생성 등 짧은 표기 (예: "강남")
  lat: number;
  lng: number;
};

export const REGIONS: Region[] = [
  { id: "gangnam", label: "서울 강남역", short: "강남", lat: 37.4979, lng: 127.0276 },
  { id: "hongdae", label: "서울 홍대입구", short: "홍대", lat: 37.5572, lng: 126.9239 },
  { id: "seongsu", label: "서울 성수", short: "성수", lat: 37.5446, lng: 127.0559 },
  { id: "jamsil", label: "서울 잠실", short: "잠실", lat: 37.5133, lng: 127.1001 },
  { id: "gwanghwamun", label: "서울 광화문", short: "광화문", lat: 37.5709, lng: 126.9768 },
  { id: "itaewon", label: "서울 이태원", short: "이태원", lat: 37.5346, lng: 126.9946 },
  { id: "kondae", label: "서울 건대입구", short: "건대", lat: 37.5404, lng: 127.0697 },
  { id: "sinchon", label: "서울 신촌", short: "신촌", lat: 37.5551, lng: 126.9368 },
  { id: "yeouido", label: "서울 여의도", short: "여의도", lat: 37.5219, lng: 126.9245 },
  { id: "pangyo", label: "성남 판교", short: "판교", lat: 37.3947, lng: 127.1112 },
  { id: "suwon", label: "수원역", short: "수원", lat: 37.266, lng: 126.9999 },
  { id: "songdo", label: "인천 송도", short: "송도", lat: 37.3825, lng: 126.6435 },
  { id: "seomyeon", label: "부산 서면", short: "서면", lat: 35.1578, lng: 129.0593 },
  { id: "haeundae", label: "부산 해운대", short: "해운대", lat: 35.1631, lng: 129.1635 },
  { id: "dongseongro", label: "대구 동성로", short: "동성로", lat: 35.8686, lng: 128.5945 },
  { id: "dunsan", label: "대전 둔산", short: "둔산", lat: 36.3504, lng: 127.3845 },
  { id: "chungjangro", label: "광주 충장로", short: "충장로", lat: 35.148, lng: 126.919 },
  { id: "jeju", label: "제주시청", short: "제주", lat: 33.4996, lng: 126.5312 },
];

export const DEFAULT_REGION = REGIONS[0];

export const REGION_STORAGE_KEY = "vibecheck.region";

// 사용자가 직접 입력한 지역의 id — 프리셋이 아닌 커스텀 지역을 구분한다.
export const CUSTOM_REGION_ID = "custom";

export function findRegion(id: string | null | undefined): Region {
  return REGIONS.find((r) => r.id === id) ?? DEFAULT_REGION;
}

// localStorage 저장값 복원 — 프리셋은 id 문자열, 커스텀 지역은 JSON으로 저장된다.
export function loadRegion(raw: string | null): Region {
  if (!raw) return DEFAULT_REGION;
  if (raw.startsWith("{")) {
    try {
      const r = JSON.parse(raw);
      if (
        typeof r.label === "string" &&
        r.label.length > 0 &&
        Number.isFinite(r.lat) &&
        Number.isFinite(r.lng)
      ) {
        return {
          id: CUSTOM_REGION_ID,
          label: r.label,
          short: typeof r.short === "string" && r.short ? r.short : r.label,
          lat: r.lat,
          lng: r.lng,
        };
      }
    } catch {
      // 손상된 값은 무시하고 기본 지역으로
    }
    return DEFAULT_REGION;
  }
  return findRegion(raw);
}

export function serializeRegion(region: Region): string {
  return region.id === CUSTOM_REGION_ID
    ? JSON.stringify({
        label: region.label,
        short: region.short,
        lat: region.lat,
        lng: region.lng,
      })
    : region.id;
}
