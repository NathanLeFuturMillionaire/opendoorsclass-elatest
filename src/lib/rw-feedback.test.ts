import { describe, expect, it } from "vitest";
import {
  RW_FEEDBACK_MASTER_GAIN,
  RW_FEEDBACK_TONES,
  rwAnswerSound,
  rwSoundPreferenceEnabled,
} from "./rw-feedback";

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

describe("volume des sons de réponse", () => {
  const sounds = ["success", "error"] as const;

  it("utilise un niveau audible sur chaque ton, jamais un niveau faible", () => {
    for (const sound of sounds) {
      const tones = RW_FEEDBACK_TONES[sound];
      expect(tones.length).toBeGreaterThan(0);
      for (const tone of tones) {
        expect(tone.volume).toBeGreaterThanOrEqual(0.7);
        expect(tone.volume).toBeLessThanOrEqual(0.9);
      }
    }
  });

  it("garde le niveau général sous la saturation", () => {
    expect(RW_FEEDBACK_MASTER_GAIN).toBeGreaterThan(0.8);
    expect(RW_FEEDBACK_MASTER_GAIN).toBeLessThanOrEqual(1);
  });

  it("maintient le cumul des tons simultanés dans la plage du limiteur", () => {
    for (const sound of sounds) {
      const tones = RW_FEEDBACK_TONES[sound];
      let peak = 0;
      for (const a of tones) {
        let sum = 0;
        for (const b of tones) {
          if (b.start <= a.start && b.start + b.duration > a.start) sum += b.volume;
        }
        peak = Math.max(peak, sum);
      }
      expect(peak).toBeGreaterThan(1.2);
      expect(peak).toBeLessThanOrEqual(1.7);
    }
  });

  it("différencie nettement la réussite de l'échec par les fréquences", () => {
    const success = RW_FEEDBACK_TONES.success.map((t) => t.frequency);
    const error = RW_FEEDBACK_TONES.error.map((t) => t.frequency);
    expect(Math.min(...success)).toBeGreaterThan(Math.max(...error));
  });
});
