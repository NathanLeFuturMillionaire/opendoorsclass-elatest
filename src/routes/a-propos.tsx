import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FoundersSection } from "@/components/founders-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { ApproachSection } from "@/components/home/approach-section";
import { SeoAboutSection, seoFaqLd } from "@/components/seo-about-section";
import { socialMeta, canonicalLink } from "@/lib/seo";

export const Route = createFileRoute("/a-propos")({
  component: AboutPage,
  head: () => ({
    meta: socialMeta({
      title: "À propos d'OpenDoorsClass | Notre vision",
      description: "OpenDoorsClass, entreprise EdTech fondée au Gabon, développe des outils numériques pour évaluer et améliorer son anglais.",
      path: "/a-propos",
    }),
    links: canonicalLink("/a-propos"),
    scripts: [{ type: "application/ld+json", children: JSON.stringify(seoFaqLd("fr")) }],
  }),
});

function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-brand-green-soft/60 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">À propos</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Une entreprise EdTech née au Gabon</h1>
            <p className="mt-4 text-lg text-muted-foreground">Notre vision : rendre l'apprentissage des langues plus accessible, plus structuré et plus efficace, au Gabon et au delà, grâce à des outils numériques utiles et mesurables.</p>
          </div>
        </section>
        <ApproachSection />
        <FoundersSection />
        <TestimonialsSection />
        <SeoAboutSection />
      </main>
      <SiteFooter />
    </div>
  );
}
