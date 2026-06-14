"use client";

import { useState } from "react";

// Walking Skeleton: 실제 모델 없이 stub 어댑터로 전 구간(세션→데모 작업→SSE→스크립트)을 관통한다.
// Phase 1에서 실제 업로드/파서/엔진으로 대체된다.
const SAMPLE_SLIDES = [
  { textContent: "Problem: 고객 이탈률이 높습니다." },
  { textContent: "Solution: 예측 ML로 이탈을 30% 줄입니다." },
  { textContent: "Traction: MRR $40K, 월 15% 성장." },
];

interface SlideScript {
  slideIndex: number;
  text: string;
}

interface JobEvent {
  status: string;
  progress: number;
  error?: string | null;
}

export function WalkingSkeletonDemo() {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [script, setScript] = useState<SlideScript[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setScript(null);
    setProgress(0);
    setStatus("세션 생성 중…");
    try {
      const sRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDurationSec: 300,
          tone: "formal",
          language: "en",
          nativeLanguage: "ko",
          slides: SAMPLE_SLIDES,
        }),
      });
      if (!sRes.ok) throw new Error("세션 생성 실패");
      const { id } = (await sRes.json()) as { id: string };

      setStatus("데모 작업 요청 중…");
      const dRes = await fetch(`/api/sessions/${id}/demo`, { method: "POST" });
      if (!dRes.ok) throw new Error("데모 요청 실패");
      const { jobId } = (await dRes.json()) as { jobId: string };

      setStatus("생성 중…");
      const es = new EventSource(`/api/jobs/${jobId}/stream`);
      es.onmessage = async (ev) => {
        const data = JSON.parse(ev.data) as JobEvent;
        setProgress(data.progress);
        if (data.status === "succeeded") {
          es.close();
          const scrRes = await fetch(`/api/sessions/${id}/script`);
          const body = (await scrRes.json()) as { content: SlideScript[] };
          setScript(body.content);
          setStatus("완료");
          setBusy(false);
        } else if (data.status === "failed") {
          es.close();
          setStatus("실패");
          setError(data.error ?? "작업 실패");
          setBusy(false);
        }
      };
      es.onerror = () => {
        es.close();
        setStatus("연결 오류");
        setBusy(false);
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("오류");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="mb-3 text-sm font-medium">
        Walking Skeleton — 샘플 슬라이드로 AI 데모 생성(stub)
      </p>
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "진행 중…" : "데모 생성"}
      </button>

      <div className="mt-4" data-testid="status">
        상태: <span className="font-medium">{status}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
        <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {script && (
        <ol className="mt-4 space-y-2" data-testid="script">
          {script.map((s) => (
            <li
              key={s.slideIndex}
              className="rounded bg-neutral-50 p-2 text-sm dark:bg-neutral-900"
            >
              <span className="text-neutral-500">슬라이드 {s.slideIndex + 1}:</span> {s.text}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
