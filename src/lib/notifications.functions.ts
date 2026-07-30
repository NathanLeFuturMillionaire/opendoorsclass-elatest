import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  category: string;
  icon: string;
  action_url: string | null;
  action_label: string | null;
  is_read: boolean;
  created_at: string;
};

const FILTERS = ["all", "unread", "payments", "achievements", "leaderboard", "system"] as const;
export type NotificationFilter = (typeof FILTERS)[number];

const ListInput = z.object({
  filter: z.enum(FILTERS).default("all"),
  limit: z.number().int().min(1).max(50).default(10),
  cursor: z.string().datetime().nullable().optional(),
});

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("notifications")
      .select("id, title, message, category, icon, action_url, action_label, is_read, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit + 1);

    if (data.filter === "unread") query = query.eq("is_read", false);
    else if (data.filter !== "all") query = query.eq("category", data.filter);
    if (data.cursor) query = query.lt("created_at", data.cursor);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const items = (rows ?? []) as NotificationRow[];
    const hasMore = items.length > data.limit;
    const page = hasMore ? items.slice(0, data.limit) : items;
    return {
      items: page,
      nextCursor: hasMore ? (page[page.length - 1]?.created_at ?? null) : null,
    };
  });

export const getUnreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", context.userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReadNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .delete()
      .eq("user_id", context.userId)
      .eq("is_read", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Records the "Welcome back" notification, at most once per 6 hours. */
export const notifySignIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { pushNotification, NotificationTemplates } = await import("@/lib/notifications.server");
    await pushNotification(NotificationTemplates.welcomeBack(context.userId));
    return { ok: true };
  });
