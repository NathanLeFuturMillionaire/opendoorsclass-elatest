import { describe, expect, it } from "vitest";
import {
  RW_TRACE_VIEW_BOX,
  countRwTraceCharacters,
  evaluateRwTrace,
  nextRwTraceCharacterIndex,
  parseRwGlyph,
  resampleRwTrace,
  rwTraceFinalScore,
  rwTraceGlyphPath,
  rwTraceAttemptScore,
} from "@/lib/rw-trace-geometry";

function perfectTrace(character: string) {
  return parseRwGlyph(rwTraceGlyphPath(character)).map((stroke) => resampleRwTrace(stroke, 0.5));
}

describe("tracé géométrique Grammar Discovery", () => {
  it("valide un tracé qui suit tous les traits du modèle", () => {
    const result = evaluateRwTrace("A", perfectTrace("A"));
    expect(result.valid).toBe(true);
    expect(result.precision).toBe(100);
    expect(result.coverage).toBe(100);
  });

  it("refuse une ligne arbitraire", () => {
    const result = evaluateRwTrace("A", [[{ x: 24, y: 25 }, { x: 25, y: 26 }, { x: 26, y: 27 }]]);
    expect(result.valid).toBe(false);
    expect(result.precision).toBeLessThan(30);
  });

  it("refuse un seul contact ou une lettre partielle", () => {
    expect(evaluateRwTrace("A", [[{ x: 9, y: 1 }]]).valid).toBe(false);
    const firstStroke = parseRwGlyph(rwTraceGlyphPath("A")).slice(0, 1);
    expect(evaluateRwTrace("A", firstStroke).valid).toBe(false);
  });

  it("exige les traits secondaires des lettres", () => {
    const onlyDot = parseRwGlyph(rwTraceGlyphPath("i")).slice(1);
    expect(evaluateRwTrace("i", onlyDot).valid).toBe(false);
    expect(evaluateRwTrace("i", perfectTrace("i")).valid).toBe(true);
  });

  it("autorise un second trait quand le premier couvre déjà une grande partie", () => {
    const firstStroke = parseRwGlyph(rwTraceGlyphPath("v")).slice(0, 1);
    const result = evaluateRwTrace("v", firstStroke);
    expect(result.coverage).toBeGreaterThanOrEqual(58);
    expect(result.strokeCoverage).toBeLessThan(35);
    expect(result.incomplete).toBe(true);
    expect(result.valid).toBe(false);
  });

  it("rejette immédiatement toute sortie du cadre", () => {
    const result = evaluateRwTrace("A", perfectTrace("A"), true);
    expect(result.valid).toBe(false);
    expect(result.outOfBounds).toBe(true);
    expect(result.score).toBe(0);
  });

  it("gère les espaces sans tracé et conserve la ponctuation obligatoire", () => {
    expect(nextRwTraceCharacterIndex("I am.", 1)).toBe(2);
    expect(nextRwTraceCharacterIndex("I am.", 4)).toBe(4);
    expect(countRwTraceCharacters("I am.")).toBe(4);
    expect(rwTraceGlyphPath("?")).not.toBe("");
    expect(rwTraceGlyphPath("'")).not.toBe("");
  });

  it("couvre les majuscules, minuscules et chiffres", () => {
    for (const character of "Az09") expect(rwTraceGlyphPath(character)).not.toBe("");
    expect(RW_TRACE_VIEW_BOX.width).toBeGreaterThan(30);
  });

  it("calcule une note de précision avec pénalité de tentative limitée", () => {
    expect(rwTraceAttemptScore({ precision: 100, coverage: 100, strokeCoverage: 100 })).toBe(100);
    expect(rwTraceAttemptScore({ precision: 100, coverage: 100, strokeCoverage: 100, previousAttempts: 2 })).toBe(96);
    expect(rwTraceFinalScore([100, 80, 60])).toBe(80);
  });
});
