import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { socialMeta, canonicalLink, SITE_URL } from "@/lib/seo";
import { ProductShowcase } from "@/components/home/product-showcase";
import { PlatformStatsSection, WorldSection, ReadingStatsSection } from "@/components/home/stats-sections";
import { ServicesShowcase } from "@/components/home/services-showcase";
import { ReadingDemo } from "@/components/home/reading-demo";
import { ApproachSection } from "@/components/home/approach-section";
import { WhySection } from "@/components/home/why-section";
import { RwReviewsSection } from "@/components/home/rw-reviews-section";
import { CommunityGlobeSection } from "@/components/home/community-globe-section";
import { Reveal } from "@/components/home/reveal";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: socialMeta({
      title: "OpenDoorsClass | Plateforme EdTech pour progresser en anglais",
      description:
        "OpenDoorsClass développe des solutions numériques pour évaluer son niveau d'anglais et progresser : English Level Assessment et Reading Workshop.",
      path: "/",
    }),
    links: canonicalLink("/"),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: "OpenDoorsClass",
          url: SITE_URL,
          address: { "@type": "PostalAddress", addressLocality: "Libreville", addressCountry: "GA" },
        }),
      },
    ],
  }),
});

function HomePage() {
  const reduce = useReducedMotion();
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-40 left-1/2 h-[32rem] w-[120%] -translate-x-1/2 rounded-full bg-brand-green-soft blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:28px_28px] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          </div>
          <div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-green">Open Doors Class</p>
              <h1 className="mt-4 text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
                Ouvrez les portes d'un <span className="text-brand-green">nouvel apprentissage</span> des langues.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                OpenDoorsClass développe des solutions numériques pour aider chacun à évaluer son niveau, améliorer ses compétences linguistiques et progresser grâce à des expériences d'apprentissage interactives.
              </p>
              <p className="mt-3 max-w-xl text-muted-foreground">Nous voulons rendre l'apprentissage des langues plus accessible, plus structuré et plus efficace.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-brand-green text-brand-green-foreground shadow-lg hover:bg-brand-green/90">
                  <a href="#services">Découvrir nos services <ArrowRight className="ml-1 size-4" /></a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth">Créer mon compte</Link>
                </Button>
              </div>
            </motion.div>
            <motion.div initial={reduce ? false : { opacity: 0, y: 30, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}>
              <ProductShowcase />
            </motion.div>
          </div>
        </section>

        <PlatformStatsSection />
        <WorldSection />
        <ServicesShowcase />
        <ReadingStatsSection />
        <CommunityGlobeSection />
        <RwReviewsSection />
        <ReadingDemo />
        <ApproachSection />
        <WhySection />

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-brand-green p-10 text-center text-brand-green-foreground shadow-2xl sm:p-16">
              <div className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full bg-background/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -right-10 size-72 rounded-full bg-foreground/10 blur-2xl" />
              <h2 className="relative text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Prêt à ouvrir de nouvelles portes grâce à l'anglais ?</h2>
              <p className="relative mx-auto mt-4 max-w-2xl opacity-90">Que vous souhaitiez connaître votre niveau ou améliorer vos compétences en anglais, OpenDoorsClass met à votre disposition des solutions conçues pour vous accompagner.</p>
              <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" variant="secondary"><Link to="/leveltest/$lang" params={{ lang: "en" }}>Évaluer mon niveau</Link></Button>
                <Button asChild size="lg" variant="secondary"><Link to="/reading-workshop">Découvrir nos ateliers</Link></Button>
                <Button asChild size="lg" variant="outline" className="border-brand-green-foreground/60 bg-transparent text-brand-green-foreground hover:bg-brand-green-foreground/10 hover:text-brand-green-foreground"><Link to="/auth">Créer mon compte</Link></Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
