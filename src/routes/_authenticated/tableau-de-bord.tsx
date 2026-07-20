import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Award, ClipboardList, UserCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyProfile } from "@/lib/payments.functions";
import { getTestHistory } from "@/lib/test.functions";
import { useT, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  component: DashboardPage,
});

function DashboardPage() {
  const t = useT();
  const { locale } = useI18n();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchHistory = useServerFn(getTestHistory);
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const { data: history } = useQuery({ queryKey: ["test-history"], queryFn: () => fetchHistory() });
  const credits = profile?.credits_remaining ?? 0;
  const hasCredits = credits > 0;

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