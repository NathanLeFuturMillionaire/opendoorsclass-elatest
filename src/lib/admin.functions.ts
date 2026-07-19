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
      metadata,
      ip_address: ip,
      user_agent: ua,
    });
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
  category: z.enum(["grammar", "vocabulary", "reading", "listening", "speaking", "writing"]),
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
        roles: [],
      };
      cur.roles.push(r.role);
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
      .insert({ user_id: data.userId, role: data.role });
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
      .eq("role", data.role);
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