import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { initChariowCheckout, getChariowSale } from "@/lib/chariow";

export const getTestAccessPlan = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("test_access_plan")
    .select("id, price, credits_included, currency, is_active")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Aucun plan de crédits disponible.");
  return data;
});

const CheckoutInput = z.object({
  origin: z.string().url(),
  phone: z
    .string()
    .trim()
    .min(6, "Numéro de téléphone invalide.")
    .max(20, "Numéro de téléphone invalide.")
    .regex(/^[0-9]+$/, "Le numéro doit contenir uniquement des chiffres (sans indicatif, sans espaces)."),
  countryCode: z
    .string()
    .trim()
    .length(2, "Code pays invalide.")
    .transform((v) => v.toUpperCase()),
});

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckoutInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.CHARIOW_API_KEY;
    const productId = process.env.CHARIOW_PRODUCT_ID;
    if (!apiKey || !productId) throw new Error("Chariow non configuré.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan, error: planError } = await supabaseAdmin
      .from("test_access_plan")
      .select("id, price, credits_included, currency")
      .eq("is_active", true)
      .maybeSingle();
    if (planError || !plan) throw new Error("Plan de crédits introuvable.");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", context.userId)
      .maybeSingle();

    const reference = `odc-${context.userId.slice(0, 8)}-${Date.now()}`;

    const { data: payment, error: insertError } = await context.supabase
      .from("payments")
      .insert({
        user_id: context.userId,
        amount: plan.price,
        currency: plan.currency,
        credits_added: plan.credits_included,
        moneroo_reference: reference,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    const returnUrl = `${data.origin}/paiement-retour?payment_id=${payment.id}`;
    const email = (context.claims?.email as string) ?? "client@opendoorsclass.com";

    const { data: checkout } = await initChariowCheckout(
      {
        product_id: productId,
        email,
        first_name: profile?.first_name ?? "Client",
        last_name: profile?.last_name ?? "OpenDoorsClass",
        phone: { number: data.phone, country_code: data.countryCode },
        redirect_url: returnUrl,
        custom_metadata: {
          payment_id: payment.id,
          reference,
          user_id: context.userId,
        },
      },
      apiKey
    );

    if (!checkout.purchase || !checkout.payment.checkout_url) {
      await context.supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);
      throw new Error(
        checkout.message ??
          "Chariow n'a pas retourné d'URL de paiement (produit déjà acheté ou indisponible)."
      );
    }

    await context.supabase
      .from("payments")
      .update({
        chariow_sale_id: checkout.purchase.id,
        moneroo_transaction_id: checkout.purchase.id,
      })
      .eq("id", payment.id);

    return { checkoutUrl: checkout.payment.checkout_url, paymentId: payment.id };
  });

export const checkPaymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paymentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: payment } = await context.supabase
      .from("payments")
      .select("id, chariow_sale_id, status, credits_added")
      .eq("id", data.paymentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!payment) throw new Error("Paiement introuvable.");

    if (payment.status === "success") {
      return { status: "success", credits: payment.credits_added };
    }

    if (!payment.chariow_sale_id) {
      return { status: payment.status, credits: 0 };
    }

    const apiKey = process.env.CHARIOW_API_KEY;
    if (!apiKey) throw new Error("Chariow non configuré.");

    const sale = await getChariowSale(payment.chariow_sale_id, apiKey);
    const rs = sale.data.status;
    const remoteStatus: "pending" | "success" | "failed" | "cancelled" =
      rs === "completed"
        ? "success"
        : rs === "failed" || rs === "refunded"
          ? "failed"
          : "pending";

    if (remoteStatus === "success") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: fresh } = await supabaseAdmin
        .from("payments")
        .select("status")
        .eq("id", payment.id)
        .maybeSingle();
      if (fresh?.status === "success") {
        return { status: "success", credits: payment.credits_added };
      }
      await supabaseAdmin.rpc("increment_credits", {
        p_user_id: context.userId,
        p_amount: payment.credits_added,
      });
      await supabaseAdmin
        .from("payments")
        .update({ status: "success", confirmed_at: new Date().toISOString() })
        .eq("id", payment.id);
      return { status: "success", credits: payment.credits_added };
    }

    if (remoteStatus !== payment.status) {
      await context.supabase
        .from("payments")
        .update({ status: remoteStatus })
        .eq("id", payment.id);
    }

    return { status: remoteStatus, credits: 0 };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, first_name, last_name, credits_remaining, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Profil introuvable.");
    return data;
  });
