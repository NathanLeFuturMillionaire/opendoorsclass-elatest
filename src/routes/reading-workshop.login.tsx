import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { getRwContext } from "@/lib/reading-workshop.functions";
import { NOINDEX } from "@/lib/seo";

export const Route = createFileRoute("/reading-workshop/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion au Reading Workshop, OpenDoorsClass" },
      NOINDEX,
      { name: "description", content: "Connectez-vous pour accéder à votre espace Reading Workshop OpenDoorsClass." },
      { property: "og:title", content: "Connexion au Reading Workshop, OpenDoorsClass" },
      { property: "og:description", content: "Accédez à votre espace de lecture, apprenant, coach ou administrateur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RwLogin,
});

const DEST = {
  admin: "/reading-workshop/admin",
  coach: "/reading-workshop/coach",
  learner: "/reading-workshop/learner",
} as const;

function RwLogin() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const fetchCtx = useServerFn(getRwContext);
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    fetchCtx().then((ctx) => {
      if (ctx.home === "none") setNoAccess(true);
      else navigate({ to: DEST[ctx.home], replace: true });
    }).catch(() => setNoAccess(true));
  }, [user, loading, fetchCtx, navigate]);

  return (
    <div className="rw-theme min-h-screen bg-[var(--rw-soft)]">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold">Reading Workshop</h1>
          {loading || (user && !noAccess) ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-primary" aria-label="Chargement" /></div>
          ) : !user ? (
            <>
              <p className="mt-2 text-muted-foreground">Connectez-vous avec votre compte OpenDoorsClass pour ouvrir votre espace.</p>
              <Button asChild size="lg" className="mt-6 w-full">
                <Link to="/auth" search={{ redirect: "/reading-workshop/login" }}>Se connecter</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-muted-foreground">
                Votre compte n'est pas encore inscrit au Reading Workshop. Contactez OpenDoorsClass pour activer votre accès.
              </p>
              <Button asChild variant="outline" className="mt-6 w-full"><Link to="/reading-workshop">Découvrir le programme</Link></Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
