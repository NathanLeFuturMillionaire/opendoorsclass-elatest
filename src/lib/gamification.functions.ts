import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Badge = {
  code: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  icon: string;
  category: string;
  xp_reward: number;
  sort_order: number;
  unlocked_at: string | null;
};

export type XpTransaction = {
  amount: number;
  reason: string;
  event_type: string;
  created_at: string;
};

export type GamificationSummary = {
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  leaderboard_opt_in: boolean;
  display_country: string | null;
  badges: Badge[];
  transactions: XpTransaction[];
};

export const LEVEL_THRESHOLDS: { level: number; min: number; max: number | null; name: string }[] = [
  { level: 1, min: 0, max: 199, name: "Explorer" },
  { level: 2, min: 200, max: 499, name: "Beginner" },
  { level: 3, min: 500, max: 999, name: "Learner" },
  { level: 4, min: 1000, max: 1799, name: "Communicator" },
  { level: 5, min: 1800, max: 2799, name: "Confident Speaker" },
  { level: 6, min: 2800, max: 3999, name: "Advanced Learner" },
  { level: 7, min: 4000, max: 5499, name: "Professional" },
  { level: 8, min: 5500, max: 7499, name: "Expert" },
  { level: 9, min: 7500, max: null, name: "Master" },
];

export function levelInfo(xp: number) {
  const t = LEVEL_THRESHOLDS.find((l) => xp >= l.min && (l.max === null || xp <= l.max)) ?? LEVEL_THRESHOLDS[0];
  const nextThreshold = t.max === null ? null : t.max + 1;
  const progressInLevel = xp - t.min;
  const spanInLevel = t.max === null ? Math.max(xp - t.min, 1) : t.max - t.min + 1;
  const percent = t.max === null ? 100 : Math.min(100, Math.round((progressInLevel / spanInLevel) * 100));
  const xpToNext = t.max === null ? 0 : Math.max(0, (t.max + 1) - xp);
  return { ...t, nextThreshold, percent, xpToNext };
}

export const getMyGamification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_gamification_summary");
    if (error) throw new Error(error.message);
    return (data ?? {}) as GamificationSummary;
  });

const LbInput = z.object({
  scope: z.enum(["global", "africa", "GA", "FR", "US", "CD", "CG", "CI", "CM", "SN", "MA", "NG"]).default("global"),
  limit: z.number().int().min(1).max(50).default(25),
});

export const getGamificationLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LbInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_gamification_leaderboard", {
      _scope: data.scope,
      _limit: data.limit,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      rank: number;
      display_name: string;
      country: string | null;
      cefr_level: string | null;
      total_xp: number;
      current_level: number;
    }>;
  });

const OptInInput = z.object({
  opt_in: z.boolean(),
  country: z.string().min(2).max(3).nullable().optional(),
});

export const setLeaderboardOptIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OptInInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_leaderboard_opt_in", {
      _opt_in: data.opt_in,
      _country: data.country ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordDailyStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("record_streak", { _user_id: context.userId });
    if (error) throw new Error(error.message);
    return data as { current: number; longest: number };
  });

export const getAdminGamificationOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_gamification_admin_overview", { _limit: 20 });
    if (error) throw new Error(error.message);
    return data as {
      total_xp_awarded: number;
      total_badges_unlocked: number;
      top_users: Array<{
        user_id: string;
        first_name: string | null;
        last_name: string | null;
        total_xp: number;
        current_level: number;
        badges: number;
      }>;
    };
  });