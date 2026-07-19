import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { initializeMonerooPayment, verifyMonerooTransaction } from "@/lib/moneroo";

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

const CheckoutInput = z.object({ origin: z.string().url() });

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckoutInput.parse(input))
  .handler(async ({ data, context }) => {
    const secret = process.env.MONEROO_SECRET_KEY;
    if (!secret) throw new Error("Clé Moneroo non configurée.");

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

    const returnUrl = `${data.origin}/paiement-retour`;

    const { data: monerooData } = await initializeMonerooPayment(
      {
        amount: plan.price,
        currency: plan.currency,
        description: `OpenDoorsClass: ${plan.credits_included} crédits de test`,
        customer: {
          email: (context.claims?.email as string) ?? "client@opendoorsclass.com",
          first_name: profile?.first_name ?? "Client",
          last_name: profile?.last_name ?? "OpenDoorsClass",
        },
        return_url: returnUrl,
        metadata: {
          payment_id: payment.id,
          reference,
        },
      },
      secret
    );

    await context.supabase
      .from("payments")
      .update({ moneroo_transaction_id: monerooData.id })
      .eq("id", payment.id);

    return { checkoutUrl: monerooData.checkout_url, paymentId: payment.id };
  });

export const checkPaymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paymentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: payment } = await context.supabase
      .from("payments")
      .select("id, moneroo_transaction_id, status, credits_added")
      .eq("id", data.paymentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!payment) throw new Error("Paiement introuvable.");

    if (payment.status === "success") {
      return { status: "success", credits: payment.credits_added };
    }

    if (!payment.moneroo_transaction_id) {
      return { status: payment.status, credits: 0 };
    }

    const secret = process.env.MONEROO_SECRET_KEY;
    if (!secret) throw new Error("Clé Moneroo non configurée.");

    const verification = await verifyMonerooTransaction(payment.moneroo_transaction_id, secret);
    const remoteStatus = verification.data.status as "pending" | "success" | "failed" | "cancelled";

    if (remoteStatus === "success") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
