import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { TEST_LANGUAGES, type TestLanguageCode } from "@/lib/test-languages";
import type { ReactNode } from "react";

/**
 * Lets the visitor pick the language they want to be ASSESSED in.
 * Independent from the site interface language switcher.
 */
export function TestLanguagesSection() {
  const t = useT();

  return (
    <section
      id="langues"
      aria-labelledby="test-languages-title"
      className="border-t border-border/60 bg-secondary/30"
    >
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <Badge variant="outline" className="mb-3">
            {t("testlang.badge")}
          </Badge>
          <h2 id="test-languages-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("testlang.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("testlang.desc")}</p>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {TEST_LANGUAGES.map((lang, i) => (
            <motion.div
              key={lang.code}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
            >
              <Card className="group h-full overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-1 hover:border-brand-green/50 hover:shadow-xl focus-within:-translate-y-1 focus-within:shadow-xl">
                <CardContent className="flex h-full flex-col p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="grid size-12 shrink-0 place-items-center rounded-2xl border border-border/60 bg-background text-2xl shadow-sm"
                      role="img"
                      aria-label={lang.label}
                    >
                      {lang.flag}
                    </span>
                    {lang.isNew ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-soft px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-brand-green">
                        <Sparkles className="size-3" aria-hidden="true" />
                        {t("testlang.new")}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-5 text-xl font-bold tracking-tight">{t(lang.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(lang.descKey)}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3 pt-1">
                    {lang.status === "available" ? (
                      <Button
                        asChild
                        className="rounded-xl bg-brand-gradient text-primary-foreground shadow-md transition-transform duration-300 group-hover:translate-x-0.5"
                      >
                        <TestLanguageLink code={lang.code}>
                          {t(lang.ctaKey)}
                          <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
                        </TestLanguageLink>
                      </Button>
                    ) : (
                      <>
                        <Button asChild variant="outline" className="rounded-xl">
                          <TestLanguageLink code={lang.code}>
                            {t(lang.ctaKey)}
                            <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
                          </TestLanguageLink>
                        </Button>
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("testlang.soon")}
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Routes each assessed language to its own entry point. */
function TestLanguageLink({
  code,
  children,
}: {
  code: TestLanguageCode;
  children: ReactNode;
}) {
  if (code === "es") return <Link to="/spanish-test">{children}</Link>;
  return (
    <Link to="/leveltest/$lang" params={{ lang: code }}>
      {children}
    </Link>
  );
}
