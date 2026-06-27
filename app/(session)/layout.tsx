import { Stepper } from "@/components/stepper";
import type { ReactNode } from "react";

/** 세션 플로우(SCR-01~08) 공용 셸: 진행 스테퍼 + 본문. (브랜드/홈 링크는 전역 상단바) */
export default function SessionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 pt-2 pb-8">
      <div className="print:hidden">
        <Stepper />
      </div>
      <main className="mt-8 flex-1">{children}</main>
    </div>
  );
}
