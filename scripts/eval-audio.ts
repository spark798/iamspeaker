/**
 * 오디오 정확도 eval (품질 플랜 Q1-6) — 실제 파이프라인으로 WPM·발음을 정답과 비교.
 * 모델 게이트(CI 제외): piper(합성)·whisper(STT) 필요, 발음은 PRONUNCIATION_SCORER=wav2vec2.
 * 실행: `pnpm eval:audio`  (예: PRONUNCIATION_SCORER=wav2vec2 pnpm eval:audio)
 *
 * 합성 음성으로 파이프라인 정합성을 회귀 검증한다(인간 코퍼스가 아니므로 절대정확도가 아닌 plumbing·방향성).
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

try {
  process.loadEnvFile(".env");
} catch {
  // 기본값
}

const { config } = await import("../lib/config");
const { normalizeToWav, readWavDurationSec } = await import("../lib/audio");
const { WhisperCppStt } = await import("../lib/ai/whispercpp");
const { computeWpm } = await import("../lib/analysis/speech");
const { getPronunciationScorer } = await import("../lib/ai/factory");
const { wpmAccuracy } = await import("../lib/eval/audio");
const { prf } = await import("../lib/eval/accuracy");

const dir = mkdtempSync(join(tmpdir(), "iamspeaker-audioeval-"));
const voice = join(config.PIPER_VOICE_DIR, `${config.PIPER_DEFAULT_VOICE}.onnx`);

function piper(text: string, out: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(config.PIPER_BIN, ["-m", voice, "-f", out], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let err = "";
    p.stderr.on("data", (d) => {
      err += d.toString();
    });
    p.on("error", reject);
    p.on("close", (c) =>
      c === 0 ? resolve() : reject(new Error(`piper ${c}: ${err.slice(-200)}`)),
    );
    p.stdin.write(text);
    p.stdin.end();
  });
}

const stt = new WhisperCppStt();
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

// 합성 → 16k 정규화 → 경로 반환
async function synth(text: string, id: string): Promise<{ wav: string; dur: number }> {
  const raw = join(dir, `${id}.wav`);
  const wav = join(dir, `${id}.16k.wav`);
  await piper(text, raw);
  await normalizeToWav(raw, wav);
  return { wav, dur: readWavDurationSec(wav) };
}

async function main() {
  console.log("\n  iamspeaker 오디오 eval (모델 게이트)\n");

  // 1) WPM 정확도
  const wpmTexts = [
    "Our solution reduces customer churn significantly using predictive machine learning models",
    "I think the weather is nice today and we should go outside",
  ];
  const wpmCases = [];
  for (let i = 0; i < wpmTexts.length; i++) {
    const text = wpmTexts[i] as string;
    const { wav, dur } = await synth(text, `wpm${i}`);
    const t = await stt.transcribe({ wavFilePath: wav });
    const measured = computeWpm(t.words.length, dur);
    const expected = computeWpm(wordCount(text), dur);
    wpmCases.push({ id: `wpm${i}`, expected, measured });
    console.log(
      `  WPM[${i}] 기대=${expected} 측정=${measured} (${dur.toFixed(1)}s, STT ${t.words.length}/${wordCount(text)}단어)`,
    );
  }
  const wa = wpmAccuracy(wpmCases);
  console.log(
    `  → MAE ${wa.mae} WPM · MAPE ${(wa.mape * 100).toFixed(1)}% · ±15% 이내 ${(wa.withinTolerance * 100).toFixed(0)}%\n`,
  );

  // 2) 발음 정확도(wav2vec2 GOP 일 때만 의미)
  if (config.PRONUNCIATION_SCORER === "wav2vec2") {
    const scorer = getPronunciationScorer();
    type Case = { id: string; audioText: string; reference: string; gold: string[] };
    const pron: Case[] = [
      {
        id: "clean",
        audioText: "I think the weather is nice",
        reference: "I think the weather is nice",
        gold: [],
      },
      {
        id: "gross",
        audioText: "I think the cat is nice",
        reference: "I think the weather is nice",
        gold: ["weather"],
      },
    ];
    const predicted: boolean[] = [];
    const gold: boolean[] = [];
    for (const c of pron) {
      const { wav } = await synth(c.audioText, `pron-${c.id}`);
      const t = await stt.transcribe({ wavFilePath: wav });
      const issues = await scorer.detect({
        wavFilePath: wav,
        words: t.words,
        referenceText: c.reference,
      });
      const flagged = new Set(issues.map((x) => x.word.toLowerCase().replace(/[^a-z]/g, "")));
      const goldSet = new Set(c.gold);
      for (const w of c.reference.split(/\s+/)) {
        const lw = w.toLowerCase().replace(/[^a-z]/g, "");
        predicted.push(flagged.has(lw));
        gold.push(goldSet.has(lw));
      }
      console.log(
        `  발음[${c.id}] 플래그=${[...flagged].join(",") || "-"} (정답=${c.gold.join(",") || "-"})`,
      );
    }
    const r = prf(predicted, gold);
    console.log(
      `  → precision ${(r.precision * 100).toFixed(0)}% · recall ${(r.recall * 100).toFixed(0)}% · F1 ${(r.f1 * 100).toFixed(0)}%\n`,
    );
  } else {
    console.log("  발음 eval 생략 — PRONUNCIATION_SCORER=wav2vec2 로 실행하세요.\n");
  }

  // 게이트: WPM ±15% 이내 100%.
  if (wa.withinTolerance < 1) {
    console.log("  ❌ WPM 정확도 게이트 미달");
    process.exit(1);
  }
  console.log("  ✅ 게이트 통과\n");
}

main().catch((e) => {
  console.error("audio eval 실패(모델 미설치 가능):", e instanceof Error ? e.message : e);
  process.exit(1);
});
