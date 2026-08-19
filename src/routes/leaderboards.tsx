import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Globe2, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { flagFor, LeaderAvatar, medalFor } from "@/components/leaderboard/shared";
import { FounderBadge } from "@/components/founder-badge";
import {
  getLeaderboard,
  LEADERBOARD_CATEGORIES,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "@/lib/leaderboards.functions";
import { detectRegion } from "@/lib/geo-price";
import { useI18n } from "@/lib/i18n";
import { socialMeta, canonicalLink, breadcrumbLd } from "@/lib/seo";

export const Route = createFileRoute("/leaderboards")({
  head: () => ({
    meta: socialMeta({
      title: "Classements des candidats | OpenDoorsClass",
      description:
        "Classement général et classements par compétence des candidats au test de niveau OpenDoorsClass, en Afrique et dans le monde.",
      path: "/leaderboards",
    }),
    links: canonicalLink("/leaderboards"),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbLd([
            { name: "OpenDoorsClass", path: "/" },
            { name: "Classements", path: "/leaderboards" },
          ]),
        ),
      },
    ],
  }),
  component: LeaderboardsPage,
});

const CATEGORY_LABELS: Record<LeaderboardCategory, { en: string; fr: string }> = {
  overall: { en: "Overall Ranking", fr: "Classement général" },
  listening: { en: "Listening", fr: "Écoute" },
  reading: { en: "Reading", fr: "Lecture" },
  writing: { en: "Writing", fr: "Écrit" },
  speaking: { en: "Speaking", fr: "Expression orale" },
  grammar: { en: "Grammar", fr: "Grammaire" },
  vocabulary: { en: "Vocabulary", fr: "Vocabulaire" },
  orthography: { en: "Orthography", fr: "Orthographe" },
};

const PERIODS: { key: LeaderboardPeriod; en: string; fr: string }[] = [
  { key: "today", en: "Today", fr: "Aujourd'hui" },
  { key: "week", en: "This Week", fr: "Cette semaine" },
  { key: "month", en: "This Month", fr: "Ce mois" },
  { key: "all", en: "All Time", fr: "Depuis le début" },
];

function EntryRow({ entry, index, en }: { entry: LeaderboardEntry; index: number; en: boolean }) {
  const medal = medalFor(entry.rank);
  const isFirst = entry.rank === 1;
  const date = entry.last_test_at
    ? new Date(entry.last_test_at).toLocaleDateString(en ? "en-GB" : "fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        to="/profile/$id"
        params={{ id: entry.user_id }}
        aria-label={`${entry.display_name}, ${en ? "rank" : "rang"} ${entry.rank}, ${entry.score}%`}
        className={
          "grid grid-cols-[2rem_auto_1fr_auto] items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[3rem_auto_1fr_5rem_6rem_5rem] sm:gap-4 sm:px-5 " +
          (isFirst
            ? "bg-gradient-to-r from-amber-400/15 via-amber-300/5 to-transparent"
            : medal
              ? "bg-muted/25"
              : "")
        }
      >
        <span className="flex justify-center text-sm font-bold text-muted-foreground">
          {medal ? <span aria-hidden className="text-xl leading-none">{medal}</span> : `#${entry.rank}`}
        </span>
        <LeaderAvatar entry={entry} size={isFirst ? 52 : 42} />
        <div className="min-w-0">
          <p className={"flex flex-wrap items-center gap-1.5 font-semibold " + (isFirst ? "text-base" : "text-sm")}>
            <span className="truncate">{entry.display_name}</span>
            <FounderBadge userId={entry.user_id} />
          </p>
          <p className="truncate text-xs text-muted-foreground">
            <span aria-hidden>{flagFor(entry.country)}</span> {entry.country ?? (en ? "Worldwide" : "International")}
            {entry.badges > 0 ? (
              <span className="ml-2 inline-flex items-center gap-1 align-middle text-[11px] font-medium text-amber-600 dark:text-amber-300">
                <Award className="size-3" aria-hidden /> {entry.badges}
              </span>
            ) : null}
            <span className="ml-2 sm:hidden">· {entry.score}%</span>
          </p>
        </div>
        <span className="hidden justify-self-start sm:block">
          {entry.cefr_level ? (
            <span className="rounded-full bg-brand-blue px-2.5 py-0.5 text-xs font-semibold text-brand-blue-foreground">
              {entry.cefr_level}
            </span>
          ) : null}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:block">{date}</span>
        <span className="text-right text-sm font-bold tabular-nums max-sm:hidden sm:text-base">
          {entry.score}%
        </span>
        <span className="text-right text-sm font-bold tabular-nums sm:hidden">{entry.cefr_level ?? ""}</span>
      </Link>
    </motion.li>
  );
}

function LeaderboardsPage() {
  const { locale } = useI18n();
  const en = locale === "en";
  const [category, setCategory] = useState<LeaderboardCategory>("overall");
  const [scope, setScope] = useState<string>("WW");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [limit, setLimit] = useState(25);

  const myCountry = useMemo(() => {
    try {
      return detectRegion();
    } catch {
      return "GA";
    }
  }, []);

  const fetchLb = useServerFn(getLeaderboard);
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["leaderboards", category, scope, period, limit],
    queryFn: () => fetchLb({ data: { category, scope, period, limit } }),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  const entries = data ?? [];

  const scopes = [
    { key: "WW", label: en ? "Worldwide" : "Monde entier" },
    { key: "AF", label: en ? "Africa" : "Afrique" },
    { key: myCountry, label: en ? "My Country" : "Mon pays" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-brand-blue-soft/40">
          <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6">
            <Badge variant="outline" className="mb-3 inline-flex items-center gap-1.5">
              <Globe2 className="size-3.5" aria-hidden /> OpenDoorsClass
            </Badge>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              {en ? "Leaderboards" : "Classements"}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {en
                ? "Official rankings of candidates who completed the OpenDoorsClass English Level Test, by overall score and by skill."
                : "Classements officiels des candidats ayant passé le Level Test d'anglais OpenDoorsClass, par score global et par compétence."}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Tabs value={category} onValueChange={(v) => setCategory(v as LeaderboardCategory)}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
              {LEADERBOARD_CATEGORIES.map((c) => (
                <TabsTrigger key={c} value={c} className="rounded-lg text-xs sm:text-sm">
                  {en ? CATEGORY_LABELS[c].en : CATEGORY_LABELS[c].fr}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label={en ? "Region filter" : "Filtre par région"}
              className="flex flex-wrap gap-1.5"
            >
              {scopes.map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  variant={scope === s.key ? "default" : "outline"}
                  aria-pressed={scope === s.key}
                  onClick={() => setScope(s.key)}
                  className="rounded-full"
                >
                  {s.label}
                </Button>
              ))}
            </div>
            <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
            <div
              role="group"
              aria-label={en ? "Period filter" : "Filtre par période"}
              className="flex flex-wrap gap-1.5"
            >
              {PERIODS.map((p) => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={period === p.key ? "secondary" : "ghost"}
                  aria-pressed={period === p.key}
                  onClick={() => setPeriod(p.key)}
                  className="rounded-full"
                >
                  {en ? p.en : p.fr}
                </Button>
              ))}
            </div>
          </div>

          <div
            aria-live="polite"
            aria-busy={isFetching}
            className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="hidden grid-cols-[3rem_auto_1fr_5rem_6rem_5rem] gap-4 border-b border-border bg-muted/40 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
              <span className="text-center">#</span>
              <span className="w-[52px]" />
              <span>{en ? "Candidate" : "Candidat"}</span>
              <span>{en ? "Level" : "Niveau"}</span>
              <span>{en ? "Last test" : "Dernier test"}</span>
              <span className="text-right">{en ? "Score" : "Score"}</span>
            </div>

            {isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <div className="h-4 w-8 animate-pulse rounded bg-muted" />
                    <div className="size-10 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-24 animate-pulse rounded bg-muted/70" />
                    </div>
                    <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                {en ? "The leaderboard is temporarily unavailable." : "Le classement est momentanément indisponible."}
              </p>
            ) : entries.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <Trophy className="mx-auto size-10 text-muted-foreground/60" aria-hidden />
                <p className="mt-4 text-sm text-muted-foreground">
                  {en
                    ? "No result for this selection yet."
                    : "Aucun résultat pour cette sélection pour le moment."}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.ul
                  key={`${category}-${scope}-${period}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="divide-y divide-border"
                >
                  {entries.map((e, i) => (
                    <EntryRow key={e.user_id} entry={e} index={i} en={en} />
                  ))}
                </motion.ul>
              </AnimatePresence>
            )}
          </div>

          {entries.length >= limit && limit < 100 ? (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" className="rounded-xl" onClick={() => setLimit((l) => Math.min(100, l + 25))}>
                {en ? "Load more" : "Voir plus"}
              </Button>
            </div>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}