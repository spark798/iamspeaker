import { estimateSpeakingSec } from "@/lib/script/estimate";

/** 초 → SRT 타임스탬프 `HH:MM:SS,mmm`. */
export function formatTimestamp(totalSec: number): string {
  const ms = Math.max(0, Math.round(totalSec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(millis, 3)}`;
}

export interface SrtCue {
  /** 원문 자막. */
  text: string;
  /** 병기 번역(선택) — 둘째 줄로 표시. */
  translation?: string;
}

/**
 * 큐 목록을 SRT 문자열로. 각 큐의 길이는 발화 추정 시간(estimateSpeakingSec)으로 산출해 순차 배치.
 * AI 데모엔 실제 타임스탬프가 없으므로 추정 페이싱(기본 130 wpm)을 쓴다.
 */
export function buildSrt(cues: SrtCue[], wpm = 130): string {
  let cursor = 0;
  return cues
    .map((cue, i) => {
      const dur = Math.max(1, estimateSpeakingSec([cue.text], wpm));
      const start = cursor;
      const end = cursor + dur;
      cursor = end;
      const lines = [cue.text, ...(cue.translation ? [cue.translation] : [])].join("\n");
      return `${i + 1}\n${formatTimestamp(start)} --> ${formatTimestamp(end)}\n${lines}`;
    })
    .join("\n\n")
    .concat(cues.length > 0 ? "\n" : "");
}
