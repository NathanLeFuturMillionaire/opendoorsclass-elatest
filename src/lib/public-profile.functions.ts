import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicSkill = { category: string; percent: number };

export type PublicProfile = {
  userId: string;
  candidateNumber: string | null;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  country: string | null;
  memberSince: string | null;
  level: string | null;
  bestScore: number | null;
  lastTestAt: string | null;
  testsCompleted: number;
  totalXp: number;
  gamificationLevel: number;
  currentStreak: number;
  longestStreak: number;
  rank: number | null;
  skills: PublicSkill[];
  badges: { code: string; name_fr: string; name_en: string; icon: string; unlocked_at: string }[];
  history: { completed_at: string; score: number | null; level_result: string | null }[];
};

const Input = z.object({ id: z.string().trim().min(4).max(64) });

/**
 * Profil PUBLIC d'un membre. N'expose jamais e-mail, telephone, paiements,
 * roles ni donnees administratives. Lecture serveur uniquement.
 */
export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<PublicProfile | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, country, nationality, candidate_number, created_at")
      .eq(isUuid ? "id" : "candidate_number", isUuid ? data.id : data.id.toUpperCase())
      .maybeSingle();

    if (!profile) return null;

    const [{ data: sessions }, { data: gam }, { data: badges }] = await Promise.all([
      supabaseAdmin
        .from("test_sessions")
        .select("score, level_result, completed_at, per_category_scores")
        .eq("user_id", profile.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("user_gamification")
        .select("total_xp, current_level, current_streak, longest_streak")
        .eq("user_id", profile.id)
        .maybeSingle(),
      supabaseAdmin
        .from("user_badges")
        .select("badge_code, unlocked_at, badges(code, name_fr, name_en, icon)")
        .eq("user_id", profile.id)
        .order("unlocked_at", { ascending: false }),
    ]);

    const completed = sessions ?? [];
    const best = completed.reduce<(typeof completed)[number] | null>((acc, s) => {
      if (typeof s.score !== "number") return acc;
      if (!acc || typeof acc.score !== "number" || s.score > acc.score) return s;
      return acc;
    }, null);

    const skills: PublicSkill[] = [];
    const cats = (best?.per_category_scores ?? {}) as Record<string, { percent?: number }>;
    for (const [category, v] of Object.entries(cats)) {
      if (v && typeof v.percent === "number") skills.push({ category, percent: Math.round(v.percent) });
    }
    skills.sort((a, b) => b.percent - a.percent);

    let rank: number | null = null;
    const totalXp = gam?.total_xp ?? 0;
    if (totalXp > 0) {
      const { count } = await supabaseAdmin
        .from("user_gamification")
        .select("user_id", { count: "exact", head: true })
        .gt("total_xp", totalXp);
      rank = (count ?? 0) + 1;
    }

    const first = (profile.first_name ?? "").trim();
    const last = (profile.last_name ?? "").trim();
    const displayName = first ? (last ? `${first} ${last}` : first) : "Candidate";

    return {
      userId: profile.id,
      candidateNumber: profile.candidate_number,
      displayName,
      initials: `${(first[0] ?? "?").toUpperCase()}${(last[0] ?? "").toUpperCase()}`,
      avatarUrl: profile.avatar_url,
      country: profile.country ?? profile.nationality ?? null,
      memberSince: profile.created_at,
      level: (best?.level_result as unknown as string) ?? null,
      bestScore: typeof best?.score === "number" ? best.score : null,
      lastTestAt: completed[0]?.completed_at ?? null,
      testsCompleted: completed.length,
      totalXp,
      gamificationLevel: gam?.current_level ?? 1,
      currentStreak: gam?.current_streak ?? 0,
      longestStreak: gam?.longest_streak ?? 0,
      rank,
      skills,
      badges: (badges ?? [])
        .map((b) => {
          const meta = b.badges as unknown as { code: string; name_fr: string; name_en: string; icon: string } | null;
          return meta ? { ...meta, unlocked_at: b.unlocked_at } : null;
        })
        .filter((b): b is NonNullable<typeof b> => b !== null),
      history: completed.slice(0, 6).map((s) => ({
        completed_at: s.completed_at!,
        score: typeof s.score === "number" ? s.score : null,
        level_result: (s.level_result as unknown as string) ?? null,
      })),
    };
  });
