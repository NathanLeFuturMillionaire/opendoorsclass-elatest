import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listTestOffers } from "@/lib/payments.functions";
import { computeLocalPrice } from "@/lib/geo-price";
import { useI18n } from "@/lib/i18n";

const STARTER_FEATURES_EN = [
  "5 Credits",
  "Grammar Assessment",
  "Reading Assessment",
  "Listening Assessment",
  "Writing Assessment",
  "Speaking Assessment",
  "Official CEFR Level",
  "Downloadable Certificate",
  "Secure Online Testing",
];

const STARTER_FEATURES_FR = [
  "5 crédits",
  "Évaluation de grammaire",
  "Évaluation de compréhension écrite",
  "Évaluation de compréhension orale",
  "Évaluation d'expression écrite",
  "Évaluation d'expression orale",
  "Niveau CECRL officiel",
  "Certificat téléchargeable",
  "Test en ligne sécurisé",
];

const DIAMOND_FEATURES_EN = [
  "11 Credits",
  "Grammar Assessment",
  "Reading Assessment",
  "Listening Assessment",
  "Writing Assessment",
  "Speaking Assessment",
  "Official CEFR Level",
  "Downloadable Certificate",
  "Detailed Error Analysis",
  "Explanation of Mistakes",
  "Personalized Learning Plan",
  "Performance Recommendations",
  "Priority Support",
  "Comprehensive Performance Report",
];

const DIAMOND_FEATURES_FR = [
  "11 crédits",
  "Évaluation de grammaire",
  "Évaluation de compréhension écrite",
  "Évaluation de compréhension orale",
  "Évaluation d'expression écrite",
  "Évaluation d'expression orale",
  "Niveau CECRL officiel",
  "Certificat téléchargeable",
  "Analyse détaillée des erreurs",
  "Explication des erreurs",
  "Plan d'apprentissage personnalisé",
  "Recommandations de performance",
  "Support prioritaire",
  "Rapport de performance complet",
];

export function HomePricingSection() {
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const navigate = useNavigate();
  const fetchOffers = useServerFn(listTestOffers);
  const offersQuery = useQuery({ queryKey: ["public-test-offers"], queryFn: () => fetchOffers() });

  const offers = offersQuery.data ?? [];
  const starter = offers.find((o) => o.code === "standard");
  const diamond = offers.find((o) => o.code === "premium");

  async function go(code: "standard" | "premium") {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      navigate({ to: "/achat-credits", search: { offer: code } });
      return;
    }
    navigate({ to: "/auth", search: { redirect: `/achat-credits?offer=${code}` } });
  }

  return (
    <section id="tarifs" className="relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute left-1/2 top-0 h-72 w-[80%] -translate-x-1/2 rounded-full bg-brand-blue-soft blur-3xl" />
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <Badge variant="outline" className="mb-3">
            {isFr ? "Nos offres" : "Pricing"}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {isFr
              ? "Choisissez l'évaluation adaptée à vos objectifs"
              : "Choose the assessment that fits your goals"}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {isFr
              ? "Que vous souhaitiez une évaluation rapide ou une analyse complète de vos compétences en anglais, OpenDoorsClass propose l'option qu'il vous faut."
              : "Whether you want a quick evaluation or a complete assessment of your English skills, OpenDoorsClass offers the right option for you."}
          </p>
        </motion.div>

        {offersQuery.isLoading || !starter || !diamond ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="h-[520px] animate-shimmer rounded-3xl bg-muted" />
            <div className="h-[520px] animate-shimmer rounded-3xl bg-muted" />
          </div>
        ) : (
          <div className="mt-10 grid items-start gap-6 md:grid-cols-2">
            <PricingCard
              name={starter.label ?? "Starter"}
              price={starter.price}
              locale={locale}
              features={isFr ? STARTER_FEATURES_FR : STARTER_FEATURES_EN}
              note={
                isFr
                  ? "Idéal pour les candidats souhaitant connaître rapidement leur niveau général d'anglais."
                  : "Ideal for candidates who want a quick overview of their general English level."
              }
              cta={isFr ? "Choisir Starter" : "Choose Starter"}
              onSelect={() => go("standard")}
            />
            <PricingCard
              highlighted
              name={diamond.label ?? "Diamond"}
              price={diamond.price}
              locale={locale}
              features={isFr ? DIAMOND_FEATURES_FR : DIAMOND_FEATURES_EN}
              note={
                isFr
                  ? "L'expérience complète : analyse détaillée, plan d'apprentissage et support prioritaire."
                  : "The complete experience: detailed analysis, learning plan and priority support."
              }
              cta={isFr ? "Choisir Diamond" : "Choose Diamond"}
              badge={isFr ? "Le plus choisi" : "Most Popular"}
              onSelect={() => go("premium")}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function PricingCard(props: {
  name: string;
  price: number;
  locale: "fr" | "en";
  features: string[];
  note: string;
  cta: string;
  badge?: string;
  highlighted?: boolean;
  onSelect: () => void;
}) {
  const nf = new Intl.NumberFormat(props.locale === "fr" ? "fr-FR" : "en-US");
  const usd = computeLocalPrice(props.price, props.locale, "US");

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className={`relative flex h-full flex-col rounded-3xl border p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-8 ${
        props.highlighted
          ? "border-brand-blue/40 bg-card ring-2 ring-brand-blue/30"
          : "border-border bg-card"
      }`}
    >
      {props.badge ? (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
          <Crown className="size-3.5" aria-hidden />
          {props.badge}
        </span>
      ) : null}

      <div className="flex items-center gap-2">
        <Sparkles
          className={`size-4 ${props.highlighted ? "text-brand-yellow-foreground" : "text-brand-green"}`}
          aria-hidden
        />
        <h3 className="font-display text-xl font-bold">{props.name}</h3>
      </div>

      <div className="mt-4">
        <p className="text-4xl font-extrabold tracking-tight">
          {nf.format(props.price)}{" "}
          <span className="text-base font-semibold text-muted-foreground">FCFA</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          ≈ ${Math.round(usd.amount)} USD
        </p>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{props.note}</p>

      <ul className="mt-6 flex-1 space-y-2.5">
        {props.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-green" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={props.onSelect}
        className={`mt-7 h-11 w-full rounded-xl font-semibold ${
          props.highlighted ? "bg-brand-gradient text-primary-foreground" : ""
        }`}
        variant={props.highlighted ? "default" : "outline"}
      >
        {props.cta}
      </Button>
    </motion.div>
  );
}