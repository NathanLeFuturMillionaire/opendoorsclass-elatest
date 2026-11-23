import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Send,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RwAvatar, RwEmpty, RwStat } from "@/components/reading-workshop/rw-shell";
import { RwProgressRing } from "@/components/reading-workshop/rw-progress";
import type { Sub } from "@/components/reading-workshop/rw-submissions-list";
import { RW_STATUS_LABEL } from "@/lib/rw-submissions";
import {
  buildRwAlerts,
  buildRwWeeklySeries,
  computeRwComprehensionScore,
  computeRwProgress,
  computeRwWeek,
  rwWeeklyReportCsv,
  rwWeekWindow,
  type RwProgressAnswer,
  type RwWeeklySummary,
} from "@/lib/rw-progress";
import {
  downloadBlob,
  downloadRwGroupPdf,
  downloadRwIndividualPdf,
} from "@/lib/rw-report-pdf";
import { cn } from "@/lib/utils";
import { RwTraceReview } from "@/components/reading-workshop/rw-trace-review";

export type RwReportLearner = {
  id: string;
  full_name: string;
  level: string;
  start_date?: string | null;
  coach_id?: string | null;
  photo_url?: string | null;
  is_active?: boolean;
};

export function useRwReportAnswers(key: string, learnerId?: string, requireLearner = false) {
  return useQuery({
    queryKey: ["rw-report-answers", key, learnerId ?? "all"],
    enabled: !requireLearner || !!learnerId,
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from("rw_answers")
        .select("learner_id, lesson_id, points, max_points, status, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5000);
      if (learnerId) query = query.eq("learner_id", learnerId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as RwProgressAnswer[];
    },
  });
}

function SkillBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-bold text-primary">{value === null ? "Pas de note" : `${value}/20`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${value === null ? 0 : Math.max(2, value * 5)}%` }}
        />
      </div>
    </div>
  );
}

function WeekChart({ series }: { series: RwWeeklySummary[] }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-bold">Six dernières semaines</h4>
        <span className="text-xs text-muted-foreground">Objectif : 6 validations</span>
      </div>
      <div className="flex h-36 items-end gap-2 sm:gap-3">
        {series.map((week) => (
          <div key={week.window.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-xs font-bold text-primary">{week.validated}</span>
            <div className="flex h-24 w-full items-end overflow-hidden rounded-t-lg bg-muted/70">
              <div
                className="w-full rounded-t-lg bg-primary transition-[height] duration-500"
                style={{ height: `${Math.max(week.validated ? 8 : 2, week.percent)}%` }}
                aria-label={`${week.validated} validations, ${week.window.label}`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-muted-foreground">
              {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(week.window.start)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RwIndividualReport({
  learner,
  subs,
  answers,
  coach,
  weekOffset,
  onWeekChange,
  onNotify,
  notifying = false,
  onDownload,
  downloading = false,
}: {
  learner: RwReportLearner;
  subs: Sub[];
  answers: RwProgressAnswer[];
  coach?: string;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  onNotify?: () => void;
  notifying?: boolean;
  onDownload: () => void;
  downloading?: boolean;
}) {
  const progress = useMemo(() => computeRwProgress(subs, learner.start_date ?? null), [subs, learner.start_date]);
  const window = useMemo(() => rwWeekWindow(weekOffset), [weekOffset]);
  const weekly = useMemo(() => computeRwWeek(subs, answers, window), [subs, answers, window]);
  const series = useMemo(() => buildRwWeeklySeries(subs, answers), [subs, answers]);
  const comprehension = useMemo(() => computeRwComprehensionScore(answers), [answers]);
  const alerts = useMemo(() => buildRwAlerts(progress), [progress]);
  const recent = useMemo(
    () => [...subs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [subs],
  );

  return (
    <section className="space-y-6 rounded-3xl border border-border bg-card p-5 shadow-[var(--rw-shadow)] sm:p-7" aria-label={`Bilan de ${learner.full_name}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <RwAvatar name={learner.full_name} url={learner.photo_url} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-extrabold">{learner.full_name}</h3>
            <span className="rounded-full bg-[var(--rw-soft)] px-2.5 py-1 text-xs font-bold text-primary">{learner.level}</span>
            {learner.is_active === false && <span className="rounded-full bg-muted px-2.5 py-1 text-xs">Inactif</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Semaine {progress.currentWeek} du programme{coach ? ` · Coach : ${coach}` : ""}
          </p>
        </div>
        <RwProgressRing percent={progress.percent} size={92} label="du programme" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-[var(--rw-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-4 text-primary" />
          Bilan du {weekly.window.label}
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" aria-label="Semaine précédente" onClick={() => onWeekChange(weekOffset + 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-28 text-center text-xs text-muted-foreground">
            {weekOffset === 0 ? "Semaine en cours" : `Il y a ${weekOffset} semaine${weekOffset > 1 ? "s" : ""}`}
          </span>
          <Button size="icon" variant="outline" aria-label="Semaine suivante" disabled={weekOffset === 0} onClick={() => onWeekChange(Math.max(0, weekOffset - 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Validations", `${weekly.validated} / 6`],
          ["Envois", weekly.submissions],
          ["Moyenne", weekly.averageScore === null ? "Aucune" : `${weekly.averageScore}/20`],
          ["Compréhension", weekly.comprehensionScore === null ? "Aucune" : `${weekly.comprehensionScore}/20`],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-border/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Rythme hebdomadaire</span>
          <span className={cn("flex items-center gap-1 text-xs font-semibold", progress.weeklyDelta >= 0 ? "text-primary" : "text-destructive")}>
            {progress.weeklyDelta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {progress.weeklyDelta >= 0 ? "+" : ""}{progress.weeklyDelta} par rapport à la semaine précédente
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${weekly.percent}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{weekly.percent} % de l'objectif de six lectures validées.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 p-5"><WeekChart series={series} /></div>
        <div className="space-y-4 rounded-2xl border border-border/70 p-5">
          <h4 className="font-bold">Compétences globales</h4>
          <SkillBar label="Reading Comprehension" value={comprehension} />
          <SkillBar label="Reading Performance" value={progress.skills.reading} />
          <SkillBar label="Pronunciation" value={progress.skills.pronunciation} />
          <SkillBar label="Fluency" value={progress.skills.fluency} />
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {alerts.map((alert) => (
            <div key={alert.id} className={cn("flex gap-3 rounded-2xl p-4 text-sm", alert.tone === "warning" || alert.tone === "action" ? "bg-destructive/10" : "bg-muted")}>
              <TriangleAlert className={cn("mt-0.5 size-4 shrink-0", alert.tone === "warning" || alert.tone === "action" ? "text-destructive" : "text-primary")} />
              <div><p className="font-semibold">{alert.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <h4 className="mb-3 font-bold">Activité récente</h4>
          {recent.length ? (
            <ul className="divide-y divide-border rounded-2xl border border-border/70">
              {recent.map((sub) => (
                <li key={sub.id} className="p-3">
                  <p className="truncate text-sm font-semibold">{sub.rw_lessons?.title ?? "Lecture"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(sub.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {RW_STATUS_LABEL[sub.status]}
                    {sub.score !== null ? ` · ${sub.score}/20` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Aucun envoi enregistré pour le moment.</p>}
        </div>
        <div className="min-w-0 rounded-2xl bg-[var(--rw-soft)] p-5">
          <h4 className="mb-3 flex items-center gap-2 font-bold"><BookOpenCheck className="size-4 text-primary" />Prochaines actions</h4>
          <ul className="space-y-2 text-sm">
            {progress.recommendations.slice(0, 4).map((recommendation) => <li key={recommendation}>· {recommendation}</li>)}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        <Button variant="outline" onClick={onDownload} disabled={downloading}>
          <Download className="mr-1.5 size-4" />{downloading ? "Préparation…" : "PDF du bilan individuel"}
        </Button>
        {onNotify && (
          <Button onClick={onNotify} disabled={notifying}>
            <Send className="mr-1.5 size-4" />{notifying ? "Envoi…" : "Envoyer le bilan"}
          </Button>
        )}
      </div>
    </section>
  );
}

export function RwProgressReports({
  learners,
  subs,
  coachName = {},
  reportName,
}: {
  learners: RwReportLearner[];
  subs: Sub[];
  coachName?: Record<string, string>;
  reportName: string;
}) {
  const qc = useQueryClient();
  const { data: answers = [], isLoading: answersLoading } = useRwReportAnswers("reports");
  const [selectedId, setSelectedId] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [busy, setBusy] = useState<"pdf" | "individual" | "notify" | null>(null);
  const window = useMemo(() => rwWeekWindow(weekOffset), [weekOffset]);

  const rows = useMemo(() => {
    return learners.map((learner) => {
      const learnerSubs = subs.filter((sub) => sub.learner_id === learner.id);
      const learnerAnswers = answers.filter((answer) => answer.learner_id === learner.id);
      return {
        learner,
        subs: learnerSubs,
        answers: learnerAnswers,
        progress: computeRwProgress(learnerSubs, learner.start_date ?? null),
        weekly: computeRwWeek(learnerSubs, learnerAnswers, window),
      };
    }).sort((a, b) => b.progress.behind - a.progress.behind || a.learner.full_name.localeCompare(b.learner.full_name));
  }, [learners, subs, answers, window]);

  const selected = rows.find((row) => row.learner.id === selectedId) ?? rows[0];
  const totalValidated = rows.reduce((sum, row) => sum + row.weekly.validated, 0);
  const attention = rows.filter((row) => row.progress.behind > 0 || row.progress.redo > 0).length;

  function exportCsv() {
    const csv = rwWeeklyReportCsv(rows.map(({ learner, progress, weekly }) => ({
      name: learner.full_name,
      level: learner.level,
      coach: learner.coach_id ? coachName[learner.coach_id] ?? "" : "",
      p: progress,
      w: weekly,
    })));
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${reportName}-${window.key}.csv`);
    toast.success("Rapport CSV téléchargé.");
  }

  async function exportGroupPdf() {
    setBusy("pdf");
    try {
      await downloadRwGroupPdf(rows.map(({ learner, progress, weekly }) => ({
        name: learner.full_name,
        level: learner.level,
        coach: learner.coach_id ? coachName[learner.coach_id] ?? "" : "",
        progress,
        weekly,
      })), window.label, `${reportName}-${window.key}.pdf`);
      toast.success("Rapport PDF téléchargé.");
    } catch {
      toast.error("Le PDF n'a pas pu être créé. Réessayez.");
    } finally { setBusy(null); }
  }

  async function exportIndividual() {
    if (!selected) return;
    setBusy("individual");
    try {
      const learnerAnswers = selected.answers;
      await downloadRwIndividualPdf({
        name: selected.learner.full_name,
        level: selected.learner.level,
        coach: selected.learner.coach_id ? coachName[selected.learner.coach_id] ?? "" : "",
        progress: selected.progress,
        weekly: selected.weekly,
        series: buildRwWeeklySeries(selected.subs, learnerAnswers),
        comprehension: computeRwComprehensionScore(learnerAnswers),
      }, `${reportName}-${selected.learner.full_name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${window.key}.pdf`);
      toast.success("Bilan individuel téléchargé.");
    } catch {
      toast.error("Le bilan PDF n'a pas pu être créé. Réessayez.");
    } finally { setBusy(null); }
  }

  async function notify() {
    if (!selected) return;
    setBusy("notify");
    try {
      const { data, error } = await supabase.rpc("rw_send_weekly_report", {
        _learner: selected.learner.id,
        _week_start: window.key,
      });
      if (error) throw new Error(error.message);
      const result = data as { sent?: number; already_sent?: number };
      if ((result.sent ?? 0) > 0) toast.success("Bilan envoyé dans les notifications de l'apprenant et de son coach.");
      else if ((result.already_sent ?? 0) > 0) toast.info("Ce bilan a déjà été envoyé. Aucun doublon n'a été créé.");
      else toast.warning("Aucun compte lié ne peut recevoir ce bilan.");
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le bilan n'a pas pu être envoyé.");
    } finally { setBusy(null); }
  }

  if (!learners.length) return <RwEmpty title="Aucun apprenant à suivre" text="La progression apparaîtra dès qu'un apprenant sera inscrit." />;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <RwStat label="Apprenants suivis" value={rows.length} />
        <RwStat label="Validations cette semaine" value={totalValidated} hint={`Objectif collectif : ${rows.length * 6}`} />
        <RwStat label="À accompagner" value={attention} hint="Retard ou reprise demandée" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Semaine précédente du rapport" onClick={() => setWeekOffset((value) => value + 1)}><ChevronLeft className="size-4" /></Button>
          <div className="text-center"><p className="text-sm font-semibold">{window.label}</p><p className="text-xs text-muted-foreground">{weekOffset === 0 ? "Semaine en cours" : "Historique hebdomadaire"}</p></div>
          <Button size="icon" variant="ghost" aria-label="Semaine suivante du rapport" disabled={weekOffset === 0} onClick={() => setWeekOffset((value) => Math.max(0, value - 1))}><ChevronRight className="size-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}><FileText className="mr-1.5 size-4" />Exporter CSV</Button>
          <Button size="sm" variant="outline" onClick={exportGroupPdf} disabled={busy === "pdf"}><Download className="mr-1.5 size-4" />{busy === "pdf" ? "Préparation…" : "Exporter PDF"}</Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Vue d'ensemble</h3>
          {answersLoading && <span className="text-xs text-muted-foreground">Chargement des notes de compréhension…</span>}
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {rows.map(({ learner, progress, weekly }) => (
            <li key={learner.id}>
              <button
                type="button"
                onClick={() => setSelectedId(learner.id)}
                className={cn("flex w-full flex-wrap items-center gap-3 p-4 text-left transition hover:bg-muted/40", selected?.learner.id === learner.id && "bg-[var(--rw-soft)]")}
              >
                <RwProgressRing percent={progress.percent} size={52} />
                <RwAvatar name={learner.full_name} url={learner.photo_url} size={38} />
                <div className="min-w-40 flex-1">
                  <p className="truncate font-semibold">{learner.full_name} <span className="ml-1 text-xs text-primary">{learner.level}</span></p>
                  <p className="truncate text-xs text-muted-foreground">{weekly.validated}/6 cette semaine · {progress.validated}/120 au total · Moyenne {progress.averageScore ?? "aucune"}{progress.averageScore !== null ? "/20" : ""}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {progress.redo > 0 && <span className="rounded-full bg-destructive/10 px-2 py-1 text-destructive">{progress.redo} reprise{progress.redo > 1 ? "s" : ""}</span>}
                  {progress.pending > 0 && <span className="rounded-full bg-muted px-2 py-1">{progress.pending} en attente</span>}
                  {progress.behind > 0 ? <span className="rounded-full bg-destructive/10 px-2 py-1 font-semibold text-destructive">{progress.behind} de retard</span> : <span className="rounded-full bg-[var(--rw-soft)] px-2 py-1 font-semibold text-primary">À jour</span>}
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <>
          <RwIndividualReport
            learner={selected.learner}
            subs={selected.subs}
            answers={selected.answers}
            coach={selected.learner.coach_id ? coachName[selected.learner.coach_id] : undefined}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
            onNotify={notify}
            notifying={busy === "notify"}
            onDownload={exportIndividual}
            downloading={busy === "individual"}
          />
          <RwTraceReview learnerId={selected.learner.id} />
        </>
      )}
      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><Bell className="size-3.5" />Les validations, reprises, badges et bilans apparaissent aussi dans le centre de notifications.</p>
      {attention === 0 && <p className="flex items-center justify-center gap-2 text-sm text-primary"><CheckCircle2 className="size-4" />Tous les apprenants sont à jour.</p>}
    </div>
  );
}
