import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, CheckCircle2, Clock, Loader2, MessageSquareText, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { computeComprehension, RW_QUESTIONS_PER_LESSON } from "@/lib/rw-comprehension";

export type RwQuestion = { question: string; type?: string; options?: string[]; answer?: string; explanation_fr?: string };
type Answer = {
  id: string; question_index: number; answer: string; expected: string | null; points: number | null;
  status: "auto_graded" | "pending" | "graded"; coach_comment: string | null; explanation_fr?: string | null;
};
type SaveState = "saving" | "saved" | "error";

const typeOf = (q: RwQuestion) => q.type ?? "mcq";
const TYPE_LABEL: Record<string, string> = { mcq: "Choix multiple", true_false: "Vrai ou faux", short: "Réponse courte", open: "Question ouverte" };

export function useRwAnswers(lessonId: string, learnerId?: string) {
  return useQuery({
    queryKey: ["rw-answers", lessonId, learnerId],
    enabled: !!learnerId,
    queryFn: async () => {
      const { data, error } = await supabase.from("rw_answers").select("*").eq("lesson_id", lessonId).eq("learner_id", learnerId!).order("question_index");
      if (error) throw new Error(error.message);
      return (data ?? []) as Answer[];
    },
  });
}

function Indicator({ s }: { s?: SaveState }) {
  if (!s) return null;
  if (s === "saving") return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />Enregistrement…</span>;
  if (s === "saved") return <span className="flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="size-3" />Enregistré</span>;
  return <span className="flex items-center gap-1 text-xs text-destructive"><TriangleAlert className="size-3" />Échec de sauvegarde</span>;
}

/** Learner view: answers are saved on the server one by one and graded there; nothing is shown as saved unless the write succeeded. */
export function RwComprehension({ lessonId, learnerId, questions }: { lessonId: string; learnerId?: string; questions: RwQuestion[] }) {
  const qc = useQueryClient();
  const { data: saved = [] } = useRwAnswers(lessonId, learnerId);
  const [byIdx, setByIdx] = useState<Record<number, Answer>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [state, setState] = useState<Record<number, SaveState>>({});
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const m: Record<number, Answer> = {};
    for (const a of saved) m[a.question_index] = a;
    setByIdx((prev) => ({ ...m, ...prev }));
    setDrafts((prev) => { const d = { ...prev }; for (const a of saved) if (d[a.question_index] === undefined) d[a.question_index] = a.answer; return d; });
  }, [saved]);

  async function save(i: number, value: string) {
    if (!learnerId || !value.trim()) return;
    setState((s) => ({ ...s, [i]: "saving" }));
    const { data, error } = await supabase.rpc("rw_save_answer", { _lesson: lessonId, _index: i, _answer: value });
    if (error || !data) { setState((s) => ({ ...s, [i]: "error" })); return; }
    setByIdx((m) => ({ ...m, [i]: data as unknown as Answer }));
    setState((s) => ({ ...s, [i]: "saved" }));
    qc.invalidateQueries({ queryKey: ["rw-answers", lessonId, learnerId] });
  }
  function typeText(i: number, v: string) {
    setDrafts((d) => ({ ...d, [i]: v }));
    clearTimeout(timers.current[i]);
    timers.current[i] = setTimeout(() => save(i, v), 900);
  }

  const res = computeComprehension(Object.values(byIdx), questions.length);
  if (!questions.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xl font-bold"><BookOpenCheck className="size-5 text-primary" /> Reading Comprehension</h3>
        <p className="text-xs text-muted-foreground">{questions.length} questions · 2 points chacune</p>
      </div>
      {questions.length !== RW_QUESTIONS_PER_LESSON && <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">Ce texte est encore à l'ancien format ({questions.length} questions). La note est ramenée sur 20.</p>}
      {!learnerId && <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Aperçu coach ou administrateur : les réponses ne sont pas enregistrées.</p>}
      {questions.map((q, i) => {
        const a = byIdx[i]; const t = typeOf(q); const locked = !!a && a.status !== "pending";
        const options = t === "true_false" ? ["True", "False"] : q.options ?? [];
        return (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold">{i + 1}. {q.question}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{TYPE_LABEL[t] ?? t}</span>
            </div>
            {(t === "mcq" || t === "true_false") ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {options.map((o) => {
                  const picked = a?.answer === o;
                  return (
                    <button key={o} type="button" disabled={!!a || !learnerId || state[i] === "saving"} onClick={() => save(i, o)}
                      className={cn("rounded-xl border px-4 py-2.5 text-left text-sm transition", !a && learnerId && "hover:border-primary",
                        a && o === a.expected && "border-primary bg-[var(--rw-soft)] font-semibold",
                        picked && a?.points === 0 && "border-destructive text-destructive")}>{o}</button>
                  );
                })}
              </div>
            ) : (
              <Textarea className="mt-3" rows={t === "open" ? 4 : 2} maxLength={2000} disabled={locked || !learnerId}
                value={drafts[i] ?? ""} onChange={(e) => typeText(i, e.target.value)} onBlur={(e) => { clearTimeout(timers.current[i]); if (e.target.value.trim() && e.target.value !== a?.answer) save(i, e.target.value); }}
                placeholder="Écrivez votre réponse en anglais…" />
            )}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <Indicator s={state[i]} />
              {state[i] === "error" && <Button size="sm" variant="ghost" onClick={() => save(i, a?.answer ?? drafts[i] ?? "")}>Réessayer</Button>}
            </div>
            {a?.status === "auto_graded" && (
              <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                {a.points === 2 ? <CheckCircle2 className="size-4 shrink-0 text-primary" /> : <XCircle className="size-4 shrink-0 text-destructive" />}
                <span><b>{a.points}/2</b> · {a.explanation_fr ?? (a.points === 2 ? "Bonne réponse." : `Réponse attendue : ${a.expected}`)}</span>
              </p>
            )}
            {a?.status === "pending" && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="size-4" />En attente de la correction du coach. Vous pouvez encore modifier votre réponse.</p>}
            {a?.status === "graded" && (
              <div className="mt-2 rounded-xl bg-[var(--rw-soft)] p-3 text-sm">
                <p className="font-semibold text-primary">Note du coach : {a.points}/2</p>
                {a.coach_comment && <p className="mt-1">{a.coach_comment}</p>}
                {a.expected && <p className="mt-1 text-xs text-muted-foreground">Réponse modèle : {a.expected}</p>}
              </div>
            )}
          </div>
        );
      })}
      {learnerId && (
        <div className="rounded-2xl border border-primary/30 bg-[var(--rw-soft)] p-5">
          <p className="text-sm text-muted-foreground">Reading Comprehension</p>
          <p className="text-3xl font-extrabold text-primary">{res.scoreOn20} / 20</p>
          <p className="text-sm text-muted-foreground">{res.percent} % · {res.answered}/{questions.length} réponses{res.pending ? ` · ${res.pending} en attente du coach` : ""}{res.complete ? " · Évaluation complète" : ""}</p>
        </div>
      )}
    </section>
  );
}

/** Coach and staff: review a learner's answers for one lesson and grade open or short answers 0, 1 or 2. */
export function RwAnswersReview({ lessonId, learnerId }: { lessonId: string; learnerId: string }) {
  const qc = useQueryClient();
  const { data: answers = [] } = useRwAnswers(lessonId, learnerId);
  const { data: questions = [] } = useQuery({
    queryKey: ["rw-lesson-questions", lessonId],
    queryFn: async () => { const { data, error } = await supabase.rpc("rw_lesson_questions", { _lesson: lessonId }); if (error) throw error; return (data as unknown as RwQuestion[]) ?? []; },
  });
  const [open, setOpen] = useState(false);
  const res = computeComprehension(answers, questions.length);
  return (
    <div className="rounded-xl border border-border p-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-2"><MessageSquareText className="size-4 text-primary" />Compréhension : {res.scoreOn20}/20 · {res.answered}/{questions.length} réponses{res.pending ? ` · ${res.pending} à corriger` : ""}</span>
        <span className="text-xs text-muted-foreground">{open ? "Masquer" : "Voir"}</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-3">
          {questions.map((q, i) => {
            const a = answers.find((x) => x.question_index === i);
            return <GradeRow key={i} i={i} q={q} a={a} onDone={() => qc.invalidateQueries({ queryKey: ["rw-answers", lessonId, learnerId] })} />;
          })}
        </ul>
      )}
    </div>
  );
}

function GradeRow({ i, q, a, onDone }: { i: number; q: RwQuestion; a?: Answer; onDone: () => void }) {
  const [pts, setPts] = useState<number | null>(a?.points ?? null);
  const [comment, setComment] = useState(a?.coach_comment ?? "");
  const [busy, setBusy] = useState(false);
  const manual = typeOf(q) === "open" || typeOf(q) === "short";
  async function grade() {
    if (!a || pts === null) return;
    setBusy(true);
    const { error } = await supabase.rpc("rw_grade_answer", { _answer: a.id, _points: pts, _comment: comment });
    setBusy(false);
    if (error) return toast.error("Note non enregistrée.");
    toast.success("Note enregistrée."); onDone();
  }
  return (
    <li className="rounded-lg bg-muted/50 p-3 text-sm">
      <p className="font-medium">{i + 1}. {q.question}</p>
      {q.answer && <p className="text-xs text-muted-foreground">Attendu : {q.answer}</p>}
      {!a ? <p className="mt-1 text-xs italic text-muted-foreground">Pas encore de réponse.</p> : (
        <>
          <p className="mt-1">« {a.answer} » {a.status !== "pending" && <b className="text-primary">· {a.points}/2</b>}</p>
          {(manual || a.status === "graded") && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-1">{[0, 1, 2].map((n) => <Button key={n} size="sm" variant={pts === n ? "default" : "outline"} onClick={() => setPts(n)}>{n}</Button>)}</div>
              <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Explication de la correction" maxLength={2000} />
              <Button size="sm" disabled={busy || pts === null} onClick={grade}>{busy && <Loader2 className="mr-1 size-3 animate-spin" />}Enregistrer la note</Button>
            </div>
          )}
        </>
      )}
    </li>
  );
}
