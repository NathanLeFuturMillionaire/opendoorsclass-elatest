import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Award, Loader2, MessageCircle } from "lucide-react";
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        {state.loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement de votre résultat...</p>
          </div>
        ) : state.error || !state.data ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            {state.error ?? "Résultat introuvable."}
          </CardContent></Card>
        ) : (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="bg-brand-gradient p-8 text-primary-foreground">
                <div className="flex items-center gap-3">
                  <Award className="size-8" />
                  <span className="text-sm font-medium uppercase tracking-wider opacity-90">
                    Votre niveau CECRL
                  </span>
                </div>
                <div className="mt-4 text-6xl font-black tracking-tight">
                  {state.data.levelResult}
                </div>
                <div className="mt-2 text-lg opacity-90">
                  Score global : {state.data.score}%
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-base leading-relaxed text-foreground">
                  {state.data.recommendation}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Détail par compétence</h2>
                {Object.entries(state.data.perCategory).map(([cat, s]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{labelCategory(cat)}</span>
                      <Badge variant="secondary">{s.correct} / {s.total}</Badge>
                    </div>
                    <Progress value={s.percent} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="outline">
                <Link to="/tableau-de-bord">Retour à mon espace</Link>
              </Button>
              <Button asChild className="bg-brand-gradient text-primary-foreground">
                <a
                  href="https://wa.me/24174825725"
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 size-4" />
                  Discuter avec un conseiller
                </a>
              </Button>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
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