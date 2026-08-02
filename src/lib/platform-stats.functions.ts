import { createServerFn } from "@tanstack/react-start";

export type PlatformStats = {
  learners: number;
  certificates: number;
  countries: number;
  tests: number;
};

/** Public, aggregate only counters used as social proof on the auth screens. */
export const getPlatformStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [learnersRes, certRes, testsRes, countriesRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("test_sessions")
        .select("id", { count: "exact", head: true })
        .not("completed_at", "is", null)
        .not("level_result", "is", null),
      supabaseAdmin.from("test_sessions").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("country, nationality").limit(2000),
    ]);

    const set = new Set<string>();
    for (const row of countriesRes.data ?? []) {
      const v = (row.country ?? row.nationality ?? "").trim();
      if (v) set.add(v.slice(0, 2).toUpperCase());
    }

    return {
      learners: learnersRes.count ?? 0,
      certificates: certRes.count ?? 0,
      countries: set.size,
      tests: testsRes.count ?? 0,
    };
  },
);
