import { createServerFn } from "@tanstack/react-start";

/** Pays détecté côté serveur à partir de l'adresse IP du visiteur. */
export const detectVisitorCountry = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ country: string | null }> => {
    const { detectCountryFromRequest } = await import("@/lib/geo.server");
    return { country: detectCountryFromRequest() };
  },
);
