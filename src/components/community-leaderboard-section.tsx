import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowRight, Award, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { flagFor, LeaderAvatar, medalFor } from "@/components/leaderboard/shared";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/leaderboards.functions";
import { useI18n } from "@/lib/i18n";
import { FounderBadge } from "@/components/founder-badge";

function Row({ entry, delay, en }: { entry: LeaderboardEntry; delay: number; en: boolean }) {
  const medal = medalFor(entry.rank);
  const isFirst = entry.rank === 1;
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay }}
    >
      <Link
        to="/profile/$id"
        params={{ id: entry.user_id }}
        aria-label={`${entry.display_name}, ${en ? "rank" : "rang"} ${entry.rank}`}
        className={
          "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:px-5 " +
          (isFirst
            ? "bg-gradient-to-r from-amber-400/15 via-amber-300/5 to-transparent"
            : medal
              ? "bg-muted/25"
              : "")
        }
      >
        <span className="flex w-8 shrink-0 justify-center text-sm font-bold text-muted-foreground">
          {medal ? <span aria-hidden className="text-xl leading-none">{medal}</span> : `#${entry.rank}`}
        </span>
        <LeaderAvatar entry={entry} size={isFirst ? 52 : 42} />
        <div className="min-w-0 flex-1">
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
          </p>
        </div>
        {entry.cefr_level ? (
          <span className="hidden rounded-full bg-brand-blue px-2.5 py-0.5 text-xs font-semibold text-brand-blue-foreground sm:inline-flex">
            {entry.cefr_level}
          </span>
        ) : null}
        <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums sm:w-16">
          {entry.score}%
        </span>
      </Link>
    </motion.li>
  );
}

export function CommunityLeaderboardSection() {
  const { locale } = useI18n();
  const en = locale === "en";
  const fetchLb = useServerFn(getLeaderboard);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["community-leaderboard", "overall", "WW", "all"],
    queryFn: () => fetchLb({ data: { category: "overall", scope: "WW", period: "all", limit: 10 } }),
    staleTime: 5 * 60 * 1000,
  });

  const entries = data ?? [];

  return (
    <section id="classement" className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-3 inline-flex items-center gap-1.5">
            <Trophy className="size-3.5" aria-hidden />
            {en ? "Top learners" : "Meilleurs candidats"}
          </Badge>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            {en ? "Community Leaderboard" : "Classement de la communauté"}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {en
              ? "See how learners from across Africa and beyond are progressing through the OpenDoorsClass English Level Test."
              : "Découvrez la progression des candidats d'Afrique et d'ailleurs au Level Test d'anglais OpenDoorsClass."}
          </p>
        </div>

        {isLoading ? (
          <div className="mt-10 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="h-4 w-8 animate-pulse rounded bg-muted" />
                <div className="size-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-muted/70" />
                </div>
                <div className="h-4 w-10 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : isError || entries.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <Trophy className="mx-auto size-10 text-muted-foreground/60" aria-hidden />
            <p className="mt-4 text-base font-medium">
              {en
                ? "Be the first to appear on the leaderboard."
                : "Soyez le premier à figurer au classement."}
            </p>
          </div>
        ) : (
          <ul className="mt-10 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {entries.map((e, i) => (
              <Row key={e.user_id} entry={e} delay={0.04 * i} en={en} />
            ))}
          </ul>
        )}

        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" variant="outline" className="rounded-xl">
            <Link to="/leaderboards">
              {en ? "View Full Leaderboards" : "Voir tous les classements"}
              <ArrowRight className="ml-1.5 size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}