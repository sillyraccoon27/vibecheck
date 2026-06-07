import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Brand } from "../types";

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function getModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

function parseJsonArray(text: string): unknown[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("JSON 배열을 파싱할 수 없습니다: " + text.slice(0, 100));
  return JSON.parse(match[0]);
}

// 질문 20개씩 생성
export async function generateQuestions(
  brand: Pick<Brand, "brand_name" | "category" | "region" | "target_customer" | "description">,
  count: number = 20
): Promise<string[]> {
  const model = getModel();
  const prompt = `당신은 ${brand.category} 분야 서비스/상품을 찾는 소비자입니다.
${brand.region} 지역의 ${brand.category} 관련 서비스/상품을 찾는 실제 사용자가 AI 어시스턴트에게 물어볼 법한 질문 ${count}개를 만들어주세요.

조건:
- 브랜드명("${brand.brand_name}")을 질문에 절대 포함하지 마세요
- 이 브랜드가 답변에 자연스럽게 등장할 수 있는 질문이어야 합니다
- 타깃 고객(${brand.target_customer || "일반 소비자"})의 관심사를 반영하세요
- 실제 사용자가 AI에게 묻는 자연스러운 한국어 질문이어야 합니다

JSON 배열 형식으로만 반환하세요 (설명 없이): ["질문1", "질문2", ...]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return parseJsonArray(text) as string[];
}

// 질문 10개에 대한 답변 수집
export async function getAnswers(
  questions: string[],
  brand: Pick<Brand, "category" | "region">
): Promise<Array<{ question: string; answer: string }>> {
  const model = getModel();
  const numbered = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
  const prompt = `당신은 ${brand.region} 지역의 ${brand.category} 분야에 정통한 AI 어시스턴트입니다.
아래 질문들에 실제 사용자에게 답변하듯 자연스럽게 답해주세요.
구체적인 브랜드명, 상품명, 장소명을 포함하여 답변하세요.

${numbered}

다음 JSON 배열 형식으로만 반환하세요 (설명 없이):
[{"question": "질문", "answer": "답변"}, ...]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return parseJsonArray(text) as Array<{ question: string; answer: string }>;
}
