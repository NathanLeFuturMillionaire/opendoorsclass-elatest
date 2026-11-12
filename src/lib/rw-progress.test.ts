import { describe, expect, it } from "vitest";
import { computeRwProgress, rwCurrentWeek, rwReportCsv } from "./rw-progress";

const now = new Date("2026-11-12T12:00:00");
const s = (lesson_id: string, status: "submitted" | "redo" | "validated", score: number | null = null) => ({ lesson_id, status, score, created_at: "2026-11-01" });

describe("rw progress", () => {
  it("week is 1 without or before the start date, capped at 20", () => {
    expect(rwCurrentWeek(null, now)).toBe(1);
    expect(rwCurrentWeek("2026-12-01", now)).toBe(1);
    expect(rwCurrentWeek("2026-11-01", now)).toBe(2);
    expect(rwCurrentWeek("2024-01-01", now)).toBe(20);
    expect(rwCurrentWeek("not a date", now)).toBe(1);
  });
  it("counts each validated lesson once and ignores resolved redo", () => {
    const p = computeRwProgress([s("a", "redo"), s("a", "validated", 14), s("a", "validated", 18), s("b", "submitted")], null, now);
    expect(p.validated).toBe(1);
    expect(p.redo).toBe(0);
    expect(p.pending).toBe(1);
    expect(p.averageScore).toBe(16);
  });
  it("progress percent is out of 120 sessions", () => {
    const subs = Array.from({ length: 60 }, (_, i) => s(`l${i}`, "validated"));
    expect(computeRwProgress(subs, null, now).percent).toBe(50);
  });
  it("delay counts 6 sessions per elapsed week", () => {
    const p = computeRwProgress([s("a", "validated")], "2026-10-22", now); // week 4
    expect(p.expected).toBe(18);
    expect(p.behind).toBe(17);
  });
  it("bright badge needs 5 scores averaging 16", () => {
    const four = [1, 2, 3, 4].map((i) => s(`l${i}`, "validated", 20));
    expect(computeRwProgress(four, null, now).badges.find((b) => b.id === "bright")?.earned).toBe(false);
    expect(computeRwProgress([...four, s("l5", "validated", 16)], null, now).badges.find((b) => b.id === "bright")?.earned).toBe(true);
  });
  it("ignores out of range scores and survives empty input", () => {
    expect(computeRwProgress([s("a", "validated", 99)], null, now).averageScore).toBeNull();
    expect(computeRwProgress(undefined as never, null, now).validated).toBe(0);
  });
  it("csv escapes separators", () => {
    expect(rwReportCsv([{ name: "Doe; Jane", level: "A1", coach: "X", p: computeRwProgress([], null, now) }]).split("\n")[1]).toContain('"Doe; Jane"');
  });
});
