import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronRight, Clock3, PenLine, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RwTracePreview } from "@/components/reading-workshop/rw-trace-preview";
import { listRwTraceExercises, type RwTraceCharacter, type RwTraceExercise } from "@/lib/rw-trace.functions";
import { cn } from "@/lib/utils";

type ReviewExercise = RwTraceExercise & {
  characters: RwTraceCharacter[];
  rw_lessons: { title: string; level: string } | null;
};

function durationLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes} min ${seconds % 60} s` : `${seconds} s`;
}

const statusLabels = { not_started: "Non commencé", in_progress: "En cours", completed: "Terminé" } as const;

export function RwTraceReview({ learnerId }: { learnerId: string }) {
  const fetchReview = useServerFn(listRwTraceExercises);
  const { data, isLoading, error } = useQuery({
    queryKey: ["rw-trace-review", learnerId],
    queryFn: () => fetchReview({ data: { learnerId } }),
  });
  const [filter, setFilter] = useState<"all" | keyof typeof statusLabels>("all");
  const [selectedId, setSelectedId] = useState("");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [characterKey, setCharacterKey] = useState("");
  const exercises = (data?.exercises ?? []) as ReviewExercise[];
  const selected = exercises.find((exercise) => exercise.id === selectedId) ?? exercises[0];
  const notStarted = useMemo(() => {
    const started = new Set(exercises.map((exercise) => `${exercise.lesson_id}:${exercise.grammar_index}`));
    return (data?.lessons ?? []).flatMap((lesson) => {
      const grammar = Array.isArray(lesson.grammar) ? lesson.grammar as { point?: string }[] : [];
      return grammar.map((item, index) => ({ lesson, index, point: item.point ?? "Grammar Discovery" }))
        .filter((item) => !started.has(`${item.lesson.id}:${item.index}`));
    });
  }, [data?.lessons, exercises]);
  const visibleExercises = exercises.filter((exercise) => filter === "all" || filter === exercise.status);
  const showNotStarted = filter === "all" || filter === "not_started";
  const sentence = selected?.sentences[sentenceIndex] ?? "";
  const sentenceCharacters = useMemo(() => Array.from(sentence).map((character, index) => ({ character, index }))
    .filter((item) => !/\s/.test(item.character)), [sentence]);
  const activeCharacter = sentenceCharacters.find((item) => `${sentenceIndex}:${item.index}` === characterKey) ?? sentenceCharacters[0];
  const savedCharacter = selected && activeCharacter
    ? selected.characters.find((item) => item.sentence_index === sentenceIndex && item.character_index === activeCharacter.index)
    : undefined;
  const difficult = selected ? [...selected.characters].filter((item) => item.invalid_attempts > 0)
    .sort((a, b) => b.invalid_attempts - a.invalid_attempts).slice(0, 6) : [];
  const completed = exercises.filter((exercise) => exercise.status === "completed");
  const average = completed.length ? Math.round(completed.reduce((sum, exercise) => sum + Number(exercise.score ?? 0), 0) / completed.length) : null;

  function chooseExercise(id: string) {
    setSelectedId(id);
    setSentenceIndex(0);
    setCharacterKey("");
  }

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-[var(--rw-shadow)] sm:p-7" aria-label="Résultats des exercices de tracé">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold"><PenLine className="size-5 text-primary" />Grammar Discovery : tracés</h3>
          <p className="mt-1 text-sm text-muted-foreground">Phrases, caractères, tentatives, temps et tracés conservés.</p>
        </div>
        <select aria-label="Filtrer les exercices de tracé" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <option value="all">Tous les statuts</option>
          <option value="completed">Terminés</option>
          <option value="in_progress">En cours</option>
          <option value="not_started">Non commencés</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[var(--rw-soft)] p-4"><p className="text-2xl font-extrabold text-primary">{exercises.length}</p><p className="text-xs text-muted-foreground">Commencés</p></div>
        <div className="rounded-2xl bg-[var(--rw-soft)] p-4"><p className="text-2xl font-extrabold text-primary">{completed.length}</p><p className="text-xs text-muted-foreground">Terminés</p></div>
        <div className="rounded-2xl bg-[var(--rw-soft)] p-4"><p className="text-2xl font-extrabold text-primary">{average === null ? "Aucune" : `${average} %`}</p><p className="text-xs text-muted-foreground">Précision moyenne</p></div>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement des tracés…</p>}
      {error && <p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{error.message}</p>}
      {!isLoading && !exercises.length && filter !== "not_started" && <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Aucun exercice de tracé commencé pour le moment.</p>}
      {visibleExercises.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {visibleExercises.map((exercise) => (
            <li key={exercise.id}>
              <button type="button" onClick={() => chooseExercise(exercise.id)} className={cn("flex w-full flex-wrap items-center gap-3 p-4 text-left hover:bg-muted/40", selected?.id === exercise.id && "bg-[var(--rw-soft)]")}>
                <span className="min-w-52 flex-1"><span className="block truncate font-semibold">{exercise.rw_lessons?.title ?? "Lecture"}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{exercise.grammar_point}</span></span>
                <span className="text-xs text-muted-foreground">{statusLabels[exercise.status]} · {exercise.total_attempts} tentatives</span>
                <span className="text-sm font-bold text-primary">{exercise.score === null ? "En attente" : `${Math.round(Number(exercise.score))} %`}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {showNotStarted && notStarted.length > 0 && (
        <details className="rounded-2xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-semibold">{notStarted.length} notion{notStarted.length > 1 ? "s" : ""} non commencée{notStarted.length > 1 ? "s" : ""}</summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {notStarted.slice(0, 30).map((item) => <li key={`${item.lesson.id}:${item.index}`} className="rounded-xl bg-muted/50 p-3 text-xs"><p className="font-semibold">{item.lesson.title}</p><p className="mt-0.5 text-muted-foreground">{item.point} · Non commencé</p></li>)}
          </ul>
          {notStarted.length > 30 && <p className="mt-3 text-xs text-muted-foreground">Les 30 premières notions sont affichées.</p>}
        </details>
      )}
      {selected && filter !== "not_started" && (
        <div className="space-y-5 rounded-2xl border border-primary/20 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h4 className="font-bold">{selected.rw_lessons?.title}</h4><p className="text-sm text-muted-foreground">{selected.grammar_point}</p></div>
            <div className="text-right text-xs text-muted-foreground"><p>{new Date(selected.completed_at ?? selected.updated_at).toLocaleString("fr-FR")}</p><p className="mt-1 flex items-center justify-end gap-1"><Clock3 className="size-3.5" />{durationLabel(selected.total_duration_ms)}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Statut</p><p className="font-bold">{statusLabels[selected.status]}</p></div>
            <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Résultat</p><p className="font-bold text-primary">{selected.score === null ? "En cours" : `${Math.round(Number(selected.score))} %`}</p></div>
            <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Tentatives</p><p className="font-bold">{selected.total_attempts}</p></div>
            <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Tracés invalides</p><p className="font-bold">{selected.invalid_attempts}</p></div>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Choisir une phrase">
            {selected.sentences.map((item, index) => <Button key={item} type="button" size="sm" variant={sentenceIndex === index ? "default" : "outline"} onClick={() => { setSentenceIndex(index); setCharacterKey(""); }}>Phrase {index + 1}</Button>)}
          </div>
          <p className="rounded-2xl bg-[var(--rw-soft)] p-4 text-sm font-semibold leading-relaxed">{sentence}</p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Caractère par caractère</p>
            <div className="flex flex-wrap gap-1.5">
              {sentenceCharacters.map((item) => {
                const saved = selected.characters.find((row) => row.sentence_index === sentenceIndex && row.character_index === item.index);
                const key = `${sentenceIndex}:${item.index}`;
                return <button key={key} type="button" onClick={() => setCharacterKey(key)} aria-label={`${item.character}, ${saved ? `${saved.attempts} tentatives` : "non tracé"}`} className={cn("min-w-9 rounded-lg border px-2 py-2 text-center text-sm font-bold", activeCharacter?.index === item.index ? "border-primary bg-primary text-primary-foreground" : saved?.validated_at ? "border-primary/30 bg-[var(--rw-soft)] text-primary" : "border-border bg-muted/40 text-muted-foreground")}>{item.character}</button>;
              })}
            </div>
          </div>
          {activeCharacter && (
            <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
              <RwTracePreview character={activeCharacter.character} trace={savedCharacter?.trace} className="aspect-[32/38] w-full max-w-44" />
              <div className="space-y-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Caractère sélectionné</p><p className="text-3xl font-extrabold text-primary">{activeCharacter.character}</p></div>
                {savedCharacter ? (
                  <>
                    <p className="flex items-center gap-2">{savedCharacter.validated_at ? <Check className="size-4 text-primary" /> : <TriangleAlert className="size-4 text-destructive" />}{savedCharacter.validated_at ? "Caractère validé" : "Dernier tracé invalide"}</p>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-muted/50 p-3"><dt className="text-muted-foreground">Tentatives</dt><dd className="mt-1 text-lg font-bold">{savedCharacter.attempts}</dd></div>
                      <div className="rounded-xl bg-muted/50 p-3"><dt className="text-muted-foreground">Invalides</dt><dd className="mt-1 text-lg font-bold">{savedCharacter.invalid_attempts}</dd></div>
                      <div className="rounded-xl bg-muted/50 p-3"><dt className="text-muted-foreground">Précision</dt><dd className="mt-1 font-bold">{Math.round(Number(savedCharacter.precision))} %</dd></div>
                      <div className="rounded-xl bg-muted/50 p-3"><dt className="text-muted-foreground">Couverture</dt><dd className="mt-1 font-bold">{Math.round(Number(savedCharacter.coverage))} %</dd></div>
                      <div className="rounded-xl bg-muted/50 p-3"><dt className="text-muted-foreground">Score</dt><dd className="mt-1 font-bold">{Math.round(Number(savedCharacter.score))} %</dd></div>
                      <div className="rounded-xl bg-muted/50 p-3"><dt className="text-muted-foreground">Temps</dt><dd className="mt-1 font-bold">{durationLabel(savedCharacter.duration_ms)}</dd></div>
                    </dl>
                  </>
                ) : <p className="text-muted-foreground">Ce caractère n'a pas encore été tracé.</p>}
              </div>
            </div>
          )}
          {difficult.length > 0 && <div className="rounded-2xl bg-destructive/5 p-4"><p className="text-sm font-semibold">Lettres ayant demandé plusieurs essais</p><div className="mt-2 flex flex-wrap gap-2">{difficult.map((item) => <span key={item.id} className="rounded-full bg-card px-3 py-1 text-xs font-semibold">{item.character} · {item.invalid_attempts} invalide{item.invalid_attempts > 1 ? "s" : ""}</span>)}</div></div>}
        </div>
      )}
    </section>
  );
}
