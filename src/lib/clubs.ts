export type ClubKey = "A1-A2" | "B1-B2" | "C1-C2";

export type Club = {
  key: ClubKey;
  name: string;
  fullName: string;
  badge: string;
  tone: string;
  gradient: string;
  accent: string;
  ring: string;
  description: string;
  features: string[];
  cta: string;
};

export const CLUBS: Club[] = [
  {
    key: "A1-A2",
    name: "A1-A2 BEGINNERS CREW",
    fullName: "OpenDoorsClass A1-A2 BEGINNERS CREW",
    badge: "Débutant",
    tone: "Sprout",
    gradient: "from-sky-500/15 via-sky-400/5 to-transparent",
    accent: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/25 border-sky-500/30",
    description:
      "Une communauté spécialement conçue pour les personnes qui débutent en anglais. Vous apprendrez les bases essentielles de la langue, développerez votre confiance et pratiquerez quotidiennement avec d'autres débutants dans un environnement encourageant.",
    features: [
      "Grammaire",
      "Vocabulaire",
      "Prononciation",
      "Conversations simples",
      "Exercices",
      "Corrections",
      "Défis hebdomadaires",
      "Accompagnement",
    ],
    cta: "Rejoindre OpenDoorsClass A1-A2",
  },
  {
    key: "B1-B2",
    name: "B1-B2 ENGLISH INTERMEDIATE LEARNERS",
    fullName: "OpenDoorsClass B1-B2 ENGLISH INTERMEDIATE LEARNERS",
    badge: "Intermédiaire",
    tone: "Momentum",
    gradient: "from-indigo-500/15 via-violet-400/5 to-transparent",
    accent: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-500/25 border-indigo-500/30",
    description:
      "Vous possédez déjà de bonnes bases. Cette communauté vous aidera à parler avec davantage de fluidité, enrichir votre vocabulaire et communiquer avec plus d'assurance.",
    features: [
      "Speaking",
      "Listening",
      "Reading",
      "Writing",
      "Débats",
      "Conversations",
      "Business English",
      "Exercices avancés",
    ],
    cta: "Rejoindre OpenDoorsClass B1-B2",
  },
  {
    key: "C1-C2",
    name: "C1-C2 PROFICIENT EMPIRE",
    fullName: "OpenDoorsClass C1-C2 PROFICIENT EMPIRE",
    badge: "Avancé",
    tone: "Excellence",
    gradient: "from-amber-500/18 via-amber-400/5 to-transparent",
    accent: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/25 border-amber-500/30",
    description:
      "Réservée aux étudiants avancés souhaitant atteindre un niveau d'excellence en anglais. Cette communauté met l'accent sur l'anglais professionnel, les débats, les présentations, la communication internationale et le perfectionnement linguistique.",
    features: [
      "Professional English",
      "Leadership Discussions",
      "Public Speaking",
      "Business Communication",
      "Vocabulary Expansion",
      "Advanced Grammar",
      "International Topics",
    ],
    cta: "Rejoindre OpenDoorsClass C1-C2",
  },
];

const LEVEL_TO_CLUB: Record<string, ClubKey> = {
  A1: "A1-A2",
  A2: "A1-A2",
  B1: "B1-B2",
  B2: "B1-B2",
  C1: "C1-C2",
  C2: "C1-C2",
};

export function clubForLevel(level: string | null | undefined): Club | null {
  const key = LEVEL_TO_CLUB[(level ?? "").toUpperCase()];
  if (!key) return null;
  return CLUBS.find((c) => c.key === key) ?? null;
}

const WHATSAPP_NUMBER = "24174825725";

export function clubWhatsappLink(level: string, club: Club) {
  const message = [
    "Bonjour Mr Nathan,",
    "",
    `J'ai effectué mon test de niveau sur OpenDoorsClass et j'ai obtenu un niveau ${level.toUpperCase()}.`,
    "",
    `Je souhaite rejoindre la communauté OpenDoorsClass ${club.key} afin d'améliorer mon anglais.`,
    "",
    "Merci.",
  ].join("\n");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const CLUB_TIMELINE = [
  "Passer le test",
  "Obtenir son niveau CEFR",
  "Recevoir son certificat officiel",
  "Débloquer sa communauté OpenDoorsClass",
  "Pratiquer régulièrement avec des étudiants du même niveau",
  "Progresser plus rapidement",
];
