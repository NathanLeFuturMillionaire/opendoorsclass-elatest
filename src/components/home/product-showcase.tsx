import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const SLIDES = [
  { label: "English Level Assessment", url: "opendoorsclass-elatest.lovable.app/leveltest/en", desktop: "/showcase/assessment.webp", mobile: "/showcase/workshop-mobile.webp" },
  { label: "Reading Workshop", url: "opendoorsclass-elatest.lovable.app/reading-workshop", desktop: "/showcase/workshop.webp", mobile: "/showcase/assessment-mobile.webp" },
  { label: "Niveaux CECRL", url: "opendoorsclass-elatest.lovable.app/cecr-niveaux-anglais", desktop: "/showcase/cecr.webp", mobile: "/showcase/cecr-mobile.webp" },
];

/** Real captures of OpenDoorsClass pages, arranged as a desktop window and a phone. */
export function ProductShowcase() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 4500);
    return () => clearInterval(id);
  }, [reduce]);
  const s = SLIDES[i] ?? SLIDES[0]!;
  return (
    <div className="relative mx-auto w-full max-w-xl pb-10 lg:max-w-none">
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-brand-green/20 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-destructive/70" />
          <span className="size-2.5 rounded-full bg-brand-yellow" />
          <span className="size-2.5 rounded-full bg-brand-green" />
          <span className="ml-3 truncate rounded-md bg-background px-3 py-0.5 text-[11px] text-muted-foreground">{s.url}</span>
        </div>
        <div className="relative aspect-[16/10] bg-background">
          <AnimatePresence mode="wait">
            <motion.img
              key={s.desktop}
              src={s.desktop}
              alt={`Capture réelle : ${s.label}`}
              className="absolute inset-0 size-full object-cover object-top"
              initial={reduce ? false : { opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              fetchPriority="high"
            />
          </AnimatePresence>
        </div>
      </div>
      <motion.div
        className="absolute -bottom-2 -right-2 w-[28%] overflow-hidden rounded-[1.4rem] border-4 border-foreground/90 bg-background shadow-2xl sm:-right-6"
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative aspect-[9/18]">
          <AnimatePresence mode="wait">
            <motion.img key={s.mobile} src={s.mobile} alt="" className="absolute inset-0 size-full object-cover object-top"
              initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
          </AnimatePresence>
        </div>
      </motion.div>
      <div className="absolute -left-2 bottom-4 hidden rounded-xl border border-border bg-card/95 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur sm:block">
        <span className="mr-2 inline-block size-2 rounded-full bg-brand-green" />{s.label}
      </div>
      <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Interfaces présentées">
        {SLIDES.map((sl, n) => (
          <button key={sl.label} type="button" role="tab" aria-selected={n === i} aria-label={sl.label}
            onClick={() => setI(n)}
            className={`h-1.5 rounded-full transition-all ${n === i ? "w-8 bg-brand-green" : "w-3 bg-border hover:bg-muted-foreground"}`} />
        ))}
      </div>
    </div>
  );
}
