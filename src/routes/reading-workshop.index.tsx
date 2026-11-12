import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { RW_DAYS, RW_LEVELS, RW_OBJECTIVES, RW_PROGRAM } from "@/lib/reading-workshop";

const TITLE = "Reading Workshop, apprendre l'anglais par la lecture | OpenDoorsClass";
const DESC = "Programme de 20 semaines pour progresser en anglais par la lecture, l'écoute et la prononciation, du niveau A1 au niveau C1, avec un coach.";

export const Route = createFileRoute("/reading-workshop/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReadingWorkshopPage,
});

const INTRO = [
  "L'OpenDoorsClass Reading Workshop est un programme d'apprentissage de l'anglais conçu pour accompagner les apprenants dans le développement progressif de leurs compétences linguistiques.",
  "À travers une sélection de textes pédagogiques, de discours historiques, de biographies, de récits inspirants et de documents portant sur des sujets de société, les participants auront l'occasion de développer leur compréhension de l'anglais tout en enrichissant leurs connaissances générales.",
  "Chaque lecture devient une occasion d'apprendre de nouveaux mots, de découvrir des idées, de comprendre des événements, d'améliorer sa prononciation et de développer sa capacité à s'exprimer en anglais.",
  "Le programme accueille les apprenants de différents niveaux, du débutant au niveau avancé, grâce à des contenus spécialement adaptés à leur maîtrise de la langue.",
  "Notre ambition est de faire de la lecture un véritable outil d'apprentissage, de découverte et d'ouverture sur le monde.",
];

function ReadingWorkshopPage() {
  return (
    <div className="rw-theme min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-[var(--rw-soft)]">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-1.5 text-xs font-semibold tracking-widest text-primary shadow-sm">
            <BookOpen className="size-4" aria-hidden /> READ · UNDERSTAND · LISTEN · SPEAK · DISCOVER
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Welcome to OpenDoorsClass <span className="text-primary">Reading Workshop</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Develop your English through reading, listening, comprehension and meaningful learning.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg"><Link to="/reading-workshop/login">Access Reading Workshop</Link></Button>
            <Button asChild size="lg" variant="outline"><a href="#programme">Learn about the program</a></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-base leading-relaxed text-foreground/90 sm:px-6">
        {INTRO.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-bold">Cinq niveaux</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {RW_LEVELS.map((l) => (
            <div key={l.code} className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
              <p className="text-3xl font-extrabold text-primary">{l.code}</p>
              <p className="mt-1 font-semibold">{l.label}</p>
              <p className="text-sm text-muted-foreground">{l.fr}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[var(--rw-soft)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold">Objectifs du programme</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RW_OBJECTIVES.map((o) => (
              <li key={o} className="flex items-start gap-2 rounded-2xl bg-background p-4 shadow-sm">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span className="font-medium">{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="programme" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold">Le programme en 20 semaines</h2>
        <p className="mt-2 text-muted-foreground">Six séances par semaine, du lundi au samedi. Chaque séance existe dans les cinq niveaux.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RW_PROGRAM.map((w) => (
            <details key={w.week} className="group rounded-2xl border border-border bg-card p-4 shadow-sm">
              <summary className="cursor-pointer list-none">
                <span className="text-xs font-semibold text-primary">Week {String(w.week).padStart(2, "0")}</span>
                <span className="block font-semibold">{w.title}</span>
              </summary>
              <ol className="mt-3 space-y-1 text-sm text-muted-foreground">
                {w.sessions.map((s, i) => <li key={s}><span className="font-medium text-foreground">{RW_DAYS[i]} :</span> {s}</li>)}
              </ol>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild size="lg"><Link to="/reading-workshop/login">Access Reading Workshop</Link></Button>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
