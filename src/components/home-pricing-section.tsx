import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listTestOffers } from "@/lib/payments.functions";
import { useI18n } from "@/lib/i18n";
import {
  OFFER_CREDITS,
  OFFER_CTA_EN,
  OFFER_CTA_FR,
  OFFER_DESCRIPTION_EN,
  OFFER_DESCRIPTION_FR,
  OFFER_FEATURES_EN,
  OFFER_FEATURES_FR,
  OFFER_NAME,
  OFFER_PRICE_USD,
  OFFER_PRICE_XAF,
} from "@/lib/offer";

export function HomePricingSection() {
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const navigate = useNavigate();
  const fetchOffers = useServerFn(listTestOffers);
  const offersQuery = useQuery({ queryKey: ["public-test-offers"], queryFn: () => fetchOffers() });

  const offer = (offersQuery.data ?? [])[0];
  const price = offer?.price ?? OFFER_PRICE_XAF;
  const credits = offer?.credits_included ?? OFFER_CREDITS;
  const nf = new Intl.NumberFormat(isFr ? "fr-FR" : "en-US");
  const features = isFr ? OFFER_FEATURES_FR : OFFER_FEATURES_EN;

  async function go() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      navigate({ to: "/achat-credits" });
      return;
    }
    navigate({ to: "/auth", search: { redirect: "/achat-credits" } });
  }

  return (
    <section id="tarifs" className="relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute left-1/2 top-0 h-72 w-[80%] -translate-x-1/2 rounded-full bg-brand-blue-soft blur-3xl" />
      </div>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <Badge variant="outline" className="mb-3">
            {isFr ? "Notre offre" : "Pricing"}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {isFr
              ? "Une offre unique, une évaluation complète"
              : "One single offer, one complete assessment"}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {isFr ? OFFER_DESCRIPTION_FR : OFFER_DESCRIPTION_EN}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          whileHover={{ y: -4 }}
          className="mx-auto mt-10 flex max-w-2xl flex-col rounded-3xl border border-brand-blue/40 bg-card p-6 shadow-sm ring-2 ring-brand-blue/25 transition-shadow hover:shadow-lg sm:p-8"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand-green" aria-hidden />
            <h3 className="font-display text-xl font-bold">{offer?.label ?? OFFER_NAME}</h3>
          </div>

          <div className="mt-4">
            <p className="text-4xl font-extrabold tracking-tight">
              {nf.format(price)}{" "}
              <span className="text-base font-semibold text-muted-foreground">FCFA</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">≈ {OFFER_PRICE_USD} USD</p>
            <p className="mt-2 text-sm font-semibold text-brand-green">
              {isFr
                ? `${credits} crédit, soit un test complet`
                : `${credits} credit, one full test`}
            </p>
          </div>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-green" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={go}
            className="mt-7 h-11 w-full rounded-xl bg-brand-gradient font-semibold text-primary-foreground"
          >
            {isFr ? OFFER_CTA_FR : OFFER_CTA_EN}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
