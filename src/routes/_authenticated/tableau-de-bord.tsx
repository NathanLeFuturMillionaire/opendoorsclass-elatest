import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Award, ClipboardList, UserCircle2, Lock, Clock, CheckCircle2, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyProfile, getTestAccessStatus } from "@/lib/payments.functions";
import { getTestHistory } from "@/lib/test.functions";
import { getMyGamification } from "@/lib/gamification.functions";
import { LevelProgressCard } from "@/components/gamification/level-progress-card";
import { StreakStrip } from "@/components/gamification/streak-strip";
import { BadgeGrid } from "@/components/gamification/badge-grid";
import { WeeklyChallengesCard } from "@/components/gamification/weekly-challenges-card";
import { Trophy, Flame, Sparkles } from "lucide-react";
import { useT, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  component: DashboardPage,
});

function DashboardPage() {
  const t = useT();
  const { locale } = useI18n();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchHistory = useServerFn(getTestHistory);
  const fetchAccess = useServerFn(getTestAccessStatus);
  const fetchGam = useServerFn(getMyGamification);
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const { data: history } = useQuery({ queryKey: ["test-history"], queryFn: () => fetchHistory() });
  const { data: gam } = useQuery({ queryKey: ["my-gamification"], queryFn: () => fetchGam() });
  const { data: access } = useQuery({
    queryKey: ["test-access"],
    queryFn: () => fetchAccess(),
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 5000 : false),
  });
  const credits = profile?.credits_remaining ?? 0;
  const status = access?.status ?? (credits > 0 ? "unlocked" : "locked");
  const hasCredits = status === "unlocked";
  const unlockedBadges = (gam?.badges ?? []).filter((b) => b.unlocked_at);
  const previewBadges = (gam?.badges ?? []).slice(0, 8);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="animate-fade-up flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("dash.title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("dash.desc")}</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/profil">
              <UserCircle2 className="mr-2 size-4" />
              {t("dash.profile")}
            </Link>
          </Button>
        </div>

        <div className="mt-6 animate-scale-in rounded-3xl border border-border bg-brand-blue-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("dash.credits")}</p>
              <p className="mt-1 text-4xl font-extrabold text-brand-gradient">{credits}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("dash.credits.hint")}</p>
            </div>
            <Button asChild className="bg-brand-gradient text-primary-foreground transition-transform hover:scale-[1.02]">
              <Link to="/achat-credits">{hasCredits ? t("dash.recharge") : t("dash.buy")}</Link>
            </Button>
          </div>
        </div>

        <AccessStatusCard status={status} />

        {gam ? (
          <section className="mt-8 space-y-4 animate-fade-up">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">
                {t("gam.journey.title")}
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <LevelProgressCard xp={gam.total_xp ?? 0} />
              </div>
              <StreakStrip
                current={gam.current_streak ?? 0}
                longest={gam.longest_streak ?? 0}
                lastActivity={gam.last_activity_date}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatMini icon={Sparkles} label={t("gam.stat.xp")} value={(gam.total_xp ?? 0).toLocaleString()} />
              <StatMini icon={Trophy} label={t("gam.stat.badges")} value={`${unlockedBadges.length} / ${gam.badges.length}`} />
              <StatMini icon={Flame} label={t("gam.stat.streak")} value={String(gam.current_streak ?? 0)} />
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">{t("gam.badges.recent")}</p>
                <Link to="/accomplissements" className="text-xs font-semibold text-primary hover:underline">
                  {t("gam.view.all")} <ArrowRight className="ml-1 inline size-3.5" />
                </Link>
              </div>
              <BadgeGrid badges={previewBadges} compact />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">{t("gam.challenges.title")}</p>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">V1</span>
              </div>
              <WeeklyChallengesCard />
            </div>
          </section>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="animate-fade-up rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">{t("dash.take.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("dash.take.desc")}</p>
            {hasCredits ? (
              <Button asChild className="mt-4 bg-brand-gradient text-primary-foreground transition-transform hover:scale-[1.02]">
                <Link to="/test">{t("dash.start")}</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="mt-4">
                <Link to="/achat-credits">{t("dash.buy.one")}</Link>
              </Button>
            )}
          </div>
          <div className="animate-fade-up rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Award className="size-5 text-primary" />
              <h2 className="text-lg font-semibold">{t("dash.best")}</h2>
            </div>
            <p className="mt-2 text-3xl font-black text-brand-gradient">
              {bestLevel(history) ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("dash.best.hint").replace("{n}", String(history?.filter((h) => h.completed_at).length ?? 0))}
            </p>
          </div>
        </div>

        <section className="mt-10 animate-fade-up">
          <div className="mb-4 flex items-center gap-2">
            <Award className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">
              {locale === "en" ? "My assessments" : "Mes évaluations"}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AssessmentBlock language="en" history={history} locale={locale} />
            <AssessmentBlock language="es" history={history} locale={locale} />
          </div>
        </section>

        <section className="mt-10 animate-fade-up">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">{t("dash.history")}</h2>
          </div>
          {!history || history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {t("dash.history.empty")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">{t("dash.col.date")}</th>
                    <th className="px-4 py-3 text-left">
                      {locale === "en" ? "Assessment" : "Évaluation"}
                    </th>
                    <th className="px-4 py-3 text-left">{t("dash.col.status")}</th>
                    <th className="px-4 py-3 text-left">{t("dash.col.level")}</th>
                    <th className="px-4 py-3 text-left">{t("dash.col.score")}</th>
                    <th className="px-4 py-3 text-right">{t("dash.col.cert")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s.id} className="border-t border-border/60">
                      <td className="px-4 py-3">
                        {new Date(s.started_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {s.language === "es" ? "🇪🇸 Spanish" : "🇬🇧 English"}
                      </td>
                      <td className="px-4 py-3">
                        {s.completed_at ? (
                          <Badge className="bg-brand-gradient text-primary-foreground">{t("dash.status.done")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("dash.status.progress")}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">{s.level_result ?? "—"}</td>
                      <td className="px-4 py-3">{s.score != null ? `${s.score}%` : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {s.completed_at ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/resultat/$id" params={{ id: s.id }}>
                              {t("dash.view")} <ArrowRight className="ml-1 size-3.5" />
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
function bestLevel(history: { level_result: string | null }[] | undefined) {
  if (!history) return null;
  let best: string | null = null;
  for (const s of history) {
    if (!s.level_result) continue;
    if (!best || LEVEL_ORDER.indexOf(s.level_result) > LEVEL_ORDER.indexOf(best)) {
      best = s.level_result;
    }
  }
  return best;
}

function AccessStatusCard({ status }: { status: "unlocked" | "pending" | "failed" | "locked" }) {
  return _AccessStatusCard({ status });
}

function StatMini({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function _AccessStatusCard({ status }: { status: "unlocked" | "pending" | "failed" | "locked" }) {
  const config = {
    unlocked: {
      icon: CheckCircle2,
      label: "Test débloqué",
      desc: "Votre paiement est confirmé. Vous pouvez démarrer votre Level Test dès maintenant.",
      cls: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
      cta: { to: "/test", label: "Démarrer mon test" },
    },
    pending: {
      icon: Clock,
      label: "Paiement en cours de confirmation",
      desc: "Votre paiement est en cours de traitement. Vos crédits seront attribués automatiquement dès la confirmation.",
      cls: "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400",
      cta: null,
    },
    failed: {
      icon: XCircle,
      label: "Paiement non confirmé",
      desc: "Votre dernier paiement n'a pas été confirmé. Vous pouvez réessayer ou contacter le support.",
      cls: "border-destructive/40 bg-destructive/5 text-destructive",
      cta: { to: "/achat-credits", label: "Réessayer" },
    },
    locked: {
      icon: Lock,
      label: "Test verrouillé",
      desc: "Effectuez le paiement pour débloquer votre Level Test. L'accès est activé automatiquement dès confirmation.",
      cls: "border-border bg-muted/40 text-foreground",
      cta: { to: "/achat-credits", label: "Débloquer mon test" },
    },
  }[status];
  const Icon = config.icon;
  return (
    <div className={`mt-6 rounded-3xl border p-5 animate-fade-up ${config.cls}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide">Accès au Level Test</p>
            <p className="mt-1 text-base font-semibold text-foreground">{config.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{config.desc}</p>
          </div>
        </div>
        {config.cta ? (
          <Button asChild className="bg-brand-gradient text-primary-foreground">
            <Link to={config.cta.to}>{config.cta.label}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}