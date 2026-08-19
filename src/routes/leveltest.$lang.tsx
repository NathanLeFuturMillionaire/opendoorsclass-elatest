import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { CheckCircle2, Clock, MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { getTestLanguage, isTestLanguageCode } from "@/lib/test-languages";
import { socialMeta, canonicalLink, breadcrumbLd, courseLd } from "@/lib/seo";

export const Route = createFileRoute("/leveltest/$lang")({
  beforeLoad: ({ params }) => {
    if (params.lang === "es") throw redirect({ to: "/spanish-test" });
    if (!isTestLanguageCode(params.lang)) throw notFound();
  },
  head: ({ params }) => {
    const isEs = params.lang === "es";
    const title = isEs
      ? "Spanish Level Test | OpenDoorsClass"
      : "Test de niveau d'anglais en ligne CECRL | OpenDoorsClass";
    const description = isEs
      ? "Spanish proficiency assessment by OpenDoorsClass, structured on the CEFR scale from A1 to C2, with an official certificate."
      : "Passez le test de niveau d'anglais OpenDoorsClass, aligné sur le CECRL de A1 à C2 : grammaire, vocabulaire, lecture, écoute, écrit et oral, avec attestation officielle.";
    const path = `/leveltest/${params.lang}`;
    return {
      meta: socialMeta({ title, description, path }),
      links: canonicalLink(path),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            courseLd({
              name: isEs
                ? "OpenDoorsClass Spanish Assessment"
                : "OpenDoorsClass English Assessment",
              description,
              path,
              inLanguage: isEs ? "es" : "en",
            }),
          ),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbLd([
              { name: "OpenDoorsClass", path: "/" },
              { name: isEs ? "Spanish Assessment" : "English Assessment", path },
            ]),
          ),
        },
      ],
    };
  },
  notFoundComponent: LevelTestNotFound,
  component: LevelTestLanding,
});

function LevelTestNotFound() {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("testlang.unknown")}</h1>
        <Button asChild size="lg" className="mt-8 bg-brand-gradient text-primary-foreground">
          <Link to="/">{t("nav.home")}</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}

function LevelTestLanding() {
  const { lang } = Route.useParams();
  const t = useT();
  const language = getTestLanguage(lang)!;
  const available = language.status === "available";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
            <div className="absolute -top-24 left-1/2 h-80 w-[110%] -translate-x-1/2 rounded-full bg-brand-blue-soft blur-3xl" />
          </div>
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <span
              className="mx-auto mb-6 grid size-16 place-items-center rounded-3xl border border-border/60 bg-card text-3xl shadow-sm"
              role="img"
              aria-label={language.label}
            >
              {language.flag}
            </span>
            <Badge variant="outline" className="mb-4">
              {available ? t("testlang.badge.live") : t("testlang.soon")}
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t(language.titleKey)}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t(language.descKey)}</p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              {available ? (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="rounded-xl bg-brand-gradient px-7 text-primary-foreground shadow-lg transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    <Link to="/auth">{t("hero.cta.start")}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-xl px-7">
                    <a href="/#tarifs">{t("testlang.pricing")}</a>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" variant="outline" className="rounded-xl px-7">
                    <a
                      href="https://wa.me/24174825725?text=Bonjour%20Nathan%2C%20je%20souhaite%20etre%20informe%20du%20lancement%20du%20test%20d%27espagnol%20OpenDoorsClass."
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="mr-2 size-4" aria-hidden="true" />
                      {t("testlang.notify")}
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="ghost" className="rounded-xl px-7">
                    <Link to="/leveltest/$lang" params={{ lang: "en" }}>
                      {t("testlang.en.cta")}
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand-green" aria-hidden="true" />
                {t("hero.tag.instant")}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand-green" aria-hidden="true" />
                {t("hero.tag.pdf")}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-brand-green" aria-hidden="true" />
                {t("hero.tag.mobile")}
              </li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
