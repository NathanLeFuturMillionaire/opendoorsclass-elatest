// Client safe difficulty model of the multilingual assessment (part VI).
// Randomisation decides WHICH items are drawn, this module decides HOW MANY
// items per CEFR level a category asks for, and in WHICH order they are shown.
import type { Cefr, Skill } from "@/lib/test-engine";
import { LEVEL_ORDER } from "@/lib/test-engine";
import type { AssessmentQuestionType, BlueprintCell } from "@/lib/assessment-engine";

/** Numeric weight of a CEFR level. Used for ordering and for weighted scoring. */
export const LEVEL_WEIGHT: Record<Cefr, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

export function levelWeight(level: string): number {
  return LEVEL_WEIGHT[level as Cefr] ?? 1;
}

export function levelRank(level: string): number {
  const i = LEVEL_ORDER.indexOf(level as Cefr);
  return i === -1 ? 0 : i;
}

/**
 * Default share of a category, level by level. Decreasing on purpose: a
 * certification style exam asks more easy and intermediate items than expert
 * ones. Values are relative weights, not percentages, so they stay easy to tune.
 */
export const DEFAULT_LEVEL_SHARE: Record<Cefr, number> = {
  A1: 2,
  A2: 2,
  B1: 2,
  B2: 2,
  C1: 1,
  C2: 1,
};

/** One category of one language: how many items, and with which level share. */
export type CategoryPlan = {
  skill: Skill;
  type: AssessmentQuestionType;
  /** Total number of items drawn for this category in one attempt. */
  count: number;
  /** Optional per category override of the level share (section 53). */
  share?: Partial<Record<Cefr, number>>;
};

/**
 * Splits a total into per level counts following the configured share.
 * Largest remainder method, so the sum always equals the requested total and
 * the result is deterministic for a given plan.
 */
export function distributeByLevel(
  total: number,
  share: Record<Cefr, number>,
): Array<{ level: Cefr; count: number }> {
  const levels = LEVEL_ORDER.filter((l) => (share[l] ?? 0) > 0);
  const sum = levels.reduce((acc, l) => acc + (share[l] ?? 0), 0);
  if (total <= 0 || sum <= 0) return [];

  const exact = levels.map((level) => ({ level, raw: (total * (share[level] ?? 0)) / sum }));
  const out = exact.map((e) => ({ level: e.level, count: Math.floor(e.raw) }));
  let left = total - out.reduce((a, b) => a + b.count, 0);

  // Remainders go to the easiest levels first: the curve must stay bottom heavy.
  const order = exact
    .map((e, i) => ({ i, frac: e.raw - Math.floor(e.raw), rank: levelRank(e.level) }))
    .sort((a, b) => b.frac - a.frac || a.rank - b.rank);
  let cursor = 0;
  while (left > 0 && order.length) {
    out[order[cursor % order.length].i].count++;
    cursor++;
    left--;
  }
  return out.filter((c) => c.count > 0);
}

/** Expands category plans into the blueprint cells consumed by the draw engine. */
export function buildBlueprint(plans: readonly CategoryPlan[]): BlueprintCell[] {
  const cells: BlueprintCell[] = [];
  for (const plan of plans) {
    const share = { ...DEFAULT_LEVEL_SHARE, ...(plan.share ?? {}) } as Record<Cefr, number>;
    for (const slice of distributeByLevel(plan.count, share)) {
      cells.push({ level: slice.level, skill: plan.skill, type: plan.type, count: slice.count });
    }
  }
  return cells;
}
