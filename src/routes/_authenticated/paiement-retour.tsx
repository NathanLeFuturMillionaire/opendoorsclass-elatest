import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { checkPaymentStatus } from "@/lib/payments.functions";

const searchSchema = z.object({
  payment_id: z.string().uuid().optional(),
  paymentId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/paiement-retour")({
  validateSearch: (s) => searchSchema.parse(s),
  component: PaymentReturnPage,
});

type Status = "checking" | "success" | "pending" | "failed" | "cancelled" | "unknown";

function PaymentReturnPage() {
  const search = Route.useSearch();
  const paymentId = search.payment_id ?? search.paymentId;
  const check = useServerFn(checkPaymentStatus);
  const [status, setStatus] = useState<Status>("checking");
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    if (!paymentId) {
      setStatus("unknown");
      return;
    }
    let cancelled = false;
    // Objectif : confirmation en 3s max. Chaque appel `checkPaymentStatus` interroge le PSP,
    // le premier passage confirme quasi systématiquement les paiements réussis.
    const delays = [0, 600, 1200, 1800];
    let idx = 0;
    const poll = async () => {
      try {
        const result = await check({ data: { paymentId } });
        if (cancelled) return;
        if (result.status === "success") {
          setStatus("success");
          setCredits(result.credits);
          return;
        }
        if (result.status === "failed" || result.status === "cancelled") {
          setStatus(result.status);
          return;
        }
        idx += 1;
        if (idx < delays.length) {
          setTimeout(poll, delays[idx]);
        } else {
          setStatus("pending");
        }
      } catch {
        if (!cancelled) setStatus("unknown");
      }
    };
    setTimeout(poll, delays[0]);
    return () => {
      cancelled = true;
    };
  }, [paymentId, check]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <div className="animate-scale-in rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          {status === "checking" && (
            <>
              <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
              <h1 className="mt-6 text-2xl font-bold">Vérification de votre paiement</h1>
              <p className="mt-2 text-muted-foreground">
                Nous confirmons votre transaction. Cela prend quelques secondes.
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-2xl text-brand-green-foreground">
                ✓
              </div>
              <h1 className="mt-6 text-2xl font-bold">Paiement confirmé</h1>
              <p className="mt-2 text-muted-foreground">
                {credits} crédits viennent d'être ajoutés à votre compte.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button asChild className="bg-brand-gradient text-primary-foreground">
                  <Link to="/test">Commencer un test</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/tableau-de-bord">Retour au tableau de bord</Link>
                </Button>
              </div>
            </>
          )}
          {status === "pending" && (
            <>
              <h1 className="text-2xl font-bold">Paiement en cours de traitement</h1>
              <p className="mt-2 text-muted-foreground">
                La confirmation prend un peu plus de temps que prévu. Vos crédits seront ajoutés automatiquement dès la validation, actualisez cette page dans un instant.
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link to="/tableau-de-bord">Retour au tableau de bord</Link>
              </Button>
            </>
          )}
          {(status === "failed" || status === "cancelled") && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-2xl text-destructive-foreground">
                !
              </div>
              <h1 className="mt-6 text-2xl font-bold">Paiement non abouti</h1>
              <p className="mt-2 text-muted-foreground">
                La transaction a été {status === "cancelled" ? "annulée" : "refusée"}. Vous pouvez réessayer sans frais.
              </p>
              <Button asChild className="mt-6 bg-brand-gradient text-primary-foreground">
                <Link to="/achat-credits">Réessayer le paiement</Link>
              </Button>
            </>
          )}
          {status === "unknown" && (
            <>
              <h1 className="text-2xl font-bold">Statut indisponible</h1>
              <p className="mt-2 text-muted-foreground">
                Nous n'avons pas retrouvé ce paiement. Contactez-nous sur WhatsApp si des crédits manquent.
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link to="/tableau-de-bord">Retour au tableau de bord</Link>
              </Button>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}