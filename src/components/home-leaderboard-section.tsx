import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getPublicHomeLeaderboard,
  type PublicLeaderboardEntry,
} from "@/lib/gamification.functions";
import { useI18n } from "@/lib/i18n";

const COUNTRY_FLAGS: Record<string, string> = {
  GA: "🇬🇦", FR: "🇫🇷", CD: "🇨🇩", CG: "🇨🇬", CI: "🇨🇮", CM: "🇨🇲",
  SN: "🇸🇳", BJ: "🇧🇯", TG: "🇹🇬", ML: "🇲🇱", BF: "🇧🇫", NE: "🇳🇪",
  MA: "🇲🇦", TN: "🇹🇳", DZ: "🇩🇿", EG: "🇪🇬", NG: "🇳🇬", GH: "🇬🇭",
  KE: "🇰🇪", ZA: "🇿🇦", US: "🇺🇸", CA: "🇨🇦", GB: "🇬🇧", BE: "🇧🇪",
  CH: "🇨🇭", DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", PT: "🇵🇹",
};

function flagFor(country: string | null): string {
  if (!country) return "🌍";
  const c = country.trim();
  if (c.length === 2 && COUNTRY_FLAGS[c.toUpperCase()]) return COUNTRY_FLAGS[c.toUpperCase()];
  const key = c.slice(0, 2).toUpperCase();
  return COUNTRY_FLAGS[key] ?? "🌍";
}

function MedalIcon({ rank }: { rank: number }) {
  const emoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  return <span aria-hidden className="text-2xl leading-none">{emoji}</span>;
}

function Avatar({ entry, size = 64 }: { entry: PublicLeaderboardEntry; size?: number }) {
  const cls = "rounded-full object-cover ring-2 ring-background shadow-md";
  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt={entry.display_name}
        loading="lazy"
        className={cls}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={`grid place-items-center bg-brand-blue-soft font-bold text-brand-blue ${cls}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {entry.initials}
    </div>
  );
}

function PodiumCard({
  entry,
  highlight,
  delay,
}: {
  entry: PublicLeaderboardEntry;
  highlight?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay }}
      className={highlight ? "sm:-mt-6" : ""}
    >
      <Card
        className={`relative overflow-hidden border-border/60 transition-all hover:-translate-y-1 hover:shadow-xl ${
          highlight ? "border-amber-400/60 shadow-lg" : ""
        }`}
      >
        <CardContent className="flex flex-col items-center p-6 text-center">
          <MedalIcon rank={entry.rank} />
          <div className="mt-3">
            <Avatar entry={entry} size={highlight ? 88 : 72} />
          </div>
          <p className="mt-3 text-base font-semibold">{entry.display_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span aria-hidden>{flagFor(entry.country)}</span> {entry.country ?? ""}
          </p>
          <div className="mt-4 flex items-center gap-2">
            {entry.cefr_level ? (
              <span className="rounded-full bg-brand-blue text-brand-blue-foreground px-2.5 py-0.5 text-xs font-semibold">
                {entry.cefr_level}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-300">
              <Sparkles className="size-3" aria-hidden />
              {entry.total_xp.toLocaleString()} XP
            </span>
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            #{entry.rank}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RowItem({ entry, delay }: { entry: PublicLeaderboardEntry; delay: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.35, delay }}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
    >
      <span className="w-8 shrink-0 text-sm font-bold text-muted-foreground">#{entry.rank}</span>
      <Avatar entry={entry} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{entry.display_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          <span aria-hidden>{flagFor(entry.country)}</span> {entry.country ?? ""}
        </p>
      </div>
      {entry.cefr_level ? (
        <span className="hidden sm:inline-flex rounded-full bg-brand-blue text-brand-blue-foreground px-2.5 py-0.5 text-xs font-semibold">
          {entry.cefr_level}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-300">
        <Sparkles className="size-3" aria-hidden />
        {entry.total_xp.toLocaleString()}
      </span>
    </motion.li>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-4 w-8 rounded bg-muted" />
      <div className="size-10 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-2.5 w-20 rounded bg-muted/70" />
      </div>
      <div className="h-5 w-16 rounded-full bg-muted" />
    </div>
  );
}

export function HomeLeaderboardSection() {
  const { locale } = useI18n();
  const fetchLb = useServerFn(getPublicHomeLeaderboard);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["home-public-leaderboard"],
    queryFn: () => fetchLb(),
    staleTime: 60_000,
  });

  const en = locale === "en";
  const title = en
    ? "Who's Leading the OpenDoorsClass Journey?"
    : "Qui mène le parcours OpenDoorsClass ?";
  const subtitle = en
    ? "Discover the learners who have already taken the test and see how they are progressing."
    : "Découvrez les candidats qui ont déjà passé le test et suivez leur progression.";
  const badgeTxt = en ? "Community leaderboard" : "Classement communautaire";
  const ctaLead = en ? "Ready to discover your level?" : "Prêt à découvrir votre niveau ?";
  const ctaBtn = en ? "Take the Level Test" : "Passer le Level Test";
  const microcopy = en
    ? "Your journey starts with one test. Your progress starts with one step."
    : "Votre parcours commence par un test. Votre progression commence par un pas.";
  const emptyTxt = en
    ? "Be the first to join the OpenDoorsClass journey."
    : "Soyez le premier à rejoindre le parcours OpenDoorsClass.";
  const errorTxt = en
    ? "The leaderboard is temporarily unavailable."
    : "Le classement est momentanément indisponible.";

  const entries = data ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const [first, second, third] = top3;

  return (
    <section id="classement" className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-3 inline-flex items-center gap-1.5">
            <Trophy className="size-3.5" aria-hidden /> {badgeTxt}
          </Badge>
          <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
          <p className="mt-3 text-muted-foreground">{subtitle}</p>
        </div>

        {isLoading ? (
          <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={i === 0 ? "" : "border-t border-border/60"}>
                <SkeletonRow />
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">{errorTxt}</p>
        ) : entries.length === 0 ? (
          <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <Trophy className="mx-auto size-10 text-muted-foreground/60" aria-hidden />
            <p className="mt-4 text-base font-medium">{emptyTxt}</p>
            <Button asChild size="lg" className="mt-6 bg-brand-gradient text-primary-foreground">
              <Link to="/auth">{ctaBtn}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:items-end">
              {second ? <PodiumCard entry={second} delay={0.05} /> : <div className="hidden sm:block" />}
              {first ? <PodiumCard entry={first} highlight delay={0} /> : <div className="hidden sm:block" />}
              {third ? <PodiumCard entry={third} delay={0.1} /> : <div className="hidden sm:block" />}
            </div>

            {rest.length > 0 ? (
              <ul className="mx-auto mt-8 max-w-3xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {rest.map((e, i) => (
                  <RowItem key={e.rank} entry={e} delay={0.05 + i * 0.04} />
                ))}
              </ul>
            ) : null}

            <p className="mt-8 text-center text-sm italic text-muted-foreground">{microcopy}</p>

            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-base font-medium">{ctaLead}</p>
              <Button asChild size="lg" className="bg-brand-gradient text-primary-foreground shadow-md">
                <Link to="/auth">{ctaBtn}</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}