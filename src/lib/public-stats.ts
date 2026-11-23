/** Pure aggregation rules for the public homepage statistics (no personal data leaves this module). */

export type CountryStat = { code: string; count: number };

export type PublicStats = {
  registered: number;
  countries: CountryStat[];
  countriesKnownAccounts: number;
  completedTests: number;
  serviceUsers: number;
  rw: {
    readersStarted: number;
    submissions: number;
    gradedCount: number;
    averageScore: number | null;
    finishedReadings: number;
    validatedReadings: number;
  };
  updatedAt: string;
};

const ISO2 = /^[A-Z]{2}$/;
const INVALID = new Set(["XX", "T1", "ZZ", "EU", "UN"]);

/** A country counts only when it is a valid ISO 3166 alpha 2 code declared on the account. */
export function normalizeCountry(country: string | null | undefined, phoneCountry?: string | null): string | null {
  for (const raw of [country, phoneCountry]) {
    const code = (raw ?? "").trim().toUpperCase();
    if (ISO2.test(code) && !INVALID.has(code)) return code;
  }
  return null;
}

export function countCountries(profiles: { country: string | null; phone_country: string | null }[]) {
  const map = new Map<string, number>();
  let known = 0;
  for (const p of profiles) {
    const c = normalizeCountry(p.country, p.phone_country);
    if (!c) continue;
    known++;
    map.set(c, (map.get(c) ?? 0) + 1);
  }
  const countries = [...map.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  return { countries, known };
}

type Sub = { id: string; learner_id: string; lesson_id: string; status: string; score: number | string | null };

export function computeReadingStats(subs: Sub[], answerLearnerIds: string[]) {
  const unique = new Map<string, Sub>();
  for (const s of subs) unique.set(s.id, s);
  const list = [...unique.values()];
  const started = new Set<string>([...answerLearnerIds, ...list.map((s) => s.learner_id)]);
  const graded = list
    .map((s) => (s.score === null || s.score === undefined ? NaN : Number(s.score)))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 20);
  const validatedPairs = new Set(list.filter((s) => s.status === "validated").map((s) => `${s.learner_id}:${s.lesson_id}`));
  const average = graded.length ? Math.round((graded.reduce((a, b) => a + b, 0) / graded.length) * 10) / 10 : null;
  return {
    readersStarted: started.size,
    submissions: list.length,
    gradedCount: graded.length,
    averageScore: average,
    finishedReadings: validatedPairs.size,
    validatedReadings: list.filter((s) => s.status === "validated").length,
  };
}

export function countryName(code: string, locale = "fr"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function countryFlag(code: string): string {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
