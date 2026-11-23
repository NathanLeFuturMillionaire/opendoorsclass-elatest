export const RW_WEEKLY_CHALLENGE_TARGET = 6;

export type RwWeeklyChallengeEntry = {
  learner_id: string;
  first_name: string;
  photo_url: string | null;
  progress: number;
  validated_count: number;
  completed_at: string | null;
  rank: number;
};

export type RwWeeklyChallengeOwn = {
  learner_id: string;
  progress: number;
  validated_count: number;
  rank: number | null;
  completed_at: string | null;
};

export type RwWeeklyChallengeData = {
  week_start: string;
  start_at: string;
  end_at: string;
  is_history: boolean;
  top: RwWeeklyChallengeEntry[];
  own: RwWeeklyChallengeOwn;
};

export type RwWeeklyChallengeRpcEntry = Omit<RwWeeklyChallengeEntry, "photo_url"> & {
  photo_path: string | null;
};

export type RwWeeklyChallengeRpcData = Omit<RwWeeklyChallengeData, "top"> & {
  top: RwWeeklyChallengeRpcEntry[];
};

export function rwWeeklyChallengeProgress(validatedCount: number): number {
  const count = Number.isFinite(validatedCount) ? Math.max(0, Math.trunc(validatedCount)) : 0;
  return Math.min(100, Math.round((Math.min(count, RW_WEEKLY_CHALLENGE_TARGET) / RW_WEEKLY_CHALLENGE_TARGET) * 100));
}

export function rwWeeklyChallengeEligible(progress: number): boolean {
  return Number.isFinite(progress) && progress > 2;
}

function completionTime(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

/** Same deterministic tie-breaking as the database ranking. */
export function compareRwWeeklyChallengeEntries(
  a: Pick<RwWeeklyChallengeEntry, "progress" | "validated_count" | "completed_at" | "learner_id">,
  b: Pick<RwWeeklyChallengeEntry, "progress" | "validated_count" | "completed_at" | "learner_id">,
): number {
  return b.progress - a.progress
    || b.validated_count - a.validated_count
    || completionTime(a.completed_at) - completionTime(b.completed_at)
    || a.learner_id.localeCompare(b.learner_id);
}

export function rwWeeklyChallengePlaneOffset(progress: number): number {
  return Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
}

export function rwWeeklyChallengeMessage(data: Pick<RwWeeklyChallengeData, "is_history" | "top" | "own">): string {
  const { own, top } = data;
  if (data.is_history) {
    return own.rank && own.rank <= 3
      ? `Semaine clôturée : tu as terminé à la ${own.rank === 1 ? "1re" : `${own.rank}e`} place. Quel beau travail !`
      : "Cette semaine est clôturée. Les résultats du Top 3 restent consultables.";
  }
  if (own.rank === 1) {
    return own.progress === 100
      ? "Tu es en tête avec six lectures validées. Beau travail, garde ce rythme !"
      : "Tu es en tête cette semaine. Continue tes lectures pour consolider ta place !";
  }
  if (own.rank === 2 || own.rank === 3) {
    return "Tu es dans le Top 3. Continue tes lectures pour conserver ta place !";
  }
  if (top.length === 0) {
    return "La première place n'est pas encore décidée. Ta prochaine lecture validée peut lancer ton ascension !";
  }
  if (!rwWeeklyChallengeEligible(own.progress)) {
    return "Chaque lecture validée te rapproche du sommet du classement. À toi de jouer !";
  }
  const third = top.length === 3 ? top[2] : undefined;
  if (third && third.progress - own.progress <= 17) {
    return "Tu es proche du Top 3. Une nouvelle lecture validée peut changer ton classement !";
  }
  return "Tu progresses cette semaine. Continue tes lectures pour prendre leur place !";
}
