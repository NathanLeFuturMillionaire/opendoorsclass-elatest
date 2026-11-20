/** Pure progress and report computations for the Reading Workshop. */
export const RW_TOTAL_WEEKS = 20;
export const RW_SESSIONS_PER_WEEK = 6;
export const RW_TOTAL_SESSIONS = RW_TOTAL_WEEKS * RW_SESSIONS_PER_WEEK;

export type RwProgressSub = {
  lesson_id: string;
  status: "submitted" | "redo" | "validated";
  score: number | null;
  created_at: string;
  reviewed_at?: string | null;
  updated_at?: string | null;
  reading_score?: number | null;
  pronunciation_score?: number | null;
  fluency_score?: number | null;
};

export type RwProgressAnswer = {
  learner_id?: string;
  lesson_id: string;
  points: number | null;
  max_points: number;
  status: "auto_graded" | "pending" | "graded" | string;
  created_at: string;
  updated_at?: string | null;
};

export type RwBadge = { id: string; label: string; hint: string; earned: boolean };

export type RwSkillAverages = {
  reading: number | null;
  pronunciation: number | null;
  fluency: number | null;
};

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
  validatedThisWeek: number;
  previousWeekValidated: number;
  weeklyDelta: number;
  lastActivityAt: string | null;
  skills: RwSkillAverages;
  badges: RwBadge[];
  recommendations: string[];
};

export type RwWeekWindow = {
  start: Date;
  end: Date;
  key: string;
  label: string;
};

export type RwWeeklySummary = {
  window: RwWeekWindow;
  validated: number;
  target: number;
  percent: number;
  submissions: number;
  averageScore: number | null;
  comprehensionScore: number | null;
  pending: number;
  redo: number;
  skills: RwSkillAverages;
};

export type RwAlert = {
  id: string;
  tone: "action" | "warning" | "info";
  title: string;
  description: string;
};

const DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;
const validScore = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 20;

function average(values: (number | null | undefined)[]): number | null {
  const valid = values.filter(validScore);
  return valid.length ? round1(valid.reduce((sum, n) => sum + n, 0) / valid.length) : null;
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday to Monday, using the viewer's calendar. The end date is exclusive. */
export function rwWeekWindow(weeksAgo = 0, now: Date = new Date()): RwWeekWindow {
  const safeWeeks = Math.max(0, Math.min(260, Math.trunc(weeksAgo) || 0));
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day) - safeWeeks * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const lastDay = new Date(end);
  lastDay.setDate(lastDay.getDate() - 1);
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  return { start, end, key: localDateKey(start), label: `${fmt.format(start)} au ${fmt.format(lastDay)}` };
}

function inWindow(value: string | null | undefined, window: RwWeekWindow): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= window.start.getTime() && time < window.end.getTime();
}

function reviewDate(sub: RwProgressSub): string {
  return sub.reviewed_at ?? sub.updated_at ?? sub.created_at;
}

export function rwCurrentWeek(startDate: string | null | undefined, now: Date = new Date()): number {
  if (!startDate) return 1;
  const start = new Date(startDate + (startDate.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(start.getTime())) return 1;
  const days = Math.floor((now.getTime() - start.getTime()) / DAY);
  if (days < 0) return 1;
  return Math.min(RW_TOTAL_WEEKS, Math.floor(days / 7) + 1);
}

export function computeRwSkillAverages(subs: RwProgressSub[]): RwSkillAverages {
  return {
    reading: average(subs.map((s) => s.reading_score)),
    pronunciation: average(subs.map((s) => s.pronunciation_score)),
    fluency: average(subs.map((s) => s.fluency_score)),
  };
}

export function computeRwComprehensionScore(
  answers: RwProgressAnswer[],
  window?: RwWeekWindow,
): number | null {
  const graded = answers.filter(
    (a) =>
      a.status !== "pending" &&
      validScore(a.points) &&
      Number.isFinite(a.max_points) &&
      a.max_points > 0 &&
      (!window || inWindow(a.updated_at ?? a.created_at, window)),
  );
  const points = graded.reduce((sum, a) => sum + Math.min(a.points ?? 0, a.max_points), 0);
  const max = graded.reduce((sum, a) => sum + a.max_points, 0);
  return max ? round1((points / max) * 20) : null;
}

export function computeRwWeek(
  subs: RwProgressSub[],
  answers: RwProgressAnswer[],
  window: RwWeekWindow,
): RwWeeklySummary {
  const safe = Array.isArray(subs) ? subs : [];
  const validatedByLesson = new Map<string, RwProgressSub>();
  for (const sub of safe) {
    if (sub.status !== "validated" || !inWindow(reviewDate(sub), window)) continue;
    const previous = validatedByLesson.get(sub.lesson_id);
    if (!previous || new Date(reviewDate(sub)).getTime() > new Date(reviewDate(previous)).getTime()) {
      validatedByLesson.set(sub.lesson_id, sub);
    }
  }
  const validatedSubs = [...validatedByLesson.values()];
  const validatedLessons = new Set(safe.filter((s) => s.status === "validated").map((s) => s.lesson_id));
  const openCount = (status: RwProgressSub["status"]) =>
    new Set(
      safe
        .filter((s) => s.status === status && !validatedLessons.has(s.lesson_id))
        .map((s) => s.lesson_id),
    ).size;
  const validated = Math.min(validatedByLesson.size, RW_SESSIONS_PER_WEEK);
  return {
    window,
    validated: validatedByLesson.size,
    target: RW_SESSIONS_PER_WEEK,
    percent: Math.min(100, Math.round((validated / RW_SESSIONS_PER_WEEK) * 100)),
    submissions: safe.filter((s) => inWindow(s.created_at, window)).length,
    averageScore: average(validatedSubs.map((s) => s.score)),
    comprehensionScore: computeRwComprehensionScore(answers, window),
    pending: openCount("submitted"),
    redo: openCount("redo"),
    skills: computeRwSkillAverages(validatedSubs),
  };
}

export function buildRwWeeklySeries(
  subs: RwProgressSub[],
  answers: RwProgressAnswer[],
  now: Date = new Date(),
  count = 6,
): RwWeeklySummary[] {
  const safeCount = Math.max(1, Math.min(12, Math.trunc(count) || 6));
  return Array.from({ length: safeCount }, (_, index) =>
    computeRwWeek(subs, answers, rwWeekWindow(safeCount - index - 1, now)),
  );
}

export function computeRwProgress(
  subs: RwProgressSub[],
  startDate: string | null | undefined,
  now: Date = new Date(),
): RwProgress {
  const safe = Array.isArray(subs) ? subs : [];
  const validatedSet = new Set(safe.filter((s) => s.status === "validated").map((s) => s.lesson_id));
  const validated = Math.min(validatedSet.size, RW_TOTAL_SESSIONS);
  const open = (status: RwProgressSub["status"]) =>
    new Set(
      safe
        .filter((s) => s.status === status && !validatedSet.has(s.lesson_id))
        .map((s) => s.lesson_id),
    ).size;
  const scores = safe.map((s) => s.score).filter(validScore);
  const averageScore = average(scores);
  const currentWeek = rwCurrentWeek(startDate, now);
  const expected = Math.min(RW_TOTAL_SESSIONS, (currentWeek - 1) * RW_SESSIONS_PER_WEEK);
  const behind = Math.max(0, expected - validated);
  const redo = open("redo");
  const pending = open("submitted");
  const thisWeek = computeRwWeek(safe, [], rwWeekWindow(0, now));
  const previousWeek = computeRwWeek(safe, [], rwWeekWindow(1, now));
  const activityTimes = safe
    .flatMap((s) => [s.created_at, s.reviewed_at, s.updated_at])
    .filter((value): value is string => !!value)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  const lastActivityAt = activityTimes.length ? new Date(Math.max(...activityTimes)).toISOString() : null;

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
  if (thisWeek.validated < RW_SESSIONS_PER_WEEK && safe.length > 0 && behind === 0) {
    recommendations.push(`Encore ${RW_SESSIONS_PER_WEEK - Math.min(thisWeek.validated, RW_SESSIONS_PER_WEEK)} validation${RW_SESSIONS_PER_WEEK - thisWeek.validated > 1 ? "s" : ""} pour atteindre le rythme de six lectures cette semaine.`);
  }
  if (recommendations.length === 0) recommendations.push("Excellent rythme, continuez avec la séance suivante.");

  return {
    validated,
    percent: Math.round((validated / RW_TOTAL_SESSIONS) * 100),
    pending,
    redo,
    totalSubmissions: safe.length,
    averageScore,
    currentWeek,
    expected,
    behind,
    validatedThisWeek: thisWeek.validated,
    previousWeekValidated: previousWeek.validated,
    weeklyDelta: thisWeek.validated - previousWeek.validated,
    lastActivityAt,
    skills: computeRwSkillAverages(safe),
    badges,
    recommendations,
  };
}

export function buildRwAlerts(progress: RwProgress, now: Date = new Date()): RwAlert[] {
  const alerts: RwAlert[] = [];
  if (progress.redo > 0) {
    alerts.push({
      id: "redo",
      tone: "action",
      title: `${progress.redo} reprise${progress.redo > 1 ? "s" : ""} à travailler`,
      description: "Le retour du coach indique les passages à retravailler.",
    });
  }
  if (progress.pending > 0) {
    alerts.push({
      id: "pending",
      tone: "info",
      title: `${progress.pending} correction${progress.pending > 1 ? "s" : ""} en attente`,
      description: "La validation du coach ouvre la lecture suivante.",
    });
  }
  if (progress.behind >= 2) {
    alerts.push({
      id: "behind",
      tone: "warning",
      title: `${progress.behind} séances de retard`,
      description: "Privilégiez une lecture courte chaque jour pour retrouver le rythme.",
    });
  }
  if (progress.lastActivityAt) {
    const inactiveDays = Math.floor((now.getTime() - new Date(progress.lastActivityAt).getTime()) / DAY);
    if (inactiveDays >= 7 && progress.validated < RW_TOTAL_SESSIONS) {
      alerts.push({
        id: "inactive",
        tone: "warning",
        title: `${inactiveDays} jours sans activité`,
        description: "Une reprise courte cette semaine aidera à conserver les acquis.",
      });
    }
  }
  return alerts;
}

function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rwReportCsv(rows: { name: string; level: string; coach: string; p: RwProgress }[]): string {
  const head = ["Apprenant", "Niveau", "Coach", "Semaine", "Lectures validées", "Progression %", "En attente", "Reprises", "Moyenne /20", "Retard (séances)"];
  const lines = rows.map(({ name, level, coach, p }) =>
    [name, level, coach, p.currentWeek, p.validated, p.percent, p.pending, p.redo, p.averageScore, p.behind]
      .map(csvCell)
      .join(";"),
  );
  return [head.join(";"), ...lines].join("\n");
}

export function rwWeeklyReportCsv(
  rows: { name: string; level: string; coach: string; p: RwProgress; w: RwWeeklySummary }[],
): string {
  const head = [
    "Semaine",
    "Apprenant",
    "Niveau",
    "Coach",
    "Validations cette semaine",
    "Envois cette semaine",
    "Moyenne hebdomadaire /20",
    "Compréhension /20",
    "Progression totale %",
    "En attente",
    "Reprises",
  ];
  const lines = rows.map(({ name, level, coach, p, w }) =>
    [w.window.key, name, level, coach, w.validated, w.submissions, w.averageScore, w.comprehensionScore, p.percent, w.pending, w.redo]
      .map(csvCell)
      .join(";"),
  );
  return [head.join(";"), ...lines].join("\n");
}
