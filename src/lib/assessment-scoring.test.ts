import { describe, expect, it } from "vitest";
import { computeAssessmentScore, parseProduction, type ScoringItem } from "./assessment-scoring";

const mcq = (id: string, level: string, category = "grammar"): ScoringItem => ({ id, level, category, correct_answer: "a" });
const prod = (id: string, level: string, category: "writing" | "speaking"): ScoringItem => ({ id, level, category, correct_answer: null });

describe("parseProduction", () => {
  it("keeps missing, pending, skipped and graded apart", () => {
    expect(parseProduction(undefined).state).toBe("missing");
    expect(parseProduction(JSON.stringify({ text: "Hello", pending: true })).state).toBe("pending");
    expect(parseProduction(JSON.stringify({ transcript: "", score: 0, skipped: true })).state).toBe("skipped");
    expect(parseProduction(JSON.stringify({ text: "Hi", score: 0, feedback: "Hors sujet" }))).toEqual({ state: "graded", score: 0 });
  });
  it("treats a legacy failed grading (0, no feedback, real text) as pending", () => {
    expect(parseProduction(JSON.stringify({ text: "My new job is great", score: 0, feedback: "" })).state).toBe("pending");
  });
  it("treats unscored plain text as pending", () => {
    expect(parseProduction("I like my school").state).toBe("pending");
  });
});

describe("computeAssessmentScore", () => {
  it("gives partial credit: a 58/100 writing shows 58%, not 0%", () => {
    const r = computeAssessmentScore([prod("w", "B1", "writing")], { w: JSON.stringify({ text: "x", score: 58, feedback: "ok" }) });
    expect(r.perCategory["writing"]?.percent).toBe(58);
  });
  it("18 correct out of 20 same level items gives 90%", () => {
    const items = Array.from({ length: 20 }, (_, i) => mcq(`q${i}`, "A1"));
    const answers = Object.fromEntries(items.map((q, i) => [q.id, i < 18 ? "a" : "b"]));
    const r = computeAssessmentScore(items, answers);
    expect(r.perCategory["grammar"]?.percent).toBe(90);
    expect(r.score).toBe(90);
  });
  it("excludes pending items from percentages and flags the result", () => {
    const r = computeAssessmentScore([mcq("g", "A1"), prod("w", "B1", "writing")], { g: "a", w: JSON.stringify({ text: "x", pending: true }) });
    expect(r.perCategory["writing"]).toMatchObject({ total: 0, pending: 1 });
    expect(r.score).toBe(100);
    expect(r.provisional).toBe(true);
  });
  it("a pending answer never lifts the level", () => {
    const items = [mcq("a1", "A1"), mcq("b1a", "B1"), mcq("b1b", "B1"), prod("w", "B1", "writing")];
    const r = computeAssessmentScore(items, { a1: "a", b1a: "a", b1b: "b", w: JSON.stringify({ text: "x", pending: true }) });
    // B1 is 1 out of 3 when the pending item counts as 0, below 70%.
    expect(r.levelResult).toBe("A1");
  });
  it("a strong writing helps reach the level it belongs to", () => {
    const items = [mcq("a1", "A1"), mcq("b1a", "B1"), mcq("b1b", "B1"), prod("w", "B1", "writing")];
    const r = computeAssessmentScore(items, { a1: "a", b1a: "a", b1b: "b", w: JSON.stringify({ text: "x", score: 90, feedback: "Bien" }) });
    // (1 + 0 + 0.9) / 3 = 63% stays below 70%, with a good second answer it passes.
    expect(r.levelResult).toBe("A1");
    const r2 = computeAssessmentScore(items, { a1: "a", b1a: "a", b1b: "a", w: JSON.stringify({ text: "x", score: 90, feedback: "Bien" }) });
    expect(r2.levelResult).toBe("B1");
  });
  it("a missing answer and a real zero both count 0 but missing is tracked", () => {
    const r = computeAssessmentScore([prod("s", "B2", "speaking")], {});
    expect(r.perCategory["speaking"]).toMatchObject({ total: 1, percent: 0, missing: 1, pending: 0 });
  });
  it("stops at the first failed level of the ladder", () => {
    const items = [mcq("a1", "A1"), mcq("a2", "A2"), mcq("b1", "B1")];
    expect(computeAssessmentScore(items, { a1: "a", a2: "b", b1: "a" }).levelResult).toBe("A1");
    expect(computeAssessmentScore(items, { a1: "a", a2: "a", b1: "a" }).levelResult).toBe("B1");
  });
  it("weights the global score by level (A1 = 1 up to C2 = 6)", () => {
    const r = computeAssessmentScore([mcq("a", "A1"), mcq("c", "C2")], { a: "b", c: "a" });
    expect(r.score).toBe(86);
  });
});

describe("skill percent", () => {
  it("is points obtained over items evaluated, whatever the levels", () => {
    const r = computeAssessmentScore([mcq("a", "A1"), mcq("c", "C2")], { a: "b", c: "a" });
    expect(r.perCategory["grammar"]).toMatchObject({ correct: 1, total: 2, percent: 50 });
  });
});
