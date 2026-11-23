import { describe, expect, it } from "vitest";
import { computeReadingStats, countCountries, normalizeCountry } from "./public-stats";

describe("public stats", () => {
  it("ignores invalid or missing countries and prefers the profile country", () => {
    expect(normalizeCountry("ga", "FR")).toBe("GA");
    expect(normalizeCountry(null, "CI")).toBe("CI");
    expect(normalizeCountry("Gabon", null)).toBeNull();
    expect(normalizeCountry("XX", null)).toBeNull();
  });
  it("counts each account once per country", () => {
    const r = countCountries([
      { country: "GA", phone_country: "GA" },
      { country: null, phone_country: "GA" },
      { country: "FR", phone_country: null },
      { country: null, phone_country: null },
    ]);
    expect(r.known).toBe(3);
    expect(r.countries).toEqual([{ code: "GA", count: 2 }, { code: "FR", count: 1 }]);
  });
  it("averages only graded submissions and dedupes finished readings", () => {
    const r = computeReadingStats(
      [
        { id: "1", learner_id: "a", lesson_id: "l1", status: "validated", score: 16 },
        { id: "1", learner_id: "a", lesson_id: "l1", status: "validated", score: 16 },
        { id: "2", learner_id: "a", lesson_id: "l1", status: "validated", score: 18 },
        { id: "3", learner_id: "b", lesson_id: "l1", status: "submitted", score: null },
      ],
      ["c"],
    );
    expect(r.submissions).toBe(3);
    expect(r.averageScore).toBe(17);
    expect(r.finishedReadings).toBe(1);
    expect(r.validatedReadings).toBe(2);
    expect(r.readersStarted).toBe(3);
  });
});
