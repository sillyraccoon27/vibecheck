import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between bg-ink p-12 text-white">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="sr-only">VibeCheck</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-snug">
            비밀번호를
            <br />
            다시 설정하세요
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-white/70">
            가입하신 이메일과 새 비밀번호를 입력하면 즉시 변경됩니다.
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
          <span className="text-sm text-ink-muted">비밀번호가 기억나셨나요?</span>
          <Link href="/login" className="ml-2 text-sm font-medium text-ink underline-offset-4 hover:underline">
            로그인
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-ink">비밀번호 찾기</h2>
          <p className="mt-2 text-sm text-ink-muted">
            가입한 이메일과 새 비밀번호를 입력하세요.
          </p>

          <ResetPasswordForm />
        </div>
      </main>
    </div>
  );
}
