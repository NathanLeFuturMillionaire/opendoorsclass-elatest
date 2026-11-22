import { describe, expect, it } from "vitest";
import { computeRwStates, rwLessonAccess } from "./rw-unlock";

describe("déblocage progressif", () => {
  it("seul le premier texte est ouvert au départ", () => {
    expect(
      computeRwStates([
        { id: "a", validated: false },
        { id: "b", validated: false },
      ]),
    ).toEqual(["available", "locked"]);
  });
  it("un envoi ou une note sans validation n'ouvre pas le texte suivant", () => {
    expect(
      computeRwStates([
        { id: "a", validated: false, lastStatus: "submitted" },
        { id: "b", validated: false },
      ])[1],
    ).toBe("locked");
  });
  it("la validation du coach ouvre le texte suivant", () => {
    expect(
      computeRwStates([
        { id: "a", validated: true },
        { id: "b", validated: false },
        { id: "c", validated: false },
      ]),
    ).toEqual(["validated", "available", "locked"]);
  });
  it("un déblocage manuel ouvre un texte verrouillé", () => {
    expect(
      computeRwStates([
        { id: "a", validated: false },
        { id: "b", validated: false, overridden: true },
      ])[1],
    ).toBe("available");
  });
  it("une reprise demandée garde le texte suivant fermé", () => {
    expect(
      computeRwStates([
        { id: "a", validated: false, lastStatus: "redo" },
        { id: "b", validated: false },
      ]),
    ).toEqual(["redo", "locked"]);
  });
  it("chaque texte validé ouvre immédiatement le suivant pour enregistrer ses réponses", () => {
    const states = computeRwStates([
      { id: "a", validated: true },
      { id: "b", validated: true },
      { id: "c", validated: false, answered: true },
      { id: "d", validated: false },
    ]);
    expect(states).toEqual(["validated", "validated", "in_progress", "locked"]);
  });
});

describe("accès direct à un texte indisponible", () => {
  it("attend la fin du chargement avant de conclure", () => {
    expect(rwLessonAccess(null, true)).toBe("loading");
  });
  it("confirme l'indisponibilité quand le texte et son accès sont absents", () => {
    expect(rwLessonAccess(null, false)).toBe("unavailable");
  });
  it("laisse le texte accessible dès que son contenu est chargé", () => {
    expect(rwLessonAccess({ id: "leçon" }, true)).toBe("ready");
  });
});
