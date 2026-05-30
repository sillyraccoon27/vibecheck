import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between bg-ink p-12 text-white">
        <Logo />
        <div>
          <h1 className="text-4xl font-bold leading-snug">
            14일 무료 체험으로
            <br />
            먼저 확인해 보세요
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-white/70">
            신용카드 없이 강력한 기능을 모두 사용해보세요. 다음 결제일부터 자동 결제됩니다.
          </p>
        </div>
        <blockquote className="text-sm text-white/60">
          "AI 검색에서 우리 브랜드가 어떻게 비춰지는지 한 번에 본다."
        </blockquote>
      </aside>

      <main className="flex flex-col p-8 lg:p-12">
        <div className="flex justify-end">
          <span className="text-sm text-ink-muted">이미 계정이 있으신가요?</span>
          <Link href="/login" className="ml-2 text-sm font-medium text-ink underline-offset-4 hover:underline">
            로그인
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-ink">계정 만들기</h2>
          <p className="mt-2 text-sm text-ink-muted">몇 가지 정보만 입력하면 바로 시작할 수 있어요</p>
          <SignupForm />
        </div>
      </main>
    </div>
  );
}
