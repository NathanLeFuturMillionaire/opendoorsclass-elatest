import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Only visible reviews authorize public access to the associated reader portrait. */
export const getRwPublicReviews = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error("Les avis sont temporairement indisponibles.");
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await db.rpc("rw_public_reviews");
  if (error) throw new Error("Les avis sont temporairement indisponibles.");
  const reviews = data ?? [];
  if (!reviews.length) return [];

  // Privileged access is solely for signing portraits of already public reviews.
  // No caller-supplied identifiers, storage paths or private learner data are returned.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: portraits } = await supabaseAdmin.from("rw_reviews")
    .select("id, rw_learners(photo_path)")
    .eq("is_visible", true).in("id", reviews.map((review) => review.id));
  const paths = [...new Set((portraits ?? []).flatMap((row) => row.rw_learners?.photo_path ? [row.rw_learners.photo_path] : []))];
  const signed = paths.length
    ? await supabaseAdmin.storage.from("rw-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const urls = new Map((signed.data ?? []).flatMap((row) => row.path && row.signedUrl ? [[row.path, row.signedUrl] as const] : []));
  const photos = new Map((portraits ?? []).map((row) => [row.id, row.rw_learners?.photo_path]));
  return reviews.map((review) => {
    const path = photos.get(review.id);
    return { ...review, photo_url: path ? urls.get(path) ?? null : null };
  });
});