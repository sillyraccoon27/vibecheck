// 소개 / 사용방법 모달 본문 (도움말, 랜딩 메뉴에서 공용 사용)

export function HelpContent() {
  return (
    <div className="space-y-5 text-sm text-ink-soft">
      <section>
        <h3 className="text-sm font-semibold text-ink">Vibecheck이란?</h3>
        <p className="mt-1 leading-relaxed text-ink-muted">
          Vibecheck은 GPT·Claude·Gemini·Perplexity 등 주요 LLM에게 실제 사용자처럼
          질문을 던져, AI가 우리 브랜드를 <b>얼마나 자주</b>, <b>어떤 이미지로</b>,
          <b> 얼마나 정확하게</b> 설명하는지 진단하는 도구입니다.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">이렇게 사용하세요</h3>
        <ol className="mt-2 space-y-2">
          {[
            ["1. 브랜드 등록", "브랜드명·카테고리·지역과 원하는 이미지, 링크, 경쟁사를 입력합니다."],
            ["2. AI 분석 실행", "등록 즉시 8개 LLM에 질문을 던져 응답을 수집합니다 (약 1~2분)."],
            ["3. 진단 리포트 확인", "가시성·이미지 일치·정확도 등 6개 점수와 카테고리별 노출률을 확인합니다."],
            ["4. 개선 추천 적용", "브랜드 상황에 맞춰 우선순위가 매겨진 개선 액션을 따라 실행합니다."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-lg border border-canvas-border bg-canvas p-3">
              <div className="font-medium text-ink">{t}</div>
              <div className="mt-0.5 text-xs text-ink-muted">{d}</div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">자주 묻는 질문</h3>
        <dl className="mt-2 space-y-3">
          <div>
            <dt className="font-medium text-ink">로그인 없이도 볼 수 있나요?</dt>
            <dd className="text-xs text-ink-muted">네, 둘러보기 모드에서 샘플 분석 결과를 확인할 수 있습니다. 실제 분석은 로그인 후 이용 가능합니다.</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">분석은 얼마나 걸리나요?</dt>
            <dd className="text-xs text-ink-muted">브랜드당 약 1~2분 정도 소요됩니다.</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">문의는 어디로 하나요?</dt>
            <dd className="text-xs text-ink-muted">support@vibecheck.app 으로 연락 주세요.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
