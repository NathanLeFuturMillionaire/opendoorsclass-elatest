import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Owner-only: full detail of one transaction, used by notification click routing. */
export const getPaymentDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isOwner) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select(
        "id, user_id, amount, currency, credits_added, status, provider, offer_code, payment_method, moneroo_reference, moneroo_transaction_id, chariow_sale_id, phone, phone_country, created_at, confirmed_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (!payment) return { payment: null, candidate: null, deliveries: [] };

    const { data: candidate } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, candidate_number, country, nationality, phone, phone_country")
      .eq("id", payment.user_id)
      .maybeSingle();

    const { data: deliveries } = await supabaseAdmin
      .from("notification_deliveries")
      .select("id, status, sent_at, error, created_at, user_id")
      .eq("event_key", `PAYMENT_SUCCESS:${payment.id}`)
      .order("created_at", { ascending: false });

    return { payment, candidate: candidate ?? null, deliveries: deliveries ?? [] };
  });
