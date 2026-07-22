import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SkillScore = { correct: number; total: number; percent: number };

export type ProfileStatus =
  | "nouveau"
  | "test_effectue"
  | "niveau_valide"
  | "membre"
  | "excellent";

function computeStatus(input: {
  completed: number;
  bestLevel: string | null;
  bestScore: number | null;
}): ProfileStatus {
  if (input.completed === 0) return "nouveau";
  if ((input.bestScore ?? 0) >= 90) return "excellent";
  if (input.completed >= 3) return "membre";
  if (input.bestLevel && ["B1", "B2", "C1", "C2"].includes(input.bestLevel))
    return "niveau_valide";
  return "test_effectue";
}

export const getProfileFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, avatar_url, credits_remaining, created_at, nationality, date_of_birth, candidate_number, objectives, ai_recommendations, ai_recommendations_at, plan, plan_activated_at"
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Profil introuvable.");

    const { data: sessions } = await context.supabase
      .from("test_sessions")
      .select(
        "id, started_at, completed_at, score, level_result, per_category_scores, duration_seconds"
      )
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false });

    const { data: paymentsHistory } = await context.supabase
      .from("payments")
      .select("id, amount, currency, status, offer_code, confirmed_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const completedList = (sessions ?? []).filter((s) => s.completed_at);
    const sessionsCompleted = completedList.length;

    // Best skill percent across sessions, per category.
    const skillsAgg: Record<string, { best: number; last: number }> = {};
    for (const s of completedList) {
      const pc = (s.per_category_scores ?? {}) as Record<string, SkillScore>;
      for (const [cat, val] of Object.entries(pc)) {
        const pct = val?.percent ?? 0;
        skillsAgg[cat] ??= { best: 0, last: 0 };
        if (pct > skillsAgg[cat].best) skillsAgg[cat].best = pct;
      }
    }
    if (completedList[0]) {
      const pc = (completedList[0].per_category_scores ?? {}) as Record<
        string,
        SkillScore
      >;
      for (const [cat, val] of Object.entries(pc)) {
        skillsAgg[cat] = { ...(skillsAgg[cat] ?? { best: 0, last: 0 }), last: val?.percent ?? 0 };
      }
    }

    const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
    let bestLevel: string | null = null;
    for (const s of completedList) {
      if (!s.level_result) continue;
      if (!bestLevel || LEVEL_ORDER.indexOf(s.level_result) > LEVEL_ORDER.indexOf(bestLevel)) {
        bestLevel = s.level_result;
      }
    }
    const bestScore = completedList.reduce(
      (m, s) => (s.score != null && s.score > m ? s.score : m),
      0
    );
    const lastCompleted = completedList[0] ?? null;
    const avgDuration =
      completedList.filter((s) => s.duration_seconds).length > 0
        ? Math.round(
            completedList.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) /
              completedList.filter((s) => s.duration_seconds).length
          )
        : null;

    const progression = completedList
      .slice()
      .reverse()
      .map((s) => ({
        date: s.completed_at ?? s.started_at,
        score: s.score ?? 0,
        level: s.level_result ?? "",
      }));

    return {
      ...data,
      email: (context.claims?.email as string) ?? "",
      sessionsCompleted,
      totalSessions: sessions?.length ?? 0,
      bestLevel,
      bestScore: bestScore || null,
      lastScore: lastCompleted?.score ?? null,
      lastLevel: lastCompleted?.level_result ?? null,
      avgDurationSeconds: avgDuration,
      status: computeStatus({
        completed: sessionsCompleted,
        bestLevel,
        bestScore: bestScore || null,
      }),
      skills: skillsAgg,
      progression,
      recentSessions: completedList.slice(0, 8).map((s) => ({
        id: s.id,
        completed_at: s.completed_at,
        score: s.score,
        level_result: s.level_result,
      })),
      payments: paymentsHistory ?? [],
    };
  });

const UpdateInput = z.object({
  firstName: z.string().trim().min(1, "Prénom requis.").max(80),
  lastName: z.string().trim().min(1, "Nom requis.").max(80),
  nationality: z.string().trim().max(80).optional().nullable(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
    .optional()
    .nullable(),
  objectives: z.array(z.string().trim().max(120)).max(10).optional().nullable(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        nationality: data.nationality ?? null,
        date_of_birth: data.dateOfBirth ?? null,
        objectives: data.objectives ?? undefined,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AvatarInput = z.object({
  avatarUrl: z.string().url().max(500).nullable(),
});

export const updateMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AvatarInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: data.avatarUrl })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Generate AI study plan based on the latest completed test.
export const generateAIRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("first_name, objectives")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: last } = await context.supabase
      .from("test_sessions")
      .select("score, level_result, per_category_scores")
      .eq("user_id", context.userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!last) {
      throw new Error("Passez au moins un test pour recevoir des recommandations.");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Service IA indisponible.");

    const prompt = `Tu es un coach d'anglais pour la plateforme OpenDoorsClass. Rédige un plan de travail personnalisé et motivant en français, 200 mots maximum, structuré en 3 sections courtes: 1) Points forts, 2) Points à travailler, 3) Plan sur 4 semaines avec 3 actions concrètes par semaine. Utilise un ton chaleureux et professionnel. N'utilise jamais de tiret cadratin (—) ni de tiret demi-cadratin (–). Utilise des virgules, deux-points ou points.

Prénom: ${profile?.first_name ?? "Candidat"}
Objectifs: ${(profile?.objectives ?? []).join(", ") || "Non précisés"}
Score global: ${last.score}%
Niveau CECRL obtenu: ${last.level_result}
Détail par compétence (JSON): ${JSON.stringify(last.per_category_scores)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`IA indisponible: ${resp.status} ${t.slice(0, 120)}`);
    }
    const json = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Aucune recommandation générée.");

    const cleaned = content.replace(/[—–]/g, ",");
    await context.supabase
      .from("profiles")
      .update({
        ai_recommendations: cleaned,
        ai_recommendations_at: new Date().toISOString(),
      })
      .eq("id", context.userId);

    return { text: cleaned };
  });