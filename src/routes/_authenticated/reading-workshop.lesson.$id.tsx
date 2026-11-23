import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Languages, Lightbulb, Lock } from "lucide-react";
import { RwComprehension } from "@/components/reading-workshop/rw-comprehension";
import { RwShell } from "@/components/reading-workshop/rw-shell";
import { Button } from "@/components/ui/button";
import { getRwLesson } from "@/lib/rw-lessons.functions";
import { RW_DAYS } from "@/lib/reading-workshop";
import { RwHoursBanner, useRwWorkshopStatus } from "@/components/reading-workshop/rw-hours-banner";
import { RwSubmit } from "@/components/reading-workshop/rw-submit";
import {
  RwSubmissionsList,
  useRwSubmissions,
} from "@/components/reading-workshop/rw-submissions-list";
import { getRwMe } from "@/lib/reading-workshop.functions";
import { SmartReader } from "@/components/reading-workshop/smart-reader";
import { useRwLessonStates } from "@/components/reading-workshop/rw-lesson-path";
import { rwLessonAccess } from "@/lib/rw-unlock";
import { RwTraceExercisePanel } from "@/components/reading-workshop/rw-trace-exercise";

type GrammarItem = { point: string; explanation_fr: string; example: string };
type VocabularyItem = {
  word: string;
  part_of_speech?: string;
  translation_fr: string;
  definition: string;
  example: string;
};

export const Route = createFileRoute("/_authenticated/reading-workshop/lesson/$id")({
  head: () => ({ meta: [{ title: "Lecture, Reading Workshop OpenDoorsClass" }] }),
  component: () => (
    <RwShell
      need="member"
      title="Lecture du jour"
      subtitle="Lisez, découvrez le vocabulaire, puis vérifiez votre compréhension."
    >
      <Lesson />
    </RwShell>
  ),
});

function Lesson() {
  const { id } = Route.useParams();
  const fetchLesson = useServerFn(getRwLesson);
  const { data: l, error } = useQuery({
    queryKey: ["rw-lesson", id],
    queryFn: () => fetchLesson({ data: { id } }),
  });
  const fetchMe = useServerFn(getRwMe);
  const { data: me } = useQuery({ queryKey: ["rw-me"], queryFn: () => fetchMe() });
  const learnerId = me?.learner?.id;
  const {
    data: lessonStates = [],
    isLoading: statesLoading,
    error: statesError,
  } = useRwLessonStates();
  const lessonState = learnerId
    ? lessonStates.find((row) => row.lesson_id === id)?.state
    : undefined;
  const lessonLocked = !!learnerId && lessonState === "locked";
  const canSubmit = !!learnerId && !!lessonState && !lessonLocked;
  const { data: status } = useRwWorkshopStatus();
  const { data: mine = [] } = useRwSubmissions("lesson", { lessonId: id });
  const [showFr, setShowFr] = useState(false);
  const exempt = !!me && !me.learner;
  if (status && !status.open && !exempt && !l) return <RwHoursBanner />;
  if (error)
    return (
      <p className="rounded-2xl border border-border p-6 text-muted-foreground">{error.message}</p>
    );
  if (!l) {
    if (rwLessonAccess(l, statesLoading) === "loading") {
      return <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Vérification de l'accès au texte…</p>;
    }
    return (
      <section className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--rw-shadow)]">
        <Lock className="mx-auto size-8 text-primary" />
        <h2 className="mt-3 text-xl font-bold">Texte verrouillé ou indisponible</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Ce texte n'est pas accessible dans votre parcours actuel. Ouvrez Mon parcours pour vérifier la prochaine lecture disponible et les validations nécessaires.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild><Link to="/reading-workshop/learner">Voir mon parcours</Link></Button>
          <Button asChild variant="outline"><Link to="/reading-workshop/library">Retour à la bibliothèque</Link></Button>
        </div>
      </section>
    );
  }
  const s = l.rw_sessions;
  const mention =
    l.mention === "original"
      ? "Original educational text, OpenDoorsClass Reading Workshop."
      : `Educational adaptation inspired by ${[l.source_author, l.source_title].filter(Boolean).join(", ") || "a public source"}.`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <article className="space-y-6">
        <Link
          to="/reading-workshop/library"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Bibliothèque
        </Link>
        <div>
          <p className="text-sm font-semibold text-primary">
            Week {String(s?.rw_weeks?.week_number ?? 0).padStart(2, "0")} ·{" "}
            {RW_DAYS[(s?.day_index ?? 1) - 1]} · {l.level}
          </p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight">{l.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {l.word_count} words · {Math.max(1, Math.round(l.word_count / 110))} min
          </p>
        </div>
        {l.knowledge_point && (
          <div className="flex gap-3 rounded-2xl bg-[var(--rw-soft)] p-4 text-sm">
            <Lightbulb className="size-5 shrink-0 text-primary" />
            <p>{l.knowledge_point}</p>
          </div>
        )}
        <SmartReader body={l.body} vocabulary={l.vocabulary ?? []} lessonId={l.id} />
        <p className="text-xs italic text-muted-foreground">
          {mention}
          {l.source_url && (
            <>
              {" "}
              ·{" "}
              <a href={l.source_url} target="_blank" rel="noreferrer" className="underline">
                Source
              </a>
            </>
          )}
        </p>
        <Button variant="outline" onClick={() => setShowFr(!showFr)}>
          <Languages className="mr-2 size-4" />
          {showFr ? "Masquer la traduction" : "Voir la traduction en français"}
        </Button>
        {showFr && l.translation_fr && (
          <div className="space-y-3 rounded-2xl border border-dashed border-border p-6 text-muted-foreground">
            {l.translation_fr.split(/\n\s*\n/).map((p: string, i: number) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {learnerId && statesLoading ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Vérification de l'accès aux questions…
          </p>
        ) : learnerId && statesError ? (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-card p-5 text-sm text-destructive"
          >
            Impossible de vérifier l'accès aux questions. Rechargez la page avant de répondre.
          </p>
        ) : (
          <RwComprehension
            key={id}
            lessonId={id}
            learnerId={learnerId}
            questions={l.questions ?? []}
            accessState={learnerId ? (lessonState ?? "unavailable") : undefined}
          />
        )}
        {(l.grammar ?? []).length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xl font-bold">Grammar discovery</h3>
            {l.grammar.map((g: GrammarItem, i: number) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <p className="font-semibold">{g.point}</p>
                <p className="mt-1 text-sm text-muted-foreground">{g.explanation_fr}</p>
                <p className="mt-2 text-sm italic">« {g.example} »</p>
                {canSubmit && (
                  <RwTraceExercisePanel
                    lessonId={id}
                    grammarIndex={i}
                    grammar={g}
                    level={l.level}
                    title={l.title}
                    learnerId={learnerId}
                  />
                )}
              </div>
            ))}
          </section>
        )}
        {(l.discussion ?? []).length > 0 && (
          <section>
            <h3 className="text-xl font-bold">Discussion</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {l.discussion.map((d: string) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
        )}
        {canSubmit && learnerId && (
          <>
            {status && !status.open && <RwHoursBanner />}
            <RwSubmit learnerId={learnerId} lessonId={id} />
            {mine.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xl font-bold">Mes envois pour ce texte</h3>
                <RwSubmissionsList items={mine} mode="learner" />
              </section>
            )}
          </>
        )}
      </article>
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <h3 className="font-bold">Vocabulaire clé</h3>
        {(l.vocabulary ?? []).map((v: VocabularyItem) => (
          <div key={v.word} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-bold text-primary">
              {v.word}{" "}
              <span className="text-xs font-normal text-muted-foreground">{v.part_of_speech}</span>
            </p>
            <p className="text-sm font-medium">{v.translation_fr}</p>
            <p className="mt-1 text-xs text-muted-foreground">{v.definition}</p>
            <p className="mt-1 text-xs italic">{v.example}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}
