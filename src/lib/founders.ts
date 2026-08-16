/**
 * Logique centralisee des statuts publics OpenDoorsClass.
 * Un seul endroit definit qui est Founder / Co-Founder.
 * Extensible: ajoutez une entree dans PUBLIC_ROLES.
 */
export type PublicRole = "founder" | "cofounder";

type PublicRoleEntry = {
  role: PublicRole;
  userId: string;
  candidateNumber: string;
};

export const PUBLIC_ROLES: PublicRoleEntry[] = [
  {
    role: "founder",
    userId: "8d1a1e74-82e5-4cb5-a3bd-2ad434f5c262",
    candidateNumber: "ODC-2026-8D1A1E",
  },
  {
    role: "cofounder",
    userId: "8b132b74-1eb5-40c3-a9ed-48023cce3722",
    candidateNumber: "ODC-2026-8B132B",
  },
];

/**
 * Retourne le statut public d'un membre a partir de son identifiant technique
 * ou de son numero de candidat. Retourne null pour un membre regulier.
 */
export function getPublicRole(
  identifiers: { userId?: string | null; candidateNumber?: string | null } | null | undefined,
): PublicRole | null {
  if (!identifiers) return null;
  const uid = identifiers.userId?.trim().toLowerCase() ?? null;
  const num = identifiers.candidateNumber?.trim().toUpperCase() ?? null;
  for (const entry of PUBLIC_ROLES) {
    if (uid && uid === entry.userId) return entry.role;
    if (num && num === entry.candidateNumber) return entry.role;
  }
  return null;
}

export const FOUNDER_ROLE_KEY: Record<PublicRole, string> = {
  founder: "role.founder",
  cofounder: "role.cofounder",
};
