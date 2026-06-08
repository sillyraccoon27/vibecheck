// Gemini 연동 — 서버 전용. 키는 developers/aistudio.google.com 에서 발급(GEMINI_API_KEY).
// 키가 없으면 hasGeminiKey === false 가 되어 호출부가 데모 데이터로 폴백한다.
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY ?? "";
// 모델은 환경변수로 덮어쓸 수 있게 둔다(기본: 빠르고 저렴한 flash).
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const hasGeminiKey = API_KEY.length > 0;

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: API_KEY });
  return client;
}

// 점수 가중치 — 검색 페이지 총점 계산과 동일하게 유지한다.
const WEIGHTS = {
  atmosphere: 0.2,
  menu: 0.2,
  price: 0.15,
  service: 0.2,
  location: 0.15,
  cleanliness: 0.1,
} as const;

export type ScoreKey = keyof typeof WEIGHTS;

export type StoreInput = {
  id: string;
  name: string;
  branch: string;
  address: string;
  category: string;
};

export type StoreEvaluation = {
  id: string;
  scores: Record<ScoreKey, number>;
  total: number;
  details: string[];
};

const SCORE_PROPS = Object.fromEntries(
  (Object.keys(WEIGHTS) as ScoreKey[]).map((k) => [
    k,
    { type: Type.NUMBER, description: `${k} 점수 (0~100 정수)` },
  ])
);

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 60;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function totalFrom(scores: Record<ScoreKey, number>): number {
  const t = (Object.keys(WEIGHTS) as ScoreKey[]).reduce(
    (acc, k) => acc + scores[k] * WEIGHTS[k],
    0
  );
  return Math.round(t * 10) / 10;
}

// 503(과부하)·429(레이트리밋) 등 일시적 오류는 짧게 재시도한다.
async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  attempts = 3
): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (e) {
      lastErr = e;
      const msg = String(e);
      const transient = /\b(429|500|503|UNAVAILABLE|overloaded|high demand)\b/i.test(msg);
      if (!transient || i === attempts - 1) throw e;
      // 0.6s, 1.2s 백오프
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}

// 매장 목록을 한 번의 호출로 평가한다(점수 6종 + 평가 코멘트).
export async function evaluateStores(
  query: string,
  stores: StoreInput[]
): Promise<StoreEvaluation[]> {
  if (!hasGeminiKey || stores.length === 0) return [];

  const list = stores
    .map(
      (s, i) =>
        `${i + 1}. id=${s.id} | ${s.name} ${s.branch} | 분류:${s.category || "미상"} | 주소:${s.address || "미상"}`
    )
    .join("\n");

  const prompt = `당신은 매장에 대한 대중의 인식과 평판을 평가하는 분석가입니다.
사용자는 "${query}"(으)로 검색했습니다. 아래 매장들을 각각 6개 항목으로 0~100점으로 평가하세요.

평가 항목: 분위기(atmosphere), 메뉴(menu), 가격(price·합리적일수록 높음), 서비스(service), 위치(location·접근성), 청결도(cleanliness).

매장 목록:
${list}

규칙:
- 각 매장마다 입력의 id를 그대로 반환하세요.
- 점수는 0~100 정수. 근거 없이 모두 같은 점수를 주지 말고 매장 특성에 따라 차등하세요.
- details에는 한국어로 2~3개의 짧은 평가 문장을 담으세요(각 항목 강·약점 위주).
- 실제로 알 수 없는 매장이면 분류·입지·일반적 평판을 바탕으로 합리적으로 추정하세요.`;

  const ai = getClient();
  const res = await generateWithRetry(ai, {
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      // thinking 비활성화 — 구조화 JSON 출력에선 불필요하고, 켜두면 출력 예산을
      // 잡아먹어 응답이 잘리거나 느려진다(11~14초 → 2~4초).
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 4096,
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            scores: { type: Type.OBJECT, properties: SCORE_PROPS },
            details: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["id", "scores", "details"],
        },
      },
    },
  });

  const raw = res.text;
  if (!raw) return [];

  let parsed: Array<{ id: string; scores: Record<string, number>; details: string[] }>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  // id로 매핑해 입력 순서대로 정렬하고, 누락 항목은 제외한다.
  const byId = new Map(parsed.map((p) => [p.id, p]));
  const out: StoreEvaluation[] = [];
  for (const s of stores) {
    const p = byId.get(s.id);
    if (!p) continue;
    const scores = Object.fromEntries(
      (Object.keys(WEIGHTS) as ScoreKey[]).map((k) => [k, clampScore(p.scores?.[k])])
    ) as Record<ScoreKey, number>;
    out.push({
      id: s.id,
      scores,
      total: totalFrom(scores),
      details: Array.isArray(p.details) ? p.details.filter((d) => typeof d === "string") : [],
    });
  }
  return out;
}
