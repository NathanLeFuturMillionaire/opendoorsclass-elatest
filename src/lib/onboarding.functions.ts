import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Complète le profil avec les données fournies par le fournisseur d'identité
 * (Google : prénom, nom, photo) et indique si le numéro WhatsApp manque encore.
 */
export const syncIdentityProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = (context.claims ?? {}) as Record<string, any>;
    const meta = (claims['user_metadata'] ?? {}) as Record<string, any>;

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url, phone, phone_country")
      .eq("id", context.userId)
      .maybeSingle();

    const fullName: string = meta['full_name'] ?? meta['name'] ?? "";
    const [fallbackFirst, ...restName] = fullName.trim().split(/\s+/);
    const patch: Record<string, unknown> = {};

    if (!profile?.first_name) {
      const first = meta['given_name'] ?? meta['first_name'] ?? fallbackFirst;
      if (first) patch['first_name'] = String(first).slice(0, 60);
    }
    if (!profile?.last_name) {
      const last = meta['family_name'] ?? meta['last_name'] ?? restName.join(" ");
      if (last) patch['last_name'] = String(last).slice(0, 60);
    }
    if (!profile?.avatar_url) {
      const avatar = meta['avatar_url'] ?? meta['picture'];
      if (typeof avatar === "string" && /^https:\/\//.test(avatar)) patch['avatar_url'] = avatar.slice(0, 500);
    }
    if (!profile?.phone && typeof meta['phone'] === "string" && meta['phone'].startsWith("+")) {
      patch['phone'] = meta['phone'];
      if (typeof meta['phone_country'] === "string") patch['phone_country'] = meta['phone_country'];
    }

    if (Object.keys(patch).length > 0) {
      await context.supabase.from("profiles").update(patch as any).eq("id", context.userId);
    }

    const phone = (patch['phone'] as string | undefined) ?? profile?.phone ?? null;
    return {
      phone,
      phoneCountry: (patch['phone_country'] as string | undefined) ?? profile?.phone_country ?? null,
      needsPhone: !phone,
    };
  });

const PhoneInput = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,15}$/, "Numéro international invalide."),
  countryCode: z.string().trim().length(2),
});

/** Enregistre le numéro WhatsApp du candidat, au format international E.164. */
export const setMyPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => PhoneInput.parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ phone: data.phone, phone_country: data.countryCode.toUpperCase() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
