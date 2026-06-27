import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "iamspeaker",
  description: "오픈소스 발표 연습 웹앱 — AI 데모 발표 + 연습 분석 + 개선 스크립트",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <NextIntlClientProvider>
          {/* 전역 상단바: 언제든 처음 화면(홈=대시보드+업로드)으로. 모든 화면에 항상 노출. */}
          <header className="flex items-center justify-between p-3 print:hidden">
            <Link href="/" className="font-bold tracking-tight hover:opacity-80">
              iamspeaker
            </Link>
            <LocaleSwitcher />
          </header>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
