"use client";

import { AnswerRecorder } from "@/components/answer-recorder";
import { errorKeyForStatus } from "@/lib/api/error-key";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Question {
  id: string;
  question: string;
  relatedSlideIndex: number;
  difficulty: "easy" | "tough";
  category: string;
}

export function QaView({ sessionId }: { sessionId: string }) {
  const t = useTranslations("qa");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/sessions/${sessionId}/qa`)
      .then((r) => r.json())
      .then((b: { questions: Question[] }) => setQuestions(b.questions))
      .catch(() => setError(te("loadFailed")));
  }, [sessionId, te]);

  useEffect(() => load(), [load]);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/qa/generate`, { method: "POST" });
      if (!res.ok) throw new Error(te(errorKeyForStatus(res.status) ?? "parseFailed"));
      const { jobId } = (await res.json()) as { jobId: string };
      const es = new EventSource(`/api/jobs/${jobId}/stream`);
      es.onmessage = (ev) => {
        const d = JSON.parse(ev.data) as { status: string; error?: string | null };
        if (d.status === "succeeded") {
          es.close();
          load();
          setBusy(false);
        } else if (d.status === "failed") {
          es.close();
          setError(d.error ?? te("parseFailed"));
          setBusy(false);
        }
      };
      es.onerror = () => {
        es.close();
        setError(te("connection"));
        setBusy(false);
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }, [sessionId, te, load]);

  const hasQuestions = questions.length > 0;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("generating") : hasQuestions ? t("regenerate") : t("generate")}
        </button>
        <Link
          href={`/progress?session=${sessionId}`}
          className="ml-auto text-sm font-medium text-brand hover:underline"
        >
          {t("toProgress")}
        </Link>
      </div>

      {busy && <p className="text-xs text-neutral-400">{tc("slowHint")}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {!hasQuestions && !busy && <p className="text-sm text-neutral-500">{t("empty")}</p>}

      <ol className="space-y-3">
        {questions.map((q) => (
          <li
            key={q.id}
            className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <div className="mb-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  q.difficulty === "tough"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                }`}
              >
                {t(q.difficulty)}
              </span>
              <span className="text-xs text-neutral-500">{t(`cat_${q.category}`)}</span>
              <span className="text-xs text-neutral-400">
                · {t("slide")} {q.relatedSlideIndex + 1}
              </span>
            </div>
            <p className="text-sm">{q.question}</p>
            <AnswerRecorder itemId={q.id} />
          </li>
        ))}
      </ol>
    </div>
  );
}
