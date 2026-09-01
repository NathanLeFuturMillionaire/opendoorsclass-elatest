/**
 * Server-only Web Push pipeline for OpenDoorsClass.
 * Never import this module from a component or a route module scope.
 *
 * Pipeline: event -> idempotency check -> notification rows -> active
 * subscriptions -> web push -> delivery log -> invalid subscription cleanup.
 */
import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

export type NotificationType =
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAYMENT_CANCELED"
  | "PAYMENT_ABANDONED"
  | "NEW_STUDENT"
  | "NEW_REGISTRATION"
  | "SESSION_STARTED"
  | "SESSION_COMPLETED"
  | "STUDENT_ABSENT"
  | "STUDENT_LATE"
  | "PROGRESS_ALERT"
  | "CERTIFICATE_ISSUED"
  | "SYSTEM_ALERT";

/** Which preference flag gates each notification type. */
const PREFERENCE_BY_TYPE: Record<NotificationType, string> = {
  PAYMENT_SUCCESS: "payment_enabled",
  PAYMENT_FAILED: "payment_enabled",
  PAYMENT_CANCELED: "payment_enabled",
  PAYMENT_ABANDONED: "payment_enabled",
  NEW_STUDENT: "student_enabled",
  NEW_REGISTRATION: "student_enabled",
  SESSION_STARTED: "student_enabled",
  SESSION_COMPLETED: "student_enabled",
  STUDENT_ABSENT: "attendance_enabled",
  STUDENT_LATE: "attendance_enabled",
  PROGRESS_ALERT: "student_enabled",
  CERTIFICATE_ISSUED: "system_enabled",
  SYSTEM_ALERT: "system_enabled",
};

/** Types enabled by default today. Others are wired but dormant. */
export const ENABLED_TYPES: NotificationType[] = ["PAYMENT_SUCCESS"];

type Locale = "fr" | "en" | "es";

export type PushContent = {
  title: string;
  body: string;
  url: string;
  actionLabel: string;
  tag?: string;
};

function vapid() {
  const subject = process.env["VAPID_SUBJECT"];
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!subject || !publicKey || !privateKey) return null;
  return { subject, publicKey, privateKey };
}

export function formatAmount(amount: number, currency: string, locale: Locale) {
  const n = new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(Math.round(amount));
  return `${n} ${currency === "XAF" ? (locale === "en" ? "XAF" : "FCFA") : currency}`;
}

/** Localised copy catalogue. Add a locale key to support a new language. */
export function paymentSuccessContent(params: {
  locale: Locale;
  name: string;
  amount: number;
  currency: string;
  productLabel?: string | null;
  paymentId: string;
}): PushContent {
  const { locale, name, amount, currency, productLabel, paymentId } = params;
  const money = formatAmount(amount, currency, locale);
  const url = `/admin/paiements/${paymentId}`;
  if (locale === "en") {
    return {
      title: "🔔 New OpenDoorsClass Payment",
      body: `${name} just paid ${money} for ${productLabel || "the level assessment"}.`,
      url,
      actionLabel: "View payment history",
      tag: `payment-${paymentId}`,
    };
  }
  if (locale === "es") {
    return {
      title: "🔔 Nuevo pago OpenDoorsClass",
      body: `${name} acaba de pagar ${money} por ${productLabel || "la prueba de nivel"}.`,
      url,
      actionLabel: "Ver el historial de pagos",
      tag: `payment-${paymentId}`,
    };
  }
  return {
    title: "🔔 Nouveau paiement OpenDoorsClass",
    body: `${name} vient de payer ${money} pour ${productLabel || "le test de niveau"}.`,
    url,
    actionLabel: "Consulter l'historique de paiement",
    tag: `payment-${paymentId}`,
  };
}

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function admin(): Promise<AdminClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Owner user ids, resolved from the real role system (never hardcoded). */
export async function getOwnerRecipients(): Promise<string[]> {
  const db = await admin();
  const { data } = await db.from("user_roles").select("user_id").eq("role", "owner");
  return Array.from(new Set((data ?? []).map((r) => r.user_id as string)));
}

/**
 * Sends a push payload to every active device of a user.
 * Logs each delivery and disables subscriptions rejected as gone/not-found.
 */
export async function sendPushToUser(params: {
  userId: string;
  content: PushContent;
  notificationId?: string | null;
  eventKey?: string | null;
}): Promise<{ sent: number; failed: number }> {
  const keys = vapid();
  const db = await admin();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", params.userId)
    .eq("is_active", true);

  const list = subs ?? [];
  if (!keys || list.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  await Promise.all(
    list.map(async (sub) => {
      const subscription: PushSubscription = {
        endpoint: sub.endpoint as string,
        expirationTime: null,
        keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
      };
      const message = {
        data: JSON.stringify({
          title: params.content.title,
          body: params.content.body,
          url: params.content.url,
          actionLabel: params.content.actionLabel,
          tag: params.content.tag,
          notificationId: params.notificationId ?? null,
          requireInteraction: true,
        }),
        options: { ttl: 3600 },
      };

      let status: "sent" | "failed" | "expired" = "failed";
      let error: string | null = null;

      // Controlled retries: two attempts, no infinite loop.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const payload = await buildPushPayload(message, subscription, keys);
          const res = await fetch(subscription.endpoint, payload as unknown as RequestInit);
          if (res.status >= 200 && res.status < 300) {
            status = "sent";
            error = null;
            break;
          }
          error = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
          if (res.status === 404 || res.status === 410) {
            status = "expired";
            await db
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id as string);
            break;
          }
          if (res.status >= 400 && res.status < 500) break; // not retryable
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        }
      }

      if (status === "sent") {
        sent += 1;
        await db
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id as string);
      } else {
        failed += 1;
      }

      await db.from("notification_deliveries").insert({
        notification_id: params.notificationId ?? null,
        subscription_id: sub.id as string,
        user_id: params.userId,
        event_key: params.eventKey ?? null,
        status,
        sent_at: status === "sent" ? new Date().toISOString() : null,
        error,
      });
    }),
  );

  return { sent, failed };
}

/**
 * Claims an event key. Returns false when the event was already processed,
 * which guarantees one notification per payment even on webhook replays.
 */
async function claimEvent(eventKey: string, eventType: string, payload: unknown) {
  const db = await admin();
  const { data, error } = await db
    .from("notification_events")
    .insert({ event_key: eventKey, event_type: eventType, payload: payload as never })
    .select("id")
    .maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}

/** Fan-out of a typed notification to the platform owners. */
export async function notifyOwners(params: {
  type: NotificationType;
  eventKey: string;
  relatedEntityType: string;
  relatedEntityId: string;
  /** Builds the localised copy for one recipient. */
  content: (locale: Locale) => PushContent;
  category?: string;
  icon?: string;
}): Promise<{ skipped?: boolean; recipients: number; sent: number; failed: number }> {
  if (!ENABLED_TYPES.includes(params.type)) {
    return { skipped: true, recipients: 0, sent: 0, failed: 0 };
  }

  const eventId = await claimEvent(params.eventKey, params.type, {
    relatedEntityType: params.relatedEntityType,
    relatedEntityId: params.relatedEntityId,
  });
  if (!eventId) return { skipped: true, recipients: 0, sent: 0, failed: 0 };

  const db = await admin();
  const owners = await getOwnerRecipients();
  let sent = 0;
  let failed = 0;

  for (const userId of owners) {
    const { data: prefs } = await db
      .from("notification_preferences")
      .select("push_enabled, payment_enabled, student_enabled, attendance_enabled, system_enabled, locale")
      .eq("user_id", userId)
      .maybeSingle();

    const gate = PREFERENCE_BY_TYPE[params.type];
    const record = (prefs ?? {}) as Record<string, unknown>;
    const categoryEnabled = prefs ? record[gate] !== false : true;
    const pushEnabled = prefs ? record["push_enabled"] !== false : true;
    const locale = ((prefs?.locale as Locale) ?? "fr") as Locale;

    if (!categoryEnabled) continue;

    const content = params.content(locale);

    // Notification center entry: always recorded, even without push.
    const { data: notif } = await db
      .from("notifications")
      .insert({
        user_id: userId,
        title: content.title,
        message: content.body,
        category: params.category ?? "payments",
        icon: params.icon ?? "check-circle",
        action_url: content.url,
        action_label: content.actionLabel,
        type: params.type,
        related_entity_type: params.relatedEntityType,
        related_entity_id: params.relatedEntityId,
      })
      .select("id")
      .maybeSingle();

    if (!pushEnabled) continue;

    const res = await sendPushToUser({
      userId,
      content,
      notificationId: (notif?.id as string | undefined) ?? null,
      eventKey: params.eventKey,
    });
    sent += res.sent;
    failed += res.failed;
  }

  await db
    .from("notification_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", eventId);

  return { recipients: owners.length, sent, failed };
}

/** Owner alert for a confirmed payment. Safe to call more than once. */
export async function notifyOwnersPaymentSuccess(paymentId: string): Promise<void> {
  try {
    const db = await admin();
    const { data: payment } = await db
      .from("payments")
      .select("id, user_id, amount, currency, status, offer_code")
      .eq("id", paymentId)
      .maybeSingle();
    if (!payment || payment.status !== "success") return;

    const { data: profile } = await db
      .from("profiles")
      .select("first_name, last_name, candidate_number")
      .eq("id", payment.user_id as string)
      .maybeSingle();

    const name =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      (profile?.candidate_number as string | undefined) ||
      "Un candidat";

    await notifyOwners({
      type: "PAYMENT_SUCCESS",
      eventKey: `PAYMENT_SUCCESS:${paymentId}`,
      relatedEntityType: "payment",
      relatedEntityId: paymentId,
      content: (locale) =>
        paymentSuccessContent({
          locale,
          name,
          amount: Number(payment.amount ?? 0),
          currency: (payment.currency as string) ?? "XAF",
          productLabel:
            locale === "en"
              ? "the English level assessment"
              : locale === "es"
                ? "la prueba de nivel"
                : "le test de niveau",
          paymentId,
        }),
    });
  } catch (err) {
    // Notifications must never break the payment flow.
    console.error("notifyOwnersPaymentSuccess failed", err);
  }
}
