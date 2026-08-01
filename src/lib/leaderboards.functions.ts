import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const LEADERBOARD_CATEGORIES = [
  "overall",
  "listening",
  "reading",
  "writing",
  "speaking",
  "grammar",
  "vocabulary",
  "orthography",
] as const;
export type LeaderboardCategory = (typeof LEADERBOARD_CATEGORIES)[number];

export const LEADERBOARD_PERIODS = ["today", "week", "month", "all"] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  initials: string;
  avatar_url: string | null;
  country: string | null;
  cefr_level: string | null;
  score: number;
  badges: number;
  last_test_at: string | null;
};

const AFRICA = new Set([
  "GA", "CD", "CG", "CI", "SN", "CM", "BJ", "TG", "ML", "BF", "NE", "TD",
  "RW", "GN", "MR", "MG", "ZA", "KE", "NG", "MA", "TN", "DZ", "EG", "ET",
  "GH", "CF", "GQ", "GW", "BI", "UG", "TZ", "ZM", "ZW", "MZ", "AO", "SD",
]);

const Input = z.object({
  category: z.enum(LEADERBOARD_CATEGORIES).default("overall"),
  scope: z.string().max(3).default("WW"), // "WW" worldwide, "AF" africa, or ISO country code
  period: z.enum(LEADERBOARD_PERIODS).default("all"),
  limit: z.number().int().min(1).max(100).default(10),
});

function periodStart(period: LeaderboardPeriod): string | null {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (period === "today") return new Date(now - day).toISOString();
  if (period === "week") return new Date(now - 7 * day).toISOString();
  if (period === "month") return new Date(now - 30 * day).toISOString();
  return null;
}

function normCountry(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  return v.length === 2 ? v.toUpperCase() : v;
}

/**
 * Public, privacy safe leaderboard built from real completed test sessions.
 * Ranking: best score for the selected skill, earliest completion breaks ties.
 */
export const getLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LeaderboardEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("test_sessions")
      .select("user_id, score, level_result, completed_at, per_category_scores")
      .not("completed_at", "is", null)
      .not("level_result", "is", null)
      .order("completed_at", { ascending: false })
      .limit(600);

    const since = periodStart(data.period);
    if (since) query = query.gte("completed_at", since);

    const { data: rows, error } = await query;
    if (error || !rows || rows.length === 0) return [];

    type Best = { score: number; level: string | null; at: string };
    const best = new Map<string, Best>();

    for (const r of rows) {
      if (!r.user_id || !r.completed_at) continue;
      let value: number | null = null;
      if (data.category === "overall") {
        value = typeof r.score === "number" ? r.score : null;
      } else {
        const cats = (r.per_category_scores ?? {}) as Record<string, { percent?: number }>;
        const cat = cats?.[data.category];
        value = cat && typeof cat.percent === "number" ? cat.percent : null;
      }
      if (value === null) continue;
      const prev = best.get(r.user_id);
      if (!prev || value > prev.score || (value === prev.score && r.completed_at < prev.at)) {
        best.set(r.user_id, {
          score: value,
          level: (r.level_result as unknown as string) ?? null,
          at: r.completed_at,
        });
      }
    }
    if (best.size === 0) return [];

    const ids = Array.from(best.keys());
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, country, nationality")
      .in("id", ids);
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));

    let ranked = ids.filter((id) => {
      if (data.scope === "WW") return true;
      const p = profMap.get(id);
      const c = normCountry(p?.country ?? p?.nationality ?? null);
      if (!c) return false;
      if (data.scope === "AF") return AFRICA.has(c);
      return c === data.scope.toUpperCase();
    });

    ranked.sort((a, b) => {
      const A = best.get(a)!;
      const B = best.get(b)!;
      if (B.score !== A.score) return B.score - A.score;
      return A.at.localeCompare(B.at);
    });
    ranked = ranked.slice(0, data.limit);
    if (ranked.length === 0) return [];

    const { data: badgeRows } = await supabaseAdmin
      .from("user_badges")
      .select("user_id")
      .in("user_id", ranked);
    const badgeCount = new Map<string, number>();
    for (const b of badgeRows ?? []) {
      badgeCount.set(b.user_id, (badgeCount.get(b.user_id) ?? 0) + 1);
    }

    return ranked.map((id, idx) => {
      const p = profMap.get(id);
      const b = best.get(id)!;
      const first = (p?.first_name ?? "").trim();
      const last = (p?.last_name ?? "").trim();
      const display = first
        ? last
          ? `${first} ${last[0].toUpperCase()}.`
          : first
        : "Candidate";
      const initials =
        `${(first[0] ?? "?").toUpperCase()}${(last[0] ?? "").toUpperCase()}` || "?";
      return {
        rank: idx + 1,
        user_id: id,
        display_name: display,
        initials,
        avatar_url: p?.avatar_url ?? null,
        country: normCountry(p?.country ?? p?.nationality ?? null),
        cefr_level: b.level,
        score: Math.round(b.score),
        badges: badgeCount.get(id) ?? 0,
        last_test_at: b.at,
      };
    });
  });