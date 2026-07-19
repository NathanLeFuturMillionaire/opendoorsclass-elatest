import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyMonerooWebhookSignature, verifyMonerooTransaction } from "@/lib/moneroo";

const WebhookPayload = z.object({
  event: z.string(),
  data: z.object({
    id: z.string(),
    status: z.string().optional(),
  }),
});

export const Route = createFileRoute("/api/public/moneroo-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MONEROO_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook secret not configured", { status: 500 });
        }

        const body = await request.text();
        const signature = request.headers.get("X-Moneroo-Signature");

        if (!verifyMonerooWebhookSignature(body, signature, secret)) {
          return new Response("Invalid signature", { status: 403 });
        }

        const parsed = WebhookPayload.safeParse(JSON.parse(body));
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 400 });
        }

        const { event, data } = parsed.data;
        const paymentId = data.id;

        if (event !== "payment.success") {
          return Response.json({ received: true, processed: false });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, moneroo_transaction_id, status, credits_added, user_id")
          .eq("moneroo_transaction_id", paymentId)
          .maybeSingle();

        if (!payment) {
          return Response.json({ received: true, processed: false, reason: "payment not found" });
        }

        if (payment.status === "success") {
          return Response.json({ received: true, processed: true, reason: "already credited" });
        }

        const monerooSecret = process.env.MONEROO_SECRET_KEY;
        if (!monerooSecret) {
          return new Response("Moneroo secret not configured", { status: 500 });
        }

        const verification = await verifyMonerooTransaction(paymentId, monerooSecret);
        const isSuccess = verification.data.status === "success";

        if (!isSuccess) {
          await supabaseAdmin
            .from("payments")
            .update({ status: verification.data.status as any, raw_payload: verification.data as any })
            .eq("id", payment.id);
          return Response.json({ received: true, processed: false, reason: "not successful" });
        }

        const { error: profileError } = await supabaseAdmin.rpc("increment_credits", {
          p_user_id: payment.user_id,
          p_amount: payment.credits_added,
        });

        if (profileError) {
          return new Response("Failed to update credits", { status: 500 });
        }

        const { error: updateError } = await supabaseAdmin
          .from("payments")
          .update({
            status: "success",
            confirmed_at: new Date().toISOString(),
            payment_method: verification.data.payment_method ?? null,
            raw_payload: verification.data as any,
          })
          .eq("id", payment.id);

        if (updateError) {
          return new Response("Failed to update payment", { status: 500 });
        }

        return Response.json({ received: true, processed: true });
      },
    },
  },
});
