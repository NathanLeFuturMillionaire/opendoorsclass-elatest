import { createServerFn } from "@tanstack/react-start";
import { computeReadingStats, countCountries, type PublicStats } from "./public-stats";

let cache: { at: number; data: PublicStats } | null = null;
const TTL = 10 * 60 * 1000;

async function all<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

/** Public aggregate only statistics for the homepage. Never returns names, emails or ids. */
export const getPublicStats = createServerFn({ method: "GET" }).handler(async (): Promise<PublicStats> => {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

  const [registered, profiles, sessions, subs, answers, learners] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    all<{ country: string | null; phone_country: string | null }>((a, b) =>
      db.from("profiles").select("country, phone_country").range(a, b),
    ),
    all<{ user_id: string }>((a, b) =>
      db.from("test_sessions").select("user_id").not("completed_at", "is", null).range(a, b),
    ),
    all<{ id: string; learner_id: string; lesson_id: string; status: string; score: number | null }>((a, b) =>
      db.from("rw_submissions").select("id, learner_id, lesson_id, status, score").range(a, b),
    ),
    all<{ learner_id: string }>((a, b) => db.from("rw_answers").select("learner_id").range(a, b)),
    all<{ id: string; user_id: string | null }>((a, b) => db.from("rw_learners").select("id, user_id").range(a, b)),
  ]);
  if (registered.error) throw registered.error;

  const { countries, known } = countCountries(profiles);
  const rw = computeReadingStats(subs, answers.map((a) => a.learner_id));
  const learnerUser = new Map(learners.map((l) => [l.id, l.user_id]));
  const users = new Set(sessions.map((s) => s.user_id));
  for (const id of [...subs.map((s) => s.learner_id), ...answers.map((a) => a.learner_id)]) {
    const u = learnerUser.get(id);
    if (u) users.add(u);
  }

  const data: PublicStats = {
    registered: registered.count ?? 0,
    countries,
    countriesKnownAccounts: known,
    completedTests: sessions.length,
    serviceUsers: users.size,
    rw,
    updatedAt: new Date().toISOString(),
  };
  cache = { at: Date.now(), data };
  return data;
});
