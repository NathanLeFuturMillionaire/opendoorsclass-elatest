import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "owner" | "admin" | "moderator" | "user";

async function getRoles(supabase: any, userId: string): Promise<Role[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role as Role);
}

function requireRole(roles: Role[], allowed: Role[]) {
  if (!roles.some((r) => allowed.includes(r))) {
    throw new Error("Forbidden: droits insuffisants.");
  }
}

async function logAction(action: string, entity?: { type?: string; id?: string }, metadata: Record<string, unknown> = {}) {
  try {
    const req = getRequest();
    const ip = req?.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
    const ua = req?.headers.get("user-agent") ?? null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_activity_log").insert({
      user_id: metadata.actor_id as string | undefined,
      action,
      entity_type: entity?.type ?? null,
      entity_id: entity?.id ?? null,
      metadata: metadata as any,
      ip_address: ip,
      user_agent: ua,
    } as any);
  } catch (e) {
    console.error("logAction failed", e);
  }
}

export const getAdminContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const isOwner = roles.includes("owner");
    const isAdmin = isOwner || roles.includes("admin");
    const isModerator = isAdmin || roles.includes("moderator");
    return { roles, isOwner, isAdmin, isModerator, userId: context.userId };
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_dashboard_stats");
    if (error) throw new Error(error.message);
    return data as Record<string, any>;
  });

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { search?: string; limit?: number } | undefined) => v ?? {})
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin", "moderator"]);
    let q = context.supabase
      .from("profiles")
      .select("id, first_name, last_name, candidate_number, nationality, credits_remaining, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.search) {
      q = q.or(
        `first_name.ilike.%${data.search}%,last_name.ilike.%${data.search}%,candidate_number.ilike.%${data.search}%`
      );
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: any) => r.id);
    const [{ data: statuses }, { data: sessions }] = await Promise.all([
      context.supabase.from("candidate_status").select("user_id, suspended").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      context.supabase
        .from("test_sessions")
        .select("user_id, level_result, score, completed_at")
        .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
        .not("completed_at", "is", null),
    ]);

    const statusMap = new Map((statuses ?? []).map((s: any) => [s.user_id, s.suspended]));
    const sessionMap = new Map<string, { count: number; best: number; last_level: string | null }>();
    for (const s of sessions ?? []) {
      const cur = sessionMap.get(s.user_id) ?? { count: 0, best: 0, last_level: null };
      cur.count += 1;
      cur.best = Math.max(cur.best, Number(s.score ?? 0));
      if (!cur.last_level) cur.last_level = s.level_result;
      sessionMap.set(s.user_id, cur);
    }
    return (rows ?? []).map((r: any) => ({
      ...r,
      suspended: statusMap.get(r.id) ?? false,
      test_count: sessionMap.get(r.id)?.count ?? 0,
      best_score: sessionMap.get(r.id)?.best ?? 0,
      last_level: sessionMap.get(r.id)?.last_level ?? null,
    }));
  });

export const suspendCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { userId: string; suspended: boolean; reason?: string }) => v)
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Protection: pas de suspension d'un owner
    const { data: targetRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
    if ((targetRoles ?? []).some((r: any) => r.role === "owner")) {
      throw new Error("Le propriétaire ne peut pas être suspendu.");
    }
    const { error } = await supabaseAdmin.from("candidate_status").upsert({
      user_id: data.userId,
      suspended: data.suspended,
      suspended_at: data.suspended ? new Date().toISOString() : null,
      suspended_by: data.suspended ? context.userId : null,
      reason: data.reason ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    await logAction(data.suspended ? "candidate.suspend" : "candidate.reactivate", { type: "user", id: data.userId }, { actor_id: context.userId });
    return { ok: true };
  });

export const deleteCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { userId: string }) => v)
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: targetRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
    if ((targetRoles ?? []).some((r: any) => r.role === "owner")) {
      throw new Error("Le propriétaire ne peut pas être supprimé.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAction("candidate.delete", { type: "user", id: data.userId }, { actor_id: context.userId });
    return { ok: true };
  });

export const adjustCandidateCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { userId: string; delta: number; reason?: string }) => v)
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin"]);
    if (!Number.isInteger(data.delta) || data.delta === 0) {
      throw new Error("Valeur invalide.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, credits_remaining")
      .eq("id", data.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Candidat introuvable.");
    const next = Math.max(0, (profile.credits_remaining ?? 0) + data.delta);
    const { error: uErr } = await supabaseAdmin
      .from("profiles")
      .update({ credits_remaining: next })
      .eq("id", data.userId);
    if (uErr) throw new Error(uErr.message);
    await logAction(
      "candidate.credits_adjust",
      { type: "user", id: data.userId },
      { actor_id: context.userId, meta: { delta: data.delta, reason: data.reason ?? null, new_balance: next } }
    );
    return { ok: true, credits: next };
  });

export const getCandidateDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { userId: string }) => v)
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin", "moderator"]);
    const [{ data: profile }, { data: sessions }, { data: status }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      context.supabase
        .from("test_sessions")
        .select("id, started_at, completed_at, score, level_result, duration_seconds")
        .eq("user_id", data.userId)
        .order("started_at", { ascending: false }),
      context.supabase.from("candidate_status").select("*").eq("user_id", data.userId).maybeSingle(),
    ]);
    return { profile, sessions: sessions ?? [], status };
  });

export const listAllReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { status?: "pending" | "approved" | "rejected" | "all" } | undefined) => v ?? {})
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin", "moderator"]);
    let q = context.supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { id: string; action: "approve" | "reject" | "delete" }) => v)
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin", "moderator"]);
    if (data.action === "delete") {
      const { error } = await context.supabase.from("reviews").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("reviews")
        .update({ status: data.action === "approve" ? "approved" : "rejected" })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    await logAction(`review.${data.action}`, { type: "review", id: data.id }, { actor_id: context.userId });
    return { ok: true };
  });

const questionSchema = z.object({
  id: z.string().optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  category: z.enum(["grammar", "vocabulary", "reading", "listening", "speaking"]),
  question_text: z.string().min(3),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct_answer: z.string().min(1),
  audio_url: z.string().url().nullable().optional(),
  order_hint: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const listQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin"]);
    const { data, error } = await context.supabase
      .from("questions")
      .select("*")
      .order("level")
      .order("order_hint");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => questionSchema.parse(v))
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin"]);
    const payload = {
      level: data.level,
      category: data.category,
      question_text: data.question_text,
      options: data.options,
      correct_answer: data.correct_answer,
      audio_url: data.audio_url ?? null,
      order_hint: data.order_hint ?? 0,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await context.supabase.from("questions").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAction("question.update", { type: "question", id: data.id }, { actor_id: context.userId });
    } else {
      const { error, data: inserted } = await context.supabase.from("questions").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      await logAction("question.create", { type: "question", id: inserted?.id }, { actor_id: context.userId });
    }
    return { ok: true };
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { id: string }) => v)
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin"]);
    const { error } = await context.supabase.from("questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction("question.delete", { type: "question", id: data.id }, { actor_id: context.userId });
    return { ok: true };
  });

export const listCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin", "moderator"]);
    const { data: sessions, error } = await context.supabase
      .from("test_sessions")
      .select("id, user_id, score, level_result, completed_at")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((sessions ?? []).map((s: any) => s.user_id)));
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, first_name, last_name, candidate_number")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const m = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return (sessions ?? []).map((s: any) => ({ ...s, profile: m.get(s.user_id) ?? null }));
  });

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const ids = Array.from(new Set((roleRows ?? []).map((r: any) => r.user_id)));
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, candidate_number")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map(users?.users.map((u: any) => [u.id, u.email]) ?? []);
    const profileMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const byUser = new Map<string, { user_id: string; email: string | null; profile: any; roles: string[] }>();
    for (const r of roleRows ?? []) {
      const cur = byUser.get(r.user_id) ?? {
        user_id: r.user_id,
        email: emailMap.get(r.user_id) ?? null,
        profile: profileMap.get(r.user_id) ?? null,
        roles: [] as string[],
      };
      cur.roles.push((r as any).role);
      byUser.set(r.user_id, cur);
    }
    return Array.from(byUser.values()).sort((a, b) => (a.roles.includes("owner") ? -1 : b.roles.includes("owner") ? 1 : 0));
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { userId: string; role: "admin" | "moderator" }) => v)
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role as any });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    await logAction("role.grant", { type: "user", id: data.userId }, { actor_id: context.userId, role: data.role });
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { userId: string; role: "admin" | "moderator" }) => v)
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner"]);
    if (data.role === ("owner" as any)) throw new Error("Le rôle propriétaire ne peut pas être révoqué.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role as any);
    if (error) throw new Error(error.message);
    await logAction("role.revoke", { type: "user", id: data.userId }, { actor_id: context.userId, role: data.role });
    return { ok: true };
  });

export const listActivityLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { limit?: number } | undefined) => v ?? {})
  .handler(async ({ context, data }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner", "admin"]);
    const { data: rows, error } = await context.supabase
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)));
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const m = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r: any) => ({ ...r, actor: r.user_id ? m.get(r.user_id) : null }));
  });

// ============================================================
// FINANCE (owner only)
// ============================================================

export const getFinanceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    requireRole(roles, ["owner"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payments, error } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, amount, currency, credits_added, status, payment_method, provider, moneroo_reference, moneroo_transaction_id, chariow_sale_id, created_at, confirmed_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const list = payments ?? [];
    const success = list.filter((p: any) => p.status === "success");

    const userIds = Array.from(new Set(list.map((p: any) => p.user_id)));
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, nationality, candidate_number")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map((users?.users ?? []).map((u: any) => [u.id, u.email]));
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    // Best level per user
    const { data: sessions } = await supabaseAdmin
      .from("test_sessions")
      .select("user_id, level_result, score, completed_at")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"])
      .not("completed_at", "is", null);
    const levelMap = new Map<string, string>();
    for (const s of sessions ?? []) {
      if (!levelMap.has(s.user_id) && s.level_result) levelMap.set(s.user_id, s.level_result);
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfDay - ((now.getDay() + 6) % 7) * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let totalRevenue = 0;
    let todayCount = 0, todayAmount = 0;
    let weekCount = 0, weekAmount = 0;
    let monthCount = 0, monthAmount = 0;
    let biggest = 0;
    const byDay = new Map<string, { amount: number; count: number }>();
    const byMonth = new Map<string, { amount: number; count: number }>();
    const byCountry = new Map<string, { amount: number; count: number }>();
    const byMethod = new Map<string, { amount: number; count: number }>();

    for (const p of success as any[]) {
      const t = new Date(p.confirmed_at ?? p.created_at).getTime();
      const amt = Number(p.amount ?? 0);
      totalRevenue += amt;
      if (amt > biggest) biggest = amt;
      if (t >= startOfDay) { todayCount++; todayAmount += amt; }
      if (t >= startOfWeek) { weekCount++; weekAmount += amt; }
      if (t >= startOfMonth) { monthCount++; monthAmount += amt; }

      const d = new Date(t);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const dCur = byDay.get(dayKey) ?? { amount: 0, count: 0 };
      dCur.amount += amt; dCur.count += 1; byDay.set(dayKey, dCur);
      const mCur = byMonth.get(monthKey) ?? { amount: 0, count: 0 };
      mCur.amount += amt; mCur.count += 1; byMonth.set(monthKey, mCur);

      const prof: any = profMap.get(p.user_id);
      const country = prof?.nationality ?? "Inconnu";
      const cCur = byCountry.get(country) ?? { amount: 0, count: 0 };
      cCur.amount += amt; cCur.count += 1; byCountry.set(country, cCur);

      const method = (p.payment_method ?? p.provider ?? "autre").toString();
      const meCur = byMethod.get(method) ?? { amount: 0, count: 0 };
      meCur.amount += amt; meCur.count += 1; byMethod.set(method, meCur);
    }

    const dailySeries: Array<{ day: string; amount: number; count: number }> = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(startOfDay - i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const v = byDay.get(key) ?? { amount: 0, count: 0 };
      dailySeries.push({ day: key, amount: v.amount, count: v.count });
    }
    const monthlySeries: Array<{ month: string; amount: number; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const v = byMonth.get(key) ?? { amount: 0, count: 0 };
      monthlySeries.push({ month: key, amount: v.amount, count: v.count });
    }

    const topCountries = Array.from(byCountry.entries())
      .map(([country, v]) => ({ country, ...v, percentage: totalRevenue ? (v.amount / totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const methodBreakdown = Array.from(byMethod.entries())
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.amount - a.amount);

    const paidUsers = new Set(success.map((p: any) => p.user_id)).size;
    const { count: totalCandidates } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    const conversion = totalCandidates ? (paidUsers / totalCandidates) * 100 : 0;

    const rows = list.map((p: any) => {
      const prof: any = profMap.get(p.user_id);
      return {
        id: p.id,
        created_at: p.created_at,
        confirmed_at: p.confirmed_at,
        first_name: prof?.first_name ?? null,
        last_name: prof?.last_name ?? null,
        email: emailMap.get(p.user_id) ?? null,
        candidate_number: prof?.candidate_number ?? null,
        country: prof?.nationality ?? null,
        amount: p.amount,
        currency: p.currency,
        credits_added: p.credits_added,
        method: p.payment_method ?? p.provider ?? "chariow",
        status: p.status,
        reference: p.moneroo_reference,
        transaction_id: p.moneroo_transaction_id ?? p.chariow_sale_id,
        level: levelMap.get(p.user_id) ?? null,
      };
    });

    return {
      totals: {
        revenue: totalRevenue,
        count: success.length,
        avgTicket: success.length ? Math.round(totalRevenue / success.length) : 0,
        biggest,
        paidUsers,
        totalCandidates: totalCandidates ?? 0,
        conversion,
      },
      today: { count: todayCount, amount: todayAmount },
      week: { count: weekCount, amount: weekAmount },
      month: { count: monthCount, amount: monthAmount },
      dailySeries,
      monthlySeries,
      topCountries,
      methodBreakdown,
      rows,
    };
  });