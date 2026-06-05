import Link from "next/link";
import { Logo } from "./Logo";
import { HeaderActions } from "./HeaderActions";

export function Header({ userName }: { userName?: string | null }) {
  return (
    <header className="border-b border-canvas-border bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="block">
          <Logo />
        </Link>
        <HeaderActions userName={userName} />
      </div>
    </header>
  );
}
