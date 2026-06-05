"use client";

import { useState } from "react";
import { Modal } from "./Modal";

type Me = {
  user_id: string;
  email: string;
  name: string;
  created_at: string;
  current_subscription: { plan_name: string; status: string } | null;
};

export function ProfileMenu({
  name,
  variant = "light",
}: {
  name: string;
  variant?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);

  async function openModal() {
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const j = await res.json();
      if (j.ok) setMe(j.data);
    } finally {
      setLoading(false);
    }
  }

  const initial = name?.[0]?.toUpperCase() ?? "U";
  const avatarCls =
    variant === "dark"
      ? "bg-ink text-white"
      : "bg-canvas border border-canvas-border text-ink-soft";

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="내 정보"
        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition hover:opacity-80 ${avatarCls}`}
      >
        {initial}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="내 정보" maxWidth="max-w-md">
        {loading && !me ? (
          <div className="py-8 text-center text-sm text-ink-muted">불러오는 중...</div>
        ) : me ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-lg font-bold text-white">
                {me.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div>
                <div className="text-base font-semibold text-ink">{me.name}</div>
                <div className="text-sm text-ink-muted">{me.email}</div>
              </div>
            </div>

            <dl className="divide-y divide-canvas-border rounded-lg border border-canvas-border">
              <Row label="플랜">
                <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-semibold uppercase text-ink-soft">
                  {me.current_subscription?.plan_name ?? "free"}
                </span>
              </Row>
              <Row label="가입일">
                {me.created_at
                  ? new Date(me.created_at).toLocaleDateString("ko-KR")
                  : "—"}
              </Row>
            </dl>

            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="btn-secondary w-full">
                로그아웃
              </button>
            </form>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-ink-muted">
            정보를 불러오지 못했습니다.
          </div>
        )}
      </Modal>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}
