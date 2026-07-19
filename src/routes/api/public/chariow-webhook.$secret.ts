import { createFileRoute } from "@tanstack/react-router";
import { getChariowSale } from "@/lib/chariow";

type ChariowPulse = {
  event?: string;
  sale?: {
    id?: string;
    status?: string;
    custom_metadata?: Record<string, string> | null;
  };
};

export const Route = createFileRoute("/api/public/chariow-webhook/$secret")({
  server: {
    handlers: {
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request, params }) => {
        const expected = process.env.CHARIOW_WEBHOOK_SECRET;
        const apiKey = process.env.CHARIOW_API_KEY;
        if (!expected || !apiKey) {
          return new Response("Not configured", { status: 500 });
        }
        if (params.secret !== expected) {
          return new Response("Invalid secret", { status: 401 });
        }

        let payload: ChariowPulse;
        try {
          payload = (await request.json()) as ChariowPulse;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const saleId = payload.sale?.id;
        const event = payload.event;
        if (!saleId || !event) {
          return new Response("ok", { status: 200 });
        }

        // Only act on sale lifecycle events
        if (!["successful.sale", "failed.sale", "abandoned.sale"].includes(event)) {
          return new Response("ok", { status: 200 });
        }

        // Re-verify by calling Chariow directly (payload is not signed).
        let sale;
        try {
          sale = (await getChariowSale(saleId, apiKey)).data;
        } catch (err) {
          console.error("chariow-webhook: sale fetch failed", err);
          return new Response("verify failed", { status: 502 });
        }

        const paymentId = sale.custom_metadata?.payment_id;
        if (!paymentId) {
          return new Response("ok", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, user_id, status, credits_added")
          .eq("id", paymentId)
          .maybeSingle();

        if (!payment) {
          return new Response("ok", { status: 200 });
        }
        if (payment.status === "success") {
          return new Response("ok", { status: 200 });
        }

        const normalized =
          sale.status === "completed"
            ? "success"
            : sale.status === "failed" || sale.status === "refunded"
              ? "failed"
              : event === "abandoned.sale"
                ? "cancelled"
                : "pending";

        if (normalized === "success") {
          await supabaseAdmin.rpc("increment_credits", {
            p_user_id: payment.user_id,
            p_amount: payment.credits_added,
          });
          await supabaseAdmin
            .from("payments")
            .update({
              status: "success",
              chariow_sale_id: saleId,
              moneroo_transaction_id: saleId,
              confirmed_at: new Date().toISOString(),
            })
            .eq("id", payment.id);
        } else {
          await supabaseAdmin
            .from("payments")
            .update({
              status: normalized,
              chariow_sale_id: saleId,
            })
            .eq("id", payment.id);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});