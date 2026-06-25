/**
 * TED 황금 기준선 실측 (품질 Q1-3, B-001 활용1) — TED-LIUM STM 전사에서 WPM 분포를 산출한다.
 *
 * 코퍼스 게이트(CI 제외): TED-LIUM은 CC BY-NC-ND 3.0·대용량이라 repo에 번들하지 않는다.
 * 사용자가 로컬에 받은 코퍼스 디렉터리를 `TEDLIUM_DIR`로 지정해 측정한다.
 *   예) TEDLIUM_DIR=~/corpora/TEDLIUM_release-3 pnpm baseline:ted
 *
 * 출력: WPM 분포 요약 + `lib/analysis/baselines/talk.json`의 wpm 블록에 드롭인할 제안값.
 * **원문 전사/오디오는 읽기만 하고 저장하지 않는다 — 숫자(분포)만 산출**한다.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.env.TEDLIUM_DIR;
if (!dir) {
  console.log(
    [
      "TEDLIUM_DIR 미설정 — 측정을 건너뜁니다.",
      "TED-LIUM(CC BY-NC-ND 3.0, gated/대용량)을 로컬에 받아 디렉터리를 지정하세요:",
      "  TEDLIUM_DIR=/path/to/TEDLIUM_release-3 pnpm baseline:ted",
      "STM(*.stm) 파일을 재귀 탐색해 talk별 WPM 분포를 산출합니다(원문 미저장).",
    ].join("\n"),
  );
  process.exit(0);
}

const { parseStmLine, aggregateTalks, talkWpm, distribution, suggestWpmBaseline } = await import(
  "../lib/eval/ted-baseline"
);

/** dir 하위 *.stm 파일을 재귀 수집. */
function findStmFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.toLowerCase().endsWith(".stm")) out.push(p);
    }
  };
  walk(root);
  return out;
}

const stmFiles = findStmFiles(dir);
if (stmFiles.length === 0) {
  console.error(`STM 파일을 찾지 못했습니다: ${dir} (하위에 *.stm 필요)`);
  process.exit(1);
}

const segments = stmFiles.flatMap((f) =>
  readFileSync(f, "utf8")
    .split("\n")
    .map(parseStmLine)
    .filter((s): s is NonNullable<typeof s> => s !== null),
);

const talks = aggregateTalks(segments);
const voicedWpm = talks
  .map((t) => talkWpm(t, "voiced"))
  .filter((w): w is number => w !== null && w > 0 && w < 400); // 비현실값(전사 오류) 컷
const dist = distribution(voicedWpm);
const suggestion = suggestWpmBaseline(dist);

console.log(`STM 파일: ${stmFiles.length} · talk: ${talks.length} · 유효 WPM 표본: ${dist.n}`);
console.log("WPM 분포(말하기 속도, voiced):");
console.table({
  mean: round(dist.mean),
  p10: round(dist.p10),
  p25: round(dist.p25),
  p50: round(dist.p50),
  p75: round(dist.p75),
  p90: round(dist.p90),
  min: round(dist.min),
  max: round(dist.max),
});
console.log("\nlib/analysis/baselines/talk.json 의 metrics.wpm 드롭인 제안:");
console.log(JSON.stringify(suggestion, null, 2));
console.log(
  `\n출처 헤더 예: "TED-LIUM 측정(N=${dist.n} talks, p50=${round(dist.p50)}wpm, 말하기속도). 원문 미보관."`,
);

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
