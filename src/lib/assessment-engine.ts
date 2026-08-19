// Client safe blueprints for the multilingual assessment engine.
// Each language declares how many items are drawn per CEFR level and skill.
import type { Cefr, Skill } from "@/lib/test-engine";
import { buildBlueprint, type CategoryPlan } from "@/lib/assessment-difficulty";

export type AssessmentQuestionType = "mcq" | "image-choice" | "writing" | "speaking";

export type BlueprintCell = {
  level: Cefr;
  skill: Skill;
  /** Item format drawn for this cell. Keeps illustrated items out of plain vocabulary. */
  type: AssessmentQuestionType;
  count: number;
};

/**
 * Spanish attempt plan (part VI): each category keeps its total number of items
 * and spreads it over the CEFR ladder with a decreasing share, so the candidate
 * climbs from A1 to C2 inside every section. Tuning a category is a one line
 * change here, the draw engine and the ordering follow automatically.
 */
export const ES_CATEGORY_PLAN: CategoryPlan[] = [
  { skill: "grammar", type: "mcq", count: 10 },
  { skill: "vocabulary", type: "mcq", count: 8 },
  // Illustrated items stay on the concrete levels of the ladder.
  { skill: "vocabulary", type: "image-choice", count: 5, share: { A1: 2, A2: 2, B1: 1, B2: 0, C1: 0, C2: 0 } },
  { skill: "orthography", type: "mcq", count: 4 },
  { skill: "reading", type: "mcq", count: 4 },
  { skill: "listening", type: "mcq", count: 5 },
  { skill: "writing", type: "writing", count: 1, share: { A1: 0, A2: 1, B1: 0, B2: 0, C1: 0, C2: 0 } },
  { skill: "speaking", type: "speaking", count: 1, share: { A1: 0, A2: 1, B1: 0, B2: 0, C1: 0, C2: 0 } },
];

export const ES_BLUEPRINT: BlueprintCell[] = buildBlueprint(ES_CATEGORY_PLAN);

export const ASSESSMENT_BLUEPRINTS: Record<"es", BlueprintCell[]> = {
  es: ES_BLUEPRINT,
};

/** Time budget of one assessment attempt, in seconds (30 minutes). */
export const ASSESSMENT_DURATION_SECONDS = 30 * 60;

/**
 * Recommended pool depth for a credible randomisation: a cell should hold at
 * least this many times the number of items it must serve in one attempt.
 * Below that ratio, two consecutive attempts would draw almost the same items.
 */
export const MIN_POOL_PER_CELL = 3;

/** Native language label used by the AI examiners and the certificates. */
export const ASSESSMENT_LANGUAGE_LABELS: Record<string, { fr: string; en: string; es: string; examiner: string; prefix: string }> = {
  en: { fr: "Anglais", en: "English", es: "Inglés", examiner: "English", prefix: "ODC" },
  es: { fr: "Espagnol", en: "Spanish", es: "Español", examiner: "Spanish", prefix: "ODC-ES" },
};
