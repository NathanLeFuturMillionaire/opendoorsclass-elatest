export type RwActivePermission = {
  isStaff: boolean;
  kind: "learner" | "coach";
  active: boolean;
  ownLearner?: boolean;
};

/** Pure mirror of the database permission rule for reversible removals. */
export function rwCanChangeActive({ isStaff, kind, active, ownLearner = false }: RwActivePermission): boolean {
  if (active) return isStaff;
  if (kind === "coach") return isStaff;
  return isStaff || ownLearner;
}
