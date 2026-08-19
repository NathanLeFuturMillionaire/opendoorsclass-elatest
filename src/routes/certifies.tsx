import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { socialMeta, canonicalLink, breadcrumbLd } from "@/lib/seo";

export const Route = createFileRoute("/certifies")({
  component: CertifiedPage,
  head: () => ({
    meta: socialMeta({
      title: "Candidats certifiés | OpenDoorsClass",
      description:
        "Découvrez les candidats qui ont passé le test de niveau OpenDoorsClass et obtenu leur attestation officielle alignée sur le CECRL.",
      path: "/certifies",
    }),
    links: canonicalLink("/certifies"),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbLd([
            { name: "OpenDoorsClass", path: "/" },
            { name: "Candidats certifiés", path: "/certifies" },
          ]),
        ),
      },
    ],
  }),
});

function CertifiedPage() {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("cert.page.title")}</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">{t("cert.page.soon")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-brand-gradient text-primary-foreground">
            <Link to="/auth">{t("hero.cta.start")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/">{t("nav.home")}</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
