import { createFileRoute, Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Candidate profile | OpenDoorsClass" },
      {
        name: "description",
        content: "Public candidate profile on the OpenDoorsClass English Level Test platform.",
      },
      { property: "og:title", content: "Candidate profile | OpenDoorsClass" },
      {
        property: "og:description",
        content: "Public candidate profile on the OpenDoorsClass English Level Test platform.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { locale } = useI18n();
  const en = locale === "en";
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <UserRound className="mx-auto size-12 text-muted-foreground/60" aria-hidden />
          <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">
            {en ? "Public profile coming soon" : "Profil public bientôt disponible"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {en
              ? "Candidate public profiles are being prepared. In the meantime, explore the leaderboards."
              : "Les profils publics des candidats sont en préparation. En attendant, explorez les classements."}
          </p>
          <Button asChild className="mt-8 rounded-xl bg-brand-gradient text-primary-foreground">
            <Link to="/leaderboards">{en ? "Back to leaderboards" : "Retour aux classements"}</Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}