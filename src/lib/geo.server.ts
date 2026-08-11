import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Pays du visiteur (ISO alpha-2) déduit de l'adresse IP par l'infrastructure.
 * Retourne null si aucun en-tête fiable n'est disponible.
 */
export function detectCountryFromRequest(): string | null {
  const raw =
    getRequestHeader("cf-ipcountry") ??
    getRequestHeader("x-vercel-ip-country") ??
    getRequestHeader("x-country-code") ??
    null;
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1") return null;
  return code;
}
