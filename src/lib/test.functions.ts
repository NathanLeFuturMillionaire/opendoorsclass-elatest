import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ClientQuestion = {
  id: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  category: "grammar" | "vocabulary" | "reading" | "listening" | "speaking";
  question_text: string;
  options: string[];
  audio_url: string | null;
  max_plays: number;
  order_hint: number;
};

// Fetch all active questions ordered. Correct answers are stripped.
export const getTestQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("questions")
      .select("id, level, category, question_text, options, audio_url, max_plays, order_hint")
      .eq("is_active", true)
      .order("order_hint", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ClientQuestion[];
  });

// Start a new test session (decrements 1 credit atomically).
export const startTestSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("start_test_session");
    if (error) {
      if (error.message.includes("INSUFFICIENT_CREDITS")) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      throw new Error(error.message);
    }
    return { sessionId: data as string };
  });

const SubmitInput = z.object({
  sessionId: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
});

export type TestResult = {
  sessionId: string;
  score: number;
  totalQuestions: number;
  levelResult: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  perLevel: Record<string, { correct: number; total: number; percent: number }>;
  perCategory: Record<string, { correct: number; total: number; percent: number }>;
  recommendation: string;
};

const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const submitTestAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify session belongs to user and not already completed.
    const { data: session, error: sErr } = await context.supabase
      .from("test_sessions")
      .select("id, user_id, completed_at")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session introuvable");
    if (session.completed_at) throw new Error("Session déjà terminée");

    const { data: questions, error: qErr } = await supabaseAdmin
      .from("questions")
      .select("id, level, category, correct_answer")
      .eq("is_active", true);
    if (qErr) throw new Error(qErr.message);

    const perLevel: Record<string, { correct: number; total: number; percent: number }> = {};
    const perCategory: Record<string, { correct: number; total: number; percent: number }> = {};
    let totalCorrect = 0;
    const total = questions?.length ?? 0;

    for (const q of questions ?? []) {
      const userAns = data.answers[q.id];
      let isCorrect = false;
      if (q.category === "speaking") {
        // Speaking answers are stored as JSON {transcript, score} produced by transcribeAndScoreSpeaking.
        try {
          const parsed = userAns ? JSON.parse(userAns) : null;
          if (parsed && typeof parsed.score === "number" && parsed.score >= 60) isCorrect = true;
        } catch {
          isCorrect = false;
        }
      } else {
        isCorrect = userAns === q.correct_answer;
      }
      const lvl = q.level as string;
      const cat = q.category as string;
      perLevel[lvl] ??= { correct: 0, total: 0, percent: 0 };
      perCategory[cat] ??= { correct: 0, total: 0, percent: 0 };
      perLevel[lvl].total++;
      perCategory[cat].total++;
      if (isCorrect) {
        totalCorrect++;
        perLevel[lvl].correct++;
        perCategory[cat].correct++;
      }
    }
    for (const k of Object.keys(perLevel)) {
      perLevel[k].percent = perLevel[k].total ? Math.round((perLevel[k].correct / perLevel[k].total) * 100) : 0;
    }
    for (const k of Object.keys(perCategory)) {
      perCategory[k].percent = perCategory[k].total ? Math.round((perCategory[k].correct / perCategory[k].total) * 100) : 0;
    }

    // Determine CEFR: highest consecutive level with >=70% starting from A1.
    let levelResult: (typeof LEVEL_ORDER)[number] = "A1";
    for (const lvl of LEVEL_ORDER) {
      if ((perLevel[lvl]?.percent ?? 0) >= 70) {
        levelResult = lvl;
      } else {
        break;
      }
    }

    // Fetch level range message.
    const range: "A1-A2" | "B1-B2" | "C1-C2" =
      levelResult === "A1" || levelResult === "A2"
        ? "A1-A2"
        : levelResult === "B1" || levelResult === "B2"
          ? "B1-B2"
          : "C1-C2";
    const { data: msg } = await supabaseAdmin
      .from("level_messages")
      .select("message_text")
      .eq("level_range", range)
      .maybeSingle();

    const scorePercent = total ? Math.round((totalCorrect / total) * 100) : 0;

    const { error: uErr } = await supabaseAdmin
      .from("test_sessions")
      .update({
        completed_at: new Date().toISOString(),
        score: scorePercent,
        level_result: levelResult,
        answers: data.answers,
        per_category_scores: perCategory,
      })
      .eq("id", data.sessionId);
    if (uErr) throw new Error(uErr.message);

    const result: TestResult = {
      sessionId: data.sessionId,
      score: scorePercent,
      totalQuestions: total,
      levelResult,
      perLevel,
      perCategory,
      recommendation: msg?.message_text ?? "",
    };
    return result;
  });

export const getSessionResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase
      .from("test_sessions")
      .select("id, score, level_result, per_category_scores, completed_at, started_at")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Session introuvable");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const range: "A1-A2" | "B1-B2" | "C1-C2" =
      session.level_result === "A1" || session.level_result === "A2"
        ? "A1-A2"
        : session.level_result === "B1" || session.level_result === "B2"
          ? "B1-B2"
          : "C1-C2";
    const { data: msg } = await supabaseAdmin
      .from("level_messages")
      .select("message_text")
      .eq("level_range", range)
      .maybeSingle();

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      sessionId: session.id,
      score: session.score,
      levelResult: session.level_result,
      perCategory: (session.per_category_scores ?? {}) as Record<
        string,
        { correct: number; total: number; percent: number }
      >,
      recommendation: msg?.message_text ?? "",
      completedAt: session.completed_at,
      startedAt: session.started_at,
      candidateFirstName: profile?.first_name ?? "",
      candidateLastName: profile?.last_name ?? "",
      candidateEmail: (context.claims?.email as string) ?? "",
    };
  });

export const getTestHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("test_sessions")
      .select("id, started_at, completed_at, score, level_result")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });