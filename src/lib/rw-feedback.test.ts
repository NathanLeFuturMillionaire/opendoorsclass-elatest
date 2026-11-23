import { describe, expect, it } from "vitest";
import { rwAnswerSound, rwSoundPreferenceEnabled } from "./rw-feedback";

describe("sons des réponses objectives", () => {
  it("joue le son de réussite pour une bonne réponse de 2 points", () => {
    expect(rwAnswerSound("auto_graded", 2)).toBe("success");
  });

  it("joue le son doux distinct pour une réponse incorrecte de 0 point", () => {
    expect(rwAnswerSound("auto_graded", 0)).toBe("error");
  });

  it("ne joue aucun son pour une réponse en attente du coach", () => {
    expect(rwAnswerSound("pending", null)).toBeNull();
  });

  it("ne joue aucun son pour une note objective incohérente", () => {
    expect(rwAnswerSound("auto_graded", 1)).toBeNull();
    expect(rwAnswerSound("auto_graded", null)).toBeNull();
  });

  it("active les sons par défaut et respecte leur désactivation enregistrée", () => {
    expect(rwSoundPreferenceEnabled(null)).toBe(true);
    expect(rwSoundPreferenceEnabled("true")).toBe(true);
    expect(rwSoundPreferenceEnabled("false")).toBe(false);
  });
});
