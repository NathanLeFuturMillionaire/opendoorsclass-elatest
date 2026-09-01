import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: the VAPID public key is safe to expose, the private key never leaves the server. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env["VAPID_PUBLIC_KEY"] ?? null };
});

const SubscriptionInput = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(10).max(500),
  auth: z.string().min(4).max(500),
  deviceName: z.string().max(120).nullable().optional(),
  browser: z.string().max(120).nullable().optional(),
  platform: z.string().max(120).nullable().optional(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubscriptionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        device_name: data.deviceName ?? null,
        browser: data.browser ?? null,
        platform: data.platform ?? null,
        is_active: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deactivatePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .update({ is_active: false })
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("push_subscriptions")
      .select("id, device_name, browser, platform, is_active, last_used_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { devices: data ?? [] };
  });

export const removeDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notification_preferences")
      .select("push_enabled, payment_enabled, student_enabled, attendance_enabled, system_enabled, locale")
      .eq("user_id", context.userId)
      .maybeSingle();
    return (
      data ?? {
        push_enabled: true,
        payment_enabled: true,
        student_enabled: false,
        attendance_enabled: false,
        system_enabled: true,
        locale: "fr",
      }
    );
  });

const PrefsInput = z.object({
  push_enabled: z.boolean().optional(),
  payment_enabled: z.boolean().optional(),
  student_enabled: z.boolean().optional(),
  attendance_enabled: z.boolean().optional(),
  system_enabled: z.boolean().optional(),
  locale: z.enum(["fr", "en", "es"]).optional(),
});

export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PrefsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_preferences")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sends a real push to the caller's own devices. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUser } = await import("@/lib/push.server");
    const res = await sendPushToUser({
      userId: context.userId,
      content: {
        title: "🔔 OpenDoorsClass, test",
        body: "Les notifications Push fonctionnent correctement.",
        url: "/admin/notifications",
        actionLabel: "Ouvrir le centre de notifications",
        tag: `test-${Date.now()}`,
      },
      eventKey: `TEST:${context.userId}:${Date.now()}`,
    });
    return res;
  });

/** Owner-only diagnostics for Admin, Settings, Notifications. */
export const getPushDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isOwner) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const configured = Boolean(process.env["VAPID_PUBLIC_KEY"] && process.env["VAPID_PRIVATE_KEY"]);

    const { data: owners } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner");
    const ownerIds = Array.from(new Set((owners ?? []).map((r) => r.user_id as string)));

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", ownerIds.length ? ownerIds : ["00000000-0000-0000-0000-000000000000"]);

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("user_id, is_active")
      .in("user_id", ownerIds.length ? ownerIds : ["00000000-0000-0000-0000-000000000000"]);

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: deliveries } = await supabaseAdmin
      .from("notification_deliveries")
      .select("status, created_at, event_key")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    const rows = deliveries ?? [];
    return {
      configured,
      owners: ownerIds.map((id) => {
        const p = (profiles ?? []).find((x) => x.id === id);
        return {
          userId: id,
          name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Propriétaire",
          activeDevices: (subs ?? []).filter((s) => s.user_id === id && s.is_active).length,
        };
      }),
      today: {
        total: rows.length,
        sent: rows.filter((r) => r.status === "sent").length,
        failed: rows.filter((r) => r.status === "failed").length,
        expired: rows.filter((r) => r.status === "expired").length,
      },
      last: rows[0]
        ? { at: rows[0].created_at as string, status: rows[0].status as string, eventKey: rows[0].event_key as string | null }
        : null,
    };
  });
