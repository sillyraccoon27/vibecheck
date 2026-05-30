import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibecheck — AI 브랜드 인식 진단",
  description: "AI가 우리 브랜드를 어떻게 알고 있는지 진단해주는 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
