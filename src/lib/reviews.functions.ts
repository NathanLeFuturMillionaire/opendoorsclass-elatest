import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const ReviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  comment: z.string().trim().min(20).max(1000),
  country: z.string().trim().max(80).optional().nullable(),
  displayName: z.string().trim().max(80).optional().nullable(),
});

export const submitMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const clean = (s: string) => s.replace(/[—–]/g, ",");
    const { data: last } = await context.supabase
      .from("test_sessions")
      .select("level_result")
      .eq("user_id", context.userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Upsert: one active review per user.
    const { data: existing } = await context.supabase
      .from("reviews")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const payload = {
      user_id: context.userId,
      rating: data.rating,
      title: clean(data.title),
      comment: clean(data.comment),
      country: data.country ? clean(data.country) : null,
      display_name: data.displayName ? clean(data.displayName) : null,
      level_achieved: last?.level_result ?? null,
      status: "pending",
    };

    if (existing) {
      const { error } = await context.supabase
        .from("reviews")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("reviews").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const getMyReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("reviews")
      .select("id, rating, title, comment, country, display_name, status, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data;
  });

// Public: approved reviews for the landing carousel.
export const listPublicReviews = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client
    .from("reviews")
    .select("id, user_id, rating, title, comment, country, display_name, level_achieved, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);
  const reviews = data ?? [];
  if (reviews.length === 0) return [];
  const userIds = Array.from(new Set(reviews.map((r) => r.user_id).filter(Boolean))) as string[];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("id, avatar_url")
    .in("id", userIds);
  const avatarByUser = new Map((profs ?? []).map((p: any) => [p.id, p.avatar_url as string | null]));
  return reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    country: r.country,
    display_name: r.display_name,
    level_achieved: r.level_achieved,
    created_at: r.created_at,
    avatar_url: avatarByUser.get(r.user_id) ?? null,
  }));
});