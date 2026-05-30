import { NextResponse } from "next/server";
import type { ApiError } from "./types";

export function ok<T>(data: T, init?: { status?: number }) {
  return NextResponse.json({ ok: true, data }, { status: init?.status ?? 200 });
}

export function created<T>(data: T) {
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export function accepted<T>(data: T) {
  return NextResponse.json({ ok: true, data }, { status: 202 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function err(code: string, message: string, status: number, details?: unknown) {
  const body: ApiError = { ok: false, error: { code, message, details } };
  return NextResponse.json(body, { status });
}

export const errors = {
  unauthorized: () => err("UNAUTHORIZED", "로그인이 필요합니다.", 401),
  forbidden: () => err("FORBIDDEN", "권한이 없습니다.", 403),
  notFound: (code: string, message: string) => err(code, message, 404),
  conflict: (code: string, message: string) => err(code, message, 409),
  validation: (message: string, details?: unknown) =>
    err("VALIDATION_ERROR", message, 400, details),
  business: (code: string, message: string) => err(code, message, 422),
  server: (e: unknown) =>
    err("INTERNAL_ERROR", e instanceof Error ? e.message : "서버 에러", 500),
};
