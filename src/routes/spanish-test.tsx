import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Ear,
  Loader2,
  Mic,
  PenLine,
  ShieldCheck,
  SpellCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AssessmentRunner } from "@/components/assessment/assessment-runner";
import { PreTestWarning } from "@/components/assessment/pre-test-warning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import {
  abandonAssessmentSession,
  getAssessmentOverview,
  startAssessmentSession,
} from "@/lib/assessment.functions";

const CANONICAL = "https://opendoorsclass-elatest.lovable.app/spanish-test";

export const Route = createFileRoute("/spanish-test")({
  head: () => {
    const title = "Spanish Language Assessment | OpenDoorsClass";
    const description =
      "Measure your real Spanish proficiency on the CEFR scale, from A1 to C2, with the OpenDoorsClass assessment engine.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: CANONICAL },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: CANONICAL }],
    };
  },
  component: SpanishAssessmentPage,
});

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const SKILLS = [
  { key: "es.skill.grammar", icon: SpellCheck },
  { key: "es.skill.vocabulary", icon: BookOpen },
  { key: "es.skill.reading", icon: BookOpen },
  { key: "es.skill.listening", icon: Ear },
  { key: "es.skill.writing", icon: PenLine },
  { key: "es.skill.speaking", icon: Mic },
] as const;

function SpanishAssessmentPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");
  const guard = useRef(false);
  // Phase of the page: presentation, live assessment, completion screen.
  const [phase, setPhase] = useState<"intro" | "warning" | "running" | "done">("intro");
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setAuthState(data.session ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthState(session ? "in" : "out");
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchOverview = useServerFn(getAssessmentOverview);
  const startSession = useServerFn(startAssessmentSession);
  const abandonSession = useServerFn(abandonAssessmentSession);

  const overview = useQuery({
    queryKey: ["assessment-overview", "es"],
    enabled: authState === "in",
    queryFn: () => fetchOverview({ data: { language: "es" as const } }),
  });

  const start = useMutation({
    mutationFn: () => startSession({ data: { language: "es" as const } }),
    onSuccess: (result) => {
      guard.current = false;
      toast.success(result.resumed ? t("es.session.resumed") : t("es.session.started"), {
        description: result.resumed ? t("sa.resume.note") : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["assessment-overview", "es"] });
      setRunningSessionId(result.sessionId);
      setPhase("running");
    },
    onError: (error: Error) => {
      guard.current = false;
      if (error.message.includes("INSUFFICIENT_CREDITS")) {
        toast.error(t("es.nocredit"));
        return;
      }
      toast.error(t("es.error.generic"));
    },
  });

  const abandon = useMutation({
    mutationFn: (sessionId: string) => abandonSession({ data: { sessionId } }),
    onSuccess: () => {
      toast.success(t("es.session.abandoned"));
      queryClient.invalidateQueries({ queryKey: ["assessment-overview", "es"] });
    },
    onError: () => toast.error(t("es.error.generic")),
  });

  // L'ecran d'avertissement est obligatoire avant tout decompte de credit.
  function requestStart() {
    setPhase("warning");
  }

  // Client side guard on top of the idempotent database function.
  function handleStart() {
    if (guard.current || start.isPending) return;
    guard.current = true;
    start.mutate();
  }

  const credits = overview.data?.credits ?? 0;
  const activeSession = overview.data?.activeSession ?? null;
  const busy = start.isPending || overview.isLoading;

  if (phase === "running" && runningSessionId) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 py-6">
          <AssessmentRunner
            sessionId={runningSessionId}
            onCompleted={() => {
              setPhase("done");
              queryClient.invalidateQueries({ queryKey: ["assessment-overview", "es"] });
              navigate({ to: "/resultat/$id", params: { id: runningSessionId } });
            }}
          />
        </main>
      </div>
    );
  }

  if (phase === "warning") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 px-4 py-12">
          <PreTestWarning
            testLanguage="es"
            loading={start.isPending}
            onStart={handleStart}
            onCancel={() => setPhase("intro")}
            cancelLabel="Volver"
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-lg"
          >
            <Card className="border-border/60 text-center">
              <CardContent className="space-y-4 p-8">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-green/10 text-brand-green">
                  <CheckCircle2 className="size-7" aria-hidden="true" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight">{t("sa.done.title")}</h1>
                <p className="text-muted-foreground">{t("sa.done.desc")}</p>
                <p className="text-sm text-muted-foreground">{t("sa.done.processing")}</p>
                {/* Placeholder for the future CEFR scoring and result report. */}
                <Button
                  className="rounded-xl bg-brand-gradient text-primary-foreground"
                  onClick={() => navigate({ to: "/tableau-de-bord" })}
                >
                  {t("sa.done.back")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden="true">
            <div className="absolute -top-32 left-1/2 h-80 w-[120%] -translate-x-1/2 rounded-full bg-brand-blue-soft blur-3xl" />
          </div>
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Badge variant="outline" className="mb-4">
                {t("es.badge")}
              </Badge>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                {t("es.title")}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                {t("es.subtitle")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="mt-10"
            >
              <StartPanel
                authState={authState}
                credits={credits}
                loading={overview.isLoading}
                pending={start.isPending}
                busy={busy}
                activeSessionId={activeSession?.id ?? null}
                abandoning={abandon.isPending}
                onStart={requestStart}
                onAbandon={(id) => abandon.mutate(id)}
                onBuy={() => navigate({ to: "/achat-credits" })}
              />
            </motion.div>
          </div>
        </section>

        {/* Levels */}
        <section aria-labelledby="es-levels" className="border-b border-border/60">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
            <h2 id="es-levels" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("es.levels.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{t("es.levels.desc")}</p>
            <ol className="mt-8 flex flex-wrap items-center gap-3">
              {LEVELS.map((level, i) => (
                <li key={level} className="flex items-center gap-3">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.94 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    className="grid h-12 w-16 place-items-center rounded-xl border border-border/70 bg-card font-bold tracking-tight shadow-sm"
                  >
                    {level}
                  </motion.span>
                  {i < LEVELS.length - 1 ? (
                    <ArrowRight
                      className="size-4 text-muted-foreground/70"
                      aria-hidden="true"
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Skills */}
        <section aria-labelledby="es-skills" className="border-b border-border/60 bg-secondary/30">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
            <h2 id="es-skills" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("es.skills.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{t("es.skills.desc")}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SKILLS.map((skill, i) => (
                <motion.div
                  key={skill.key}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Card className="h-full border-border/60">
                    <CardContent className="flex items-center gap-3 p-5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-blue-soft text-brand-blue">
                        <skill.icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="font-semibold">{t(skill.key)}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Information */}
        <section aria-labelledby="es-info">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
            <h2 id="es-info" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("es.info.title")}
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {(["es.info.1", "es.info.2", "es.info.3", "es.info.4"] as const).map((key) => (
                <li key={key} className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 text-brand-green"
                    aria-hidden="true"
                  />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function StartPanel(props: {
  authState: "loading" | "in" | "out";
  credits: number;
  loading: boolean;
  pending: boolean;
  busy: boolean;
  activeSessionId: string | null;
  abandoning: boolean;
  onStart: () => void;
  onAbandon: (sessionId: string) => void;
  onBuy: () => void;
}) {
  const t = useT();

  if (props.authState === "loading") {
    return (
      <div className="mx-auto flex h-12 max-w-md items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span className="sr-only">{t("es.cta.starting")}</span>
      </div>
    );
  }

  if (props.authState === "out") {
    return (
      <Button
        asChild
        size="lg"
        className="rounded-xl bg-brand-gradient px-7 text-primary-foreground shadow-lg transition-transform duration-300 hover:-translate-y-0.5"
      >
        <Link to="/auth" search={{ redirect: "/spanish-test" }}>
          {t("es.cta.auth")}
        </Link>
      </Button>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <Wallet className="size-4 text-brand-blue" aria-hidden="true" />
        <span>
          {t("es.credits")} :{" "}
          {props.loading ? (
            <span className="text-muted-foreground">...</span>
          ) : (
            <span className="font-bold">{props.credits}</span>
          )}
        </span>
      </div>

      {props.activeSessionId ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("es.session.active")}</p>
          <Button
            size="lg"
            className="w-full rounded-xl bg-brand-gradient text-primary-foreground"
            onClick={props.onStart}
            disabled={props.busy}
          >
            {props.pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {t("es.session.resume")}
          </Button>
          <Button
            variant="ghost"
            className="w-full rounded-xl"
            onClick={() => props.onAbandon(props.activeSessionId!)}
            disabled={props.abandoning}
          >
            {t("es.session.abandon")}
          </Button>
        </div>
      ) : props.credits < 1 && !props.loading ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-destructive">{t("es.nocredit")}</p>
          <Button size="lg" className="w-full rounded-xl" disabled aria-disabled="true">
            {t("es.cta.start")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full rounded-xl"
            onClick={props.onBuy}
          >
            {t("es.cta.buy")}
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full rounded-xl bg-brand-gradient text-primary-foreground shadow-lg transition-transform duration-300 hover:-translate-y-0.5"
          onClick={props.onStart}
          disabled={props.busy}
        >
          {props.pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {props.pending ? t("es.cta.starting") : t("es.cta.start")}
        </Button>
      )}
    </div>
  );
}
