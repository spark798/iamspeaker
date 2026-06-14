import { Stepper } from "@/components/stepper";
import Link from "next/link";
import type { ReactNode } from "react";

/** 세션 플로우(SCR-01~08) 공용 셸: 헤더 + 진행 스테퍼 + 본문. */
export default function SessionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          iamspeaker
        </Link>
      </header>
      <Stepper />
      <main className="mt-8 flex-1">{children}</main>
    </div>
  );
}
