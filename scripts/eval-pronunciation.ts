/**
 * 발음 스코어러 절대 정확도 eval (품질 Q1-4 잔여) — speechocean762(L2 영어) 전문가 점수 대비.
 *
 * 코퍼스 게이트(CI 제외): speechocean762(OpenSLR 101, 퍼미시브)를 로컬에 받아 지정.
 *   SPEECHOCEAN762_DIR=~/corpora/speechocean762 PRONUNCIATION_SCORER=wav2vec2 \
 *     [LIMIT=50] pnpm eval:pronunciation
 *
 * 단어 단위 비교(IPA↔ARPAbet 음소 정렬 불필요):
 *  - 검출 PRF: 우리가 오발음으로 플래그한 단어 vs 전문가 word accuracy<임계.
 *  - 발화 단조성(Spearman): 우리 점수(1−이슈율) vs 전문가 발화 accuracy.
 * **원문/오디오는 읽기만 — 메트릭 숫자만 산출.**
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.env.SPEECHOCEAN762_DIR;
if (!dir) {
  console.log(
    [
      "SPEECHOCEAN762_DIR 미설정 — 측정을 건너뜁니다.",
      "speechocean762(OpenSLR 101, 퍼미시브)를 로컬에 받아 지정하세요:",
      "  SPEECHOCEAN762_DIR=/path/to/speechocean762 PRONUNCIATION_SCORER=wav2vec2 pnpm eval:pronunciation",
      "전문가 점수 대비 단어 검출 PRF + 발화 Spearman을 산출합니다(원문 미저장).",
    ].join("\n"),
  );
  process.exit(0);
}

const scoresPath = join(dir, "resource", "scores.json");
if (!existsSync(scoresPath)) {
  console.error(`scores.json을 찾지 못했습니다: ${scoresPath}`);
  process.exit(1);
}

const { parseSpeechocean, goldWordMispronounced, spearman } = await import(
  "../lib/eval/pronunciation"
);
const { prf } = await import("../lib/eval/accuracy");
const { getPronunciationScorer } = await import("../lib/ai/factory");
const { normalizeToWav } = await import("../lib/audio");
const { mkdtempSync } = await import("node:fs");
const { tmpdir } = await import("node:os");

const limit = Number(process.env.LIMIT ?? 50);
const utterances = parseSpeechocean(JSON.parse(readFileSync(scoresPath, "utf8"))).slice(0, limit);

/** uttid → wav 경로. train/test의 wav.scp를 읽어 매핑(상대/절대 모두 처리). */
function loadWavMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const split of ["train", "test"]) {
    const scp = join(dir as string, split, "wav.scp");
    if (!existsSync(scp)) continue;
    for (const line of readFileSync(scp, "utf8").split("\n")) {
      const [id, ...rest] = line.trim().split(/\s+/);
      const p = rest.join(" ");
      if (!id || !p) continue;
      const resolved = [p, join(dir as string, p), join(dir as string, split, p)].find((c) =>
        existsSync(c),
      );
      if (resolved) map.set(id, resolved);
    }
  }
  return map;
}

const wavMap = loadWavMap();
const scorer = getPronunciationScorer();
const tmp = mkdtempSync(join(tmpdir(), "iamspeaker-pron-"));

const predicted: boolean[] = [];
const gold: boolean[] = [];
const ourUtt: number[] = [];
const expertUtt: number[] = [];
let evaluated = 0;

for (const utt of utterances) {
  const wav = wavMap.get(utt.id);
  if (!wav || utt.words.length === 0) continue;
  let norm: string;
  try {
    norm = join(tmp, `${utt.id}.wav`);
    await normalizeToWav(wav, norm);
  } catch {
    continue;
  }

  const words = utt.text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => ({ word: w, startSec: i * 0.5, endSec: i * 0.5 + 0.4, confidence: 1 }));

  let result: Awaited<ReturnType<typeof scorer.detect>>;
  try {
    result = await scorer.detect({ wavFilePath: norm, words, referenceText: utt.text });
  } catch {
    continue;
  }
  const flagged = new Set(result.issues.map((i) => i.word.toLowerCase()));

  for (const w of utt.words) {
    predicted.push(flagged.has(w.text));
    gold.push(goldWordMispronounced(w));
  }
  ourUtt.push(1 - result.issues.length / utt.words.length);
  expertUtt.push(utt.accuracy);
  evaluated++;
}

if (evaluated === 0) {
  console.error("평가된 발화 0 — wav.scp 경로/모델 설정을 확인하세요.");
  process.exit(1);
}

const detection = prf(predicted, gold);
const rho = spearman(ourUtt, expertUtt);
console.log(`평가 발화: ${evaluated} · 단어: ${gold.length}`);
console.log("단어 오발음 검출 PRF:");
console.table({
  precision: round(detection.precision),
  recall: round(detection.recall),
  f1: round(detection.f1),
  tp: detection.tp,
  fp: detection.fp,
  fn: detection.fn,
});
console.log(`발화 단조성 Spearman(우리 1−이슈율 vs 전문가 accuracy): ${round(rho)}`);

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
