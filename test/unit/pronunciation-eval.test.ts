import {
  goldWordMispronounced,
  parseSpeechocean,
  pearson,
  spearman,
} from "@/lib/eval/pronunciation";
import { describe, expect, it } from "vitest";

const SAMPLE = {
  "000010011": {
    text: "MARK IS CLEVER",
    accuracy: 8,
    words: [
      { text: "MARK", accuracy: 10, mispronunciations: [] },
      { text: "IS", accuracy: 9, mispronunciations: [] },
      {
        text: "CLEVER",
        accuracy: 4,
        mispronunciations: [{ "canonical-phone": "V", index: 3, "pronounced-phone": "W" }],
      },
    ],
  },
  "000010012": { text: "GO", accuracy: 5, words: [{ text: "GO", accuracy: 6 }] },
};

describe("parseSpeechocean", () => {
  it("utt→점수 dict를 정규화(단어 소문자·오발음 플래그)", () => {
    const us = parseSpeechocean(SAMPLE);
    expect(us).toHaveLength(2);
    const u = us[0];
    if (!u) throw new Error("expected utterance");
    expect(u.id).toBe("000010011");
    expect(u.accuracy).toBe(8);
    expect(u.words.map((w) => w.text)).toEqual(["mark", "is", "clever"]);
    expect(u.words[2]).toMatchObject({ accuracy: 4, hasMispronunciation: true });
    // mispronunciations 누락도 안전하게 false
    expect(parseSpeechocean(SAMPLE)[1]?.words[0]?.hasMispronunciation).toBe(false);
  });

  it("비객체 입력은 빈 배열", () => {
    expect(parseSpeechocean(null)).toEqual([]);
    expect(parseSpeechocean("x")).toEqual([]);
  });
});

describe("goldWordMispronounced", () => {
  it("accuracy<임계 또는 오발음 라벨이면 true", () => {
    expect(goldWordMispronounced({ text: "a", accuracy: 10, hasMispronunciation: false })).toBe(
      false,
    );
    expect(goldWordMispronounced({ text: "a", accuracy: 4, hasMispronunciation: false })).toBe(
      true,
    );
    expect(goldWordMispronounced({ text: "a", accuracy: 10, hasMispronunciation: true })).toBe(
      true,
    );
  });

  it("임계는 조정 가능", () => {
    expect(goldWordMispronounced({ text: "a", accuracy: 6, hasMispronunciation: false }, 5)).toBe(
      false,
    );
  });
});

describe("pearson / spearman", () => {
  it("완전 단조 증가는 +1", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 6);
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 6);
  });

  it("완전 역순은 -1", () => {
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 6);
  });

  it("비선형이어도 순위 단조면 Spearman=1(Pearson<1)", () => {
    const xs = [1, 2, 3, 4];
    const ys = [1, 4, 9, 16];
    expect(spearman(xs, ys)).toBeCloseTo(1, 6);
    expect(pearson(xs, ys)).toBeLessThan(1);
  });

  it("분산 0이면 0, 빈 배열도 0", () => {
    expect(spearman([1, 1, 1], [1, 2, 3])).toBe(0);
    expect(spearman([], [])).toBe(0);
  });
});
