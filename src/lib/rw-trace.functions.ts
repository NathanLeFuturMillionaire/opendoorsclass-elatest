import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildRwTraceSentences } from "@/lib/rw-trace-sentences";

const idSchema = z.string().uuid();
const grammarIndexSchema = z.number().int().min(0).max(9);

export type RwTraceExercise = {
  id: string;
  learner_id: string;
  lesson_id: string;
  grammar_index: number;
  grammar_point: string;
  sentences: string[];
  status: "in_progress" | "completed";
  current_sentence: number;
  current_character: number;
  score: number | null;
  total_attempts: number;
  invalid_attempts: number;
  total_duration_ms: number;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type RwTraceCharacter = {
  id: string;
  exercise_id: string;
  learner_id: string;
  sentence_index: number;
  character_index: number;
  character: string;
  attempts: number;
  invalid_attempts: number;
  precision: number;
  coverage: number;
  stroke_coverage: number;
  score: number;
  duration_ms: number;
  trace: { strokes: { x: number; y: number }[][] };
  validated_at: string | null;
};

async function ownExercise(supabase: any, learnerId: string, lessonId: string, grammarIndex: number) {
  const { data, error } = await supabase
    .from("rw_trace_exercises")
    .select("*")
    .eq("learner_id", learnerId)
    .eq("lesson_id", lessonId)
    .eq("grammar_index", grammarIndex)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as RwTraceExercise | null;
}

export const getRwTraceExercise = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ lessonId: idSchema, grammarIndex: grammarIndexSchema }).parse(value))
  .handler(async ({ data, context }) => {
    const { data: learner, error } = await context.supabase
      .from("rw_learners").select("id").eq("user_id", context.userId).eq("is_active", true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!learner) return null;
    return ownExercise(context.supabase, learner.id, data.lessonId, data.grammarIndex);
  });

export const startRwTraceExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ lessonId: idSchema, grammarIndex: grammarIndexSchema }).parse(value))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: learner, error: learnerError } = await supabase
      .from("rw_learners").select("id, level").eq("user_id", userId).eq("is_active", true).maybeSingle();
    if (learnerError) throw new Error(learnerError.message);
    if (!learner) throw new Error("Réservé aux apprenants de l'atelier.");
    const existing = await ownExercise(supabase, learner.id, data.lessonId, data.grammarIndex);
    if (existing) return existing;
    const { data: allowed, error: hoursError } = await supabase.rpc("rw_workshop_allows", { _uid: userId });
    if (hoursError) throw new Error(hoursError.message);
    if (!allowed) throw new Error("L'atelier est fermé pour le moment. Revenez aux heures d'ouverture.");
    const { data: lesson, error: lessonError } = await supabase
      .from("rw_lessons").select("id, title, level, grammar, status").eq("id", data.lessonId).maybeSingle();
    if (lessonError) throw new Error(lessonError.message);
    if (!lesson || lesson.status !== "published" || lesson.level !== learner.level) {
      throw new Error("Texte non disponible ou encore verrouillé.");
    }
    const grammar = Array.isArray(lesson.grammar) ? lesson.grammar[data.grammarIndex] as {
      point?: string; explanation_fr?: string; example?: string;
    } | undefined : undefined;
    if (!grammar?.point) throw new Error("Leçon de grammaire introuvable.");
    const sentences = buildRwTraceSentences({
      point: grammar.point,
      explanation_fr: grammar.explanation_fr,
      example: grammar.example,
      level: lesson.level,
      title: lesson.title,
    });
    if (sentences.length !== 5) throw new Error("Impossible de préparer les cinq phrases.");
    const { data: inserted, error: insertError } = await supabase
      .from("rw_trace_exercises")
      .insert({
        learner_id: learner.id,
        lesson_id: lesson.id,
        grammar_index: data.grammarIndex,
        grammar_point: grammar.point,
        sentences,
      })
      .select("*")
      .single();
    if (insertError) {
      if (insertError.code === "23505") {
        const concurrent = await ownExercise(supabase, learner.id, data.lessonId, data.grammarIndex);
        if (concurrent) return concurrent;
      }
      throw new Error(insertError.message);
    }
    return inserted as RwTraceExercise;
  });

const pointSchema = z.object({ x: z.number().min(-0.25).max(1.25), y: z.number().min(-0.25).max(1.25) });
const attemptSchema = z.object({
  exerciseId: idSchema,
  sentenceIndex: z.number().int().min(0).max(4),
  characterIndex: z.number().int().min(0).max(500),
  outOfBounds: z.boolean(),
  precision: z.number().min(0).max(100),
  coverage: z.number().min(0).max(100),
  strokeCoverage: z.number().min(0).max(100),
  durationMs: z.number().int().min(0).max(120000),
  trace: z.object({ strokes: z.array(z.array(pointSchema).max(400)).max(16) })
    .refine((trace) => trace.strokes.reduce((sum, stroke) => sum + stroke.length, 0) <= 800, "Trop de points"),
});

export const recordRwTraceAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => attemptSchema.parse(value))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("rw_trace_record_attempt", {
      _exercise: data.exerciseId,
      _sentence_index: data.sentenceIndex,
      _character_index: data.characterIndex,
      _out_of_bounds: data.outOfBounds,
      _precision: data.precision,
      _coverage: data.coverage,
      _stroke_coverage: data.strokeCoverage,
      _duration_ms: data.durationMs,
      _trace: data.trace,
    });
    if (error) throw new Error(error.message);
    return result as RwTraceExercise & { accepted: boolean; completed: boolean; expected: string };
  });

export const listRwTraceExercises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ learnerId: idSchema }).parse(value))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: staff }, { data: own }, { data: assigned }] = await Promise.all([
      supabase.rpc("rw_is_staff", { _uid: userId }),
      supabase.from("rw_learners").select("id, level").eq("id", data.learnerId).eq("user_id", userId).maybeSingle(),
      supabase.rpc("rw_coaches_learner", { _uid: userId, _learner: data.learnerId }),
    ]);
    if (staff !== true && !own && assigned !== true) throw new Error("Accès refusé.");
    const { data: learner, error: learnerError } = await supabase
      .from("rw_learners").select("id, level").eq("id", data.learnerId).maybeSingle();
    if (learnerError) throw new Error(learnerError.message);
    if (!learner) throw new Error("Apprenant introuvable.");
    const [{ data: exercises, error: exerciseError }, { data: lessons, error: lessonError }] = await Promise.all([
      supabase.from("rw_trace_exercises").select("*, rw_lessons(title, level)")
        .eq("learner_id", data.learnerId).order("updated_at", { ascending: false }),
      supabase.from("rw_lessons").select("id, title, level, grammar")
        .eq("status", "published").eq("level", learner.level).order("title"),
    ]);
    if (exerciseError) throw new Error(exerciseError.message);
    if (lessonError) throw new Error(lessonError.message);
    const ids = (exercises ?? []).map((exercise) => exercise.id);
    const { data: characters, error: characterError } = ids.length
      ? await supabase.from("rw_trace_characters").select("*").in("exercise_id", ids)
        .order("sentence_index").order("character_index")
      : { data: [], error: null };
    if (characterError) throw new Error(characterError.message);
    return {
      exercises: (exercises ?? []).map((exercise) => ({
        ...exercise,
        characters: (characters ?? []).filter((character) => character.exercise_id === exercise.id),
      })) as unknown as (RwTraceExercise & { characters: RwTraceCharacter[]; rw_lessons: { title: string; level: string } | null })[],
      lessons: lessons ?? [],
    };
  });
