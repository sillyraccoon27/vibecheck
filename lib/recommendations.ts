// 규칙 기반 개선 추천 생성기.
// 브랜드 정보 + 6개 점수 + 경쟁사 + 이미지 갭을 조합해 브랜드마다 다른,
// 구체적인 액션을 우선순위와 함께 만들어 낸다. (LLM 미사용 · 비용 없음 · 결정적)

export type RecPriority = "high" | "medium" | "low";
export type Recommendation = { priority: RecPriority; title: string; desc: string };

type ScoreSet = {
  visibility_score: number;
  ranking_score: number;
  stability_score: number;
  image_match_score: number;
  accuracy_score: number;
  competitor_pressure_score: number;
  total_score: number;
};

type BrandInfo = {
  brand_name: string;
  category: string;
  region: string;
  desired_image: string;
  target_customer: string;
};

// 카테고리별 주요 노출 채널 (추천 문구를 구체화하는 데 사용)
const CHANNELS: Record<string, string> = {
  cafe: "네이버 플레이스·인스타그램",
  cosmetics: "올리브영 상세페이지·인스타그램",
  interior: "자사몰 상세페이지·핀터레스트",
  food: "네이버 플레이스·배달앱 가게정보",
  saas: "랜딩페이지·공식 문서/G2",
  fashion: "무신사·인스타그램",
  other: "공식 웹사이트·SNS 채널",
};

function channelFor(category: string): string {
  return CHANNELS[category] ?? CHANNELS.other;
}

export function generateRecommendations(input: {
  brand: BrandInfo;
  scores: ScoreSet;
  competitors: string[];
  gapKeywords: string[];
}): Recommendation[] {
  const { brand, scores, competitors, gapKeywords } = input;
  const channel = channelFor(brand.category);
  const rival = competitors[0] ?? "주요 경쟁사";
  const recs: Recommendation[] = [];

  // 이미지 갭 — 가장 직접적인 개선 포인트
  if (gapKeywords.length > 0) {
    const gaps = gapKeywords.slice(0, 2).join("·");
    recs.push({
      priority: scores.image_match_score < 50 ? "high" : "medium",
      title: `'${gaps}' 이미지를 콘텐츠에 명시`,
      desc: `AI는 아직 ${brand.brand_name}을(를) '${gaps}'(으)로 인식하지 못하고 있어요. ${channel}의 소개글·해시태그·게시물 제목에 '${gaps}' 키워드를 반복 노출하세요.`,
    });
  }

  // 가시성
  if (scores.visibility_score < 50) {
    recs.push({
      priority: "high",
      title: `${channel} 기본 정보 보강으로 AI 노출 끌어올리기`,
      desc: `가시성 점수가 ${scores.visibility_score.toFixed(0)}점으로 낮아요. ${brand.region} ${brand.category} 관련 질문에서 떠오르도록 위치·메뉴·특징을 구조화된 텍스트로 채워주세요.`,
    });
  }

  // 검색 순위
  if (scores.ranking_score < 55) {
    recs.push({
      priority: "medium",
      title: `${rival} 대비 차별화 포인트 구조화`,
      desc: `AI 추천 순위가 평균 대비 밀려요. ${rival}와(과) 비교했을 때 ${brand.brand_name}만의 강점(가격·시그니처·후기)을 표·리스트 형태로 공식 채널에 추가하면 상위 노출에 유리합니다.`,
    });
  }

  // 경쟁 압력
  if (scores.competitor_pressure_score < 50) {
    recs.push({
      priority: "medium",
      title: `경쟁사 동시 언급 방어 키워드 강화`,
      desc: `${rival} 등과 함께 묶여 언급되는 비율이 높아요. 우리만 가진 키워드를 FAQ·리뷰 답글·상세 설명에 의도적으로 심어 '대체재'가 아닌 '대표'로 인식되게 하세요.`,
    });
  }

  // 정확도
  if (scores.accuracy_score < 80) {
    recs.push({
      priority: scores.accuracy_score < 65 ? "high" : "low",
      title: `채널별 기본 정보(영업시간·위치) 표기 통일`,
      desc: `AI가 인식한 사실 정보의 정확도가 ${scores.accuracy_score.toFixed(0)}점이에요. ${channel}을 포함한 모든 채널의 영업시간·주소·연락처 표기를 동일하게 맞춰 오인식을 줄이세요.`,
    });
  }

  // 안정성
  if (scores.stability_score < 60) {
    recs.push({
      priority: "low",
      title: `공식 정보 업데이트 빈도 높여 응답 일관성 확보`,
      desc: `같은 질문에도 AI 응답이 들쭉날쭉해요(안정성 ${scores.stability_score.toFixed(0)}점). 공식 채널 정보를 주기적으로 갱신하면 모델 간 응답 편차가 줄어듭니다.`,
    });
  }

  // 타깃 맞춤 (항상 후보로 두되 우선순위 낮음)
  if (brand.target_customer.trim()) {
    recs.push({
      priority: "low",
      title: `타깃 '${brand.target_customer}'의 언어로 콘텐츠 작성`,
      desc: `타깃 고객이 실제로 검색·사용하는 표현을 소개글과 게시물에 반영하면, 해당 고객층 질문에서의 노출이 좋아집니다.`,
    });
  }

  // 후보가 너무 적으면 카테고리 일반 팁으로 보강
  if (recs.length < 3) {
    recs.push({
      priority: "low",
      title: `${channel}에 후기·사진 콘텐츠 꾸준히 축적`,
      desc: `리뷰와 시각 콘텐츠가 많을수록 AI가 ${brand.brand_name}을(를) 더 풍부하게 설명합니다. 방문·구매 후기를 정기적으로 모아 공식 채널에 노출하세요.`,
    });
  }

  // high → medium → low 순으로 정렬 후 상위 5개
  const order: Record<RecPriority, number> = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 5);
}
