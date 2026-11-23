import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ServicesShowcase } from "@/components/home/services-showcase";
import { TestLanguagesSection } from "@/components/test-languages-section";
import { HomePricingSection } from "@/components/home-pricing-section";
import { PaymentTutorialSection } from "@/components/payment-tutorial-section";
import { TrainingSection } from "@/components/training-section";
import { socialMeta, canonicalLink } from "@/lib/seo";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: socialMeta({
      title: "Nos services | OpenDoorsClass",
      description: "English Level Assessment, Reading Workshop, test d'espagnol et formation : découvrez les solutions OpenDoorsClass pour progresser en langues.",
      path: "/services",
    }),
    links: canonicalLink("/services"),
  }),
});

function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-brand-green-soft/60 py-16 text-center">
          <div className="mx-auto max-w-3xl px-4">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">Nos services</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Des solutions pensées pour faire progresser votre anglais.</h1>
            <p className="mt-4 text-muted-foreground">Chaque service possède son propre espace. Choisissez celui qui correspond à votre objectif.</p>
          </div>
        </section>
        <ServicesShowcase withHeading={false} />
        <TestLanguagesSection />
        <HomePricingSection />
        <PaymentTutorialSection />
        <TrainingSection />
      </main>
      <SiteFooter />
    </div>
  );
}
