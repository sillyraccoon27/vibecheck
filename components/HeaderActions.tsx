"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { HelpContent } from "./HelpContent";
import { ProfileMenu } from "./ProfileMenu";

const NOTIFY_KEY = "vc_notify_enabled";

export function HeaderActions({ userName }: { userName?: string | null }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [notify, setNotify] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setNotify(localStorage.getItem(NOTIFY_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function toggleNotify() {
    const next = !notify;
    setNotify(next);
    localStorage.setItem(NOTIFY_KEY, next ? "1" : "0");
    setToast(next ? "🔔 알림 받기가 켜졌어요" : "🔕 알림 받기가 꺼졌어요");
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="text-ink-muted hover:text-ink"
      >
        도움말
      </button>

      <button
        type="button"
        onClick={toggleNotify}
        aria-pressed={notify}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          notify
            ? "border-success/30 bg-success/10 text-success"
            : "border-canvas-border bg-white text-ink-muted hover:text-ink"
        }`}
      >
        <span>{notify ? "🔔" : "🔕"}</span>
        {notify ? "알림 켜짐" : "알림 받기"}
      </button>

      {userName ? (
        <ProfileMenu name={userName} variant="light" />
      ) : (
        <Link href="/login" className="btn-primary">
          로그인
        </Link>
      )}

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="소개 · 사용방법">
        <HelpContent />
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-pop">
          {toast}
        </div>
      )}
    </div>
  );
}
