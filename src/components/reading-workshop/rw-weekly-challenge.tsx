import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Flag, History, Loader2, Plane, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RwAvatar } from "@/components/reading-workshop/rw-shell";
import { getRwWeeklyChallenge } from "@/lib/reading-workshop.functions";
import {
  compareRwWeeklyChallengeEntries,
  rwWeeklyChallengeMessage,
  rwWeeklyChallengePlaneOffset,
  type RwWeeklyChallengeEntry,
} from "@/lib/rw-weekly-challenge";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Africa/Libreville",
});

function rankLabel(rank: number): string {
  return rank === 1 ? "1er" : `${rank}e`;
}

function ChallengeLane({ entry, index }: { entry: RwWeeklyChallengeEntry; index: number }) {
  const offset = rwWeeklyChallengePlaneOffset(entry.progress);
  const planeTone = entry.rank === 1
    ? "bg-primary text-primary-foreground"
    : entry.rank === 2
      ? "bg-secondary text-secondary-foreground"
      : "bg-accent text-accent-foreground";

  return (
    <div
      role="listitem"
      aria-label={`${rankLabel(entry.rank)} : ${entry.first_name}, ${entry.progress} %, ${entry.validated_count} lectures validées`}
      className="animate-fade-up relative h-24"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="absolute bottom-0 left-14 right-14 top-0 sm:left-20 sm:right-20">
        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-primary/20" />
        <div
          className="absolute top-1/2 w-28 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-1000 ease-out sm:w-36"
          style={{ left: `${offset}%` }}
        >
          <div className="rw-challenge-plane-float" style={{ animationDelay: `${index * 240}ms` }}>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <RwAvatar name={entry.first_name} url={entry.photo_url} size={34} />
                <span className="absolute -left-1 -top-1 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-extrabold text-background ring-2 ring-card">
                  {entry.rank}
                </span>
              </div>
              <p className="flex-1 text-center text-[11px] font-bold text-primary">{entry.progress} %</p>
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full shadow-sm sm:size-9", planeTone)}>
                <Plane className="size-4 rotate-90 sm:size-5" aria-hidden />
              </span>
            </div>
            <p className="mt-1 truncate text-center text-xs font-extrabold sm:text-sm">{entry.first_name}</p>
            <p className="text-center text-[10px] font-medium text-muted-foreground">
              {rankLabel(entry.rank)} · {entry.validated_count} lecture{entry.validated_count > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyTrack() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/25 bg-[var(--rw-soft)] px-5 py-8 text-center">
      <div className="absolute left-14 right-14 top-1/2 border-t-2 border-dashed border-primary/20 sm:left-20 sm:right-20" />
      <div className="relative mx-auto flex size-12 items-center justify-center rounded-full bg-card text-primary shadow-sm">
        <Plane className="size-5 rotate-90" aria-hidden />
      </div>
      <p className="relative mt-3 text-sm font-semibold">La piste est libre pour le moment.</p>
      <p className="relative mt-1 text-xs text-muted-foreground">Aucun lecteur n'a encore dépassé 2 % sur cette période.</p>
    </div>
  );
}

export function RwWeeklyChallenge() {
  const [weekOffset, setWeekOffset] = useState<0 | 1>(0);
  const fetchChallenge = useServerFn(getRwWeeklyChallenge);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["rw-weekly-challenge", weekOffset],
    queryFn: () => fetchChallenge({ data: { weekOffset } }),
    staleTime: 30_000,
    refetchInterval: weekOffset === 0 ? 60_000 : false,
    refetchOnWindowFocus: true,
  });

  const leaders = data ? [...data.top].sort(compareRwWeeklyChallengeEntries) : [];
  const period = data
    ? `${dateFormatter.format(new Date(data.start_at))} au ${dateFormatter.format(new Date(new Date(data.end_at).getTime() - 60_000))}`
    : "";

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--rw-shadow)]" aria-labelledby="weekly-reading-challenge-title">
      <div className="relative overflow-hidden border-b border-border bg-[var(--rw-soft)] p-5 sm:p-6">
        <div aria-hidden className="absolute -right-10 -top-16 size-44 rounded-full border-[28px] border-primary/5" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
              <Trophy className="size-4" aria-hidden /> Weekly Reading Challenge
            </p>
            <h2 id="weekly-reading-challenge-title" className="mt-2 text-xl font-extrabold sm:text-2xl">La course des lecteurs</h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Six lectures validées pour atteindre 100 %. Chaque texte compte une seule fois.</p>
          </div>
          <div className="flex rounded-xl border border-border bg-card p-1 shadow-sm" aria-label="Période du classement">
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              aria-pressed={weekOffset === 0}
              className={cn("rounded-lg px-3 py-2 text-xs font-bold transition-colors", weekOffset === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Cette semaine
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(1)}
              aria-pressed={weekOffset === 1}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors", weekOffset === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <History className="size-3.5" aria-hidden /> Précédente
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center" aria-label="Chargement du classement">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : error || !data ? (
          <div className="py-10 text-center">
            <p className="font-semibold">Le classement n'a pas pu être chargé.</p>
            <p className="mt-1 text-sm text-muted-foreground">Tes lectures et tes résultats ne sont pas affectés.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
              <RefreshCw className="mr-1.5 size-4" /> Réessayer
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-semibold"><CalendarDays className="size-4 text-primary" aria-hidden /> {period}</span>
              <span className="flex items-center gap-1.5">
                {isFetching && <Loader2 className="size-3 animate-spin" aria-label="Mise à jour" />}
                {data.is_history ? "Semaine clôturée" : "Fin dimanche à 23 h 59, Libreville"}
              </span>
            </div>

            {leaders.length ? (
              <div className="relative mt-3" role="list" aria-label="Trois meilleurs lecteurs de la semaine">
                <div className="pointer-events-none absolute bottom-2 right-14 top-0 border-r-2 border-dashed border-primary/45 sm:right-20" aria-hidden />
                <div className="pointer-events-none absolute -top-1 right-10 flex flex-col items-center text-primary sm:right-16" aria-hidden>
                  <Flag className="size-5 fill-current" />
                  <span className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider">Arrivée</span>
                </div>
                {leaders.map((entry, index) => <ChallengeLane key={entry.learner_id} entry={entry} index={index} />)}
              </div>
            ) : <div className="mt-4"><EmptyTrack /></div>}

            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-[var(--rw-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">{rwWeeklyChallengeMessage(data)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ta progression : {data.own.progress} % · {data.own.validated_count} lecture{data.own.validated_count > 1 ? "s" : ""} validée{data.own.validated_count > 1 ? "s" : ""}
                </p>
              </div>
              {!data.is_history && (
                <Button asChild size="sm" className="shrink-0">
                  <Link to="/reading-workshop/library">Continuer mes lectures <ArrowRight className="ml-1.5 size-4" /></Link>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
