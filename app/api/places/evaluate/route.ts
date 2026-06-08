import { NextRequest } from "next/server";
import { errors, ok } from "@/lib/api-response";
import { evaluateStores, hasGeminiKey, type StoreInput } from "@/lib/llm/gemini";

// 검색 결과 매장들을 Gemini로 평가한다.
// 키가 없으면 source: "mock" 으로 응답해 클라이언트가 데모 점수로 폴백한다.
export async function POST(req: NextRequest) {
  if (!hasGeminiKey) {
    return ok({ source: "mock" as const, evaluations: [] });
  }

  let body: { query?: string; stores?: StoreInput[] };
  try {
    body = await req.json();
  } catch {
    return errors.validation("JSON 본문이 필요합니다.");
  }

  const query = (body.query ?? "").trim();
  const stores = Array.isArray(body.stores) ? body.stores.slice(0, 8) : [];
  if (stores.length === 0) {
    return errors.validation("stores 배열이 필요합니다.");
  }

  try {
    const evaluations = await evaluateStores(query, stores);
    if (evaluations.length === 0) {
      return ok({ source: "mock" as const, evaluations: [] });
    }
    return ok({ source: "gemini" as const, evaluations });
  } catch (e) {
    // LLM 실패 시 폴백되도록 mock 으로 응답(서버 에러로 막지 않음)
    return ok({ source: "mock" as const, evaluations: [], error: String(e) });
  }
}
