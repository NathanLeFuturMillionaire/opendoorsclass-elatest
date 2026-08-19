import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getMyGamification, setLeaderboardOptIn } from "@/lib/gamification.functions";
import { LevelProgressCard } from "@/components/gamification/level-progress-card";
import { StreakStrip } from "@/components/gamification/streak-strip";
import { BadgeGrid } from "@/components/gamification/badge-grid";
import { XpActivityList } from "@/components/gamification/xp-activity-list";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { NOINDEX } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/accomplissements")({
  head: () => ({
    meta: [
      { title: "Mes accomplissements | OpenDoorsClass" },
      { name: "description", content: "Retrouvez vos badges, votre expérience et vos séries d'apprentissage OpenDoorsClass." },
      NOINDEX,
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const t = useT();
  const fetchGam = useServerFn(getMyGamification);
  const doOptIn = useServerFn(setLeaderboardOptIn);
  const qc = useQueryClient();
  const { data: gam } = useQuery({ queryKey: ["my-gamification"], queryFn: () => fetchGam() });
  const mut = useMutation({
    mutationFn: (v: boolean) => doOptIn({ data: { opt_in: v } }),
    onSuccess: () => {
      toast.success("OK");
      qc.invalidateQueries({ queryKey: ["my-gamification"] });
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/tableau-de-bord"><ArrowLeft className="mr-1 size-4" /> {t("dash.title")}</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Trophy className="size-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{t("gam.achievements")}</h1>
        </div>
        {!gam ? null : (
          <div className="mt-6 space-y-6 animate-fade-up">
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

            <div className="rounded-3xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold">{t("gam.badges.recent")}</h2>
              <BadgeGrid badges={gam.badges ?? []} />
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{t("gam.opt_in.title")}</h2>
                  <p className="text-sm text-muted-foreground">{t("gam.opt_in.desc")}</p>
                </div>
                <Switch
                  checked={!!gam.leaderboard_opt_in}
                  onCheckedChange={(v) => mut.mutate(v)}
                  aria-label={t("gam.opt_in.title")}
                />
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/classement">{t("gam.leaderboard")}</Link>
              </Button>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold">{t("gam.activity")}</h2>
              <XpActivityList transactions={gam.transactions ?? []} />
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}