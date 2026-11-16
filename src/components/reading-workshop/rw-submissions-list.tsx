import { RwMediaPlayer } from "@/components/reading-workshop/rw-media-player";
import { RwAnswersReview } from "@/components/reading-workshop/rw-comprehension";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RwAvatar, RwEmpty } from "@/components/reading-workshop/rw-shell";
import { RW_STATUS_LABEL, signedRwMedia } from "@/lib/rw-submissions";
import { cn } from "@/lib/utils";

export type Sub = {
  id: string; kind: string; storage_path: string; status: keyof typeof RW_STATUS_LABEL; learner_note: string | null;
  coach_feedback: string | null; score: number | null; reading_score: number | null; pronunciation_score: number | null; fluency_score: number | null; rework_passages?: string | null; created_at: string; lesson_id: string; learner_id: string;
  rw_lessons: { title: string; level: string } | null; rw_learners: { full_name: string; level: string; start_date: string | null } | null;
};

export function useRwSubmissions(key: string, filter?: { lessonId?: string }) {
  return useQuery({
    queryKey: ["rw-my-submissions", key, filter?.lessonId ?? ""],
    queryFn: async () => {
      let q = supabase.from("rw_submissions")
        .select("id, kind, storage_path, status, learner_note, coach_feedback, score, reading_score, pronunciation_score, fluency_score, rework_passages, created_at, lesson_id, learner_id, rw_lessons(title, level), rw_learners(full_name, level, start_date)")
        .order("created_at", { ascending: false }).limit(1000);
      if (filter?.lessonId) q = q.eq("lesson_id", filter.lessonId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Sub[];
    },
  });
}

const ICON = { submitted: Clock, redo: RotateCcw, validated: CheckCircle2 };

function Media({ s }: { s: Sub }) {
  const { data: url } = useQuery({ queryKey: ["rw-media", s.storage_path], queryFn: () => signedRwMedia(s.storage_path), staleTime: 30 * 60 * 1000 });
  if (!url) return <p className="text-xs text-muted-foreground">Chargement du média…</p>;
  return <RwMediaPlayer src={url} kind={s.kind === "video" ? "video" : "audio"} />;
}

function Review({ s }: { s: Sub }) {
  const qc = useQueryClient();
  const [fb, setFb] = useState(s.coach_feedback ?? "");
  const [score, setScore] = useState(s.score?.toString() ?? "");
  const [skills, setSkills] = useState({ reading: s.reading_score?.toString() ?? "", pronunciation: s.pronunciation_score?.toString() ?? "", fluency: s.fluency_score?.toString() ?? "" });
  const to20 = (v: string) => (v === "" ? null : Math.max(0, Math.min(20, Math.round(Number(v)))));
  const [passages, setPassages] = useState(s.rework_passages ?? "");
  const [busy, setBusy] = useState(false);
  async function decide(status: "validated" | "redo") {
    if (status === "redo" && !fb.trim()) return toast.error("Expliquez à l'apprenant ce qu'il doit améliorer.");
    const n = score === "" ? null : Math.max(0, Math.min(20, Math.round(Number(score))));
    setBusy(true);
    const { error } = await supabase.from("rw_submissions").update({ status, coach_feedback: fb.trim() || null, score: n, reading_score: to20(skills.reading), pronunciation_score: to20(skills.pronunciation), fluency_score: to20(skills.fluency), rework_passages: passages.trim() || null }).eq("id", s.id);
    setBusy(false);
    if (error) return toast.error(error.message || "Correction non enregistrée.");
    toast.success(status === "validated" ? "Lecture validée." : "Reprise demandée.");
    qc.invalidateQueries({ queryKey: ["rw-my-submissions"] });
    qc.invalidateQueries({ queryKey: ["rw-history"] });
    qc.invalidateQueries({ queryKey: ["rw-lesson-states"] });
  }
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Textarea value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Votre retour : prononciation, fluidité, intonation…" maxLength={2000} />
      <Textarea value={passages} onChange={(e) => setPassages(e.target.value)} placeholder="Passages à retravailler (facultatif)" maxLength={2000} className="min-h-16" />
      <div className="flex flex-wrap items-center gap-2">
        <Input type="number" min={0} max={20} value={score} onChange={(e) => setScore(e.target.value)} placeholder="Note globale /20" className="w-36" aria-label="Reading Performance sur 20" />
        <Input type="number" min={0} max={20} value={skills.reading} onChange={(e) => setSkills({ ...skills, reading: e.target.value })} placeholder="Lecture /20" className="w-28" aria-label="Lecture orale sur 20" />
        <Input type="number" min={0} max={20} value={skills.pronunciation} onChange={(e) => setSkills({ ...skills, pronunciation: e.target.value })} placeholder="Pronunciation /20" className="w-36" aria-label="Prononciation sur 20" />
        <Input type="number" min={0} max={20} value={skills.fluency} onChange={(e) => setSkills({ ...skills, fluency: e.target.value })} placeholder="Fluency /20" className="w-28" aria-label="Fluidité sur 20" />
        <Button size="sm" disabled={busy} onClick={() => decide("validated")}>{busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 size-4" />}Valider</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("redo")}><RotateCcw className="mr-1.5 size-4" />Demander une reprise</Button>
      </div>
    </div>
  );
}

export function RwSubmissionsList({ items, mode }: { items: Sub[]; mode: "learner" | "coach" }) {
  if (!items.length) return <RwEmpty title={mode === "coach" ? "Aucun travail ici" : "Aucun envoi pour le moment"} text={mode === "coach" ? "Les lectures envoyées par vos apprenants apparaîtront ici." : "Enregistrez votre lecture depuis un texte de la bibliothèque."} />;
  return (
    <ul className="space-y-3">
      {items.map((s) => {
        const I = ICON[s.status];
        return (
          <li key={s.id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {mode === "coach" && <RwAvatar name={s.rw_learners?.full_name ?? "?"} size={36} />}
                <div>
                  <p className="font-semibold">{mode === "coach" ? s.rw_learners?.full_name : s.rw_lessons?.title}</p>
                  <p className="text-xs text-muted-foreground">{mode === "coach" ? `${s.rw_lessons?.title} · ` : ""}{s.rw_lessons?.level} · {s.kind === "video" ? "Vidéo" : "Audio"} · {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
              <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                s.status === "validated" ? "bg-[var(--rw-soft)] text-primary" : s.status === "redo" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                <I className="size-3.5" />{RW_STATUS_LABEL[s.status]}{s.score !== null && ` · ${s.score}/20`}
              </span>
            </div>
            <Media s={s} />
            {s.learner_note && <p className="text-sm italic text-muted-foreground">« {s.learner_note} »</p>}
            {mode === "learner" && s.coach_feedback && <div className="rounded-xl bg-[var(--rw-soft)] p-3 text-sm"><p className="text-xs font-semibold text-primary">Retour du coach</p><p>{s.coach_feedback}</p>{s.rework_passages && <><p className="mt-2 text-xs font-semibold text-primary">Passages à retravailler</p><p className="whitespace-pre-line">{s.rework_passages}</p></>}</div>}
            {(s.reading_score !== null || s.pronunciation_score !== null || s.fluency_score !== null) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {s.reading_score !== null && <span className="rounded-full bg-muted px-2.5 py-1">Reading Performance {s.reading_score}/20</span>}
                {s.pronunciation_score !== null && <span className="rounded-full bg-muted px-2.5 py-1">Pronunciation {s.pronunciation_score}/20</span>}
                {s.fluency_score !== null && <span className="rounded-full bg-muted px-2.5 py-1">Fluency {s.fluency_score}/20</span>}
              </div>
            )}
            {mode === "coach" && <RwAnswersReview lessonId={s.lesson_id} learnerId={s.learner_id} />}
            <History id={s.id} />
            {mode === "coach" && <Review s={s} />}
          </li>
        );
      })}
    </ul>
  );
}

function History({ id }: { id: string }) {
  const { data = [] } = useQuery({
    queryKey: ["rw-history", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rw_submission_history").select("id, old_status, new_status, score, created_at").eq("submission_id", id).order("created_at");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  if (data.length < 2) return null;
  const label = (v: string | null) => (v ? RW_STATUS_LABEL[v as keyof typeof RW_STATUS_LABEL] ?? v : "Nouveau");
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer font-medium">Historique ({data.length})</summary>
      <ul className="mt-1 space-y-0.5">
        {data.map((h) => <li key={h.id}>{new Date(h.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {label(h.old_status)} vers {label(h.new_status)}{h.score !== null ? ` · ${h.score}/20` : ""}</li>)}
      </ul>
    </details>
  );
}
