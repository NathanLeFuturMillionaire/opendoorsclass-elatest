export type RwLessonState = "locked" | "available" | "in_progress" | "submitted" | "resubmitted" | "redo" | "validated";

export type RwLessonAccess = "loading" | "ready" | "unavailable";

/** Distinguishes a pending lesson request from a confirmed unavailable lesson. */
export function rwLessonAccess(lesson: unknown, statesLoading: boolean): RwLessonAccess {
  if (lesson) return "ready";
  return statesLoading ? "loading" : "unavailable";
}

export const RW_LESSON_STATE_LABEL: Record<RwLessonState, string> = {
  locked: "Verrouillé",
  available: "Disponible",
  in_progress: "En cours",
  submitted: "Envoyé, en correction",
  resubmitted: "Nouvel envoi",
  redo: "Correction demandée",
  validated: "Validé",
};

export type RwStateRow = { lesson_id: string; title: string; week_number: number; day_index: number; pos: number; state: RwLessonState };

/** Pure mirror of the database rule: a lesson opens only when the previous one is validated, or after a manual unlock. */
export function computeRwStates(
  lessons: { id: string; validated: boolean; overridden?: boolean; lastStatus?: "submitted" | "redo" | "validated" | null; submissions?: number; answered?: boolean }[],
): RwLessonState[] {
  return lessons.map((l, i) => {
    const prevOk = i === 0 || lessons[i - 1].validated;
    if (l.validated) return "validated";
    if (!prevOk && !l.overridden) return "locked";
    if (l.lastStatus === "redo") return "redo";
    if (l.lastStatus === "submitted") return (l.submissions ?? 1) > 1 ? "resubmitted" : "submitted";
    if (l.answered) return "in_progress";
    return "available";
  });
}
