/** Comprehension scoring rules: every question is worth 2 points, a standard lesson has 10 questions (20 points). */
export const RW_QUESTIONS_PER_LESSON = 10;
export const RW_POINTS_PER_QUESTION = 2;

export type RwAnswerLite = { question_index: number; points: number | null; status: "auto_graded" | "pending" | "graded" };

export function computeComprehension(answers: RwAnswerLite[], questionCount: number) {
  const max = questionCount * RW_POINTS_PER_QUESTION;
  const valid = answers.filter((a) => a.question_index >= 0 && a.question_index < questionCount);
  const points = valid.reduce((s, a) => s + (a.status === "pending" ? 0 : Math.max(0, Math.min(RW_POINTS_PER_QUESTION, a.points ?? 0))), 0);
  const pending = valid.filter((a) => a.status === "pending").length;
  const answered = valid.length;
  const complete = answered === questionCount && pending === 0;
  const scoreOn20 = max ? Math.round((points / max) * 20 * 10) / 10 : 0;
  return { points, max, answered, pending, complete, scoreOn20, percent: max ? Math.round((points / max) * 100) : 0 };
}
