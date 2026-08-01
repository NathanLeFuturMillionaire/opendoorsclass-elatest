import { createServerFn } from "@tanstack/react-start";

export type CertifiedLearner = {
  display_name: string;
  initials: string;
  avatar_url: string;
  cefr_level: string | null;
  country: string | null;
};

export type CertifiedLearnersPayload = {
  learners: CertifiedLearner[];
  total: number;
  remaining: number;
};

/**
 * Public, privacy safe social proof for the homepage hero.
 * Only certified learners who have a real profile photo are shown,
 * sorted from the most recent certification to the oldest.
 */
export const getCertifiedLearners = createServerFn({ method: "GET" }).handler(
  async (): Promise<CertifiedLearnersPayload> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("test_sessions")
      .select("user_id, level_result, completed_at")
      .not("completed_at", "is", null)
      .not("level_result", "is", null)
      .order("completed_at", { ascending: false })
      .limit(400);
    if (error || !rows) return { learners: [], total: 0, remaining: 0 };

    const bestByUser = new Map<string, string>();
    for (const r of rows) {
      if (r.user_id && !bestByUser.has(r.user_id)) {
        bestByUser.set(r.user_id, r.level_result as unknown as string);
      }
    }
    const orderedIds = Array.from(bestByUser.keys());
    if (orderedIds.length === 0) return { learners: [], total: 0, remaining: 0 };

    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, country, nationality")
      .in("id", orderedIds)
      .not("avatar_url", "is", null);
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));

    // Keep certification order (most recent first) and only real photos.
    const withPhoto = orderedIds.filter((id) => {
      const url = profMap.get(id)?.avatar_url;
      return typeof url === "string" && url.trim().length > 0;
    });
    const total = withPhoto.length;

    const learners: CertifiedLearner[] = withPhoto.slice(0, 6).map((id) => {
      const p = profMap.get(id)!;
      const first = (p?.first_name ?? "").trim();
      const last = (p?.last_name ?? "").trim();
      const display = first ? (last ? first + " " + last[0].toUpperCase() + "." : first) : "Candidate";
      const initials = ((first[0] ?? "?").toUpperCase() + (last[0] ?? "").toUpperCase()) || "?";
      return {
        display_name: display,
        initials,
        avatar_url: p.avatar_url as string,
        cefr_level: bestByUser.get(id) ?? null,
        country: p?.country ?? p?.nationality ?? null,
      };
    });

    return { learners, total, remaining: Math.max(0, total - learners.length) };
  },
);
