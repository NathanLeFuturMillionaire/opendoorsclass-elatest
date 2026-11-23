import { describe, expect, it } from "vitest";
import { computeComprehension, congratulationMessage, shouldCelebrateComprehension } from "./rw-comprehension";

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

describe("confettis de fin de compréhension", () => {
  const score = (correct: number) => computeComprehension(
    Array.from({ length: 10 }, (_, i) => auto(i, i < correct)),
    10,
  );

  it("ne déclenche rien à 14/20", () => {
    expect(shouldCelebrateComprehension(score(7))).toBe(false);
  });

  it("ne déclenche rien à 15/20", () => {
    expect(shouldCelebrateComprehension(score(7))).toBe(false);
    const fifteen = [...Array.from({ length: 7 }, (_, i) => auto(i, true)), { question_index: 7, points: 1, status: "graded" as const }, auto(8, false), auto(9, false)];
    expect(computeComprehension(fifteen, 10).scoreOn20).toBe(15);
    expect(shouldCelebrateComprehension(computeComprehension(fifteen, 10))).toBe(false);
  });

  it("déclenche les confettis à 16/20 après toutes les réponses", () => {
    expect(shouldCelebrateComprehension(score(8))).toBe(true);
  });

  it("déclenche les confettis à 20/20", () => {
    expect(shouldCelebrateComprehension(score(10))).toBe(true);
  });

  it("attend la correction de toutes les questions ouvertes", () => {
    const pending = [...Array.from({ length: 9 }, (_, i) => auto(i, true)), { question_index: 9, points: null, status: "pending" as const }];
    expect(shouldCelebrateComprehension(computeComprehension(pending, 10))).toBe(false);
  });

  it("utilise le message adapté à chaque niveau de réussite", () => {
    expect(congratulationMessage(16)).toBe("Très bien ! Tu progresses, continue ainsi !");
    expect(congratulationMessage(18)).toBe("Excellent travail ! Tes efforts commencent à porter leurs fruits !");
    expect(congratulationMessage(20)).toBe("Félicitations ! Tu as réalisé une excellente performance !");
    expect(congratulationMessage(15)).toBe("");
  });
});
