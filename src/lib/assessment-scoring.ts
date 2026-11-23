// Single source of truth for level test scoring, shared by the English and
// Spanish flows, live completion and historical recalculation.
//
// Three situations are kept apart and never confused:
// - missing: the candidate gave no answer, the item is worth 0.
// - pending: an answer exists but has not been evaluated yet (AI failure,
//   plain text never graded). It is excluded from scores and flagged.
// - graded: the item has a real evaluation, possibly 0.
// Productive skills (writing, speaking) earn partial credit: a 58/100 answer
// counts for 0.58 of the item, never 0 and never a full point.

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_PASS_PERCENT = 70;
const LEVEL_WEIGHT: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

export function isProductiveCategory(category: string): boolean {
  return category === "writing" || category === "speaking";
}

export type ProductionState =
  | { state: "missing" }
  | { state: "skipped" }
  | { state: "pending"; content: string }
  | { state: "graded"; score: number };

function contentOf(o: Record<string, unknown>): string {
  const v = typeof o["text"] === "string" ? o["text"] : o["transcript"];
  return typeof v === "string" ? v.trim() : "";
}

/** Reads a stored writing or speaking answer and classifies it. */
export function parseProduction(raw: unknown): ProductionState {
  if (raw === null || raw === undefined) return { state: "missing" };
  let obj: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return { state: "missing" };
    try {
      obj = JSON.parse(trimmed);
    } catch {
      return { state: "pending", content: trimmed };
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return typeof obj === "string" && obj.trim() ? { state: "pending", content: obj.trim() } : { state: "missing" };
  }
  const o = obj as Record<string, unknown>;
  const content = contentOf(o);
  if (o["skipped"] === true) return { state: "skipped" };
  if (o["pending"] === true) return content ? { state: "pending", content } : { state: "missing" };
  const score = typeof o["score"] === "number" ? o["score"] : Number.NaN;
  if (!Number.isFinite(score)) return content ? { state: "pending", content } : { state: "missing" };
  const feedback = typeof o["feedback"] === "string" ? o["feedback"].trim() : "";
  // Legacy grading failures were stored as score 0 with no feedback although
  // the candidate had written or spoken something: that is not an evaluation.
  if (score === 0 && !feedback && content) return { state: "pending", content };
  return { state: "graded", score: Math.max(0, Math.min(100, score)) };
}

export type ScoringItem = { id: string; level: string; category: string; correct_answer: string | null };

export type Cell = {
  /** Points obtained, partial credit included (2 decimals). */
  correct: number;
  /** Evaluated items (pending items excluded). */
  total: number;
  percent: number;
  pending: number;
  missing: number;
};

export type AssessmentScore = {
  score: number;
  levelResult: Level;
  perLevel: Record<string, Cell>;
  perCategory: Record<string, Cell>;
  pendingCount: number;
  provisional: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Credit of one item between 0 and 1, or null when it awaits evaluation. */
export function itemCredit(item: ScoringItem, raw: unknown): { credit: number | null; missing: boolean } {
  if (isProductiveCategory(item.category)) {
    const p = parseProduction(raw);
    if (p.state === "pending") return { credit: null, missing: false };
    if (p.state === "graded") return { credit: p.score / 100, missing: false };
    return { credit: 0, missing: p.state === "missing" };
  }
  if (raw === null || raw === undefined || raw === "") return { credit: 0, missing: true };
  return { credit: item.correct_answer !== null && raw === item.correct_answer ? 1 : 0, missing: false };
}

export function computeAssessmentScore(
  items: ScoringItem[],
  answers: Record<string, unknown>,
): AssessmentScore {
  const perLevel: Record<string, Cell> = {};
  const perCategory: Record<string, Cell> = {};
  let got = 0;
  let max = 0;
  let pendingCount = 0;

  for (const item of items) {
    const { credit, missing } = itemCredit(item, answers[item.id]);
    const w = LEVEL_WEIGHT[item.level] ?? 1;
    const lc = (perLevel[item.level] ??= { correct: 0, total: 0, percent: 0, pending: 0, missing: 0 });
    const cc = (perCategory[item.category] ??= { correct: 0, total: 0, percent: 0, pending: 0, missing: 0 });
    if (credit === null) {
      lc.pending++;
      cc.pending++;
      pendingCount++;
      continue;
    }
    if (missing) {
      lc.missing++;
      cc.missing++;
    }
    lc.total++;
    cc.total++;
    lc.correct += credit;
    cc.correct += credit;
    got += credit * w;
    max += w;
  }

  for (const c of Object.values(perLevel)) {
    c.percent = c.total ? Math.round((c.correct / c.total) * 100) : 0;
    c.correct = round2(c.correct);
  }
  // Skill percent = points obtained / items evaluated, so 18 out of 20 is 90%.
  for (const c of Object.values(perCategory)) {
    c.percent = c.total ? Math.round((c.correct / c.total) * 100) : 0;
    c.correct = round2(c.correct);
  }

  // CEFR ladder: highest level reached without a break, 70% required.
  // A pending item counts as 0 for this decision, so an unevaluated answer can
  // never lift the level; once graded the result is recalculated.
  let levelResult: Level = "A1";
  for (const lvl of LEVELS) {
    const c = perLevel[lvl];
    if (!c || c.total + c.pending === 0) continue;
    const conservative = (c.correct / (c.total + c.pending)) * 100;
    if (Math.round(conservative) >= LEVEL_PASS_PERCENT) levelResult = lvl;
    else break;
  }

  return {
    score: max ? Math.round((got / max) * 100) : 0,
    levelResult,
    perLevel,
    perCategory,
    pendingCount,
    provisional: pendingCount > 0,
  };
}

/** True when a skill has no evaluated item yet, only answers awaiting evaluation. */
export function isCellAwaitingEvaluation(cell: { total?: number; pending?: number } | null | undefined): boolean {
  return !!cell && (cell.total ?? 0) === 0 && (cell.pending ?? 0) > 0;
}
