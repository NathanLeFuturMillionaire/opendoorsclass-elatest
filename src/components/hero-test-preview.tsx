import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import type { TestLanguageCode } from "@/lib/test-languages";

type PreviewItem = {
  code: TestLanguageCode;
  flag: string;
  tabKey: string;
  questionKey: string;
  levelKey: string;
  choices: string[];
  correct: number;
};

const PREVIEWS: PreviewItem[] = [
  {
    code: "en",
    flag: "🇬🇧",
    tabKey: "hero.preview.tab.en",
    questionKey: "hero.preview.q",
    levelKey: "hero.preview.level",
    choices: [
      "She don't like tea.",
      "She doesn't likes tea.",
      "She doesn't like tea.",
      "She not like tea.",
    ],
    correct: 2,
  },
  {
    code: "es",
    flag: "🇪🇸",
    tabKey: "hero.preview.tab.es",
    questionKey: "hero.preview.es.q",
    levelKey: "hero.preview.es.level",
    choices: [
      "Ella no gusta el té.",
      "A ella no le gusta el té.",
      "Ella no le gustan el té.",
      "A ella no gusta el té.",
    ],
    correct: 1,
  },
];

/** Interactive hero card: preview of an English and a Spanish test question. */
export function HeroTestPreview() {
  const t = useT();
  const [active, setActive] = useState<TestLanguageCode>("en");
  const item = PREVIEWS.find((p) => p.code === active) ?? PREVIEWS[0];

  return (
    <Card className="relative overflow-hidden border-border/60 shadow-xl">
      <CardContent className="p-6">
        <div
          role="tablist"
          aria-label={t("hero.preview.step")}
          className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1"
        >
          {PREVIEWS.map((p) => (
            <button
              key={p.code}
              type="button"
              role="tab"
              aria-selected={active === p.code}
              onClick={() => setActive(p.code)}
              className={
                "relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors " +
                (active === p.code ? "text-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              {active === p.code ? (
                <motion.span
                  layoutId="hero-preview-tab"
                  className="absolute inset-0 rounded-lg bg-background shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ) : null}
              <span className="relative inline-flex items-center gap-1.5">
                <span aria-hidden="true">{p.flag}</span>
                {t(p.tabKey)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("hero.preview.step")}</span>
          <span className="rounded-full bg-brand-yellow-soft px-2 py-0.5 text-xs font-semibold text-brand-yellow-foreground">
            {t("hero.preview.count")}
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={item.code}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <p className="mt-4 text-base font-semibold">{t(item.questionKey)}</p>
            <div className="mt-4 space-y-2">
              {item.choices.map((choice, i) => (
                <div
                  key={choice}
                  className={
                    "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm " +
                    (i === item.correct
                      ? "border-brand-green bg-brand-green-soft"
                      : "border-border bg-muted/30")
                  }
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-background text-xs font-semibold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-foreground">{choice}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> {t("hero.preview.remaining")}
              </span>
              <span>{t(item.levelKey)}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
