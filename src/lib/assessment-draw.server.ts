// Server only drawing engine for the multilingual assessment.
// The candidate never influences the draw: everything below runs on the server.
import type { BlueprintCell } from "@/lib/assessment-engine";
import { MIN_POOL_PER_CELL } from "@/lib/assessment-engine";
import { levelRank } from "@/lib/assessment-difficulty";
import { LEVEL_ORDER } from "@/lib/test-engine";

export type DrawRow = {
  id: string;
  level: string;
  category: string;
  question_type: string | null;
};

/**
 * Fisher Yates shuffle seeded by the platform CSPRNG.
 * Rejection sampling keeps the distribution uniform (no bias toward the first
 * items of the bank, unlike a modulo on a raw random integer).
 */
export function secureShuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomBelow(bound: number): number {
  if (bound <= 1) return 0;
  const limit = Math.floor(0xffffffff / bound) * bound;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % bound;
}

export function cellKey(level: string, skill: string, type: string): string {
  return `${level}:${skill}:${type}`;
}

export type DrawResult<T extends DrawRow> = {
  picked: T[];
  /** Cells whose pool could not cover the blueprint quota. */
  shortfalls: Array<{ cell: string; required: number; available: number }>;
  /** Cells whose pool is too thin for a meaningful randomisation. */
  thinPools: Array<{ cell: string; required: number; available: number }>;
  /**
   * Quotas that had to be served by another CEFR level because the bank has no
   * content yet at the target level (section 56). Never blocks the attempt.
   */
  levelFallbacks: Array<{ cell: string; missing: number; servedBy: string[] }>;
  /** Number of items reused from the candidate own history (bank too small). */
  repeated: number;
};

/**
 * Draws one attempt: per blueprint cell (level + skill + item type) it prefers
 * items the candidate has never seen, then falls back to already seen items
 * only when the bank cannot cover the quota otherwise.
 */
export function drawAttempt<T extends DrawRow>(
  rows: readonly T[],
  blueprint: readonly BlueprintCell[],
  seenIds: ReadonlySet<string>,
): DrawResult<T> {
  const byCell = new Map<string, T[]>();
  // Same skill and item type, every level: used to fill an empty high level.
  const bySkill = new Map<string, T[]>();
  for (const row of rows) {
    const type = row.question_type ?? "mcq";
    const key = cellKey(row.level, row.category, type);
    const bucket = byCell.get(key);
    if (bucket) bucket.push(row);
    else byCell.set(key, [row]);
    const skillKey = `${row.category}:${type}`;
    const skillBucket = bySkill.get(skillKey);
    if (skillBucket) skillBucket.push(row);
    else bySkill.set(skillKey, [row]);
  }

  const picked: T[] = [];
  const usedIds = new Set<string>();
  const shortfalls: DrawResult<T>["shortfalls"] = [];
  const thinPools: DrawResult<T>["thinPools"] = [];
  const levelFallbacks: DrawResult<T>["levelFallbacks"] = [];
  let repeated = 0;

  for (const cell of blueprint) {
    const key = cellKey(cell.level, cell.skill, cell.type);
    const bucket = (byCell.get(key) ?? []).filter((q) => !usedIds.has(q.id));
    const fresh = secureShuffle(bucket.filter((q) => !seenIds.has(q.id)));
    const seen = secureShuffle(bucket.filter((q) => seenIds.has(q.id)));
    const chosen = [...fresh, ...seen].slice(0, cell.count);

    // Bank too thin at this level: complete with the closest level actually
    // available, preferring the highest one below the target so the curve keeps
    // climbing instead of blocking the attempt. No content is ever invented.
    if (chosen.length < cell.count) {
      const missing = cell.count - chosen.length;
      const pool = (bySkill.get(`${cell.skill}:${cell.type}`) ?? []).filter(
        (q) => !usedIds.has(q.id) && q.level !== cell.level && !chosen.includes(q),
      );
      const target = levelRank(cell.level);
      const ranked = [...pool].sort((a, b) => {
        const da = levelRank(a.level) - target;
        const db = levelRank(b.level) - target;
        // Below the target first (highest available), then above.
        const sa = da < 0 ? [0, -da] : [1, da];
        const sb = db < 0 ? [0, -db] : [1, db];
        if (sa[0] !== sb[0]) return sa[0] - sb[0];
        if (sa[1] !== sb[1]) return sa[1] - sb[1];
        const fa = seenIds.has(a.id) ? 1 : 0;
        const fb = seenIds.has(b.id) ? 1 : 0;
        return fa - fb;
      });
      const groups = new Map<string, T[]>();
      for (const q of ranked) {
        const g = groups.get(q.level);
        if (g) g.push(q);
        else groups.set(q.level, [q]);
      }
      const substitutes = [...groups.values()].flatMap((g) => secureShuffle(g)).slice(0, missing);
      if (substitutes.length) {
        chosen.push(...substitutes);
        levelFallbacks.push({
          cell: key,
          missing,
          servedBy: [...new Set(substitutes.map((q) => q.level))].sort(
            (a, b) => LEVEL_ORDER.indexOf(a as never) - LEVEL_ORDER.indexOf(b as never),
          ),
        });
      }
    }

    repeated += chosen.filter((q) => seenIds.has(q.id)).length;
    for (const q of chosen) usedIds.add(q.id);
    picked.push(...chosen);

    if (chosen.length < cell.count) {
      shortfalls.push({ cell: key, required: cell.count, available: bucket.length });
    }
    if (bucket.length < Math.max(cell.count * MIN_POOL_PER_CELL, cell.count)) {
      thinPools.push({ cell: key, required: cell.count, available: bucket.length });
    }
  }

  return { picked, shortfalls, thinPools, levelFallbacks, repeated };
}
