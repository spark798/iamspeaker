import { spawn } from "node:child_process";
import type { PronunciationInput, PronunciationScorerAdapter } from "@/lib/ai/types";
import { matchL1RuleByPhoneme } from "@/lib/analysis/pronunciation";
import { config } from "@/lib/config";
import type { PhonemeRule, PronunciationIssue } from "@/lib/domain";
import { z } from "zod";

/** gop.py 출력 — 단어별 음향 평가(confidence 0..1 = 평균 음소 사후확률). */
const GopSchema = z.object({
  words: z.array(
    z.object({
      word: z.string(),
      startSec: z.coerce.number(),
      confidence: z.coerce.number(),
      worstPhoneme: z.string().optional(),
    }),
  ),
});
export type GopWord = z.infer<typeof GopSchema>["words"][number];

/**
 * GOP 단어 점수 → 발음 이슈(순수 함수, 테스트 가능). confidence < threshold인 단어를 플래그하고,
 * 오발음 음소(worstPhoneme)를 L1 규칙과 음소 단위로 교차해 l1Related·교정 팁을 부여.
 */
export function gopWordsToIssues(
  words: GopWord[],
  rules: PhonemeRule[],
  threshold = 0.5,
): PronunciationIssue[] {
  const out: PronunciationIssue[] = [];
  for (const w of words) {
    if (w.confidence >= threshold) continue;
    const rule = w.worstPhoneme ? matchL1RuleByPhoneme(w.worstPhoneme, rules) : undefined;
    const phonemeNote = w.worstPhoneme ? ` (/${w.worstPhoneme}/ 발음 주의)` : "";
    out.push({
      word: w.word,
      expectedSound: rule ? rule.description : `발음 정확도가 낮게 측정됨${phonemeNote}`,
      confidence: Math.round(w.confidence * 100) / 100,
      timestamp: w.startSec,
      l1Related: rule !== undefined,
    });
  }
  return out;
}

/**
 * wav2vec2 음소 CTC + 강제정렬(GOP) 기반 발음 평가(옵션, env 게이트).
 * 대본(referenceText)을 오디오에 강제정렬해 음소별 발음 정확도를 산출 → STT 타임스탬프에 의존하지 않음.
 * Python 스코어러(scripts/pronunciation/gop.py)를 서브프로세스로 호출(배열 인자 spawn, 보안 §10).
 */
export class Wav2Vec2PronunciationScorer implements PronunciationScorerAdapter {
  /** 음향 confidence가 이 값 미만이면 발음 이슈로 플래그(env로 보정). */
  private readonly threshold = config.WAV2VEC2_GOP_THRESHOLD;

  async detect(input: PronunciationInput): Promise<PronunciationIssue[]> {
    const reference = (input.referenceText ?? input.words.map((w) => w.word).join(" ")).trim();
    if (!reference) return [];

    const parsed = GopSchema.parse(await this.runScorer({ wav: input.wavFilePath, reference }));
    const rules = input.l1Profile?.commonPronunciationIssues ?? [];
    return gopWordsToIssues(parsed.words, rules, this.threshold);
  }

  private runScorer(payload: { wav: string; reference: string }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const proc = spawn(
        config.PYTHON_BIN,
        ["scripts/pronunciation/gop.py", "--model", config.WAV2VEC2_PHONEME_MODEL],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => {
        stdout += d.toString();
      });
      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`gop.py 실패 (code ${code}): ${stderr.slice(-400)}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error(`gop.py 출력 파싱 실패: ${stdout.slice(-200)}`));
        }
      });
      proc.stdin.write(JSON.stringify(payload));
      proc.stdin.end();
    });
  }
}
