import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";

export const DEMO_TEXT = "Every morning, Daniel reads a short story in English. He learns new words and practises their pronunciation.";
export const DEMO_OPTIONS = [
  { key: "A", text: "He learns new songs." },
  { key: "B", text: "He learns new words and their pronunciation." },
  { key: "C", text: "He learns how to cook." },
  { key: "D", text: "He learns to write stories in French." },
] as const;
export const DEMO_CORRECT = "B";

/** Free, local only demo. Nothing is saved and no statistics are affected. */
export function ReadingDemo() {
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const reduce = useReducedMotion();
  const solved = picked === DEMO_CORRECT;

  const choose = (k: string) => {
    if (solved) return;
    setPicked(k);
    if (k !== DEMO_CORRECT) setWrong((w) => (w.includes(k) ? w : [...w, k]));
  };

  return (
    <section id="essai" className="bg-brand-green-soft/50 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">Essai gratuit</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Avant de nous rejoindre, faites un petit exercice !</h2>
          <p className="mt-3 text-muted-foreground">Découvrez comment fonctionne notre approche de compréhension écrite.</p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="size-4 text-brand-green" /> Texte · Niveau A2
            </div>
            <p lang="en" className="mt-4 font-serif text-xl leading-relaxed sm:text-2xl">{DEMO_TEXT}</p>
            <div className="mt-8 border-t border-border pt-6">
              <p lang="en" id="demo-q" className="font-bold">What does Daniel learn from reading?</p>
              <div role="radiogroup" aria-labelledby="demo-q" className="mt-4 grid gap-3">
                {DEMO_OPTIONS.map((o) => {
                  const isWrong = wrong.includes(o.key) && picked === o.key;
                  const isRight = solved && o.key === DEMO_CORRECT;
                  return (
                    <motion.button
                      key={o.key}
                      type="button"
                      role="radio"
                      aria-checked={picked === o.key}
                      disabled={solved && !isRight}
                      onClick={() => choose(o.key)}
                      animate={isWrong && !reduce ? { x: [0, -6, 6, -4, 0] } : { x: 0 }}
                      transition={{ duration: 0.35 }}
                      whileHover={solved ? undefined : { scale: 1.01 }}
                      whileTap={solved ? undefined : { scale: 0.99 }}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isRight ? "border-brand-green bg-brand-green-soft" : isWrong ? "border-destructive/60 bg-destructive/5" : "border-border hover:border-brand-green/50"
                      } disabled:opacity-50`}
                    >
                      <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${isRight ? "bg-brand-green text-brand-green-foreground" : "bg-muted"}`}>{o.key}</span>
                      <span lang="en">{o.text}</span>
                      {isRight ? <CheckCircle2 className="ml-auto size-5 text-brand-green" /> : null}
                    </motion.button>
                  );
                })}
              </div>
              <div aria-live="polite" className="mt-5 min-h-6">
                <AnimatePresence mode="wait">
                  {solved ? (
                    <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-brand-green-soft p-5">
                      <p className="flex items-center gap-2 font-bold text-brand-green"><Sparkles className="size-5" /> Excellent !</p>
                      <p className="mt-2 text-sm">Daniel apprend de nouveaux mots en anglais et travaille leur prononciation. C'est justement l'un des objectifs du Reading Workshop.</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button asChild className="bg-brand-green text-brand-green-foreground hover:bg-brand-green/90">
                          <Link to="/reading-workshop">Découvrir le Reading Workshop <ArrowRight className="ml-1 size-4" /></Link>
                        </Button>
                        <Button variant="ghost" onClick={() => { setPicked(null); setWrong([]); }}><RotateCcw className="mr-1 size-4" /> Recommencer</Button>
                      </div>
                    </motion.div>
                  ) : picked ? (
                    <motion.p key={`no-${picked}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground">
                      Pas tout à fait. Relisez la deuxième phrase du texte et essayez une autre réponse.
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
