/**
 * 정확도 eval (품질 플랜 Q1-1) — 분석 메트릭이 정답셋과 얼마나 일치하는지 측정.
 * 실행: `pnpm eval:accuracy`. 모델 불요(전사 라벨 기반, 결정적).
 *
 * 현재: 필러 검출 precision/recall/F1. 오디오 기반(STT·발음 GOP) eval은 모델 게이트로 후속.
 */
import { readFileSync } from "node:fs";
import { type FillerSample, evalFillers } from "@/lib/eval/accuracy";

const data = JSON.parse(readFileSync("eval/accuracy/fillers.json", "utf8")) as {
  samples: FillerSample[];
};

const { overall, missed } = evalFillers(data.samples);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

console.log("\n  iamspeaker 정확도 eval — 필러 검출\n");
console.log(`  샘플 ${data.samples.length}개`);
console.log(
  `  precision ${pct(overall.precision)} · recall ${pct(overall.recall)} · F1 ${pct(overall.f1)}`,
);
console.log(`  (tp=${overall.tp} fp=${overall.fp} fn=${overall.fn})`);
if (missed.length > 0) {
  console.log(`  ⚠️ 미검출(재현율 갭): ${[...new Set(missed)].join(", ")}`);
}

// 회귀 가드: F1이 기준 밑으로 떨어지면 실패(개선분 보호). 정답셋 확장·다어절·like-동사 규칙 반영.
const MIN_F1 = 0.9;
console.log(`\n  게이트 F1>=${pct(MIN_F1)} → ${overall.f1 >= MIN_F1 ? "PASS" : "FAIL"}\n`);
if (overall.f1 < MIN_F1) process.exit(1);
