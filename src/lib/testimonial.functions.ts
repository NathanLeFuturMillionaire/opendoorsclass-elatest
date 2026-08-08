import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Renvoie uniquement les informations publiques d'un candidat, identifié
 * par son numéro de candidat (ex. ODC-2026-62E98E).
 * Aucune donnée privée (email, téléphone, paiements) n'est exposée.
 */
export const getPublicCandidateByNumber = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ candidateNumber: z.string().trim().min(4).max(40) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, country, nationality, candidate_number")
      .eq("candidate_number", data.candidateNumber)
      .maybeSingle();

    if (!profile) return null;

    const { data: session } = await supabaseAdmin
      .from("test_sessions")
      .select("level_result, score, completed_at")
      .eq("user_id", profile.id)
      .not("completed_at", "is", null)
      .order("score", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    return {
      candidateNumber: profile.candidate_number,
      firstName: profile.first_name,
      lastName: profile.last_name,
      avatarUrl: profile.avatar_url,
      country: profile.country ?? profile.nationality ?? null,
      level: session?.level_result ?? null,
      score: session?.score ?? null,
      completedAt: session?.completed_at ?? null,
    };
  });
