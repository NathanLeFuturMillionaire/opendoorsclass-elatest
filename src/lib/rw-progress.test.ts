import { describe, expect, it } from "vitest";
import {
  buildRwAlerts,
  buildRwWeeklySeries,
  computeRwComprehensionScore,
  computeRwProgress,
  computeRwWeek,
  rwCurrentWeek,
  rwReportCsv,
  rwWeekWindow,
  type RwProgressAnswer,
} from "./rw-progress";

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
    const p = computeRwProgress([s("a", "validated")], "2026-10-22", now);
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
  it("csv escapes separators and spreadsheet formulas", () => {
    const report = rwReportCsv([{ name: "Doe; Jane", level: "A1", coach: "=FORMULA()", p: computeRwProgress([], null, now) }]);
    expect(report.split("\n")[1]).toContain('"Doe; Jane"');
    expect(report).toContain("'=FORMULA()");
  });
});

describe("weekly reports", () => {
  const localNow = new Date(2026, 10, 19, 12, 0, 0);
  const monday = rwWeekWindow(0, localNow);

  it("starts on Monday and excludes the following Monday", () => {
    expect(monday.start.getDay()).toBe(1);
    expect(localDateKey(monday.start)).toBe("2026-11-16");
    expect(localDateKey(monday.end)).toBe("2026-11-23");
    expect(monday.key).toBe("2026-11-16");
  });

  it("counts six weekly validations once per lesson and uses review time", () => {
    const subs = Array.from({ length: 8 }, (_, index) => ({
      lesson_id: `lesson-${index}`,
      status: "validated" as const,
      score: 10 + index,
      created_at: "2026-11-15T10:00:00",
      reviewed_at: `2026-11-${String(16 + (index % 6)).padStart(2, "0")}T10:00:00`,
    }));
    const duplicate = { ...subs[0], score: 20, reviewed_at: "2026-11-18T12:00:00" };
    const weekly = computeRwWeek([...subs, duplicate], [], monday);
    expect(weekly.validated).toBe(8);
    expect(weekly.percent).toBe(100);
    expect(weekly.submissions).toBe(0);
    expect(weekly.averageScore).toBe(14.8);
  });

  it("computes comprehension on 20 and ignores pending answers", () => {
    const answers: RwProgressAnswer[] = [
      { lesson_id: "a", points: 2, max_points: 2, status: "auto_graded", created_at: "2026-11-17T10:00:00" },
      { lesson_id: "a", points: 1, max_points: 2, status: "graded", created_at: "2026-11-17T10:00:00" },
      { lesson_id: "a", points: null, max_points: 2, status: "pending", created_at: "2026-11-17T10:00:00" },
    ];
    expect(computeRwComprehensionScore(answers, monday)).toBe(15);
    expect(computeRwWeek([], answers, monday).comprehensionScore).toBe(15);
  });

  it("returns six chronological weekly windows", () => {
    const series = buildRwWeeklySeries([], [], localNow);
    expect(series).toHaveLength(6);
    expect(series[5].window.key).toBe(monday.key);
    expect(series[0].window.start.getTime()).toBeLessThan(series[1].window.start.getTime());
  });

  it("alerts on two sessions of delay and on requested rework", () => {
    const progress = computeRwProgress([{ ...s("a", "redo") }], "2026-10-19", localNow);
    const alerts = buildRwAlerts(progress, localNow);
    expect(alerts.some((alert) => alert.id === "redo")).toBe(true);
    expect(alerts.some((alert) => alert.id === "behind")).toBe(true);
  });
});

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
