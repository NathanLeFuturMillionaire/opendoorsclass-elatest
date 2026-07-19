import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileDown,
  Headphones,
  MessageCircle,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import founderPhoto from "@/assets/founder-nathan.jpg.asset.json";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const STEPS = [
  {
    icon: Sparkles,
    title: "Créez votre compte",
    text: "Inscription en 30 secondes, avec Google ou par e-mail.",
  },
  {
    icon: BookOpen,
    title: "Passez le test CECRL",
    text: "Environ 30 minutes, difficulté croissante de A1 à C2, grammaire, vocabulaire, compréhension écrite et orale.",
  },
  {
    icon: Trophy,
    title: "Recevez votre niveau",
    text: "Résultat visuel immédiat, attestation PDF, recommandations personnalisées.",
  },
];

const BENEFITS = [
  {
    icon: Target,
    title: "Standard CECRL reconnu",
    text: "Une évaluation alignée sur les six niveaux internationaux, de A1 (débutant) à C2 (maîtrise).",
  },
  {
    icon: Clock,
    title: "Rapide et précis",
    text: "Environ 30 minutes pour une vision claire de votre niveau réel en anglais.",
  },
  {
    icon: Headphones,
    title: "Compréhension orale incluse",
    text: "Des audios authentiques, jusqu'à 5 écoutes par question, casque recommandé.",
  },
  {
    icon: FileDown,
    title: "Attestation officielle",
    text: "Une attestation PDF à télécharger, à partager avec votre école ou votre employeur.",
  },
];

const TESTIMONIALS = [
  {
    name: "Marina O.",
    level: "B2",
    quote:
      "Le test est vraiment bien pensé, la partie audio est authentique. J'ai eu mon niveau exact et un plan pour progresser.",
  },
  {
    name: "Steeve M.",
    level: "A2",
    quote:
      "Simple, clair, en français. J'ai enfin compris où je me situais et par où commencer avec Nathan.",
  },
  {
    name: "Grace N.",
    level: "C1",
    quote:
      "L'attestation m'a permis de rassurer mon recruteur. La plateforme est fluide, même sur mon téléphone.",
  },
];

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
            <div className="absolute -top-24 left-1/2 h-96 w-[110%] -translate-x-1/2 rounded-full bg-brand-blue-soft blur-3xl" />
            <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-brand-green-soft blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-brand-yellow-soft blur-3xl" />
          </div>
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2 md:items-center md:py-24">
            <div>
              <Badge variant="secondary" className="mb-4">
                Nouveau, plateforme officielle OpenDoorsClass
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                Découvrez votre <span className="text-brand-gradient">niveau d'anglais</span> en 30 minutes.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Un test complet, aligné sur le CECRL (A1 à C2), conçu par le professeur Nathan Harysthote pour les apprenants d'Afrique francophone.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-brand-gradient text-primary-foreground shadow-md">
                  <Link to="/auth">Commencer le test maintenant</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#comment">Comment ça marche</a>
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-brand-green" /> Résultat immédiat
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-brand-green" /> Attestation PDF
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-brand-green" /> Adapté mobile
                </li>
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-4 rounded-3xl bg-brand-gradient opacity-20 blur-2xl" />
              <Card className="relative overflow-hidden border-border/60 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Aperçu du test</span>
                    <span className="rounded-full bg-brand-yellow-soft px-2 py-0.5 text-xs font-semibold text-brand-yellow-foreground">
                      Question 12 / 30
                    </span>
                  </div>
                  <p className="mt-4 text-base font-semibold">
                    Choose the correct sentence:
                  </p>
                  <div className="mt-4 space-y-2">
                    {[
                      "She don't like tea.",
                      "She doesn't likes tea.",
                      "She doesn't like tea.",
                      "She not like tea.",
                    ].map((choice, i) => (
                      <div
                        key={choice}
                        className={
                          "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm " +
                          (i === 2
                            ? "border-brand-green bg-brand-green-soft"
                            : "border-border bg-muted/30")
                        }
                      >
                        <span className="grid size-6 place-items-center rounded-full border border-border bg-background text-xs font-semibold">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-foreground">{choice}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> 24:12 restantes
                    </span>
                    <span>Niveau ciblé, B1</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="comment" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-3">Comment ça marche</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">Trois étapes, un niveau clair.</h2>
            <p className="mt-3 text-muted-foreground">
              Un parcours simple, pensé pour être fait sur téléphone ou sur ordinateur.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Card key={s.title} className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-blue-soft text-brand-blue">
                      <s.icon className="size-5" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Étape {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pourquoi nous */}
        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-3">Pourquoi OpenDoorsClass</Badge>
              <h2 className="text-3xl font-bold sm:text-4xl">Un test conçu pour vous, ici.</h2>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b) => (
                <div key={b.title} className="rounded-2xl bg-card p-6 shadow-sm">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-green-soft text-brand-green">
                    <b.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{b.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Témoignages */}
        <section id="temoignages" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-3">Témoignages</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">Ils ont passé le test.</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border-border/60">
                <CardContent className="p-6">
                  <p className="text-sm text-foreground">« {t.quote} »</p>
                  <div className="mt-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">Niveau obtenu, {t.level}</p>
                    </div>
                    <span className="rounded-full bg-brand-blue text-brand-blue-foreground px-3 py-1 text-xs font-semibold">
                      {t.level}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Fondateur */}
        <section id="fondateur" className="border-t border-border bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-5 md:items-center">
            <div className="md:col-span-2">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl border border-border shadow-xl">
                <img
                  src={founderPhoto.url}
                  alt="MAYUKWA Nathan Harysthote, fondateur d'OpenDoorsClass"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <Badge variant="outline" className="mb-3">Le fondateur</Badge>
              <h2 className="text-3xl font-bold sm:text-4xl">
                MAYUKWA Nathan Harysthote,
                <span className="block text-brand-gradient">professeur d'anglais passionné.</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Formateur au Gabon, Nathan accompagne depuis plusieurs années des élèves, étudiants et professionnels vers un anglais utile, celui qui ouvre les portes de l'école, du travail et du voyage.
              </p>
              <p className="mt-3 text-muted-foreground">
                OpenDoorsClass est né d'un constat simple, chaque apprenant mérite d'abord de connaître son vrai niveau avant de choisir un parcours. Ce test est la première étape de ce voyage.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-brand-gradient text-primary-foreground">
                  <Link to="/auth">Passer le test</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a
                    href="https://wa.me/24174825725?text=Bonjour%20Nathan%2C%20je%20souhaite%20des%20informations%20sur%20les%20formations%20OpenDoorsClass."
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 size-4" /> Contacter sur WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 text-center text-primary-foreground shadow-2xl sm:p-14">
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Prêt à connaître votre vrai niveau d'anglais ?
            </h2>
            <p className="mt-3 text-primary-foreground/90">
              Créez votre compte, passez le test, recevez votre attestation.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" variant="secondary" className="shadow-lg">
                <Link to="/auth">Commencer maintenant</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
