import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ASSESSMENT_BLUEPRINTS,
  ASSESSMENT_DURATION_SECONDS,
  ASSESSMENT_LANGUAGE_LABELS,
} from "@/lib/assessment-engine";
import { LEVEL_ORDER, SKILL_ORDER, shuffle } from "@/lib/test-engine";

/**
 * Multilingual assessment engine (phase 1).
 * One generic session model handles every assessed language ("en", "es", ...).
 * Credits, sessions and history stay per language and never overwrite each other.
 */
const LanguageInput = z.object({ language: z.enum(["en", "es"]) });

export type AssessmentStatus =
  | "not_started"
  | "in_progress"
  | "paused"
  | "completed"
  | "abandoned"
  | "expired";

export type AssessmentOverview = {
  credits: number;
  activeSession: {
    id: string;
    startedAt: string;
    currentSection: string | null;
    currentQuestion: number;
  } | null;
  lastCompleted: {
    id: string;
    completedAt: string | null;
    level: string | null;
    score: number | null;
  } | null;
};

/** Real, server side view of the candidate credits and language session state. */
export const getAssessmentOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LanguageInput.parse(input))
  .handler(async ({ data, context }): Promise<AssessmentOverview> => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("credits_remaining")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: active } = await context.supabase
      .from("test_sessions")
      .select("id, started_at, current_section, current_question")
      .eq("user_id", context.userId)
      .eq("language", data.language)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: last } = await context.supabase
      .from("test_sessions")
      .select("id, completed_at, level_result, score")
      .eq("user_id", context.userId)
      .eq("language", data.language)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      credits: profile?.credits_remaining ?? 0,
      activeSession: active
        ? {
            id: active.id,
            startedAt: active.started_at,
            currentSection: active.current_section ?? null,
            currentQuestion: active.current_question ?? 0,
          }
        : null,
      lastCompleted: last
        ? {
            id: last.id,
            completedAt: last.completed_at,
            level: last.level_result,
            score: last.score,
          }
        : null,
    };
  });

export type StartAssessmentResult = {
  sessionId: string;
  resumed: boolean;
  creditsRemaining: number;
};

/**
 * Creates (or resumes) a session for one language.
 * The database function is idempotent and holds a row lock on the profile,
 * so a double click, a refresh, a retry or a second tab can never debit twice.
 */
export const startAssessmentSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LanguageInput.parse(input))
  .handler(async ({ data, context }): Promise<StartAssessmentResult> => {
    const { data: result, error } = await context.supabase.rpc("start_assessment_session", {
      _language: data.language,
    });
    if (error) {
      if (error.message.includes("INSUFFICIENT_CREDITS")) throw new Error("INSUFFICIENT_CREDITS");
      if (error.message.includes("UNSUPPORTED_LANGUAGE")) throw new Error("UNSUPPORTED_LANGUAGE");
      throw new Error("SESSION_CREATION_FAILED");
    }
    const payload = (result ?? {}) as {
      session_id?: string;
      resumed?: boolean;
      credits_remaining?: number;
    };
    if (!payload.session_id) throw new Error("SESSION_CREATION_FAILED");
    return {
      sessionId: payload.session_id,
      resumed: Boolean(payload.resumed),
      creditsRemaining: payload.credits_remaining ?? 0,
    };
  });

/** Abandons the candidate own in progress session. The credit stays consumed. */
export const abandonAssessmentSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("abandon_assessment_session", {
      _session_id: data.sessionId,
    });
    if (error) throw new Error("SESSION_ABANDON_FAILED");
    return { abandoned: Boolean((result as { abandoned?: boolean } | null)?.abandoned) };
  });

export type AssessmentQuestion = {
  id: string;
  level: string;
  category: string;
  question_text: string;
  options: string[];
  question_type: string;
  order_hint: number;
  audio_url: string | null;
  image_url: string | null;
  image_alt: string | null;
  max_plays: number;
};

/**
 * Draws the item set for one session, in the session own language.
 * Correct answers never leave the server and option order is shuffled per candidate.
 */
export const getAssessmentQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<AssessmentQuestion[]> => {
    const { data: session, error: sessionError } = await context.supabase
      .from("test_sessions")
      .select("id, language, status, question_ids")
      .eq("id", data.sessionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (sessionError) throw new Error(sessionError.message);
    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status !== "in_progress") throw new Error("SESSION_NOT_ACTIVE");

    const language = session.language as keyof typeof ASSESSMENT_BLUEPRINTS;
    const blueprint = ASSESSMENT_BLUEPRINTS[language];
    if (!blueprint) throw new Error("UNSUPPORTED_LANGUAGE");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pool, error } = await supabaseAdmin
      .from("questions")
      .select(
        "id, level, category, question_text, options, question_type, order_hint, audio_url, image_url, image_alt, max_plays",
      )
      .eq("is_active", true)
      .eq("language", language);
    if (error) throw new Error(error.message);

    type Row = NonNullable<typeof pool>[number];
    const rows = (pool ?? []) as Row[];
    const existing = ((session.question_ids as string[] | null) ?? []).filter(Boolean);

    let picked: Row[];
    if (existing.length) {
      // A resumed session keeps exactly the same items, in the same order.
      const byId = new Map(rows.map((q) => [q.id, q]));
      picked = existing.map((id) => byId.get(id)).filter(Boolean) as Row[];
    } else {
      const byCell = new Map<string, Row[]>();
      for (const q of rows) {
        const key = `${q.level}:${q.category}:${q.question_type ?? "mcq"}`;
        byCell.set(key, [...(byCell.get(key) ?? []), q]);
      }
      picked = [];
      for (const cell of blueprint) {
        const bucket = byCell.get(`${cell.level}:${cell.skill}:${cell.type}`) ?? [];
        picked.push(...shuffle(bucket).slice(0, cell.count));
      }
      picked.sort((a, b) => {
        const l =
          LEVEL_ORDER.indexOf(a.level as never) - LEVEL_ORDER.indexOf(b.level as never);
        if (l !== 0) return l;
        return SKILL_ORDER.indexOf(a.category as never) - SKILL_ORDER.indexOf(b.category as never);
      });
      await supabaseAdmin
        .from("test_sessions")
        .update({ question_ids: picked.map((q) => q.id) })
        .eq("id", session.id);
    }

    return picked.map((q) => ({
      id: q.id,
      level: q.level as string,
      category: q.category as string,
      question_text: q.question_text,
      options: shuffle((q.options as string[]) ?? []),
      question_type: q.question_type ?? "mcq",
      order_hint: q.order_hint,
      audio_url: q.audio_url ?? null,
      image_url: q.image_url ?? null,
      image_alt: q.image_alt ?? null,
      max_plays: q.max_plays ?? 5,
    }));
  });

export type AssessmentSessionState = {
  sessionId: string;
  language: string;
  status: AssessmentStatus;
  currentQuestion: number;
  answers: Record<string, string>;
  startedAt: string;
  completedAt: string | null;
};

/** Reads the candidate own session, its saved answers and its position. */
export const getAssessmentSessionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<AssessmentSessionState> => {
    const { data: session, error } = await context.supabase
      .from("test_sessions")
      .select("id, language, status, answers, current_question, started_at, completed_at")
      .eq("id", data.sessionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("SESSION_NOT_FOUND");
    const raw = (session.answers ?? {}) as Record<string, unknown>;
    const answers: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") answers[k] = v;
    }
    return {
      sessionId: session.id,
      language: session.language,
      status: session.status as AssessmentStatus,
      currentQuestion: session.current_question ?? 0,
      answers,
      startedAt: session.started_at,
      completedAt: session.completed_at,
    };
  });

const SaveAnswerInput = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: z.string().max(4000),
  currentQuestion: z.number().int().min(0).max(500),
});

/**
 * Persists one answer plus the candidate position.
 * The session identity comes from the database row, never from the client:
 * user_id, language, status, score and credits cannot be altered here.
 */
export const saveAssessmentAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveAnswerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase
      .from("test_sessions")
      .select("id, status, answers, question_ids")
      .eq("id", data.sessionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status === "completed") throw new Error("SESSION_ALREADY_COMPLETED");
    if (session.status !== "in_progress") throw new Error("SESSION_NOT_ACTIVE");

    const served = ((session.question_ids as string[] | null) ?? []).filter(Boolean);
    if (served.length && !served.includes(data.questionId)) throw new Error("QUESTION_NOT_IN_SESSION");

    const answers: Record<string, string> = {};
    for (const [k, v] of Object.entries((session.answers ?? {}) as Record<string, unknown>)) {
      if (typeof v === "string") answers[k] = v;
    }
    answers[data.questionId] = data.answer;
    const answered = Object.keys(answers).length;

    const { error: updateError } = await context.supabase
      .from("test_sessions")
      .update({
        answers,
        current_question: data.currentQuestion,
        progress: {
          answered,
          total: served.length,
          updated_at: new Date().toISOString(),
        },
      })
      .eq("id", session.id)
      .eq("user_id", context.userId)
      .eq("status", "in_progress");
    if (updateError) throw new Error("ANSWER_SAVE_FAILED");

    return { saved: true, answered, total: served.length };
  });

export type CompleteAssessmentResult = {
  sessionId: string;
  alreadyCompleted: boolean;
  answered: number;
  total: number;
};

/**
 * Closes the session. Idempotent: a second call returns the same completed session
 * and never produces a second result. No CEFR scoring happens at this stage.
 */
export const completeAssessmentSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<CompleteAssessmentResult> => {
    const { data: session, error } = await context.supabase
      .from("test_sessions")
      .select("id, status, answers, question_ids, started_at")
      .eq("id", data.sessionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const served = ((session.question_ids as string[] | null) ?? []).filter(Boolean);
    const answered = Object.keys((session.answers ?? {}) as Record<string, unknown>).length;

    if (session.status === "completed") {
      return { sessionId: session.id, alreadyCompleted: true, answered, total: served.length };
    }
    if (session.status !== "in_progress") throw new Error("SESSION_NOT_ACTIVE");

    const startedAt = new Date(session.started_at).getTime();
    const duration = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

    // Single conditional write: two parallel submissions cannot both succeed.
    const { data: updated, error: updateError } = await context.supabase
      .from("test_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        progress: {
          answered,
          total: served.length,
          updated_at: new Date().toISOString(),
        },
      })
      .eq("id", session.id)
      .eq("user_id", context.userId)
      .eq("status", "in_progress")
      .select("id")
      .maybeSingle();
    if (updateError) throw new Error("SESSION_COMPLETION_FAILED");

    return {
      sessionId: session.id,
      alreadyCompleted: !updated,
      answered,
      total: served.length,
    };
  });
