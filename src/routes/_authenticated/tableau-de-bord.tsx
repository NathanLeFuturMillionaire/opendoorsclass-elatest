import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Mon espace</h1>
        <p className="mt-2 text-muted-foreground">
          Retrouvez ici vos tests, vos crédits et vos résultats.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Passer le test de niveau</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              30 minutes, questions CECRL de A1 à C2, avec une section de compréhension orale.
            </p>
            <Button asChild className="mt-4 bg-brand-gradient text-primary-foreground">
              <Link to="/test">Commencer le test</Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-card p-6">
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