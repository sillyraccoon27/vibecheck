import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ProfileMenu } from "@/components/ProfileMenu";
import { LandingMenu } from "./_components/LandingMenu";
import { LandingSearch } from "./_components/LandingSearch";

export default function HomePage() {
  const user = getCurrentUser();

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-ink/[0.03] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-ink/[0.04] blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-8">
        <LandingMenu isLoggedIn={!!user} />
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-canvas-border bg-white text-xs">
            ◆
          </span>
          Vibecheck
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/brands" className="btn-secondary">
                내 브랜드
              </Link>
              <ProfileMenu name={user.name || user.email} variant="dark" />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                로그인
              </Link>
              <Link href="/signup" className="btn-primary">
                회원가입
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="relative z-10 flex flex-col items-center px-6 pt-20 pb-24 text-center sm:pt-28">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-canvas-border bg-white px-3 py-1 text-xs font-medium text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          AI 브랜드 가시성 진단 · v0.1
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          AI가 우리 브랜드를
          <br />
          어떻게 보고 있을까?
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
          궁금한 브랜드명을 검색해 보세요. 8개 LLM이 어떤 키워드로,
          어떤 맥락에서 그 브랜드를 떠올리는지 한눈에 보여드립니다.
        </p>
        <div className="mt-10 w-full max-w-2xl">
          <LandingSearch />
        </div>

        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              kicker: "01",
              title: "8개 LLM 응답 수집",
              body: "GPT·Claude·Gemini·Perplexity 등 주요 모델에 실제 사용자 질의를 던져 응답을 모읍니다.",
            },
            {
              kicker: "02",
              title: "이미지 갭 분석",
              body: "목표하는 브랜드 이미지와 AI가 인식한 이미지 사이의 차이를 정량화합니다.",
            },
            {
              kicker: "03",
              title: "개선 추천 액션",
              body: "갭을 줄이기 위해 즉시 적용할 수 있는 콘텐츠·SEO·FAQ 액션을 우선순위로 제시합니다.",
            },
          ].map((b) => (
            <div
              key={b.kicker}
              className="rounded-2xl border border-canvas-border bg-white p-6 text-left shadow-card"
            >
              <div className="mb-2 text-xs font-semibold tracking-wider text-ink-subtle">
                STEP {b.kicker}
              </div>
              <div className="mb-2 text-base font-semibold text-ink">{b.title}</div>
              <div className="text-sm leading-relaxed text-ink-muted">{b.body}</div>
            </div>
          ))}
        </div>

        {user && (
          <div className="mt-12 text-xs text-ink-subtle">
            <Link href="/brands" className="underline underline-offset-4 hover:text-ink">
              내 브랜드 분석으로 이동 →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
