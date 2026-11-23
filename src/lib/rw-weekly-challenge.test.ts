import { describe, expect, it } from "vitest";
import {
  compareRwWeeklyChallengeEntries,
  rwWeeklyChallengeEligible,
  rwWeeklyChallengePlaneOffset,
  rwWeeklyChallengeProgress,
} from "./rw-weekly-challenge";

const entry = (learner_id: string, validated_count: number, completed_at: string | null) => ({
  learner_id,
  validated_count,
  completed_at,
  progress: rwWeeklyChallengeProgress(validated_count),
});

describe("Weekly Reading Challenge rules", () => {
  it("uses the existing six-reading weekly target", () => {
    expect(rwWeeklyChallengeProgress(0)).toBe(0);
    expect(rwWeeklyChallengeProgress(1)).toBe(17);
    expect(rwWeeklyChallengeProgress(2)).toBe(33);
    expect(rwWeeklyChallengeProgress(3)).toBe(50);
    expect(rwWeeklyChallengeProgress(6)).toBe(100);
    expect(rwWeeklyChallengeProgress(9)).toBe(100);
  });

  it("requires progress strictly greater than two percent", () => {
    expect(rwWeeklyChallengeEligible(0)).toBe(false);
    expect(rwWeeklyChallengeEligible(2)).toBe(false);
    expect(rwWeeklyChallengeEligible(2.01)).toBe(true);
    expect(rwWeeklyChallengeEligible(17)).toBe(true);
  });

  it("uses more distinct validations to break a 100 percent tie", () => {
    const six = entry("learner-six", 6, "2026-11-20T10:00:00Z");
    const seven = entry("learner-seven", 7, "2026-11-20T11:00:00Z");
    expect(compareRwWeeklyChallengeEntries(seven, six)).toBeLessThan(0);
    expect(compareRwWeeklyChallengeEntries(six, seven)).toBeGreaterThan(0);
  });

  it("uses the earliest real completion when progress and validations tie", () => {
    const early = entry("learner-b", 2, "2026-11-17T10:00:00Z");
    const late = entry("learner-a", 2, "2026-11-18T10:00:00Z");
    expect([late, early].sort(compareRwWeeklyChallengeEntries).map((item) => item.learner_id)).toEqual(["learner-b", "learner-a"]);
  });

  it("uses the learner id only as a final deterministic tie-breaker", () => {
    const a = entry("learner-a", 1, "2026-11-17T10:00:00Z");
    const b = entry("learner-b", 1, "2026-11-17T10:00:00Z");
    expect([b, a].sort(compareRwWeeklyChallengeEntries).map((item) => item.learner_id)).toEqual(["learner-a", "learner-b"]);
  });

  it("maps the plane position directly to real progress and guards invalid values", () => {
    expect(rwWeeklyChallengePlaneOffset(17)).toBe(17);
    expect(rwWeeklyChallengePlaneOffset(50)).toBe(50);
    expect(rwWeeklyChallengePlaneOffset(100)).toBe(100);
    expect(rwWeeklyChallengePlaneOffset(-4)).toBe(0);
    expect(rwWeeklyChallengePlaneOffset(120)).toBe(100);
    expect(rwWeeklyChallengePlaneOffset(Number.NaN)).toBe(0);
  });
});
