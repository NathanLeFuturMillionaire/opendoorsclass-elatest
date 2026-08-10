// Source de vérité unique du tarif du test de niveau.
// La résolution réelle (promotion active ou non) est faite côté serveur.

export type PricingState = {
  /** true tant que la promotion est active (horloge serveur). */
  promoActive: boolean;
  /** Prix applicable maintenant, en XAF. */
  price: number;
  /** Prix promotionnel de référence, en XAF. */
  promoPrice: number;
  /** Prix normal (hors promotion), en XAF. */
  normalPrice: number;
  /** Fin de la promotion, ISO 8601 UTC. */
  endsAt: string;
  /** Début de la promotion, ISO 8601 UTC. */
  startsAt: string;
  /** Horodatage serveur au moment de la réponse, ISO 8601 UTC. */
  serverNow: string;
  credits: number;
  currency: string;
  /** Pays détecté (ISO alpha-2) ou null. */
  country: string | null;
  /** Devise d'affichage locale. */
  displayCurrency: string;
  /** Taux 1 XAF => displayCurrency. */
  rate: number;
};

export type PromotionRow = {
  is_enabled: boolean;
  promo_price: number;
  promo_product_id: string;
  normal_price: number;
  normal_product_id: string;
  currency: string;
  credits_included: number;
  starts_at: string;
  ends_at: string;
};

export type ResolvedOffer = {
  promoActive: boolean;
  price: number;
  productId: string;
  credits: number;
  currency: string;
};

/** Résolution déterministe du tarif à un instant donné. */
export function resolveOffer(row: PromotionRow, nowMs: number): ResolvedOffer {
  const start = Date.parse(row.starts_at);
  const end = Date.parse(row.ends_at);
  const promoActive = row.is_enabled && nowMs >= start && nowMs < end;
  return {
    promoActive,
    price: promoActive ? row.promo_price : row.normal_price,
    productId: promoActive ? row.promo_product_id : row.normal_product_id,
    credits: row.credits_included,
    currency: row.currency,
  };
}

export function formatXaf(amount: number, locale: "fr" | "en" = "fr"): string {
  return `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(amount)} FCFA`;
}

export function formatConverted(
  amountXaf: number,
  rate: number,
  currency: string,
  locale: "fr" | "en" = "fr",
  zeroDecimal = false,
): string {
  const value = amountXaf * rate;
  const rounded = zeroDecimal ? Math.round(value) : Math.round(value * 100) / 100;
  try {
    return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: zeroDecimal ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(rounded);
  } catch {
    return `${rounded} ${currency}`;
  }
}