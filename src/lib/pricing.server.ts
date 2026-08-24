import type { ResolvedOffer } from "@/lib/pricing";
import {
  OFFER_CODE,
  TEST_CREDITS,
  TEST_CURRENCY,
  TEST_PRICE_XAF,
  TEST_PRODUCT_ID,
} from "@/lib/offer";

const FALLBACK: ResolvedOffer = {
  price: TEST_PRICE_XAF,
  productId: TEST_PRODUCT_ID,
  credits: TEST_CREDITS,
  currency: TEST_CURRENCY,
};

let offerCache: { offer: ResolvedOffer; at: number } | null = null;
const OFFER_TTL = 60_000;

/**
 * Tarif applicable. Prix fixe, sans promotion.
 * La table `test_access_plan` peut surcharger la configuration centrale.
 */
export async function resolveCurrentOffer(): Promise<ResolvedOffer> {
  const now = Date.now();
  if (offerCache && now - offerCache.at < OFFER_TTL) return offerCache.offer;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("test_access_plan")
    .select("price, credits_included, currency, chariow_product_id")
    .eq("code", OFFER_CODE)
    .eq("is_active", true)
    .maybeSingle();

  const offer: ResolvedOffer = {
    price: data?.price ?? FALLBACK.price,
    credits: data?.credits_included ?? FALLBACK.credits,
    currency: data?.currency ?? FALLBACK.currency,
    productId: data?.chariow_product_id ?? FALLBACK.productId,
  };
  offerCache = { offer, at: now };
  return offer;
}

// --- Taux de change, mis en cache pour éviter les appels répétés ---
let ratesCache: { rates: Record<string, number>; at: number } | null = null;
const RATES_TTL = 6 * 60 * 60 * 1000;

export async function getXafRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (ratesCache && now - ratesCache.at < RATES_TTL) return ratesCache.rates;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/XAF");
    if (!res.ok) throw new Error(`rates ${res.status}`);
    const body = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (body.result !== "success" || !body.rates) throw new Error("rates unavailable");
    ratesCache = { rates: body.rates, at: now };
    return body.rates;
  } catch {
    if (ratesCache) return ratesCache.rates;
    return { XAF: 1, XOF: 1 };
  }
}
