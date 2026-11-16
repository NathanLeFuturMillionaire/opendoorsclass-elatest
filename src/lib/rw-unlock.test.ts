import { describe, expect, it } from "vitest";
import { computeRwStates } from "./rw-unlock";

describe("déblocage progressif", () => {
  it("seul le premier texte est ouvert au départ", () => {
    expect(computeRwStates([{ id: "a", validated: false }, { id: "b", validated: false }])).toEqual(["available", "locked"]);
  });
  it("un envoi ou une note sans validation n'ouvre pas le texte suivant", () => {
    expect(computeRwStates([{ id: "a", validated: false, lastStatus: "submitted" }, { id: "b", validated: false }])[1]).toBe("locked");
  });
  it("la validation du coach ouvre le texte suivant", () => {
    expect(computeRwStates([{ id: "a", validated: true }, { id: "b", validated: false }, { id: "c", validated: false }])).toEqual(["validated", "available", "locked"]);
  });
  it("un déblocage manuel ouvre un texte verrouillé", () => {
    expect(computeRwStates([{ id: "a", validated: false }, { id: "b", validated: false, overridden: true }])[1]).toBe("available");
  });
  it("une reprise demandée garde le texte suivant fermé", () => {
    expect(computeRwStates([{ id: "a", validated: false, lastStatus: "redo" }, { id: "b", validated: false }])).toEqual(["redo", "locked"]);
  });
});
