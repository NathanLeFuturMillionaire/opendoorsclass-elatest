import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CheckCircle2, Clock3, Loader2, PenLine, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { rwLiveTracePath } from "@/components/reading-workshop/rw-trace-preview";
import {
  RW_TRACE_VIEW_BOX,
  countRwTraceCharacters,
  evaluateRwTrace,
  rwTraceGlyphPath,
  rwTracePointToStored,
  type RwTracePoint,
  type RwTraceStroke,
} from "@/lib/rw-trace-geometry";
import {
  getRwTraceExercise,
  recordRwTraceAttempt,
  startRwTraceExercise,
  type RwTraceExercise,
} from "@/lib/rw-trace.functions";
import { buildRwTraceSentences } from "@/lib/rw-trace-sentences";
import { cn } from "@/lib/utils";

export type RwTraceGrammar = { point: string; explanation_fr: string; example: string };

function durationLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes} min ${seconds % 60} s` : `${seconds} s`;
}

export function RwTraceExercisePanel({ lessonId, grammarIndex, grammar, level, title, learnerId }: {
  lessonId: string;
  grammarIndex: number;
  grammar: RwTraceGrammar;
  level: string;
  title: string;
  learnerId?: string;
}) {
  const queryClient = useQueryClient();
  const fetchExercise = useServerFn(getRwTraceExercise);
  const createExercise = useServerFn(startRwTraceExercise);
  const saveAttempt = useServerFn(recordRwTraceAttempt);
  const queryKey = ["rw-trace-exercise", lessonId, grammarIndex];
  const { data, isLoading, error: readError } = useQuery({
    queryKey,
    queryFn: () => fetchExercise({ data: { lessonId, grammarIndex } }),
    enabled: !!learnerId,
  });
  const [exercise, setExercise] = useState<RwTraceExercise | null>(null);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("Suivez le modèle gris sans sortir du cadre.");
  const [strokes, setStrokes] = useState<RwTraceStroke[]>([]);
  const [activePointer, setActivePointer] = useState<number | null>(null);
  const [outOfBounds, setOutOfBounds] = useState(false);
  const [justValidated, setJustValidated] = useState(false);
  const strokesRef = useRef<RwTraceStroke[]>([]);
  const outRef = useRef(false);
  const charStartedAt = useRef(Date.now());
  const previewSentences = useMemo(() => buildRwTraceSentences({
    point: grammar.point,
    explanation_fr: grammar.explanation_fr,
    example: grammar.example,
    level,
    title,
  }), [grammar, level, title]);

  useEffect(() => {
    if (data !== undefined) {
      setExercise(data);
      setStrokes([]);
      strokesRef.current = [];
      outRef.current = false;
      setOutOfBounds(false);
      charStartedAt.current = Date.now();
    }
  }, [data]);

  const sentence = exercise?.sentences[exercise.current_sentence] ?? "";
  const character = exercise?.status === "in_progress" ? sentence[exercise.current_character] ?? "" : "";
  const totalCharacters = useMemo(() => exercise?.sentences.reduce((sum, item) => sum + countRwTraceCharacters(item), 0) ?? 0, [exercise]);
  const completedCharacters = useMemo(() => {
    if (!exercise) return 0;
    const previous = exercise.sentences.slice(0, exercise.current_sentence).reduce((sum, item) => sum + countRwTraceCharacters(item), 0);
    const current = Array.from(sentence.slice(0, exercise.current_character)).filter((item) => !/\s/.test(item) && rwTraceGlyphPath(item)).length;
    return previous + current;
  }, [exercise, sentence]);

  function replaceStrokes(next: RwTraceStroke[]) {
    strokesRef.current = next;
    setStrokes(next);
  }

  function pointFromEvent(event: React.PointerEvent<SVGSVGElement>): { point: RwTracePoint; inside: boolean } {
    const rect = event.currentTarget.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    const xRatio = (event.clientX - rect.left) / Math.max(1, rect.width);
    const yRatio = (event.clientY - rect.top) / Math.max(1, rect.height);
    return {
      inside,
      point: {
        x: RW_TRACE_VIEW_BOX.x + xRatio * RW_TRACE_VIEW_BOX.width,
        y: RW_TRACE_VIEW_BOX.y + yRatio * RW_TRACE_VIEW_BOX.height,
      },
    };
  }

  async function submitTrace(trace: RwTraceStroke[], outside: boolean) {
    if (!exercise || !character || saving) return;
    const evaluation = evaluateRwTrace(character, trace, outside);
    if (evaluation.incomplete && !outside) {
      setFeedback("Continuez sur les traits gris. Les autres parties de la lettre restent à tracer.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await saveAttempt({ data: {
        exerciseId: exercise.id,
        sentenceIndex: exercise.current_sentence,
        characterIndex: exercise.current_character,
        outOfBounds: outside,
        precision: evaluation.precision,
        coverage: evaluation.coverage,
        strokeCoverage: evaluation.strokeCoverage,
        durationMs: Math.min(120000, Math.max(0, Date.now() - charStartedAt.current)),
        trace: { strokes: trace.map((stroke) => stroke.map(rwTracePointToStored)) },
      } });
      setExercise(result);
      replaceStrokes([]);
      setOutOfBounds(false);
      outRef.current = false;
      charStartedAt.current = Date.now();
      if (result.accepted) {
        setJustValidated(true);
        window.setTimeout(() => setJustValidated(false), 350);
        setFeedback(result.completed ? "Les cinq phrases sont terminées. Bravo !" : "Lettre validée. Continuez avec le modèle suivant.");
      } else {
        setFeedback(outside ? "Le tracé est sorti du cadre. Recommencez en restant dans la zone." : "La forme ne suit pas assez le modèle. Recommencez cette lettre.");
      }
      void queryClient.invalidateQueries({ queryKey: ["rw-trace-review"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Le tracé n'a pas pu être enregistré. Réessayez.");
      setFeedback("Votre tracé est conservé à l'écran. Vous pouvez relancer sa validation.");
    } finally {
      setSaving(false);
      setActivePointer(null);
    }
  }

  function pointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (saving || activePointer !== null || !character) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const { point, inside } = pointFromEvent(event);
    setActivePointer(event.pointerId);
    if (!inside) {
      outRef.current = true;
      setOutOfBounds(true);
    }
    replaceStrokes([...strokesRef.current, [point]]);
  }

  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (activePointer !== event.pointerId || saving) return;
    event.preventDefault();
    const { point, inside } = pointFromEvent(event);
    if (!inside && !outRef.current) {
      outRef.current = true;
      setOutOfBounds(true);
      setFeedback("Sortie du cadre détectée. Cette lettre devra être recommencée.");
    }
    const next = strokesRef.current.map((stroke, index) =>
      index === strokesRef.current.length - 1 ? [...stroke, point] : stroke,
    );
    replaceStrokes(next);
  }

  function pointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (activePointer !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setActivePointer(null);
    void submitTrace(strokesRef.current, outRef.current);
  }

  function resetTrace() {
    replaceStrokes([]);
    outRef.current = false;
    setOutOfBounds(false);
    setError("");
    setFeedback("Modèle prêt. Suivez tous les traits gris dans le cadre.");
  }

  async function begin() {
    setStarting(true);
    setError("");
    try {
      const created = await createExercise({ data: { lessonId, grammarIndex } });
      setExercise(created);
      charStartedAt.current = Date.now();
      queryClient.setQueryData(queryKey, created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de commencer l'exercice.");
    } finally {
      setStarting(false);
    }
  }

  if (!learnerId) return null;
  if (isLoading) return <div className="flex justify-center rounded-2xl border border-border p-5"><Loader2 className="size-5 animate-spin text-primary" aria-label="Chargement de l'exercice" /></div>;
  if (readError) return <p role="alert" className="rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">{readError.message}</p>;

  if (!exercise) {
    return (
      <div className="mt-4 rounded-2xl bg-[var(--rw-soft)] p-4">
        <div className="flex items-start gap-3">
          <PenLine className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">À vous de tracer</p>
            <p className="mt-1 text-sm text-muted-foreground">Reproduisez cinq phrases lettre par lettre. Les espaces sont automatiques et chaque tracé doit rester dans le cadre.</p>
          </div>
        </div>
        <ol className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          {previewSentences.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}
        </ol>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <Button className="mt-4" onClick={begin} disabled={starting}>
          {starting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PenLine className="mr-2 size-4" />}
          {starting ? "Préparation…" : "Commencer les cinq phrases"}
        </Button>
      </div>
    );
  }

  if (exercise.status === "completed") {
    return (
      <div className="mt-4 space-y-4 rounded-2xl border border-primary/20 bg-[var(--rw-soft)] p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-9 shrink-0 text-primary" />
          <div><p className="font-bold">Exercice terminé</p><p className="text-sm text-muted-foreground">Vous avez validé tous les caractères des cinq phrases.</p></div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-card p-3"><p className="text-xl font-extrabold text-primary">{Math.round(exercise.score ?? 0)} %</p><p className="text-[11px] text-muted-foreground">Précision</p></div>
          <div className="rounded-xl bg-card p-3"><p className="text-xl font-extrabold text-primary">{exercise.total_attempts}</p><p className="text-[11px] text-muted-foreground">Tentatives</p></div>
          <div className="rounded-xl bg-card p-3"><p className="text-xl font-extrabold text-primary">{durationLabel(exercise.total_duration_ms)}</p><p className="text-[11px] text-muted-foreground">Temps actif</p></div>
        </div>
        <ol className="space-y-2">
          {exercise.sentences.map((item, index) => <li key={item} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span>{index + 1}. {item}</span></li>)}
        </ol>
      </div>
    );
  }

  const viewBox = `${RW_TRACE_VIEW_BOX.x} ${RW_TRACE_VIEW_BOX.y} ${RW_TRACE_VIEW_BOX.width} ${RW_TRACE_VIEW_BOX.height}`;
  const sentenceCharacters = countRwTraceCharacters(sentence);
  const currentSentenceDone = Array.from(sentence.slice(0, exercise.current_character)).filter((item) => !/\s/.test(item) && rwTraceGlyphPath(item)).length;

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-border bg-background p-3 sm:p-5">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span>Phrase {exercise.current_sentence + 1} sur 5</span>
        <span className="text-primary">Lettre {Math.min(currentSentenceDone + 1, sentenceCharacters)} sur {sentenceCharacters}</span>
      </div>
      <Progress value={(exercise.current_sentence / 5) * 100} aria-label="Progression des phrases" />
      <div className="rounded-2xl bg-[var(--rw-soft)] p-4 text-center">
        <p className="text-lg font-semibold leading-relaxed tracking-wide sm:text-xl">
          {Array.from(sentence).map((item, index) => /\s/.test(item) ? (
            <span key={index} className="inline-block w-2.5" aria-hidden> </span>
          ) : (
            <span key={index} className={cn(index < exercise.current_character && "text-primary", index === exercise.current_character && "rounded bg-primary/15 px-0.5 text-primary underline decoration-2 underline-offset-4")}>{item}</span>
          ))}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs text-muted-foreground">Caractère à reproduire</p><p className="text-2xl font-extrabold text-primary">{character === " " ? "Espace" : character}</p></div>
        <Button type="button" variant="outline" size="sm" onClick={resetTrace} disabled={saving || !strokes.length}><RotateCcw className="mr-1.5 size-4" />Recommencer</Button>
      </div>
      <div className={cn("relative mx-auto w-full max-w-[340px] overflow-hidden rounded-3xl border-2 bg-card shadow-inner transition-colors", outOfBounds ? "border-destructive" : justValidated ? "border-primary" : "border-border")}>
        <svg
          viewBox={viewBox}
          className="aspect-[32/38] w-full touch-none select-none"
          role="application"
          aria-label={`Zone de tracé pour la lettre ${character}`}
          data-sentence-index={exercise.current_sentence}
          data-character-index={exercise.current_character}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onContextMenu={(event) => event.preventDefault()}
        >
          <rect x={RW_TRACE_VIEW_BOX.x} y={RW_TRACE_VIEW_BOX.y} width={RW_TRACE_VIEW_BOX.width} height={RW_TRACE_VIEW_BOX.height} fill="var(--card)" />
          <path d={rwTraceGlyphPath(character)} fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.38" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d={rwLiveTracePath(strokes)} fill="none" stroke={outOfBounds ? "var(--destructive)" : "var(--primary)"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {saving && <div className="absolute inset-0 flex items-center justify-center bg-card/70"><Loader2 className="size-8 animate-spin text-primary" aria-label="Validation du tracé" /></div>}
      </div>
      <div className="flex items-start gap-2 text-sm" aria-live="polite">
        {outOfBounds ? <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" /> : justValidated ? <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" /> : <PenLine className="mt-0.5 size-4 shrink-0 text-primary" />}
        <p className={outOfBounds ? "text-destructive" : "text-muted-foreground"}>{feedback}</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive"><p>{error}</p><Button type="button" variant="outline" size="sm" className="mt-2" disabled={saving} onClick={() => void submitTrace(strokesRef.current, outRef.current)}>Réessayer la validation</Button></div>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock3 className="size-3.5" />{exercise.total_attempts} tentative{exercise.total_attempts > 1 ? "s" : ""} enregistrée{exercise.total_attempts > 1 ? "s" : ""}</span>
        <span>{completedCharacters} sur {totalCharacters} caractères validés</span>
      </div>
      <Progress value={totalCharacters ? (completedCharacters / totalCharacters) * 100 : 0} aria-label="Progression des lettres" />
      <details className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-foreground">Comment réussir le tracé ?</summary>
        <p className="mt-2">Suivez tous les traits gris avec le doigt, la souris ou le stylet. Vous pouvez lever le doigt entre deux traits. Toute sortie du cadre invalide la tentative. La page ne défile pas pendant le tracé.</p>
      </details>
    </div>
  );
}
