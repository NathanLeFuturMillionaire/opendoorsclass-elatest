import { createServerFn } from "@tanstack/react-start";
import { rankCommunity, type CommunityReader } from "./rw-community";

export type PublicCommunityReader = CommunityReader & { photo_url: string | null };

/** Public, no-input: computed server-side from validated readings; returns no private fields. */
export const getRwCommunity = createServerFn({ method: "GET" }).handler(async (): Promise<PublicCommunityReader[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [learners, subs, lessons] = await Promise.all([
    supabaseAdmin.from("rw_learners").select("id, full_name, level, is_active, community_visible, photo_path"),
    supabaseAdmin.from("rw_submissions").select("learner_id, lesson_id, status, score, reviewed_at").eq("status", "validated"),
    supabaseAdmin.from("rw_lessons").select("id", { count: "exact", head: true }),
  ]);
  if (learners.error || subs.error) {
    console.error("rw community", learners.error ?? subs.error);
    return [];
  }
  const ranked = rankCommunity(learners.data ?? [], subs.data ?? [], lessons.count ?? 0);
  const photoOf = new Map((learners.data ?? []).map((l) => [l.id, l.photo_path]));
  const paths = ranked.flatMap((r) => (photoOf.get(r.id) ? [photoOf.get(r.id)!] : []));
  const signed = paths.length ? await supabaseAdmin.storage.from("rw-photos").createSignedUrls(paths, 3600) : { data: [] };
  const urls = new Map((signed.data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));
  return ranked.map((r) => {
    const p = photoOf.get(r.id);
    return { ...r, photo_url: p ? urls.get(p) ?? null : null };
  });
});
