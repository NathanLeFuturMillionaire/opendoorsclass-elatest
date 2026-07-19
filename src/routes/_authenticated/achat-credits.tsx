import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { getTestAccessPlan, createCheckout, getMyProfile } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/achat-credits")({
  component: BuyCreditsPage,
});

function formatFcfa(amount: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency}`;
}

function BuyCreditsPage() {
  const fetchPlan = useServerFn(getTestAccessPlan);
  const fetchProfile = useServerFn(getMyProfile);
  const startCheckout = useServerFn(createCheckout);
  const [loading, setLoading] = useState(false);

  const planQuery = useQuery({ queryKey: ["test-access-plan"], queryFn: () => fetchPlan() });
  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });

  const handleBuy = async () => {
    setLoading(true);
    try {
      const { checkoutUrl } = await startCheckout({ data: { origin: window.location.origin } });
      window.location.href = checkoutUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de démarrer le paiement.");
      setLoading(false);
    }
  };

  const plan = planQuery.data;
  const credits = profileQuery.data?.credits_remaining ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <div className="animate-fade-up">
          <p className="text-sm font-medium text-brand-green">Offre d'accès aux tests</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Recharger votre compte OpenDoorsClass
          </h1>
          <p className="mt-3 text-muted-foreground">
            Un crédit vaut un test complet de niveau CECRL. Vos crédits n'expirent pas.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="animate-scale-in rounded-3xl border border-border bg-card p-8 shadow-sm">
            {planQuery.isLoading || !plan ? (
              <div className="h-40 animate-shimmer rounded-2xl bg-muted" />
            ) : (
              <div>
                <div className="inline-flex items-center rounded-full bg-brand-yellow-soft px-3 py-1 text-xs font-semibold text-brand-yellow-foreground">
                  Recommandé
                </div>
                <h2 className="mt-4 text-2xl font-bold">
                  {plan.credits_included} tests de niveau
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Idéal pour un candidat, une famille ou un petit groupe.
                </p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-brand-gradient">
                    {formatFcfa(plan.price, plan.currency)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    soit {Math.round(plan.price / plan.credits_included).toLocaleString("fr-FR")} {plan.currency} par test
                  </span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-green">✓</span>
                    <span>Test complet: grammaire, vocabulaire, lecture, écoute.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-green">✓</span>
                    <span>Niveau CECRL de A1 à C2 avec détail par compétence.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-green">✓</span>
                    <span>Recommandations de formation adaptées à votre niveau.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-green">✓</span>
                    <span>Paiement sécurisé Moneroo: Mobile Money, cartes, virements.</span>
                  </li>
                </ul>
                <Button
                  size="lg"
                  disabled={loading}
                  onClick={handleBuy}
                  className="mt-8 w-full bg-brand-gradient text-primary-foreground transition-transform hover:scale-[1.01]"
                >
                  {loading ? "Redirection vers Moneroo..." : "Payer et recevoir mes crédits"}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Vous serez redirigé vers la page sécurisée de Moneroo.
                </p>
              </div>
            )}
          </div>

          <aside className="animate-fade-up rounded-3xl border border-dashed border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Crédits disponibles</p>
            <p className="mt-2 text-4xl font-bold">{credits}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Chaque test consomme 1 crédit au démarrage.
            </p>
            <div className="mt-6 space-y-2 text-sm">
              <Link to="/tableau-de-bord" className="block text-brand-blue underline-offset-4 hover:underline">
                Retour au tableau de bord
              </Link>
              {credits > 0 && (
                <Link to="/test" className="block text-brand-green underline-offset-4 hover:underline">
                  Passer un test maintenant
                </Link>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-brand-blue-soft p-6 text-sm text-brand-blue-foreground/90">
          <p className="font-semibold">Besoin d'une facture ou d'une offre équipe ?</p>
          <p className="mt-1">
            Écrivez-nous sur WhatsApp au +241 74 82 57 25, nous préparons une offre adaptée à votre structure.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}