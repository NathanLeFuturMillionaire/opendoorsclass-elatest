import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Award, Loader2, MessageCircle, Printer, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getSessionResult } from "@/lib/test.functions";

export const Route = createFileRoute("/_authenticated/resultat/$id")({
  component: ResultPage,
});

const LEVEL_TITLE: Record<string, string> = {
  A1: "Débutant",
  A2: "Élémentaire",
  B1: "Intermédiaire",
  B2: "Intermédiaire avancé",
  C1: "Autonome",
  C2: "Maîtrise",
};

function ResultPage() {
  const { id } = Route.useParams();
  const fetchResult = useServerFn(getSessionResult);
  const [state, setState] = useState<{
    loading: boolean;
    data: Awaited<ReturnType<typeof getSessionResult>> | null;
    error: string | null;
  }>({ loading: true, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetchResult({ data: { sessionId: id } })
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({
            loading: false,
            data: null,
            error: e instanceof Error ? e.message : "Erreur",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [id, fetchResult]);

  const r = state.data;
  const verifId = r ? r.sessionId.slice(0, 8).toUpperCase() : "";
  const dateStr = r?.completedAt
    ? new Date(r.completedAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";
  const fullName = r ? `${r.candidateFirstName} ${r.candidateLastName}`.trim() || "Candidat" : "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        {state.loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement de votre résultat...</p>
          </div>
        ) : state.error || !r ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            {state.error ?? "Résultat introuvable."}
          </CardContent></Card>
        ) : (
          <div className="space-y-6 animate-fade-up">
            {/* Certificate preview */}
            <div
              id="certificate"
              className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-card shadow-xl print:rounded-none print:border-0 print:shadow-none"
            >
              <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
                <div className="absolute -top-24 -left-24 size-96 rounded-full bg-brand-gradient blur-3xl" />
                <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-brand-gradient blur-3xl" />
              </div>

              <div className="relative p-8 sm:p-12">
                <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-gradient text-primary-foreground shadow">
                      <span className="text-base font-black">O</span>
                    </span>
                    <div>
                      <div className="font-bold tracking-tight">OpenDoorsClass</div>
                      <div className="text-xs text-muted-foreground">Institut de langues, Gabon</div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>Attestation N° <span className="font-mono font-semibold text-foreground">ODC-{verifId}</span></div>
                    <div>Délivrée le {dateStr}</div>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                    <ShieldCheck className="size-3.5" /> Attestation officielle de niveau
                  </div>
                  <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
                    Test de niveau d'anglais, référentiel CECRL
                  </h1>
                  <p className="mt-4 text-sm text-muted-foreground">
                    La présente atteste que
                  </p>
                  <p className="mt-3 font-serif text-3xl font-bold sm:text-4xl">{fullName}</p>
                  {r.candidateEmail ? (
                    <p className="mt-1 text-xs text-muted-foreground">{r.candidateEmail}</p>
                  ) : null}
                  <p className="mt-6 text-sm text-muted-foreground">
                    a passé avec succès le test de positionnement et atteint le niveau
                  </p>

                  <div className="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl bg-brand-gradient px-10 py-6 text-primary-foreground shadow-lg">
                    <Award className="size-8 opacity-90" />
                    <div className="mt-2 text-6xl font-black leading-none tracking-tight">
                      {r.levelResult}
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-widest opacity-90">
                      {LEVEL_TITLE[r.levelResult] ?? ""}
                    </div>
                    <div className="mt-3 text-sm font-medium opacity-95">
                      Score global : {r.score}%
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {Object.entries(r.perCategory).map(([cat, s]) => (
                    <div key={cat} className="rounded-xl border border-border/60 bg-background/60 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{labelCategory(cat)}</span>
                        <Badge variant="secondary">{s.correct} / {s.total}</Badge>
                      </div>
                      <Progress className="mt-2" value={s.percent} />
                      <div className="mt-1 text-right text-xs text-muted-foreground">{s.percent}%</div>
                    </div>
                  ))}
                </div>

                {r.recommendation ? (
                  <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed text-foreground">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
                      Recommandation pédagogique
                    </div>
                    {r.recommendation}
                  </div>
                ) : null}

                <div className="mt-10 flex flex-col items-start justify-between gap-6 border-t border-border/60 pt-6 sm:flex-row sm:items-end">
                  <div className="text-xs text-muted-foreground">
                    <div>Document généré automatiquement.</div>
                    <div>
                      Vérification : code <span className="font-mono font-semibold text-foreground">ODC-{verifId}</span>
                    </div>
                    <div>WhatsApp : +241 74 82 57 25</div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-lg italic text-foreground">Nathan H. Mayukwa</div>
                    <div className="mt-1 h-px w-40 bg-border" />
                    <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                      Fondateur, OpenDoorsClass
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 size-4" />
                Imprimer ou enregistrer en PDF
              </Button>
              <Button asChild variant="outline">
                <Link to="/tableau-de-bord">Retour à mon espace</Link>
              </Button>
              <Button asChild className="bg-brand-gradient text-primary-foreground">
                <a href="https://wa.me/24174825725" target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 size-4" />
                  Discuter avec un conseiller
                </a>
              </Button>
            </div>
          </div>
        )}
      </main>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}

function labelCategory(cat: string) {
  switch (cat) {
    case "grammar": return "Grammaire";
    case "vocabulary": return "Vocabulaire";
    case "reading": return "Compréhension écrite";
    case "listening": return "Compréhension orale";
    default: return cat;
  }
}