import { motion } from "framer-motion";
import { Briefcase, CalendarCheck, Clock, Globe, GraduationCap, MessageCircle, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COACH_WHATSAPP_URL, TRAINING_OFFER, TRAINING_PRICING } from "@/lib/training-program";

const GROUP_ICONS = [Briefcase, GraduationCap] as const;

function formatPrice(value: number): string {
  return `${value.toLocaleString("fr-FR")} F CFA`;
}

export function TrainingPricingSection() {
  return (
    <section
      id="tarifs-formation"
      aria-labelledby="training-pricing-title"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto max-w-2xl text-center"
      >
        <Badge variant="outline" className="mb-3">
          Nos tarifs
        </Badge>
        <h2 id="training-pricing-title" className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Des tarifs clairs, pour tous les profils
        </h2>
        <p className="mt-3 text-muted-foreground">
          Choisissez la formule qui correspond à votre rythme. Plus l'engagement est long, plus vous économisez.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-8">
        {TRAINING_PRICING.map((group, groupIndex) => {
          const GroupIcon = GROUP_ICONS[groupIndex % GROUP_ICONS.length];
          const bestDiscount = Math.max(...group.plans.map((p) => p.discount ?? 0));
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
            >
              <div className="flex items-center gap-3 bg-brand-gradient px-5 py-4 text-primary-foreground sm:px-8">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <GroupIcon className="size-5" aria-hidden />
                </span>
                <h3 className="text-lg font-bold tracking-tight sm:text-xl">{group.title}</h3>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
                {group.plans.map((plan) => {
                  const isBest = plan.discount !== null && plan.discount === bestDiscount;
                  return (
                    <div
                      key={plan.period}
                      className={
                        "relative flex flex-col rounded-2xl border bg-background/60 p-5 pt-6 text-center transition-shadow hover:shadow-md " +
                        (isBest ? "border-brand-green/60 ring-2 ring-brand-green/30" : "border-border/60")
                      }
                    >
                      {isBest ? (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-green px-3 py-0.5 text-xs font-bold text-white">
                          Meilleure offre
                        </span>
                      ) : null}
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">{plan.period}</p>
                      <p className="mt-3 text-2xl font-extrabold tracking-tight sm:text-[1.35rem]">
                        {formatPrice(plan.price)}
                      </p>
                      <div className="mt-auto pt-4">
                        {plan.discount !== null ? (
                          <span className="inline-block rounded-full bg-brand-green px-3 py-1 text-xs font-bold text-white">
                            - {plan.discount} %
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            Sans engagement
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:p-6"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-green-soft">
            <Globe className="size-5 text-brand-green" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-bold">Formation 100 % en ligne</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-green" aria-hidden />
                <span>Cours dispensés via WhatsApp</span>
              </li>
              <li className="flex items-start gap-2">
                <Monitor className="mt-0.5 size-4 shrink-0 text-brand-green" aria-hidden />
                <span>Accessible depuis n'importe quel pays du monde</span>
              </li>
            </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
          className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:p-6"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue-soft">
            <CalendarCheck className="size-5 text-brand-blue" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-bold">Formation en présentiel</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CalendarCheck className="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden />
                <span>{TRAINING_OFFER.sessionsPerWeek} fois par semaine</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden />
                <span>
                  {TRAINING_OFFER.hoursPerSession} h par séance, tarifs communiqués directement par le coach sur demande
                </span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mt-8 text-center"
      >
        <p className="text-sm text-muted-foreground">
          {TRAINING_OFFER.durationMonths} mois de formation avec le coach Mr Nathan. Chaque inscription démarre après un
          échange direct avec le coach.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-4 rounded-xl bg-brand-gradient font-semibold text-primary-foreground shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <a href={COACH_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-1.5 size-4" aria-hidden /> Choisir ma formule sur WhatsApp
          </a>
        </Button>
      </motion.div>
    </section>
  );
}
