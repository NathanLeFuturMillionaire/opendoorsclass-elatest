/**
 * Server-only helpers to persist notifications.
 * Never import this file from a component or a route module scope.
 */
export type NotificationCategory =
  | "system"
  | "payments"
  | "achievements"
  | "leaderboard"
  | "profile"
  | "certificates"
  | "security"
  | "updates";

export type NotificationInput = {
  userId: string;
  title: string;
  message: string;
  category?: NotificationCategory;
  icon?: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  /** When provided, skip insert if a notification with the same key already exists. */
  dedupeKey?: string | null;
};

/**
 * Insert a notification. Never throws: notifications must never break a business flow.
 */
export async function pushNotification(input: NotificationInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (input.dedupeKey) {
      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", input.userId)
        .eq("title", input.title)
        .eq("message", input.message)
        .gte("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();
      if (existing) return;
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      message: input.message,
      category: input.category ?? "system",
      icon: input.icon ?? "bell",
      action_url: input.actionUrl ?? null,
      action_label: input.actionLabel ?? null,
    });
  } catch {
    // silent by design
  }
}

/** Catalogue of platform events that generate a notification. */
export const NotificationTemplates = {
  paymentSuccess: (userId: string, paymentId?: string): NotificationInput => ({
    userId,
    title: "Payment successful",
    message: "Your payment has been successfully confirmed. Your credits have been added to your account.",
    category: "payments",
    icon: "check-circle",
    actionUrl: paymentId ? `/paiement-retour?payment_id=${paymentId}` : "/achat-credits",
    actionLabel: "View payment",
  }),
  paymentFailed: (userId: string): NotificationInput => ({
    userId,
    title: "Payment failed",
    message: "Your payment could not be completed. Please try again.",
    category: "payments",
    icon: "x-circle",
    actionUrl: "/achat-credits",
    actionLabel: "Try again",
  }),
  creditsReceived: (userId: string, credits: number): NotificationInput => ({
    userId,
    title: "Credits received",
    message: `You have received ${credits} credits. Good luck with your next challenge!`,
    category: "payments",
    icon: "star",
    actionUrl: "/test",
    actionLabel: "Start a test",
  }),
  testStarted: (userId: string): NotificationInput => ({
    userId,
    title: "Good luck!",
    message: "Your Level Test has started. Stay focused and avoid leaving your browser.",
    category: "system",
    icon: "target",
  }),
  testCompleted: (userId: string, sessionId: string): NotificationInput => ({
    userId,
    title: "Congratulations!",
    message: "Your English Level Test has been completed successfully.",
    category: "achievements",
    icon: "trophy",
    actionUrl: `/resultat/${sessionId}`,
    actionLabel: "View result",
  }),
  certificateAvailable: (userId: string, sessionId: string): NotificationInput => ({
    userId,
    title: "Certificate available",
    message: "Your official OpenDoorsClass certificate is now available for download.",
    category: "certificates",
    icon: "scroll",
    actionUrl: `/resultat/${sessionId}`,
    actionLabel: "Download certificate",
  }),
  personalBest: (userId: string, sessionId: string): NotificationInput => ({
    userId,
    title: "New personal best!",
    message: "Congratulations! You achieved your highest score so far.",
    category: "achievements",
    icon: "rocket",
    actionUrl: `/resultat/${sessionId}`,
    actionLabel: "View result",
  }),
  leaderboardOvertaken: (userId: string): NotificationInput => ({
    userId,
    title: "Someone just reached a higher score!",
    message:
      "A learner has just climbed above you in the leaderboard. Take another test and reclaim your position!",
    category: "leaderboard",
    icon: "medal",
    actionUrl: "/classement",
    actionLabel: "View leaderboard",
  }),
  levelUp: (userId: string, level: string): NotificationInput => ({
    userId,
    title: "Level up!",
    message: `You have reached CEFR level ${level}. Amazing progress!`,
    category: "achievements",
    icon: "trending-up",
    actionUrl: "/accomplissements",
    actionLabel: "View achievements",
  }),
  welcomeBack: (userId: string): NotificationInput => ({
    userId,
    title: "Welcome back!",
    message: "We're happy to see you again.",
    category: "security",
    icon: "hand",
    dedupeKey: "welcome-back",
  }),
  newFeature: (userId: string): NotificationInput => ({
    userId,
    title: "New feature available",
    message: "Discover what's new on OpenDoorsClass.",
    category: "updates",
    icon: "sparkles",
  }),
};
