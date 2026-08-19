// Server only drawing engine for the multilingual assessment.
// The candidate never influences the draw: everything below runs on the server.
import type { BlueprintCell } from "@/lib/assessment-engine";
import { MIN_POOL_PER_CELL } from "@/lib/assessment-engine";

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
  for (const row of rows) {
    const key = cellKey(row.level, row.category, row.question_type ?? "mcq");
    const bucket = byCell.get(key);
    if (bucket) bucket.push(row);
    else byCell.set(key, [row]);
  }

  const picked: T[] = [];
  const shortfalls: DrawResult<T>["shortfalls"] = [];
  const thinPools: DrawResult<T>["thinPools"] = [];
  let repeated = 0;

  for (const cell of blueprint) {
    const key = cellKey(cell.level, cell.skill, cell.type);
    const bucket = byCell.get(key) ?? [];
    const fresh = secureShuffle(bucket.filter((q) => !seenIds.has(q.id)));
    const seen = secureShuffle(bucket.filter((q) => seenIds.has(q.id)));
    const chosen = [...fresh, ...seen].slice(0, cell.count);
    repeated += chosen.filter((q) => seenIds.has(q.id)).length;
    picked.push(...chosen);

    if (chosen.length < cell.count) {
      shortfalls.push({ cell: key, required: cell.count, available: bucket.length });
    }
    if (bucket.length < Math.max(cell.count * MIN_POOL_PER_CELL, cell.count)) {
      thinPools.push({ cell: key, required: cell.count, available: bucket.length });
    }
  }

  return { picked, shortfalls, thinPools, repeated };
}
