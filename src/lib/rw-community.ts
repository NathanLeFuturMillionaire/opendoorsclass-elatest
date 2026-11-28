/** Public "reading community" ranking rules (pure, client-safe). */
export const COMMUNITY_MIN_VALIDATED = 4;
export const COMMUNITY_SIZE = 7;

export type CommunitySubmission = {
  learner_id: string;
  lesson_id: string;
  status: string;
  score: number | null;
  reviewed_at: string | null;
};

export type CommunityLearner = {
  id: string;
  full_name: string;
  level: string;
  is_active: boolean;
  community_visible: boolean;
};

export type CommunityReader = {
  rank: number;
  id: string;
  display_name: string;
  level: string;
  validated: number;
  average: number | null;
  active_weeks: number;
  progress: number;
};

/** First name plus last-name initial, so full surnames never become public. */
export function publicDisplayName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Lecteur";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]!.charAt(0).toUpperCase()}.`;
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/**
 * Only coach/admin validated readings count (one per lesson). Ties: more validated,
 * higher average, earlier latest validation, then id, so the order is deterministic.
 */
export function rankCommunity(learners: CommunityLearner[], subs: CommunitySubmission[], totalLessons: number): CommunityReader[] {
  const byLearner = new Map<string, { lessons: Set<string>; scores: number[]; weeks: Set<string>; last: string }>();
  for (const s of subs) {
    if (s.status !== "validated") continue;
    const e = byLearner.get(s.learner_id) ?? { lessons: new Set(), scores: [], weeks: new Set(), last: "" };
    e.lessons.add(s.lesson_id);
    if (typeof s.score === "number") e.scores.push(s.score);
    if (s.reviewed_at) { e.weeks.add(weekKey(s.reviewed_at)); if (s.reviewed_at > e.last) e.last = s.reviewed_at; }
    byLearner.set(s.learner_id, e);
  }
  const rows = learners
    .filter((l) => l.is_active && l.community_visible)
    .flatMap((l) => {
      const e = byLearner.get(l.id);
      if (!e || e.lessons.size < COMMUNITY_MIN_VALIDATED) return [];
      const average = e.scores.length ? Math.round((e.scores.reduce((a, b) => a + b, 0) / e.scores.length) * 10) / 10 : null;
      return [{ l, e, average }];
    })
    .sort((a, b) =>
      b.e.lessons.size - a.e.lessons.size ||
      (b.average ?? -1) - (a.average ?? -1) ||
      (a.e.last < b.e.last ? -1 : a.e.last > b.e.last ? 1 : 0) ||
      (a.l.id < b.l.id ? -1 : 1));
  return rows.slice(0, COMMUNITY_SIZE).map(({ l, e, average }, i) => ({
    rank: i + 1,
    id: l.id,
    display_name: publicDisplayName(l.full_name),
    level: l.level,
    validated: e.lessons.size,
    average,
    active_weeks: e.weeks.size,
    progress: totalLessons > 0 ? Math.min(100, Math.round((e.lessons.size / totalLessons) * 100)) : 0,
  }));
}
