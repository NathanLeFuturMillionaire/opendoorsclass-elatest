import { describe, expect, it } from "vitest";
import { computeRwSubscription, rwLibrevilleDate } from "./rw-subscription";

describe("Reading Workshop subscription", () => {
  it("gives exactly 30 days from the recorded start date", () => {
    expect(computeRwSubscription("2026-11-24", "2026-11-24")).toEqual({
      startDate: "2026-11-24",
      endDate: "2026-12-24",
      durationDays: 30,
      daysRemaining: 30,
      daysUntilStart: 0,
      percentRemaining: 100,
      status: "active",
    });
  });

  it("counts calendar days without depending on the learner device clock", () => {
    const result = computeRwSubscription("2026-11-24", "2026-12-10");
    expect(result?.daysRemaining).toBe(14);
    expect(result?.percentRemaining).toBe(47);
    expect(result?.status).toBe("active");
  });

  it("shows one remaining day on the day before the end date", () => {
    const result = computeRwSubscription("2026-11-24", "2026-12-23");
    expect(result?.daysRemaining).toBe(1);
    expect(result?.status).toBe("active");
  });

  it("expires at the start date plus 30 days", () => {
    const result = computeRwSubscription("2026-11-24", "2026-12-24");
    expect(result?.daysRemaining).toBe(0);
    expect(result?.percentRemaining).toBe(0);
    expect(result?.status).toBe("expired");
  });

  it("keeps the full duration and reports the wait before a future start", () => {
    const result = computeRwSubscription("2026-12-01", "2026-11-24");
    expect(result?.daysRemaining).toBe(30);
    expect(result?.daysUntilStart).toBe(7);
    expect(result?.status).toBe("upcoming");
  });

  it("handles month and year boundaries", () => {
    expect(computeRwSubscription("2026-12-15", "2026-12-15")?.endDate).toBe("2027-01-14");
    expect(computeRwSubscription("2028-02-10", "2028-02-10")?.endDate).toBe("2028-03-11");
  });

  it("does not invent a subscription for a missing or invalid date", () => {
    expect(computeRwSubscription(null, "2026-11-24")).toBeNull();
    expect(computeRwSubscription("2026-02-30", "2026-11-24")).toBeNull();
    expect(computeRwSubscription("2026-11-24", "invalid")).toBeNull();
  });

  it("uses the calendar date in Libreville", () => {
    expect(rwLibrevilleDate(new Date("2026-11-23T23:30:00.000Z"))).toBe("2026-11-24");
    expect(rwLibrevilleDate(new Date("2026-11-24T22:59:59.000Z"))).toBe("2026-11-24");
    expect(rwLibrevilleDate(new Date("2026-11-24T23:00:00.000Z"))).toBe("2026-11-25");
  });
});
