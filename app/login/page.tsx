import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between bg-ink p-12 text-white">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="sr-only">VibeCheck</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-snug">
            AI가 보는 우리 브랜드를
            <br />
            숫자로 확인하세요
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-white/70">
            500개의 질문을 AI에게 던지고, 우리 브랜드가 얼마나 자주, 어떤 이미지로,
            얼마나 정확하게 설명되는지 분석해드립니다.
          </p>
        </div>
        <blockquote className="text-sm text-white/60">
          "AI 검색에서 우리 브랜드가 어떻게 비춰지는지 한 번에 본다."
          <br />
          <span className="text-white/40">— Vibecheck Team</span>
        </blockquote>
      </aside>

      <main className="flex flex-col p-8 lg:p-12">
        <div className="flex justify-end">
          <span className="text-sm text-ink-muted">계정이 없으신가요?</span>
          <Link href="/signup" className="ml-2 text-sm font-medium text-ink underline-offset-4 hover:underline">
            회원가입
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-ink">다시 오신 걸 환영합니다</h2>
          <p className="mt-2 text-sm text-ink-muted">계정에 로그인해 분석을 이어가세요</p>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-ink-subtle">
            로그인 시 이용약관과 개인정보처리방침에 동의한 것으로 간주됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
