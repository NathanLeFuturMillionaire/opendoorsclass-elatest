import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RwSpace = "admin" | "coach" | "learner" | "none";

/** Reading Workshop role context for the signed-in user. RLS scopes every read. */
export const getRwContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: staff }, { data: coach }, { data: learner }] = await Promise.all([
      supabase.rpc("rw_is_staff", { _uid: userId }),
      supabase.from("rw_coaches").select("id, full_name, is_active").eq("user_id", userId).maybeSingle(),
      supabase
        .from("rw_learners")
        .select("id, full_name, level, coach_id, is_active")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const isStaff = staff === true;
    const isCoach = !!coach?.is_active;
    const isLearner = !!learner?.is_active;
    const home: RwSpace = isStaff ? "admin" : isCoach ? "coach" : isLearner ? "learner" : "none";
    return { isStaff, isCoach, isLearner, home, coach: coach ?? null, learner: learner ?? null };
  });

/** Admin overview counts (staff only). */
export const getRwAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("rw_is_staff", { _uid: userId });
    if (staff !== true) throw new Error("Accès réservé aux administrateurs.");
    const count = async (t: "rw_learners" | "rw_coaches" | "rw_lessons") =>
      (await supabase.from(t).select("id", { count: "exact", head: true })).count ?? 0;
    const [learners, coaches, lessons] = await Promise.all([
      count("rw_learners"),
      count("rw_coaches"),
      count("rw_lessons"),
    ]);
    return { learners, coaches, lessons };
  });

/** Coach: assigned learners (RLS limits to own learners). */
export const listRwCoachLearners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rw_learners")
      .select("id, full_name, level, is_active, photo_path, start_date")
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Published lessons visible to the caller (RLS: learner sees own level only). */
export const listRwLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rw_lessons")
      .select("id, title, level, word_count, mention, status, session_id")
      .order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

type Level = "A1" | "A2" | "B1" | "B2" | "C1";
const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("rw_is_staff", { _uid: userId });
  if (data !== true) throw new Error("Accès réservé aux administrateurs.");
}

/** Signs private photo paths. Callers must first read the owning row through RLS. */
async function signPhotos(paths: (string | null)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (!list.length) return {} as Record<string, string>;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("rw-photos").createSignedUrls(list, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Staff: all learners and coaches with photo URLs. */
export const listRwPeople = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const [{ data: learners, error: e1 }, { data: coaches, error: e2 }] = await Promise.all([
      supabase.from("rw_learners").select("id, user_id, full_name, email, photo_path, level, coach_id, is_active, start_date").order("created_at", { ascending: false }),
      supabase.from("rw_coaches").select("id, user_id, full_name, email, photo_path, bio, is_active").order("full_name"),
    ]);
    if (e1 || e2) throw new Error((e1 ?? e2)!.message);
    const urls = await signPhotos([...(learners ?? []), ...(coaches ?? [])].map((r) => r.photo_path));
    const withUrl = <T extends { photo_path: string | null }>(r: T) => ({ ...r, photo_url: r.photo_path ? urls[r.photo_path] ?? null : null });
    return { learners: (learners ?? []).map(withUrl), coaches: (coaches ?? []).map(withUrl) };
  });

export type RwPersonInput = {
  kind: "learner" | "coach";
  id?: string;
  full_name: string;
  email?: string;
  photo_path?: string | null;
  is_active?: boolean;
  level?: Level;
  coach_id?: string | null;
  start_date?: string | null;
  bio?: string;
};

/** Staff: create or update a learner or coach. */
export const saveRwPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: RwPersonInput) => {
    const full_name = clean(v.full_name, 120);
    if (full_name.length < 2) throw new Error("Indiquez le nom complet.");
    const email = clean(v.email, 160).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) throw new Error("Adresse e-mail invalide.");
    if (v.kind === "learner" && v.level && !LEVELS.includes(v.level)) throw new Error("Niveau invalide.");
    return { ...v, full_name, email: email || null };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const common = { full_name: data.full_name, email: data.email, photo_path: data.photo_path ?? null, is_active: data.is_active ?? true };
    const row =
      data.kind === "learner"
        ? { ...common, level: data.level ?? "A1", coach_id: data.coach_id || null, start_date: data.start_date || null }
        : { ...common, bio: clean(data.bio, 600) || null };
    const table = data.kind === "learner" ? "rw_learners" : "rw_coaches";
    const q = data.id
      ? supabase.from(table).update(row as any).eq("id", data.id).select("id").single()
      : supabase.from(table).insert(row as any).select("id").single();
    const { data: saved, error } = await q;
    if (error) throw new Error(error.message);
    return { id: saved.id as string };
  });

/** Staff: generate a one-time sign-in link for a learner or coach and link the account. */
export const createRwAccessLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { kind: "learner" | "coach"; id: string }) => v)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const table = data.kind === "learner" ? "rw_learners" : "rw_coaches";
    const { data: person, error } = await supabase.from(table).select("id, email").eq("id", data.id).single();
    if (error || !person) throw new Error("Personne introuvable.");
    if (!person.email) throw new Error("Ajoutez d'abord une adresse e-mail.");
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const origin = getRequestHeader("origin") || "https://opendoorsclass-elatest.lovable.app";
    const redirectTo = `${origin}/reading-workshop/login`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let res = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: person.email, options: { redirectTo } });
    if (res.error) res = await supabaseAdmin.auth.admin.generateLink({ type: "invite", email: person.email, options: { redirectTo } }) as any;
    if (res.error || !res.data?.user) throw new Error("Impossible de créer le lien d'accès.");
    const { error: linkErr } = await supabase.from(table).update({ user_id: res.data.user.id } as any).eq("id", data.id);
    if (linkErr) throw new Error(linkErr.message.includes("duplicate") ? "Ce compte est déjà lié à une autre fiche." : linkErr.message);
    return { url: res.data.properties.action_link };
  });

/** Learner or coach: own card with photo and, for learners, the coach. */
export const getRwMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: learner }, { data: coach }] = await Promise.all([
      supabase.from("rw_learners").select("id, full_name, photo_path, level, coach_id, start_date").eq("user_id", userId).maybeSingle(),
      supabase.from("rw_coaches").select("id, full_name, photo_path").eq("user_id", userId).maybeSingle(),
    ]);
    let myCoach: { full_name: string; photo_path: string | null } | null = null;
    if (learner?.coach_id) {
      const { data } = await supabase.from("rw_coaches").select("full_name, photo_path").eq("id", learner.coach_id).maybeSingle();
      myCoach = data ?? null;
    }
    const urls = await signPhotos([learner?.photo_path ?? null, coach?.photo_path ?? null, myCoach?.photo_path ?? null]);
    const u = (p?: string | null) => (p ? urls[p] ?? null : null);
    return {
      learner: learner ? { ...learner, photo_url: u(learner.photo_path) } : null,
      coach: coach ? { ...coach, photo_url: u(coach.photo_path) } : null,
      myCoach: myCoach ? { full_name: myCoach.full_name, photo_url: u(myCoach.photo_path) } : null,
    };
  });
