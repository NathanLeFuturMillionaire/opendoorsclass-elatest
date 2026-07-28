import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Medal, Trophy } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { getGamificationLeaderboard } from "@/lib/gamification.functions";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/classement")({
  component: LeaderboardPage,
});

const SCOPES = [
  { key: "global", flag: "🌍" },
  { key: "africa", flag: "🌍" },
  { key: "GA", flag: "🇬🇦" },
  { key: "FR", flag: "🇫🇷" },
  { key: "CD", flag: "🇨🇩" },
  { key: "CI", flag: "🇨🇮" },
] as const;

function LeaderboardPage() {
  const t = useT();
  const [scope, setScope] = useState<(typeof SCOPES)[number]["key"]>("global");
  const fetchLb = useServerFn(getGamificationLeaderboard);
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", scope],
    queryFn: () => fetchLb({ data: { scope, limit: 25 } }),
  });
  const rows = data ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/tableau-de-bord"><ArrowLeft className="mr-1 size-4" /> {t("dash.title")}</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Trophy className="size-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{t("gam.leaderboard")}</h1>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                scope === s.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {s.flag} {s.key === "global" ? t("gam.scope.global") : s.key === "africa" ? t("gam.scope.africa") : s.key}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">…</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <Medal className="mx-auto size-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">{t("gam.lb.empty")}</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/accomplissements">{t("gam.opt_in.title")}</Link>
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">{t("gam.lb.rank")}</th>
                  <th className="px-4 py-3 text-left">{t("gam.lb.name")}</th>
                  <th className="px-4 py-3 text-left">{t("gam.lb.country")}</th>
                  <th className="px-4 py-3 text-left">{t("gam.lb.cefr")}</th>
                  <th className="px-4 py-3 text-right">{t("gam.lb.xp")}</th>
                  <th className="px-4 py-3 text-right">{t("gam.lb.level")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rank} className="border-t border-border/60">
                    <td className="px-4 py-3 font-bold">
                      {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`}
                    </td>
                    <td className="px-4 py-3">{r.display_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.country ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold">{r.cefr_level ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">{r.total_xp.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">Lv. {r.current_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}