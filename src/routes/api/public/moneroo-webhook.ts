import { createFileRoute } from "@tanstack/react-router";
import { verifyMonerooWebhookSignature } from "@/lib/moneroo";

type MonerooWebhookPayload = {
  event?: string;
  data?: {
    id?: string;
    status?: string;
    metadata?: Record<string, string> | null;
  };
};

export const Route = createFileRoute("/api/public/moneroo-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MONEROO_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook secret not configured", { status: 500 });
        }

        const rawBody = await request.text();
        const signature =
          request.headers.get("x-moneroo-signature") ??
          request.headers.get("moneroo-signature") ??
          request.headers.get("x-webhook-signature");

        if (!verifyMonerooWebhookSignature(rawBody, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: MonerooWebhookPayload;
        try {
          payload = JSON.parse(rawBody) as MonerooWebhookPayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const transactionId = payload.data?.id;
        const status = payload.data?.status;
        const paymentIdMeta = payload.data?.metadata?.payment_id;

        if (!transactionId || !status) {
          return new Response("ok", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let paymentQuery = supabaseAdmin
          .from("payments")
          .select("id, user_id, status, credits_added")
          .limit(1);

        paymentQuery = paymentIdMeta
          ? paymentQuery.eq("id", paymentIdMeta)
          : paymentQuery.eq("moneroo_transaction_id", transactionId);

        const { data: payment } = await paymentQuery.maybeSingle();

        if (!payment) {
          return new Response("ok", { status: 200 });
        }

        if (payment.status === "success") {
          return new Response("ok", { status: 200 });
        }

        const normalized =
          status === "success" || status === "successful" || status === "completed"
            ? "success"
            : status === "failed" || status === "cancelled" || status === "canceled"
              ? "failed"
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
              moneroo_transaction_id: transactionId,
              confirmed_at: new Date().toISOString(),
            })
            .eq("id", payment.id);
        } else {
          await supabaseAdmin
            .from("payments")
            .update({
              status: normalized,
              moneroo_transaction_id: transactionId,
            })
            .eq("id", payment.id);
        }

        return new Response("ok", { status: 200 });
      },

      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});