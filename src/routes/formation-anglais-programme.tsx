import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Award, MessageCircle, Quote } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  COACH_WHATSAPP_URL,
  PROGRAM_CERTIFICATION,
  PROGRAM_MONTHS,
  PROGRAM_PILLARS,
  PROGRAM_SESSION_STRUCTURE,
  TRAINING_OFFER,
} from "@/lib/training-program";
import { socialMeta, canonicalLink, breadcrumbLd, courseLd } from "@/lib/seo";

const TITLE = "Formation anglais professionnel | OpenDoorsClass";
const DESC =
  "Le programme officiel OpenDoorsClass de Mr Nathan : progression du niveau A1 au niveau C2, méthode, séances et certification.";

export const Route = createFileRoute("/formation-anglais-programme")({
  component: ProgramPage,
  head: () => ({
    meta: socialMeta({
      title: TITLE,
      description: DESC,
      path: "/formation-anglais-programme",
      type: "article",
    }),
    links: canonicalLink("/formation-anglais-programme"),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          courseLd({
            name: "Formation Anglais Professionnel OpenDoorsClass",
            description: DESC,
            path: "/formation-anglais-programme",
            inLanguage: "fr",
          }),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbLd([
            { name: "OpenDoorsClass", path: "/" },
            { name: "Formation anglais professionnel", path: "/formation-anglais-programme" },
          ]),
        ),
      },
    ],
  }),
});

function CoachButton({ className }: { className?: string }) {
  return (
    <Button
      asChild
      size="lg"
      className={`rounded-xl bg-brand-gradient text-primary-foreground shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${className ?? ""}`}
    >
      <a href={COACH_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="mr-1.5 size-4" aria-hidden /> Contacter le coach
      </a>
    </Button>
  );
}

function ProgramPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
            <div className="absolute -top-24 left-1/2 h-80 w-[110%] -translate-x-1/2 rounded-full bg-brand-blue-soft blur-3xl" />
          </div>
          <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20">
            <Badge variant="outline" className="mb-4">Programme officiel, édition 2025 / 2026</Badge>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-5xl">
              Professional English Training
            </h1>
            <p className="mt-4 text-muted-foreground sm:text-lg">
              Du niveau A1 au niveau C2, conçu et rédigé par Mr Nathan, fondateur d'OpenDoorsClass,
              Libreville, Gabon.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
              {[
                `${TRAINING_OFFER.durationMonths} mois`,
                `${TRAINING_OFFER.sessionsPerWeek} séances par semaine`,
                `${TRAINING_OFFER.hoursPerSession} h par cours`,
                TRAINING_OFFER.format,
                `${TRAINING_OFFER.priceMonthly.toLocaleString("fr-FR")} ${TRAINING_OFFER.currency} / mois`,
              ].map((chip) => (
                <span key={chip} className="rounded-full border border-border/60 bg-card/70 px-3 py-1 font-medium backdrop-blur">
                  {chip}
                </span>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <CoachButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <Card className="border-border/60 bg-secondary/30">
            <CardContent className="p-6 sm:p-8">
              <Quote className="size-6 text-brand-green" aria-hidden />
              <p className="mt-3 text-base leading-relaxed text-foreground/90">
                « Ce programme n'est pas une simple feuille de route scolaire. Il est exigeant, il demande
                de la discipline. Mais si vous faites le travail, vous ne serez plus la même personne. »
              </p>
              <p className="mt-4 text-sm font-semibold">Mr Nathan, fondateur d'OpenDoorsClass</p>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Notre méthode</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {PROGRAM_PILLARS.map((p) => (
              <div key={p.n} className="rounded-2xl border border-border/60 bg-card p-5">
                <span className="text-xs font-bold text-brand-green">{p.n}</span>
                <p className="mt-1 font-semibold">{p.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-12 text-xl font-bold tracking-tight">Structure des séances</h3>
          <div className="mt-5 grid gap-3">
            {PROGRAM_SESSION_STRUCTURE.map((s) => (
              <div
                key={s.label}
                className="grid gap-1.5 rounded-xl border border-border/60 bg-card p-4 sm:grid-cols-[170px_1fr] sm:items-baseline sm:gap-4"
              >
                <span className="text-sm font-semibold uppercase tracking-wide text-brand-blue">{s.label}</span>
                <span className="text-sm text-muted-foreground">{s.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Le programme mois par mois</h2>
            <div className="mt-8 grid gap-6">
              {PROGRAM_MONTHS.map((m, i) => (
                <motion.article
                  key={m.index}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 4) * 0.05 }}
                  className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
                >
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-brand-blue-soft/40 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">{m.index}</p>
                      <h3 className="text-lg font-bold sm:text-xl">{m.title}</h3>
                    </div>
                    <span className="rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold text-brand-blue-foreground">
                      Niveau {m.level}
                    </span>
                  </header>
                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    {m.weeks.map((w) => (
                      <div key={w.title} className="min-w-0">
                        <p className="text-sm font-semibold">{w.title}</p>
                        <ul className="mt-2 space-y-1.5">
                          {w.items.map((it) => (
                            <li key={it} className="flex gap-2 text-sm text-muted-foreground">
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-green" aria-hidden />
                              <span className="min-w-0 break-words">{it}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <div className="flex items-center gap-2">
            <Award className="size-5 text-brand-yellow-foreground" aria-hidden />
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Le certificat OpenDoorsClass</h2>
          </div>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            À l'issue du programme, les étudiants qui ont satisfait aux exigences de validation reçoivent le
            certificat officiel OpenDoorsClass, attestant d'un niveau professionnel évalué sur 130 points.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {PROGRAM_CERTIFICATION.map((c) => (
              <div key={c.tier} className="rounded-2xl border border-border/60 bg-card p-5 text-center">
                <p className="text-lg font-extrabold">{c.tier}</p>
                <p className="mt-2 text-sm text-muted-foreground">{c.score}</p>
                <p className="mt-1 text-sm font-semibold text-brand-green">{c.result}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
          <div className="rounded-3xl bg-brand-gradient p-8 text-center text-primary-foreground shadow-xl sm:p-12">
            <h2 className="text-2xl font-extrabold sm:text-3xl">La porte est ouverte. La clé vous appartient.</h2>
            <p className="mt-3 text-primary-foreground/90">
              Discutez directement avec le coach pour construire votre parcours et convenir des modalités.
            </p>
            <div className="mt-7 flex justify-center">
              <Button asChild size="lg" variant="secondary" className="rounded-xl shadow-lg">
                <a href={COACH_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-1.5 size-4" aria-hidden /> Contacter le coach
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}