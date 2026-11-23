import { describe, expect, it } from "vitest";
import { buildRwTraceSentences, rwTraceExerciseKey } from "@/lib/rw-trace-sentences";

const base = {
  point: "Can + verb",
  explanation_fr: "Can exprime une capacité et reste suivi de la base verbale.",
  example: "A student can explain a calculation to a parent.",
  level: "A1",
  title: "Education and Opportunity",
};

describe("phrases Grammar Discovery", () => {
  it("produit exactement cinq phrases différentes et stables", () => {
    const first = buildRwTraceSentences(base);
    expect(first).toHaveLength(5);
    expect(new Set(first).size).toBe(5);
    expect(buildRwTraceSentences(base)).toEqual(first);
    expect(first[4]).toBe(base.example);
  });

  it("utilise la règle grammaticale et le niveau", () => {
    const simple = buildRwTraceSentences(base);
    expect(simple.slice(0, 4).every((sentence) => /\bcan\b/i.test(sentence))).toBe(true);
    const advanced = buildRwTraceSentences({ ...base, level: "C1" });
    expect(advanced[0]).toContain("careful reader");
  });

  it("relie les phrases au thème du texte", () => {
    const sentences = buildRwTraceSentences(base);
    expect(sentences[0]).toContain("new ideas");
  });

  it("sélectionne les comparatifs et leurs exemples du brief", () => {
    const sentences = buildRwTraceSentences({
      point: "Comparative adjectives",
      explanation_fr: "Le comparatif de supériorité.",
      example: "This book is more interesting than that one.",
      level: "A2",
      title: "My library",
    });
    expect(sentences.slice(0, 4).every((sentence) => /than|better/.test(sentence))).toBe(true);
  });

  it("normalise les caractères pour les modèles vectoriels", () => {
    const sentences = buildRwTraceSentences({ ...base, example: "L'élève peut apprendre…" });
    expect(sentences.join(" ")).not.toMatch(/[\u2018\u2019\u201c\u201d\u2026]/);
  });

  it("identifie chaque exercice par leçon et notion", () => {
    expect(rwTraceExerciseKey("lesson-1", 1)).toBe("lesson-1:1");
  });
});
