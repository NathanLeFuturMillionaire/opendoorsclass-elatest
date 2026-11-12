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
      .select("id, full_name, level, is_active")
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
