import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfileFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, credits_remaining, created_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Profil introuvable.");

    const { count: sessionsCompleted } = await context.supabase
      .from("test_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .not("completed_at", "is", null);

    return {
      ...data,
      email: (context.claims?.email as string) ?? "",
      sessionsCompleted: sessionsCompleted ?? 0,
    };
  });

const UpdateInput = z.object({
  firstName: z.string().trim().min(1, "Prénom requis.").max(80),
  lastName: z.string().trim().min(1, "Nom requis.").max(80),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ first_name: data.firstName, last_name: data.lastName })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });