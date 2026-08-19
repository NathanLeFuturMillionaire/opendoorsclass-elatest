// Client safe blueprints for the multilingual assessment engine.
// Each language declares how many items are drawn per CEFR level and skill.
import type { Cefr, Skill } from "@/lib/test-engine";

export type AssessmentQuestionType = "mcq" | "image-choice" | "writing" | "speaking";

export type BlueprintCell = {
  level: Cefr;
  skill: Skill;
  /** Item format drawn for this cell. Keeps illustrated items out of plain vocabulary. */
  type: AssessmentQuestionType;
  count: number;
};

// Spanish A1 and A2: full skill coverage, written, illustrated, oral and productive.
export const ES_BLUEPRINT: BlueprintCell[] = [
  { level: "A1", skill: "grammar", type: "mcq", count: 5 },
  { level: "A1", skill: "vocabulary", type: "mcq", count: 4 },
  { level: "A1", skill: "vocabulary", type: "image-choice", count: 3 },
  { level: "A1", skill: "orthography", type: "mcq", count: 2 },
  { level: "A1", skill: "reading", type: "mcq", count: 2 },
  { level: "A1", skill: "listening", type: "mcq", count: 2 },

  { level: "A2", skill: "grammar", type: "mcq", count: 5 },
  { level: "A2", skill: "vocabulary", type: "mcq", count: 4 },
  { level: "A2", skill: "vocabulary", type: "image-choice", count: 2 },
  { level: "A2", skill: "orthography", type: "mcq", count: 2 },
  { level: "A2", skill: "reading", type: "mcq", count: 2 },
  { level: "A2", skill: "listening", type: "mcq", count: 3 },
  { level: "A2", skill: "writing", type: "writing", count: 1 },
  { level: "A2", skill: "speaking", type: "speaking", count: 1 },
];

export const ASSESSMENT_BLUEPRINTS: Record<"es", BlueprintCell[]> = {
  es: ES_BLUEPRINT,
};

/** Time budget of one assessment attempt, in seconds (30 minutes). */
export const ASSESSMENT_DURATION_SECONDS = 30 * 60;

/** Native language label used by the AI examiners and the certificates. */
export const ASSESSMENT_LANGUAGE_LABELS: Record<string, { fr: string; en: string; es: string; examiner: string; prefix: string }> = {
  en: { fr: "Anglais", en: "English", es: "Inglés", examiner: "English", prefix: "ODC" },
  es: { fr: "Espagnol", en: "Spanish", es: "Español", examiner: "Spanish", prefix: "ODC-ES" },
};
