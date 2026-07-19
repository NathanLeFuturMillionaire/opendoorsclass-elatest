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
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Le tableau de bord complet arrive dans la prochaine itération.
          </p>
          <Button asChild className="mt-4 bg-brand-gradient text-primary-foreground">
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}