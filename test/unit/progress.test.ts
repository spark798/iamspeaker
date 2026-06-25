import { type ProgressGoal, summarizeProgress } from "@/lib/analysis/progress";
import { describe, expect, it } from "vitest";

const GOAL: ProgressGoal = { wpmMin: 130, wpmMax: 150, fillerPerMinMax: 5 };
const DAY = 86_400_000;

function attempt(id: string, day: number, wpm: number | null, fpm: number | null) {
  return { recordingId: id, createdAt: day * DAY, wpm, fillerPerMin: fpm };
}

describe("summarizeProgress", () => {
  it("분석 회차 없으면 0 요약", () => {
    const s = summarizeProgress([attempt("a", 1, null, null)], GOAL);
    expect(s.analyzedCount).toBe(0);
    expect(s.goalMetCount).toBe(0);
    expect(s.wpm).toBeUndefined();
  });

  it("첫→최신 개선(필러 감소·WPM 목표 근접)", () => {
    const s = summarizeProgress(
      [
        attempt("a", 1, 100, 8), // 느림·필러 많음
        attempt("b", 2, 140, 3), // 목표 안·필러 적음
      ],
      GOAL,
    );
    expect(s.analyzedCount).toBe(2);
    expect(s.fillerPerMin).toMatchObject({ first: 8, latest: 3, improved: true });
    expect(s.wpm).toMatchObject({ first: 100, latest: 140, improved: true });
  });

  it("악화 시 improved=false", () => {
    const s = summarizeProgress([attempt("a", 1, 140, 2), attempt("b", 2, 140, 6)], GOAL);
    expect(s.fillerPerMin?.improved).toBe(false);
  });

  it("목표 달성 카운트 + 최신 달성 여부", () => {
    const s = summarizeProgress(
      [
        attempt("a", 1, 120, 4), // WPM 미달
        attempt("b", 2, 140, 4), // 달성
        attempt("c", 3, 145, 7), // 필러 초과
      ],
      GOAL,
    );
    expect(s.goalMetCount).toBe(1);
    expect(s.latestMeetsGoal).toBe(false);
  });

  it("베스트 테이크 = 필러 최저 / WPM 목표 근접(recordingId)", () => {
    const s = summarizeProgress(
      [
        attempt("a", 1, 100, 9),
        attempt("b", 2, 135, 2), // 필러 최저 + WPM 목표 안
        attempt("c", 3, 200, 4),
      ],
      GOAL,
    );
    expect(s.bestFiller).toEqual({ recordingId: "b", value: 2 });
    expect(s.bestWpm).toEqual({ recordingId: "b", value: 135 });
  });

  it("스트릭 = 최신일 기준 연속 달력일(끊기면 멈춤)", () => {
    // day 5,4,3 연속 → 3, day 1은 끊김
    const s = summarizeProgress(
      [
        attempt("a", 1, 130, 3),
        attempt("b", 3, 130, 3),
        attempt("c", 4, 130, 3),
        attempt("d", 5, 130, 3),
      ],
      GOAL,
    );
    expect(s.streakDays).toBe(3);
  });

  it("같은 날 여러 회차는 하루로(스트릭 1)", () => {
    const s = summarizeProgress([attempt("a", 7, 130, 3), attempt("b", 7, 130, 3)], GOAL);
    expect(s.streakDays).toBe(1);
  });
});
