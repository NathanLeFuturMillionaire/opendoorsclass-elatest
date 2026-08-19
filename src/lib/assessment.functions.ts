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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("start_assessment_session", {
      _language: data.language,
      _actor: context.userId,
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("abandon_assessment_session", {
      _session_id: data.sessionId,
      _actor: context.userId,
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
      // Brand new attempt: draw a fresh set, server side, favouring items this
      // candidate has never seen. The draw is never exposed to the client.
      const { drawAttempt, secureShuffle } = await import("@/lib/assessment-draw.server");

      const { data: history } = await supabaseAdmin
        .from("test_sessions")
        .select("question_ids")
        .eq("user_id", context.userId)
        .eq("language", language)
        .neq("id", session.id)
        .order("started_at", { ascending: false })
        .limit(20);
      const seen = new Set<string>();
      for (const row of history ?? []) {
        for (const id of ((row.question_ids as string[] | null) ?? [])) seen.add(id);
      }

      const draw = drawAttempt(rows, blueprint, seen);
      if (
        draw.shortfalls.length ||
        draw.thinPools.length ||
        draw.levelFallbacks.length ||
        draw.repeated
      ) {
        // Never blocks the attempt: the candidate starts with what exists.
        console.warn("[assessment] bank coverage warning", {
          language,
          sessionId: session.id,
          shortfalls: draw.shortfalls,
          thinPools: draw.thinPools,
          levelFallbacks: draw.levelFallbacks,
          repeatedItems: draw.repeated,
        });
      }

      // Presentation order (part VI): the category order never changes, and
      // inside each category the difficulty curve restarts at the easiest level
      // available and climbs to the hardest. Only items sharing the exact same
      // level are shuffled between themselves.
      const groups = new Map<string, Row[]>();
      for (const q of draw.picked) {
        const key = `${q.category}:${q.level}`;
        const bucket = groups.get(key);
        if (bucket) bucket.push(q);
        else groups.set(key, [q]);
      }
      picked = [...groups.entries()]
        .sort((a, b) => {
          const [ca, la] = a[0].split(":");
          const [cb, lb] = b[0].split(":");
          const c = SKILL_ORDER.indexOf(ca as never) - SKILL_ORDER.indexOf(cb as never);
          if (c !== 0) return c;
          return LEVEL_ORDER.indexOf(la as never) - LEVEL_ORDER.indexOf(lb as never);
        })
        .flatMap(([, bucket]) => secureShuffle(bucket));
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
  /** Absolute deadline of the attempt, ISO string. */
  deadlineAt: string;
  /** Seconds left when the server answered. Negative means already expired. */
  remainingSeconds: number;
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
      deadlineAt: new Date(
        new Date(session.started_at).getTime() + ASSESSMENT_DURATION_SECONDS * 1000,
      ).toISOString(),
      remainingSeconds: Math.round(
        (new Date(session.started_at).getTime() + ASSESSMENT_DURATION_SECONDS * 1000 - Date.now()) /
          1000,
      ),
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
      .select("id, status, answers, question_ids, started_at")
      .eq("id", data.sessionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status === "completed") throw new Error("SESSION_ALREADY_COMPLETED");
    if (session.status !== "in_progress") throw new Error("SESSION_NOT_ACTIVE");
    const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
    // A 15 second grace period absorbs clock drift and the last request in flight.
    if (elapsed > ASSESSMENT_DURATION_SECONDS + 15) throw new Error("SESSION_TIME_OVER");

    const served = ((session.question_ids as string[] | null) ?? []).filter(Boolean);
    if (served.length && !served.includes(data.questionId))
      throw new Error("QUESTION_NOT_IN_SESSION");

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
  score: number;
  levelResult: string;
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
      .select("id, status, answers, question_ids, started_at, language, score, level_result")
      .eq("id", data.sessionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const served = ((session.question_ids as string[] | null) ?? []).filter(Boolean);
    const answers = (session.answers ?? {}) as Record<string, string>;
    const answered = Object.keys(answers).length;

    if (session.status === "completed") {
      return {
        sessionId: session.id,
        alreadyCompleted: true,
        answered,
        total: served.length,
        score: session.score ?? 0,
        levelResult: session.level_result ?? "A1",
      };
    }
    if (session.status !== "in_progress") throw new Error("SESSION_NOT_ACTIVE");

    const startedAt = new Date(session.started_at).getTime();
    const duration = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

    // Server side grading. Correct answers never leave the server.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: graded } = await supabaseAdmin
      .from("questions")
      .select("id, level, category, correct_answer")
      .in("id", served.length ? served : ["00000000-0000-0000-0000-000000000000"]);

    // Weighted scoring (part VI): an item counts as much as its CEFR weight,
    // A1 = 1 up to C2 = 6. Deterministic, no randomness, no adaptive logic.
    const { levelWeight } = await import("@/lib/assessment-difficulty");
    const perLevel: Record<string, { correct: number; total: number; percent: number }> = {};
    const perCategory: Record<string, { correct: number; total: number; percent: number }> = {};
    // Weighted numerator and denominator per category, used for the percent.
    const catWeights: Record<string, { correct: number; total: number }> = {};
    let totalCorrect = 0;
    let weightedCorrect = 0;
    let weightedTotal = 0;
    const totalGraded = graded?.length ?? 0;

    for (const q of graded ?? []) {
      const raw = answers[q.id];
      let isCorrect = false;
      if (q.category === "speaking" || q.category === "writing") {
        try {
          const parsed = raw ? JSON.parse(raw) : null;
          if (parsed && typeof parsed.score === "number" && parsed.score >= 60) isCorrect = true;
        } catch {
          isCorrect = false;
        }
      } else {
        isCorrect = raw === q.correct_answer;
      }
      const lvl = q.level as string;
      const cat = q.category as string;
      const weight = levelWeight(lvl);
      weightedTotal += weight;
      perLevel[lvl] ??= { correct: 0, total: 0, percent: 0 };
      perCategory[cat] ??= { correct: 0, total: 0, percent: 0 };
      catWeights[cat] ??= { correct: 0, total: 0 };
      catWeights[cat].total += weight;
      perLevel[lvl].total++;
      perCategory[cat].total++;
      if (isCorrect) {
        totalCorrect++;
        weightedCorrect += weight;
        catWeights[cat].correct += weight;
        perLevel[lvl].correct++;
        perCategory[cat].correct++;
      }
    }
    for (const cell of Object.values(perLevel)) {
      cell.percent = cell.total ? Math.round((cell.correct / cell.total) * 100) : 0;
    }
    for (const [cat, cell] of Object.entries(perCategory)) {
      const w = catWeights[cat];
      cell.percent = w && w.total ? Math.round((w.correct / w.total) * 100) : 0;
    }

    // CEFR ceiling: the highest level mastered without a break in the ladder.
    // A candidate strong on A1 to B1 but failing B2 stays at B1, whatever the
    // raw percentage of correct answers looks like.
    let levelResult: string = "A1";
    for (const lvl of LEVEL_ORDER) {
      const cell = perLevel[lvl];
      if (!cell || cell.total === 0) continue;
      if (cell.percent >= 70) levelResult = lvl;
      else break;
    }
    // Score reported to the candidate: weighted by level, so a C2 item won
    // weighs six times an A1 item. Falls back to the flat ratio if no weight.
    const scorePercent = weightedTotal
      ? Math.round((weightedCorrect / weightedTotal) * 100)
      : totalGraded
        ? Math.round((totalCorrect / totalGraded) * 100)
        : 0;

    // Single conditional write: two parallel submissions cannot both succeed.
    const { data: updated, error: updateError } = await context.supabase
      .from("test_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        score: scorePercent,
        level_result: levelResult as never,
        per_category_scores: perCategory,
        skill_scores: perLevel,
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

    if (updated) {
      // Gamification and notifications must never block the result.
      try {
        await supabaseAdmin.rpc("process_test_completion", { _session_id: session.id });
      } catch {
        // ignore
      }
      try {
        const { pushNotification, NotificationTemplates } =
          await import("@/lib/notifications.server");
        await pushNotification(NotificationTemplates.testCompleted(context.userId, session.id));
        await pushNotification(
          NotificationTemplates.certificateAvailable(context.userId, session.id),
        );
      } catch {
        // ignore
      }
    }

    return {
      sessionId: session.id,
      alreadyCompleted: !updated,
      answered,
      total: served.length,
      score: scorePercent,
      levelResult,
    };
  });

/** Shared AI grading endpoint for the productive skills of any assessed language. */
const GradeTextInput = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  text: z.string().min(1).max(4000),
});

export const scoreAssessmentWriting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GradeTextInput.parse(input))
  .handler(async ({ data, context }): Promise<{ score: number; feedback: string }> => {
    const { gradeProduction, loadGradingContext } = await import("@/lib/assessment-grading.server");
    const ctx = await loadGradingContext(context, data.sessionId, data.questionId, "writing");
    const result = await gradeProduction({
      kind: "writing",
      examinerLanguage: ASSESSMENT_LANGUAGE_LABELS[ctx.language]?.examiner ?? "Spanish",
      level: ctx.level,
      prompt: ctx.prompt,
      content: data.text,
    });
    await ctx.persist({ text: data.text, ...result });
    return result;
  });

const GradeAudioInput = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  audioBase64: z.string().min(100),
  mimeType: z.string().default("audio/webm"),
});

export const scoreAssessmentSpeaking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GradeAudioInput.parse(input))
  .handler(
    async ({ data, context }): Promise<{ transcript: string; score: number; feedback: string }> => {
      const { gradeProduction, loadGradingContext, transcribeAudio } =
        await import("@/lib/assessment-grading.server");
      const ctx = await loadGradingContext(context, data.sessionId, data.questionId, "speaking");
      const transcript = await transcribeAudio(data.audioBase64, data.mimeType);
      const examinerLanguage = ASSESSMENT_LANGUAGE_LABELS[ctx.language]?.examiner ?? "Spanish";
      const result = transcript
        ? await gradeProduction({
            kind: "speaking",
            examinerLanguage,
            level: ctx.level,
            prompt: ctx.prompt,
            content: transcript,
          })
        : { score: 0, feedback: "" };
      await ctx.persist({ transcript, ...result });
      return { transcript, ...result };
    },
  );
