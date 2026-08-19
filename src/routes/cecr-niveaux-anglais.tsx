import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { socialMeta, canonicalLink, breadcrumbLd, canonical, SITE_NAME, SITE_URL } from "@/lib/seo";

const PATH = "/cecr-niveaux-anglais";
const TITLE = "Niveaux d'anglais CECRL : guide A1 à C2";
const DESCRIPTION =
  "Les niveaux d'anglais du CECRL de A1 à C2 : ce que vous savez faire à chaque niveau et comment tester votre niveau réel.";

export const Route = createFileRoute("/cecr-niveaux-anglais")({
  head: () => ({
    meta: socialMeta({ title: TITLE, description: DESCRIPTION, path: PATH, type: "article" }),
    links: canonicalLink(PATH),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          inLanguage: "fr",
          mainEntityOfPage: canonical(PATH),
          author: { "@type": "Person", name: "MAYUKWA Nathan Harysthote" },
          publisher: { "@type": "EducationalOrganization", name: SITE_NAME, url: SITE_URL },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbLd([
            { name: "OpenDoorsClass", path: "/" },
            { name: "Niveaux d'anglais CECRL", path: PATH },
          ]),
        ),
      },
    ],
  }),
  component: CefrGuidePage,
});

const LEVELS = [
  {
    code: "A1",
    label: "Découverte",
    hours: "60 à 100 heures d'apprentissage",
    summary:
      "Vous comprenez et utilisez des expressions familières et quotidiennes, ainsi que des énoncés très simples destinés à satisfaire des besoins concrets.",
    can: [
      "Vous présenter, dire où vous habitez, parler de vos proches.",
      "Poser des questions simples sur des sujets familiers, si votre interlocuteur parle lentement.",
      "Remplir un formulaire avec vos informations personnelles.",
    ],
  },
  {
    code: "A2",
    label: "Intermédiaire élémentaire",
    hours: "180 à 200 heures d'apprentissage",
    summary:
      "Vous communiquez lors de tâches simples et habituelles, ne demandant qu'un échange d'informations sur des sujets familiers.",
    can: [
      "Décrire votre formation, votre travail et votre environnement immédiat.",
      "Comprendre des annonces, des menus, des horaires et des messages courts.",
      "Échanger dans un magasin, une gare ou un hôtel.",
    ],
  },
  {
    code: "B1",
    label: "Seuil, utilisateur indépendant",
    hours: "350 à 400 heures d'apprentissage",
    summary:
      "Vous vous débrouillez dans la plupart des situations rencontrées en voyage et vous produisez un discours simple et cohérent.",
    can: [
      "Suivre une conversation courante sur le travail, les loisirs ou l'actualité.",
      "Raconter un événement, une expérience, expliquer un projet et justifier une opinion.",
      "Écrire un courriel professionnel simple et structuré.",
    ],
  },
  {
    code: "B2",
    label: "Avancé, utilisateur indépendant",
    hours: "500 à 600 heures d'apprentissage",
    summary:
      "Vous comprenez le contenu essentiel de sujets concrets ou abstraits et vous communiquez avec spontanéité et aisance.",
    can: [
      "Participer activement à une réunion de travail en anglais.",
      "Comprendre un article de presse, un rapport ou un documentaire.",
      "Défendre un point de vue argumenté, à l'oral comme à l'écrit.",
    ],
  },
  {
    code: "C1",
    label: "Autonome, utilisateur expérimenté",
    hours: "700 à 800 heures d'apprentissage",
    summary:
      "Vous vous exprimez couramment et de façon bien structurée sur des sujets complexes, sans chercher vos mots de manière apparente.",
    can: [
      "Comprendre des textes longs et exigeants, et saisir les significations implicites.",
      "Utiliser la langue avec efficacité dans la vie sociale, professionnelle ou académique.",
      "Rédiger des documents clairs, détaillés et bien organisés.",
    ],
  },
  {
    code: "C2",
    label: "Maîtrise, utilisateur expérimenté",
    hours: "1 000 heures et plus",
    summary:
      "Vous comprenez sans effort pratiquement tout ce que vous lisez ou entendez et vous restituez faits et arguments de façon cohérente.",
    can: [
      "Suivre une conférence spécialisée ou une négociation rapide.",
      "Nuancer finement votre propos, même dans des situations complexes.",
      "Écrire des textes de niveau professionnel ou académique.",
    ],
  },
];

function CefrGuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              OpenDoorsClass
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-foreground">Niveaux d'anglais CECRL</span>
          </nav>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Niveaux d'anglais CECRL : le guide complet de A1 à C2
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Le CECRL, Cadre européen commun de référence pour les langues, décrit six niveaux de
            maîtrise, de A1 à C2. C'est la référence utilisée par les écoles, les universités et les
            employeurs pour situer un niveau d'anglais de façon objective. Ce guide explique ce que
            vous savez faire à chaque niveau, le temps d'apprentissage habituellement observé, et
            comment mesurer votre niveau réel.
          </p>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">Les trois grandes catégories du CECRL</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                { t: "A, utilisateur élémentaire", d: "Niveaux A1 et A2 : communication simple sur des sujets familiers." },
                { t: "B, utilisateur indépendant", d: "Niveaux B1 et B2 : autonomie au travail, en voyage et dans les études." },
                { t: "C, utilisateur expérimenté", d: "Niveaux C1 et C2 : aisance, nuance et maîtrise des sujets complexes." },
              ].map((c) => (
                <Card key={c.t} className="border-border/60">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold">{c.t}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Détail des six niveaux d'anglais</h2>
            <div className="mt-6 space-y-6">
              {LEVELS.map((lv) => (
                <Card key={lv.code} className="border-border/60">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-brand-blue px-3 py-1 text-sm font-bold text-brand-blue-foreground">
                        {lv.code}
                      </span>
                      <h3 className="text-lg font-bold">{lv.label}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-foreground/90">{lv.summary}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Repère : {lv.hours}
                    </p>
                    <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                      {lv.can.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Quel niveau d'anglais viser ?</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Pour un usage touristique, le niveau A2 suffit généralement. Pour travailler dans une
              entreprise internationale, la plupart des recruteurs attendent un B2. Les universités
              anglophones demandent le plus souvent un B2 solide ou un C1. Les métiers de la
              traduction, de l'enseignement ou de la diplomatie visent le C1 et le C2.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Comment connaître votre niveau exact</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              L'auto-évaluation reste approximative : la plupart des apprenants se sous-estiment à
              l'écrit et se surestiment à l'oral. Le test de niveau OpenDoorsClass mesure vos sept
              compétences (grammaire, vocabulaire, lecture, écoute, expression écrite, expression
              orale, orthographe), convertit votre score en niveau CECRL et vous remet une
              attestation officielle avec votre numéro de candidat.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-brand-gradient text-primary-foreground">
                <Link to="/leveltest/$lang" params={{ lang: "en" }}>
                  Tester mon niveau d'anglais
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/formation-anglais-programme">Voir le programme de formation</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Vous apprenez aussi l'espagnol ?{" "}
              <Link to="/spanish-test" className="font-medium text-foreground underline">
                Découvrez le test de niveau d'espagnol
              </Link>
              .
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
