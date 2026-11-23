import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TEST_BLUEPRINT, SKILL_ORDER, LEVEL_ORDER as ENGINE_LEVELS, shuffle } from "@/lib/test-engine";

export type ClientQuestion = {
  id: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  category:
    | "grammar"
    | "vocabulary"
    | "reading"
    | "listening"
    | "speaking"
    | "writing"
    | "orthography";
  question_text: string;
  options: string[];
  question_type: string;
  image_url: string | null;
  image_alt: string | null;
  audio_url: string | null;
  max_plays: number;
  order_hint: number;
};

// Draw a unique, randomised question set for one attempt.
// Correct answers are never sent to the client and option order is shuffled
// for display only, the stored options and correct_answer are untouched.
export const getTestQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pool, error } = await supabaseAdmin
      .from("questions")
      .select(
        "id, level, category, question_text, options, question_type, image_url, image_alt, audio_url, max_plays, order_hint",
      )
      .eq("is_active", true)
      .eq("language", "en");
    if (error) throw new Error(error.message);

    // Questions already served to this candidate in previous attempts.
    const { data: previous } = await supabaseAdmin
      .from("test_sessions")
      .select("question_ids")
      .eq("user_id", context.userId)
      .neq("id", data.sessionId);
    const seen = new Set<string>();
    for (const row of previous ?? []) {
      for (const id of (row.question_ids as string[] | null) ?? []) seen.add(id);
    }

    type Row = (typeof pool extends (infer R)[] | null ? R : never);
    const byCell = new Map<string, Row[]>();
    for (const q of (pool ?? []) as Row[]) {
      const key = `${q.level}:${q.category}`;
      const bucket = byCell.get(key) ?? [];
      bucket.push(q);
      byCell.set(key, bucket);
    }

    const picked: Row[] = [];
    for (const cell of TEST_BLUEPRINT) {
      const bucket = byCell.get(`${cell.level}:${cell.skill}`) ?? [];
      if (!bucket.length) continue;
      const fresh = shuffle(bucket.filter((q) => !seen.has(q.id)));
      const reused = shuffle(bucket.filter((q) => seen.has(q.id)));
      picked.push(...[...fresh, ...reused].slice(0, cell.count));
    }

    // Order the attempt by rising CEFR level, then by a stable skill order.
    picked.sort((a, b) => {
      const l =
        ENGINE_LEVELS.indexOf(a.level as never) - ENGINE_LEVELS.indexOf(b.level as never);
      if (l !== 0) return l;
      return (
        SKILL_ORDER.indexOf(a.category as never) - SKILL_ORDER.indexOf(b.category as never)
      );
    });

    await supabaseAdmin
      .from("test_sessions")
      .update({ question_ids: picked.map((q) => q.id) })
      .eq("id", data.sessionId);

    return picked.map((q) => ({
      id: q.id,
      level: q.level,
      category: q.category,
      question_text: q.question_text,
      options: shuffle((q.options as string[]) ?? []),
      question_type: q.question_type ?? "mcq",
      image_url: q.image_url ?? null,
      image_alt: q.image_alt ?? null,
      audio_url: q.audio_url ?? null,
      max_plays: q.max_plays,
      order_hint: q.order_hint,
    })) as ClientQuestion[];
  });

// Start a new test session (decrements 1 credit atomically).
export const startTestSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await admin.rpc("start_test_session", { _actor: context.userId });
    if (error) {
      if (error.message.includes("INSUFFICIENT_CREDITS")) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      throw new Error(error.message);
    }
    try {
      const { pushNotification, NotificationTemplates } = await import("@/lib/notifications.server");
      await pushNotification(NotificationTemplates.testStarted(context.userId));
    } catch {
      // ignore
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


export const submitTestAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify session belongs to user and not already completed.
    const { data: session, error: sErr } = await context.supabase
      .from("test_sessions")
      .select("id, user_id, completed_at, question_ids, answers, language")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session introuvable");
    if (session.completed_at) throw new Error("Session déjà terminée");

    // Grade only the questions that were actually served for this attempt.
    const servedIds = ((session.question_ids as string[] | null) ?? []).filter(Boolean);
    let query = supabaseAdmin
      .from("questions")
      .select("id, level, category, correct_answer, question_text");
    query = servedIds.length ? query.in("id", servedIds) : query.eq("is_active", true).eq("language", "en");
    const { data: questions, error: qErr } = await query;
    if (qErr) throw new Error(qErr.message);
    const total = questions?.length ?? 0;

    // Writing and speaking evaluations come only from the server copy of the
    // answers (written by the graders), never from the browser payload.
    const { isProductiveCategory, computeAssessmentScore } = await import("@/lib/assessment-scoring");
    const stored = ((session.answers as Record<string, string> | null) ?? {});
    const merged: Record<string, string> = { ...data.answers };
    for (const q of questions ?? []) {
      if (!isProductiveCategory(q.category)) continue;
      if (stored[q.id] !== undefined) merged[q.id] = stored[q.id] as string;
      else delete merged[q.id];
    }
    // Persist objective answers first so the atomic grader writes stack on top.
    await supabaseAdmin
      .from("test_sessions")
      .update({ answers: merged })
      .eq("id", data.sessionId)
      .is("completed_at", null);
    const { gradePendingProductions } = await import("@/lib/assessment-grading.server");
    const finalAnswers = (await gradePendingProductions({
      sessionId: data.sessionId,
      userId: context.userId,
      language: "en",
      examinerLanguage: "English",
      items: questions ?? [],
      answers: merged,
    })) as Record<string, string>;
    const computed = computeAssessmentScore(questions ?? [], finalAnswers);
    const perLevel = computed.perLevel;
    const perCategory = computed.perCategory;
    const levelResult = computed.levelResult;

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

    const scorePercent = computed.score;

    // Previous best score, read before this session is marked completed.
    const { data: previousSessions } = await supabaseAdmin
      .from("test_sessions")
      .select("score, level_result")
      .eq("user_id", context.userId)
      .not("completed_at", "is", null)
      .neq("id", data.sessionId);
    const previousBest = (previousSessions ?? []).reduce(
      (max, s) => Math.max(max, s.score ?? 0),
      -1,
    );
    const previousLevels = new Set((previousSessions ?? []).map((s) => s.level_result));

    const { error: uErr } = await supabaseAdmin
      .from("test_sessions")
      .update({
        completed_at: new Date().toISOString(),
        score: scorePercent,
        level_result: levelResult,
        status: "completed",
        answers: finalAnswers,
        per_category_scores: perCategory,
        skill_scores: perLevel,
        progress: {
          answered: Object.keys(finalAnswers).length,
          total,
          grading_pending: computed.pendingCount,
          updated_at: new Date().toISOString(),
        },
      })
      .eq("id", data.sessionId)
      .is("completed_at", null);
    if (uErr) throw new Error(uErr.message);

    // Gamification: award XP + badges for this completed session (idempotent).
    let gamification: {
      awarded: Array<{ event: string; amount: number }>;
      new_badges: string[];
      total_xp: number;
      current_level: number;
      level_up: boolean;
    } | null = null;
    try {
      const { data: beforeXp } = await supabaseAdmin
        .from("user_gamification")
        .select("total_xp")
        .eq("user_id", context.userId)
        .maybeSingle();
      const { data: g } = await supabaseAdmin.rpc("process_test_completion", { _session_id: data.sessionId });
      gamification = (g as typeof gamification) ?? null;
      // Motivating leaderboard nudge for learners who were just overtaken.
      const from = beforeXp?.total_xp ?? 0;
      const to = (gamification as { total_xp?: number } | null)?.total_xp ?? from;
      if (to > from) {
        const { data: overtaken } = await supabaseAdmin
          .from("user_gamification")
          .select("user_id")
          .eq("leaderboard_opt_in", true)
          .neq("user_id", context.userId)
          .gte("total_xp", from)
          .lt("total_xp", to)
          .limit(20);
        if (overtaken?.length) {
          const { pushNotification, NotificationTemplates } = await import(
            "@/lib/notifications.server"
          );
          for (const row of overtaken) {
            await pushNotification({
              ...NotificationTemplates.leaderboardOvertaken(row.user_id),
              dedupeKey: "leaderboard-overtaken",
            });
          }
        }
      }
    } catch {
      gamification = null;
    }

    // Notifications (never block the result).
    try {
      const { pushNotification, NotificationTemplates } = await import("@/lib/notifications.server");
      await pushNotification(NotificationTemplates.testCompleted(context.userId, data.sessionId));
      await pushNotification(
        NotificationTemplates.certificateAvailable(context.userId, data.sessionId),
      );
      if (previousBest >= 0 && scorePercent > previousBest) {
        await pushNotification(NotificationTemplates.personalBest(context.userId, data.sessionId));
      }
      if (!previousLevels.has(levelResult)) {
        await pushNotification(NotificationTemplates.levelUp(context.userId, levelResult));
      }
    } catch {
      // ignore
    }

    const result: TestResult = {
      sessionId: data.sessionId,
      score: scorePercent,
      totalQuestions: total,
      levelResult,
      perLevel,
      perCategory,
      recommendation: msg?.message_text ?? "",
    };
    return { ...result, gamification };
  });

export const getSessionResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase
      .from("test_sessions")
      .select("id, score, level_result, per_category_scores, completed_at, started_at, language")
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
      .select("first_name, last_name, avatar_url, candidate_number, nationality, country")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      sessionId: session.id,
      language: session.language ?? "en",
      score: session.score,
      levelResult: session.level_result,
      perCategory: (session.per_category_scores ?? {}) as Record<
        string,
        { correct: number; total: number; percent: number; pending?: number; missing?: number }
      >,
      recommendation: msg?.message_text ?? "",
      completedAt: session.completed_at,
      startedAt: session.started_at,
      candidateFirstName: profile?.first_name ?? "",
      candidateLastName: profile?.last_name ?? "",
      candidateEmail: (context.claims?.email as string) ?? "",
      candidateAvatar: profile?.avatar_url ?? null,
      candidateNumber: profile?.candidate_number ?? null,
      candidateNationality: profile?.nationality ?? null,
      candidateCountry: profile?.country ?? null,
    };
  });

export const getTestHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("test_sessions")
      .select("id, started_at, completed_at, score, level_result, language")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((s) => ({ ...s, language: s.language ?? "en" }));
  });

const SpeakingInput = z.object({ recordingId: z.string().uuid() });

export const transcribeAndScoreSpeaking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SpeakingInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Lovable AI non configuré.");
    const { finishEnglishSpeaking } = await import("@/lib/english-speaking.server");
    return finishEnglishSpeaking(data.recordingId, context.userId, apiKey);
  });
const WritingInput = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  text: z.string().min(1).max(4000),
});

// Grade a free written production with AI and store it in the session answers.
export const scoreWritingAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => WritingInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Lovable AI non configuré.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: session } = await context.supabase
      .from("test_sessions")
      .select("id, completed_at, answers")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Session introuvable.");
    if (session.completed_at) throw new Error("Session déjà terminée.");

    const { data: question } = await supabaseAdmin
      .from("questions")
      .select("id, question_text, level, category")
      .eq("id", data.questionId)
      .maybeSingle();
    if (!question || question.category !== "writing") throw new Error("Question invalide.");

    let score: number | null = null;
    let feedback = "";
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        reasoning_effort: "none",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an English CEFR examiner grading a short written production. Return strict JSON with keys: score (integer 0 to 100 based on task fulfilment, grammar, vocabulary range, spelling and coherence), feedback (one short sentence in French, no dashes). Be strict but fair.",
          },
          {
            role: "user",
            content: `CEFR target level: ${question.level}. Task prompt: ${question.question_text}\n\nCandidate answer:\n"""${data.text}"""`,
          },
        ],
      }),
    });
    if (res.ok) {
      const gj = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      try {
        const parsed = JSON.parse(gj.choices?.[0]?.message?.content ?? "{}");
        const raw = Number(parsed.score);
        if (parsed.score !== undefined && parsed.score !== null && Number.isFinite(raw)) {
          score = Math.max(0, Math.min(100, Math.round(raw)));
          feedback = typeof parsed.feedback === "string" ? parsed.feedback : "";
        }
      } catch {
        score = null;
      }
    }

    // Atomic single key write. A failed evaluation is stored as pending (never
    // as 0) and graded again when the test is submitted.
    const payload = score === null ? { text: data.text, pending: true } : { text: data.text, score, feedback };
    const { data: saved } = await supabaseAdmin.rpc("save_english_speaking_answer", {
      _session: data.sessionId,
      _user: context.userId,
      _question: data.questionId,
      _answer: JSON.stringify(payload),
    });
    if (!saved) throw new Error("Sauvegarde de la réponse impossible.");
    if (score === null) {
      throw new Error("Correction momentanément indisponible. Votre texte est enregistré et sera corrigé à la fin du test.");
    }
    return { score, feedback };
  });
