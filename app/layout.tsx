import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iamspeaker",
  description: "오픈소스 발표 연습 웹앱 — AI 데모 발표 + 연습 분석 + 개선 스크립트",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
