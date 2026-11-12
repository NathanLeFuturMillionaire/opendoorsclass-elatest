/** Pure progress computations for the Reading Workshop (no I/O, fully testable). */
export const RW_TOTAL_WEEKS = 20;
export const RW_SESSIONS_PER_WEEK = 6;
export const RW_TOTAL_SESSIONS = RW_TOTAL_WEEKS * RW_SESSIONS_PER_WEEK;

export type RwProgressSub = {
  lesson_id: string;
  status: "submitted" | "redo" | "validated";
  score: number | null;
  created_at: string;
};

export type RwBadge = { id: string; label: string; hint: string; earned: boolean };

export type RwProgress = {
  validated: number;
  percent: number;
  pending: number;
  redo: number;
  totalSubmissions: number;
  averageScore: number | null;
  currentWeek: number;
  expected: number;
  behind: number;
  badges: RwBadge[];
  recommendations: string[];
};

const DAY = 86_400_000;

export function rwCurrentWeek(startDate: string | null | undefined, now: Date = new Date()): number {
  if (!startDate) return 1;
  const start = new Date(startDate + (startDate.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(start.getTime())) return 1;
  const days = Math.floor((now.getTime() - start.getTime()) / DAY);
  if (days < 0) return 1;
  return Math.min(RW_TOTAL_WEEKS, Math.floor(days / 7) + 1);
}

export function computeRwProgress(subs: RwProgressSub[], startDate: string | null | undefined, now: Date = new Date()): RwProgress {
  const safe = Array.isArray(subs) ? subs : [];
  const validatedSet = new Set(safe.filter((s) => s.status === "validated").map((s) => s.lesson_id));
  const validated = Math.min(validatedSet.size, RW_TOTAL_SESSIONS);
  // A lesson already validated no longer counts as pending or redo.
  const open = (st: RwProgressSub["status"]) => new Set(safe.filter((s) => s.status === st && !validatedSet.has(s.lesson_id)).map((s) => s.lesson_id)).size;
  const scores = safe.map((s) => s.score).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 20);
  const averageScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const currentWeek = rwCurrentWeek(startDate, now);
  const expected = Math.min(RW_TOTAL_SESSIONS, (currentWeek - 1) * RW_SESSIONS_PER_WEEK);
  const behind = Math.max(0, expected - validated);
  const redo = open("redo");
  const pending = open("submitted");

  const badges: RwBadge[] = [
    { id: "first", label: "Premiers pas", hint: "1 lecture validée", earned: validated >= 1 },
    { id: "ten", label: "Lecteur régulier", hint: "10 lectures validées", earned: validated >= 10 },
    { id: "thirty", label: "Cap des 30", hint: "30 lectures validées", earned: validated >= 30 },
    { id: "half", label: "Mi-parcours", hint: "60 lectures validées", earned: validated >= 60 },
    { id: "full", label: "Programme accompli", hint: "120 lectures validées", earned: validated >= RW_TOTAL_SESSIONS },
    { id: "bright", label: "Voix brillante", hint: "Moyenne de 16/20 sur 5 notes", earned: scores.length >= 5 && (averageScore ?? 0) >= 16 },
  ];

  const recommendations: string[] = [];
  if (redo > 0) recommendations.push(`Refaites ${redo === 1 ? "la lecture" : `les ${redo} lectures`} pour lesquelles votre coach demande une reprise.`);
  if (safe.length === 0) recommendations.push("Commencez par la première séance de la semaine dans la bibliothèque.");
  else if (behind > 0) recommendations.push(`Vous avez ${behind} séance${behind > 1 ? "s" : ""} de retard sur le rythme prévu. Une lecture par jour suffit pour rattraper.`);
  if (averageScore !== null && averageScore < 10) recommendations.push("Écoutez le texte en vitesse lente et répétez le vocabulaire clé avant d'enregistrer.");
  if (recommendations.length === 0) recommendations.push("Excellent rythme, continuez avec la séance suivante.");

  return {
    validated, percent: Math.round((validated / RW_TOTAL_SESSIONS) * 100), pending, redo,
    totalSubmissions: safe.length, averageScore, currentWeek, expected, behind, badges, recommendations,
  };
}

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rwReportCsv(rows: { name: string; level: string; coach: string; p: RwProgress }[]): string {
  const head = ["Apprenant", "Niveau", "Coach", "Semaine", "Lectures validées", "Progression %", "En attente", "Reprises", "Moyenne /20", "Retard (séances)"];
  const lines = rows.map(({ name, level, coach, p }) => [name, level, coach, p.currentWeek, p.validated, p.percent, p.pending, p.redo, p.averageScore, p.behind].map(csvCell).join(";"));
  return [head.join(";"), ...lines].join("\n");
}
