import { motion } from "framer-motion";
import { Check, Lock, Users, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CLUBS, CLUB_TIMELINE } from "@/lib/clubs";

export function ClubsSection() {
  return (
    <section id="clubs" className="relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute left-1/2 top-10 h-72 w-[85%] -translate-x-1/2 rounded-full bg-brand-blue-soft blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <Badge variant="outline" className="mb-3">
            <Users className="mr-1.5 size-3.5" aria-hidden />
            Communautés officielles
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Rejoignez la communauté qui correspond à votre niveau.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Chez OpenDoorsClass, chaque apprenant évolue avec des personnes ayant le même niveau
            que lui. Après votre test de niveau, nous vous orientons automatiquement vers la
            communauté la plus adaptée afin de pratiquer dans un environnement motivant,
            bienveillant et structuré.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {CLUBS.map((club, i) => (
            <motion.article
              key={club.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              whileHover={{ y: -6 }}
              className={`flex flex-col rounded-3xl border bg-gradient-to-br ${club.gradient} ${club.ring} p-6 shadow-sm ring-1 transition-shadow hover:shadow-lg sm:p-7`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    OpenDoorsClass
                  </p>
                  <h3 className={`mt-1 font-display text-lg font-bold leading-snug ${club.accent}`}>
                    {club.name}
                  </h3>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {club.badge}
                </Badge>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {club.description}
              </p>

              <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {club.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className={`size-4 shrink-0 ${club.accent}`} aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6">
                <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/70 px-4 py-3 text-sm font-semibold text-muted-foreground">
                  <Lock className="size-4" aria-hidden />
                  Accessible après votre test
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-14 rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8"
        >
          <h3 className="text-center font-display text-xl font-bold sm:text-2xl">
            Votre parcours OpenDoorsClass
          </h3>

          <ol className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {CLUB_TIMELINE.map((step, i) => (
              <motion.li
                key={step}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-4"
              >
                <span className="grid size-8 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-sm font-medium leading-snug">{step}</span>
                {i < CLUB_TIMELINE.length - 1 ? (
                  <ArrowRight
                    className="absolute -right-3 top-1/2 hidden size-5 -translate-y-1/2 text-muted-foreground/50 lg:block"
                    aria-hidden
                  />
                ) : null}
              </motion.li>
            ))}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
