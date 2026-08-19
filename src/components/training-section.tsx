import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Clock, GraduationCap, MessageCircle, Monitor, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COACH_WHATSAPP_URL, TRAINING_OFFER } from "@/lib/training-program";

const HIGHLIGHTS = [
  { icon: GraduationCap, label: "A1 vers C1 / C2" },
  { icon: CalendarDays, label: `${TRAINING_OFFER.durationMonths} mois de formation` },
  { icon: Clock, label: `${TRAINING_OFFER.sessionsPerWeek} séances par semaine, ${TRAINING_OFFER.hoursPerSession} h par cours` },
  { icon: Monitor, label: TRAINING_OFFER.format },
];

export function TrainingSection() {
  return (
    <section id="formation" aria-labelledby="training-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-brand-gradient p-1 shadow-xl"
      >
        <div className="relative overflow-hidden rounded-[1.35rem] bg-background/95 p-6 sm:p-10">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-green-soft blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-brand-yellow-soft blur-3xl" />
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="min-w-0">
              <Badge variant="outline" className="mb-4 border-brand-green/50 text-brand-green">
                <Sparkles className="mr-1.5 size-3.5" aria-hidden /> Formation Anglais Professionnel
              </Badge>
              <h2 id="training-title" className="text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">
                Passez du niveau A1 au niveau <span className="text-brand-gradient">C1 / C2</span>
              </h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                Un accompagnement complet conçu par Mr Nathan : progression rigoureuse, mises en situation
                professionnelles réelles et suivi personnalisé, du premier mot au niveau expert.
              </p>

              <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
                {HIGHLIGHTS.map((h, i) => (
                  <motion.li
                    key={h.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.08 * i }}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/70 px-3.5 py-2.5 text-sm font-medium backdrop-blur"
                  >
                    <h.icon className="size-4 shrink-0 text-brand-green" aria-hidden />
                    <span className="min-w-0">{h.label}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="min-w-0 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
              <p className="text-sm font-medium text-muted-foreground">Tarif de la formation</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  {TRAINING_OFFER.priceMonthly.toLocaleString("fr-FR")}
                </span>
                <span className="pb-1 text-lg font-semibold text-muted-foreground">
                  {TRAINING_OFFER.currency} / mois
                </span>
              </div>
              <Badge className="mt-3 bg-brand-yellow-soft text-brand-yellow-foreground hover:bg-brand-yellow-soft">
                Négociable
              </Badge>

              <div className="mt-6 flex flex-col gap-3">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-xl bg-brand-gradient text-primary-foreground shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <Link to="/formation-anglais-programme">
                    Voir le programme <ArrowRight className="ml-1.5 size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full rounded-xl border-brand-green/50 text-brand-green transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-green/10"
                >
                  <a href={COACH_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-1.5 size-4" aria-hidden /> Contacter le coach
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}