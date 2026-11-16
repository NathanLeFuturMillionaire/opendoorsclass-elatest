import { describe, expect, it } from "vitest";
import { rwCountdown, rwDaysLabel, rwLibrevilleDate } from "./rw-hours";

describe("horaires de l'atelier", () => {
  it("affiche du lundi au samedi", () => expect(rwDaysLabel([1, 2, 3, 4, 5, 6])).toBe("du lundi au samedi"));
  it("compte à rebours", () => {
    expect(rwCountdown((2 * 3600 + 5 * 60) * 1000)).toBe("2 h 05 min");
    expect(rwCountdown((26 * 3600) * 1000)).toBe("1 j 2 h 00 min");
  });
  it("heure affichée en heure de Libreville (UTC+1)", () => {
    expect(rwLibrevilleDate("2026-11-17T11:30:00Z")).toContain("12:30");
  });
});
