// Client safe blueprints for the multilingual assessment engine.
// Each language declares how many items are drawn per CEFR level and skill.
import type { Cefr, Skill } from "@/lib/test-engine";

export type BlueprintCell = { level: Cefr; skill: Skill; count: number };

// Spanish, phase 2: A1 and A2 only, written skills.
export const ES_BLUEPRINT: BlueprintCell[] = [
  { level: "A1", skill: "grammar", count: 5 },
  { level: "A1", skill: "vocabulary", count: 4 },
  { level: "A1", skill: "orthography", count: 2 },
  { level: "A1", skill: "reading", count: 2 },

  { level: "A2", skill: "grammar", count: 5 },
  { level: "A2", skill: "vocabulary", count: 4 },
  { level: "A2", skill: "orthography", count: 2 },
  { level: "A2", skill: "reading", count: 2 },
];

export const ASSESSMENT_BLUEPRINTS: Record<"es", BlueprintCell[]> = {
  es: ES_BLUEPRINT,
};
