import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudOff,
  ListChecks,
  Loader2,
  RefreshCw,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useT } from "@/lib/i18n";
import { SKILL_LABELS, type Skill } from "@/lib/test-engine";
import { useI18n } from "@/lib/i18n";
import {
  AssessmentAudio,
  AssessmentSpeaking,
  AssessmentWriting,
} from "@/components/assessment/assessment-media";
import { AssessmentNavigator } from "@/components/assessment/assessment-navigator";
import {
  completeAssessmentSession,
  getAssessmentQuestions,
  getAssessmentSessionState,
  saveAssessmentAnswer,
  type AssessmentQuestion,
} from "@/lib/assessment.functions";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AssessmentRunner(props: { sessionId: string; onCompleted: () => void }) {
  const t = useT();
  const { locale } = useI18n();
  const fetchQuestions = useServerFn(getAssessmentQuestions);
  const fetchState = useServerFn(getAssessmentSessionState);
  const saveAnswer = useServerFn(saveAssessmentAnswer);
  const complete = useServerFn(completeAssessmentSession);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [transition, setTransition] = useState<string | null>(null);
  const hydrated = useRef(false);
  const warned = useRef<Record<number, boolean>>({});
  // Answers awaiting a confirmed server write, replayed on retry.
  const pending = useRef<Record<string, string>>({});

  const questions = useQuery({
    queryKey: ["assessment-questions", props.sessionId],
    queryFn: () => fetchQuestions({ data: { sessionId: props.sessionId } }),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });

  const state = useQuery({
    queryKey: ["assessment-state", props.sessionId],
    queryFn: () => fetchState({ data: { sessionId: props.sessionId } }),
    staleTime: Infinity,
    retry: 2,
  });

  const items: AssessmentQuestion[] = useMemo(() => questions.data ?? [], [questions.data]);
  const total = items.length;

  // Restore saved answers and position exactly once.
  useEffect(() => {
    if (hydrated.current || !state.data || !total) return;
    hydrated.current = true;
    setAnswers(state.data.answers);
    setCurrent(Math.min(Math.max(state.data.currentQuestion, 0), total - 1));
  }, [state.data, total]);

  // Exam clock, seeded by the server so a page reload cannot buy extra time.
  useEffect(() => {
    if (!state.data) return;
    const deadline = new Date(state.data.deadlineAt).getTime();
    const sync = () => setTimeLeft(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    sync();
    const id = setInterval(sync, 1000);
    return () => clearInterval(id);
  }, [state.data]);

  const persist = async (questionId: string, answer: string, index: number) => {
    setSaveState("saving");
    pending.current[questionId] = answer;
    try {
      await saveAnswer({
        data: { sessionId: props.sessionId, questionId, answer, currentQuestion: index },
      });
      delete pending.current[questionId];
      setSaveState(Object.keys(pending.current).length ? "error" : "saved");
    } catch {
      setSaveState("error");
    }
  };

  const retryPending = async () => {
    const entries = Object.entries(pending.current);
    if (!entries.length) {
      setSaveState("saved");
      return;
    }
    setSaveState("saving");
    for (const [questionId, answer] of entries) {
      try {
        await saveAnswer({
          data: { sessionId: props.sessionId, questionId, answer, currentQuestion: current },
        });
        delete pending.current[questionId];
      } catch {
        // keep it queued
      }
    }
    setSaveState(Object.keys(pending.current).length ? "error" : "saved");
  };

  const submit = useMutation({
    mutationFn: () => complete({ data: { sessionId: props.sessionId } }),
    onSuccess: () => {
      setConfirmOpen(false);
      props.onCompleted();
    },
  });

  // The attempt closes by itself when the clock reaches zero.
  useEffect(() => {
    if (timeLeft === 0 && !submit.isPending && !submit.isSuccess) submit.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Discreet countdown reminders at 10 min, 5 min, 1 min and 30 seconds.
  useEffect(() => {
    if (timeLeft === null) return;
    for (const mark of [600, 300, 60, 30]) {
      if (timeLeft <= mark && timeLeft > mark - 2 && !warned.current[mark]) {
        warned.current[mark] = true;
        toast(
          `${t("sa.timer.left")} : ${Math.floor(mark / 60) ? `${Math.floor(mark / 60)} min` : `${mark} s`}`,
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Replay queued answers as soon as the connection is back.
  useEffect(() => {
    const handler = () => void retryPending();
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Warn before leaving while the assessment is running.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (submit.isSuccess) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [submit.isSuccess]);

  if (questions.isLoading || state.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span>{t("sa.loading")}</span>
      </div>
    );
  }

  if (questions.isError || state.isError || !total) {
    return (
      <Card className="mx-auto max-w-xl border-destructive/40">
        <CardContent className="space-y-4 p-6 text-center">
          <p className="font-medium">{t("sa.error.load")}</p>
          <Button variant="outline" onClick={() => void questions.refetch()}>
            <RefreshCw className="mr-2 size-4" aria-hidden="true" />
            {t("sa.error.load")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const q = items[current];
  const answeredCount = items.filter((item) => (answers[item.id] ?? "").trim().length > 0).length;
  const remaining = total - answeredCount;
  const percent = Math.round(((current + 1) / total) * 100);
  const isLast = current === total - 1;
  const skillLabel = SKILL_LABELS[q.category as Skill];

  const setAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    void persist(q.id, value, current);
  };

  // Navigator sections follow the order in which the skills appear in the attempt.
  const groups: Array<{ skill: string; indexes: number[]; answered: number }> = [];
  items.forEach((item, index) => {
    const done = (answers[item.id] ?? "").trim().length > 0;
    const last = groups[groups.length - 1];
    if (last && last.skill === item.category) {
      last.indexes.push(index);
      if (done) last.answered += 1;
    } else {
      groups.push({ skill: item.category, indexes: [index], answered: done ? 1 : 0 });
    }
  });

  const isAnswered = (index: number) => (answers[items[index].id] ?? "").trim().length > 0;

  const goTo = (index: number) => {
    const next = Math.min(total - 1, Math.max(0, index));
    const from = items[current]?.category;
    const to = items[next]?.category;
    if (from && to && from !== to && next > current) {
      const fromLabel = SKILL_LABELS[from as Skill];
      const toLabel = SKILL_LABELS[to as Skill];
      setTransition(
        `${locale === "fr" ? (fromLabel?.fr ?? from) : (fromLabel?.en ?? from)} ✓ · ${locale === "fr" ? (toLabel?.fr ?? to) : (toLabel?.en ?? to)}`,
      );
      window.setTimeout(() => setTransition(null), 1600);
    }
    setCurrent(next);
    setNavOpen(false);
  };

  const navigator = (
    <AssessmentNavigator
      groups={groups}
      current={current}
      answeredIds={isAnswered}
      onSelect={goTo}
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      {/* Assessment header */}
      <header className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight">OpenDoorsClass</p>
            <p className="truncate text-xs text-muted-foreground">
              <span aria-hidden="true">🇪🇸</span> {t("sa.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TimerChip seconds={timeLeft} />
            <SaveIndicator state={saveState} onRetry={() => void retryPending()} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            {t("sa.question")} {current + 1} {t("sa.of")} {total}
            {skillLabel ? (
              <span className="hidden sm:inline">
                {" "}
                · {locale === "fr" ? skillLabel.fr : skillLabel.en}
              </span>
            ) : null}
          </span>
          <span>{percent} %</span>
        </div>
        <Progress value={percent} className="mt-2 h-2" aria-label={t("sa.question")} />
        <div className="mt-3 lg:hidden">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="w-full rounded-xl">
                <ListChecks className="mr-2 size-4" aria-hidden="true" />
                {t("sa.nav.title")}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[75dvh] overflow-y-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>{t("sa.nav.title")}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{navigator}</div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Compact navigator, desktop side panel */}
        <aside className="hidden lg:block">
          <div className="sticky top-40">{navigator}</div>
        </aside>

        <div>
        <AnimatePresence>
          {transition ? (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 rounded-xl border border-brand-green/40 bg-brand-green/10 px-4 py-2 text-sm font-medium text-brand-green"
            >
              {transition}
            </motion.p>
          ) : null}
        </AnimatePresence>
      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Card className="border-border/60">
            <CardContent className="space-y-6 p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{q.level}</Badge>
                {skillLabel ? (
                  <Badge variant="outline">{locale === "fr" ? skillLabel.fr : skillLabel.en}</Badge>
                ) : null}
              </div>

              <h1 className="text-lg font-semibold leading-relaxed sm:text-xl" lang="es">
                {q.question_text}
              </h1>

              {q.image_url ? (
                <img
                  src={q.image_url}
                  alt={q.image_alt ?? ""}
                  loading="lazy"
                  width={768}
                  height={576}
                  className="mx-auto w-full max-w-sm rounded-xl border border-border/60 bg-muted/30 object-contain"
                />
              ) : null}

              {q.audio_url ? <AssessmentAudio url={q.audio_url} maxPlays={q.max_plays} /> : null}

              {q.category === "writing" ? (
                <AssessmentWriting
                  sessionId={props.sessionId}
                  questionId={q.id}
                  value={answers[q.id]}
                  onGraded={setAnswer}
                />
              ) : q.category === "speaking" ? (
                <AssessmentSpeaking
                  sessionId={props.sessionId}
                  questionId={q.id}
                  value={answers[q.id]}
                  onGraded={setAnswer}
                  onSkip={() => goTo(current + 1)}
                />
              ) : q.options.length ? (
                <RadioGroup
                  value={answers[q.id] ?? ""}
                  onValueChange={setAnswer}
                  className="space-y-2"
                >
                  {q.options.map((option) => {
                    const id = `${q.id}-${option}`;
                    const selected = answers[q.id] === option;
                    return (
                      <Label
                        key={id}
                        htmlFor={id}
                        lang="es"
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-base font-normal transition-colors",
                          selected
                            ? "border-brand-blue bg-brand-blue-soft"
                            : "border-border/70 hover:bg-secondary/60",
                        ].join(" ")}
                      >
                        <RadioGroupItem id={id} value={option} />
                        <span>{option}</span>
                      </Label>
                    );
                  })}
                </RadioGroup>
              ) : (
                <Textarea
                  lang="es"
                  rows={6}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  onBlur={(e) => void persist(q.id, e.target.value, current)}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
        >
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          {t("sa.prev")}
        </Button>

        {isLast ? (
          <Button
            className="rounded-xl bg-brand-gradient text-primary-foreground"
            onClick={() => setConfirmOpen(true)}
          >
            {t("sa.finish")}
            <CheckCircle2 className="ml-2 size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            className="rounded-xl bg-brand-gradient text-primary-foreground"
            onClick={() => goTo(current + 1)}
          >
            {t("sa.next")}
            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sa.confirm.title")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                <p>
                  {t("sa.answered")} : {answeredCount} / {total}
                </p>
                <p>
                  {t("sa.remaining")} : {remaining}
                </p>
                {remaining > 0 ? (
                  <p className="font-medium text-destructive">
                    {t("sa.confirm.unanswered").replace("{n}", String(remaining))}
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("sa.confirm.continue")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!submit.isPending) submit.mutate();
              }}
            >
              {submit.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {t("sa.confirm.submit")}
            </AlertDialogAction>
          </AlertDialogFooter>
          {submit.isError ? (
            <p className="text-sm font-medium text-destructive">{t("sa.error.submit")}</p>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const t = useT();
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        {t("sa.saving")}
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-brand-green">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        {t("sa.saved")}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onRetry}
      className="flex items-center gap-1.5 text-xs font-medium text-destructive underline-offset-2 hover:underline"
    >
      <CloudOff className="size-3.5" aria-hidden="true" />
      {t("sa.savefail.final")}
    </button>
  );
}

/** Exam countdown. Turns red in the final five minutes. */
function TimerChip({ seconds }: { seconds: number | null }) {
  const t = useT();
  if (seconds === null) return null;
  const urgent = seconds <= 300;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <span
      aria-live="polite"
      title={seconds === 0 ? t("sa.timer.over") : t("sa.timer.left")}
      className={[
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums",
        urgent
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border/70 bg-secondary text-foreground",
      ].join(" ")}
    >
      <Timer className="size-3.5" aria-hidden="true" />
      {mm}:{ss}
    </span>
  );
}
