import { describe, expect, it } from "vitest";
import { computeComprehension } from "./rw-comprehension";

const auto = (i: number, ok: boolean) => ({ question_index: i, points: ok ? 2 : 0, status: "auto_graded" as const });

describe("comprehension score", () => {
  it("8 correct answers out of 10 give 16/20", () => {
    const a = Array.from({ length: 10 }, (_, i) => auto(i, i < 8));
    expect(computeComprehension(a, 10)).toMatchObject({ points: 16, max: 20, scoreOn20: 16, percent: 80, complete: true });
  });
  it("10 correct answers give 20/20", () => {
    expect(computeComprehension(Array.from({ length: 10 }, (_, i) => auto(i, true)), 10).points).toBe(20);
  });
  it("a partially correct open answer graded 1 adds 1 point", () => {
    const a = [...Array.from({ length: 9 }, (_, i) => auto(i, true)), { question_index: 9, points: 1, status: "graded" as const }];
    expect(computeComprehension(a, 10).points).toBe(19);
  });
  it("an open answer awaiting the coach is not complete and counts 0", () => {
    const a = [...Array.from({ length: 9 }, (_, i) => auto(i, true)), { question_index: 9, points: null, status: "pending" as const }];
    expect(computeComprehension(a, 10)).toMatchObject({ points: 18, pending: 1, complete: false });
  });
  it("points never exceed 2 per question", () => {
    expect(computeComprehension([{ question_index: 0, points: 5, status: "graded" }], 10).points).toBe(2);
  });
});
