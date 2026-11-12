import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
type Level = (typeof LEVELS)[number];

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("rw_is_staff", { _uid: userId });
  if (data !== true) throw new Error("Accès réservé aux administrateurs.");
}

/** Program grid with lesson status per level. RLS hides drafts from non staff. */
export const listRwProgram = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: weeks }, { data: sessions }, { data: lessons }] = await Promise.all([
      supabase.from("rw_weeks").select("id, week_number, title").order("week_number"),
      supabase.from("rw_sessions").select("id, week_id, day_index, title").order("day_index"),
      supabase.from("rw_lessons").select("id, session_id, level, status, title, word_count"),
    ]);
    return (weeks ?? []).map((w) => ({
      ...w,
      sessions: (sessions ?? []).filter((s) => s.week_id === w.id).map((s) => ({
        ...s,
        lessons: (lessons ?? []).filter((l) => l.session_id === s.id),
      })),
    }));
  });

/** Staff: AI draft for one session and level (saved as draft, never published automatically). */
export const generateRwLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { session_id: string; level: Level }) => {
    if (!LEVELS.includes(v.level)) throw new Error("Niveau invalide.");
    return v;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const { data: s } = await supabase.from("rw_sessions").select("id, title, rw_weeks(week_number, title)").eq("id", data.session_id).single();
    if (!s) throw new Error("Séance introuvable.");
    const { data: existing } = await supabase.from("rw_lessons").select("status").eq("session_id", data.session_id).eq("level", data.level).maybeSingle();
    if (existing?.status === "published") throw new Error("Ce texte est déjà publié. Repassez-le en brouillon pour le régénérer.");
    const week = (s as any).rw_weeks;
    const { draftRwLesson, countWords } = await import("@/lib/rw-lessons.server");
    const d = await draftRwLesson({ week: week.week_number, weekTitle: week.title, title: s.title, level: data.level });
    const row = {
      session_id: data.session_id, level: data.level, title: d.title, body: d.body, word_count: countWords(d.body),
      summary_fr: d.summary_fr, translation_fr: d.translation_fr, knowledge_point: d.knowledge_point,
      vocabulary: d.vocabulary, questions: d.questions, grammar: d.grammar, discussion: d.discussion,
      mention: d.mention, source_author: d.source_author, source_title: d.source_title, source_date: d.source_date,
      content_type: d.content_type, rights_status: d.mention === "adapted" ? "À vérifier par l'administrateur" : "Texte original OpenDoorsClass",
      status: "draft",
    };
    const { data: saved, error } = await supabase.from("rw_lessons").upsert(row as any, { onConflict: "session_id,level" }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: saved.id as string };
  });

/** Read one lesson (RLS: learners only their level and published). */
export const getRwLesson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { id: string }) => v)
  .handler(async ({ data, context }) => {
    const { data: l, error } = await context.supabase
      .from("rw_lessons")
      .select("*, rw_sessions(day_index, title, rw_weeks(week_number, title))")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!l) throw new Error("Texte introuvable ou non disponible pour votre niveau.");
    return l as any;
  });

export type RwLessonEdit = {
  id: string; title: string; body: string; summary_fr?: string; translation_fr?: string; knowledge_point?: string;
  mention: "original" | "adapted" | "excerpt"; source_author?: string; source_title?: string; source_date?: string;
  source_institution?: string; source_url?: string; rights_status?: string; status: "draft" | "published";
};

/** Staff: edit and publish or unpublish. Adapted texts need a named source before publishing. */
export const saveRwLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: RwLessonEdit) => {
    if (!v.title?.trim() || !v.body?.trim()) throw new Error("Titre et texte obligatoires.");
    if (/[\u2012-\u2015\u2011]/.test(v.title + v.body + (v.translation_fr ?? ""))) throw new Error("Retirez les tirets longs du texte avant d'enregistrer.");
    if (v.status === "published" && v.mention !== "original" && !v.source_author?.trim()) throw new Error("Indiquez l'auteur de la source avant de publier une adaptation.");
    if (v.source_url && !/^https:\/\//.test(v.source_url)) throw new Error("Le lien de la source doit commencer par https://");
    return v;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const { countWords } = await import("@/lib/rw-lessons.server");
    const n = (s?: string) => (s?.trim() ? s.trim() : null);
    const { error } = await supabase.from("rw_lessons").update({
      title: data.title.trim(), body: data.body.trim(), word_count: countWords(data.body),
      summary_fr: n(data.summary_fr), translation_fr: n(data.translation_fr), knowledge_point: n(data.knowledge_point),
      mention: data.mention, source_author: n(data.source_author), source_title: n(data.source_title), source_date: n(data.source_date),
      source_institution: n(data.source_institution), source_url: n(data.source_url), rights_status: n(data.rights_status),
      status: data.status,
      published_at: data.status === "published" ? new Date().toISOString() : null,
      published_by: data.status === "published" ? userId : null,
    } as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Members: translation of a clicked word (context aware). */
export const translateRwWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { word: string; sentence: string }) => {
    const word = String(v.word ?? "").trim().slice(0, 40);
    if (!/^[A-Za-z'’]+$/.test(word)) throw new Error("Mot invalide.");
    return { word, sentence: String(v.sentence ?? "").slice(0, 400) };
  })
  .handler(async ({ data }) => {
    const { glossRwWord } = await import("./rw-lessons.server");
    return glossRwWord(data.word, data.sentence);
  });
