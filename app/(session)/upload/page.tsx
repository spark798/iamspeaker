import { WalkingSkeletonDemo } from "@/components/walking-skeleton-demo";

/** SCR-01 업로드 — Phase 0에서는 셸 자리표시자 + Walking Skeleton 데모. Phase 1에서 업로드 폼·파서 연결. */
export default function UploadPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">슬라이드 업로드</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        PPTX/PDF 업로드 + 발표 설정(목표 시간·톤·언어·모국어).
      </p>
      <p className="text-sm text-neutral-500">SCR-01 — Phase 1에서 구현됩니다.</p>
      <WalkingSkeletonDemo />
    </section>
  );
}
