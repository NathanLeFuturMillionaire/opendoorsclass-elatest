import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { getMyProfile } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  component: DashboardPage,
});

function DashboardPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const credits = profile?.credits_remaining ?? 0;
  const hasCredits = credits > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold tracking-tight">Mon espace</h1>
          <p className="mt-2 text-muted-foreground">
            Retrouvez ici vos tests, vos crédits et vos résultats.
          </p>
        </div>

        <div className="mt-6 animate-scale-in rounded-3xl border border-border bg-brand-blue-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Crédits disponibles</p>
              <p className="mt-1 text-4xl font-extrabold text-brand-gradient">{credits}</p>
              <p className="mt-1 text-xs text-muted-foreground">1 crédit = 1 test complet.</p>
            </div>
            <Button asChild className="bg-brand-gradient text-primary-foreground transition-transform hover:scale-[1.02]">
              <Link to="/achat-credits">{hasCredits ? "Recharger" : "Acheter des crédits"}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="animate-fade-up rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Passer le test de niveau</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              30 minutes, questions CECRL de A1 à C2, avec une section de compréhension orale.
            </p>
            {hasCredits ? (
              <Button asChild className="mt-4 bg-brand-gradient text-primary-foreground transition-transform hover:scale-[1.02]">
                <Link to="/test">Commencer le test</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="mt-4">
                <Link to="/achat-credits">Acheter un crédit pour commencer</Link>
              </Button>
            )}
          </div>
          <div className="animate-fade-up rounded-2xl border border-dashed border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Historique</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              L'historique de vos sessions arrive dans la prochaine itération.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}