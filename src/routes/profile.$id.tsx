import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Award,
  BarChart3,
  CalendarDays,
  Flame,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { flagFor } from "@/components/leaderboard/shared";
import { getPublicProfile, type PublicProfile } from "@/lib/public-profile.functions";
import { useI18n } from "@/lib/i18n";

const SKILL_LABELS: Record<string, { fr: string; en: string }> = {
  grammar: { fr: "Grammaire", en: "Grammar" },
  vocabulary: { fr: "Vocabulaire", en: "Vocabulary" },
  reading: { fr: "Compréhension écrite", en: "Reading" },
  listening: { fr: "Compréhension orale", en: "Listening" },
  writing: { fr: "Expression écrite", en: "Writing" },
  speaking: { fr: "Expression orale", en: "Speaking" },
  orthography: { fr: "Orthographe", en: "Orthography" },
};

export const Route = createFileRoute("/profile/$id")({
  loader: ({ params }) => getPublicProfile({ data: { id: params.id } }),
  head: ({ loaderData }) => {
    const p = loaderData as PublicProfile | null | undefined;
    const title = p ? `${p.displayName} | OpenDoorsClass` : "Candidate profile | OpenDoorsClass";
    const description = p
      ? `${p.displayName}${p.level ? `, CEFR ${p.level}` : ""} on the OpenDoorsClass English Level Test community.`
      : "Public candidate profile on the OpenDoorsClass English Level Test platform.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: () => <ProfileFallback />,
  notFoundComponent: () => <ProfileFallback />,
  component: PublicProfilePage,
});

function ProfileFallback() {
  const { locale } = useI18n();
  const en = locale === "en";
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <UserRound className="mx-auto size-12 text-muted-foreground/60" aria-hidden />
          <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">
            {en ? "Profile not found" : "Profil introuvable"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {en
              ? "This member profile does not exist or is no longer available."
              : "Ce profil de membre n'existe pas ou n'est plus disponible."}
          </p>
          <Button asChild className="mt-8 rounded-xl bg-brand-gradient text-primary-foreground">
            <Link to="/leaderboards">{en ? "Back to leaderboards" : "Retour aux classements"}</Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md">
      <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-brand-blue-soft text-brand-blue">
        {icon}
      </div>
      <p className="mt-2 text-xl font-extrabold tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function PublicProfilePage() {
  const profile = Route.useLoaderData() as PublicProfile | null;
  const { locale } = useI18n();
  const en = locale === "en";

  if (!profile) return <ProfileFallback />;

  const dateFmt = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(en ? "en-GB" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "-";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left"
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  loading="lazy"
                  className="size-24 rounded-full object-cover ring-4 ring-background shadow-md sm:size-28"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid size-24 place-items-center rounded-full bg-brand-blue-soft text-2xl font-bold text-brand-blue ring-4 ring-background sm:size-28"
                >
                  {profile.initials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {profile.displayName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span aria-hidden>{flagFor(profile.country)}</span>{" "}
                  {profile.country ?? (en ? "Worldwide" : "International")}
                  {profile.memberSince ? (
                    <span className="ml-2">
                      · {en ? "Member since" : "Membre depuis"} {dateFmt(profile.memberSince)}
                    </span>
                  ) : null}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {profile.level ? (
                    <Badge className="rounded-full bg-brand-blue text-brand-blue-foreground">
                      CEFR {profile.level}
                    </Badge>
                  ) : null}
                  {profile.rank ? (
                    <Badge variant="outline" className="rounded-full">
                      <Trophy className="mr-1 size-3" aria-hidden /> #{profile.rank}
                    </Badge>
                  ) : null}
                  {profile.candidateNumber ? (
                    <Badge variant="secondary" className="rounded-full font-mono text-[11px]">
                      {profile.candidateNumber}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat icon={<BarChart3 className="size-4" />} label={en ? "Tests" : "Tests"} value={profile.testsCompleted} />
            <Stat icon={<Trophy className="size-4" />} label={en ? "Best score" : "Meilleur score"} value={profile.bestScore !== null ? `${profile.bestScore}%` : "-"} />
            <Stat icon={<Sparkles className="size-4" />} label="XP" value={profile.totalXp} />
            <Stat icon={<Award className="size-4" />} label={en ? "Badges" : "Badges"} value={profile.badges.length} />
            <Stat icon={<Flame className="size-4" />} label={en ? "Streak" : "Série"} value={profile.currentStreak} />
            <Stat icon={<CalendarDays className="size-4" />} label={en ? "Level" : "Niveau"} value={profile.gamificationLevel} />
          </div>

          {profile.skills.length > 0 ? (
            <section>
              <h2 className="font-display text-xl font-bold">
                {en ? "Skill performance" : "Performances par compétence"}
              </h2>
              <div className="mt-4 grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2">
                {profile.skills.map((s) => (
                  <div key={s.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {SKILL_LABELS[s.category]
                          ? en
                            ? SKILL_LABELS[s.category].en
                            : SKILL_LABELS[s.category].fr
                          : s.category}
                      </span>
                      <span className="font-bold tabular-nums">{s.percent}%</span>
                    </div>
                    <Progress value={s.percent} className="mt-1.5 h-2" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {profile.badges.length > 0 ? (
            <section>
              <h2 className="font-display text-xl font-bold">{en ? "Achievements" : "Accomplissements"}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.badges.map((b) => (
                  <span
                    key={b.code}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm shadow-sm transition-transform hover:-translate-y-0.5"
                    title={dateFmt(b.unlocked_at)}
                  >
                    <Award className="size-3.5 text-amber-500" aria-hidden />
                    {en ? b.name_en : b.name_fr}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {profile.history.length > 0 ? (
            <section>
              <h2 className="font-display text-xl font-bold">{en ? "Recent activity" : "Activité récente"}</h2>
              <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {profile.history.map((h) => (
                  <li key={h.completed_at} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-muted-foreground">{dateFmt(h.completed_at)}</span>
                    <span className="flex items-center gap-3">
                      {h.level_result ? (
                        <span className="rounded-full bg-brand-blue-soft px-2 py-0.5 text-xs font-semibold text-brand-blue">
                          {h.level_result}
                        </span>
                      ) : null}
                      <span className="font-bold tabular-nums">{h.score !== null ? `${h.score}%` : "-"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {en
                ? "This member has not completed a level test yet."
                : "Ce membre n'a pas encore terminé de test de niveau."}
            </p>
          )}

          <div className="flex justify-center">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/leaderboards">{en ? "Explore the leaderboards" : "Explorer les classements"}</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
