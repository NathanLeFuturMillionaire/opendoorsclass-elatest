// Shared, client safe constants and helpers for the test engine.
// Nothing here touches scoring, credits, payments or certificates.

export type Skill =
  | "grammar"
  | "vocabulary"
  | "reading"
  | "listening"
  | "speaking"
  | "writing"
  | "orthography";

export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

// How many items the engine tries to draw per level and skill for one attempt.
export const TEST_BLUEPRINT: Array<{ level: Cefr; skill: Skill; count: number }> = [
  { level: "A1", skill: "grammar", count: 2 },
  { level: "A1", skill: "vocabulary", count: 2 },
  { level: "A1", skill: "reading", count: 1 },
  { level: "A1", skill: "orthography", count: 1 },

  { level: "A2", skill: "grammar", count: 2 },
  { level: "A2", skill: "vocabulary", count: 2 },
  { level: "A2", skill: "reading", count: 1 },
  { level: "A2", skill: "orthography", count: 1 },

  { level: "B1", skill: "grammar", count: 2 },
  { level: "B1", skill: "vocabulary", count: 2 },
  { level: "B1", skill: "reading", count: 1 },
  { level: "B1", skill: "orthography", count: 1 },
  { level: "B1", skill: "listening", count: 2 },
  { level: "B1", skill: "writing", count: 1 },

  { level: "B2", skill: "grammar", count: 2 },
  { level: "B2", skill: "vocabulary", count: 2 },
  { level: "B2", skill: "reading", count: 1 },
  { level: "B2", skill: "orthography", count: 1 },
  { level: "B2", skill: "speaking", count: 1 },

  { level: "C1", skill: "grammar", count: 2 },
  { level: "C1", skill: "vocabulary", count: 1 },
  { level: "C1", skill: "reading", count: 1 },

  { level: "C2", skill: "grammar", count: 2 },
  { level: "C2", skill: "vocabulary", count: 1 },
  { level: "C2", skill: "reading", count: 1 },
];

export const SKILL_ORDER: Skill[] = [
  "grammar",
  "vocabulary",
  "orthography",
  "reading",
  "listening",
  "writing",
  "speaking",
];

export const LEVEL_ORDER: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Fisher Yates shuffle on a copy.
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const TEST_INTROS: Array<{ fr: string; en: string }> = [
  {
    fr: "Cette évaluation a été conçue pour révéler votre véritable niveau d'anglais, avec la rigueur d'un examen international. Prenez votre temps, lisez chaque énoncé attentivement.",
    en: "This assessment is designed to reveal your true level of English, with the rigour of an international examination. Take your time and read every question carefully.",
  },
  {
    fr: "Vous vous apprêtez à passer une évaluation calibrée sur le Cadre européen commun de référence. Chaque question compte, aucune n'est piégeuse sans raison pédagogique.",
    en: "You are about to take an assessment calibrated on the Common European Framework of Reference. Every question counts, and none is tricky without a pedagogical reason.",
  },
  {
    fr: "Respirez. Votre session est unique : les questions et l'ordre des propositions ont été tirés spécialement pour vous. Concentrez-vous sur le sens, pas sur la vitesse.",
    en: "Take a breath. Your session is unique: the questions and the order of the options were drawn especially for you. Focus on meaning rather than speed.",
  },
  {
    fr: "Objectif du jour : mesurer précisément ce que vous savez déjà faire en anglais. Il n'y a pas d'échec ici, seulement un point de départ clair pour progresser.",
    en: "Today's goal is to measure precisely what you can already do in English. There is no failure here, only a clear starting point for your progress.",
  },
  {
    fr: "Les meilleurs résultats viennent d'un esprit calme. Installez-vous confortablement, coupez les distractions, et laissez votre anglais parler pour vous.",
    en: "The best results come from a calm mind. Get comfortable, cut out distractions, and let your English speak for you.",
  },
  {
    fr: "Un examen sérieux, mais bienveillant. Répondez avec honnêteté : votre attestation n'aura de valeur que si elle reflète votre niveau réel.",
    en: "A serious yet supportive examination. Answer honestly: your certificate is only valuable if it reflects your real level.",
  },
];

export const SECTION_ENCOURAGEMENTS: Array<{ fr: string; en: string }> = [
  { fr: "Excellent rythme, continuez ainsi.", en: "Great pace, keep going." },
  { fr: "Vous avancez bien, restez concentré.", en: "You are making good progress, stay focused." },
  { fr: "Nouvelle compétence, nouveau départ.", en: "New skill, fresh start." },
  { fr: "À mi-chemin ou presque, tenez bon.", en: "Almost halfway, hold on." },
  { fr: "Belle constance, la suite est à votre portée.", en: "Nice consistency, the next part is within reach." },
  { fr: "Respirez un instant, puis reprenez.", en: "Take a short breath, then carry on." },
  { fr: "Vous y êtes presque, gardez le cap.", en: "You are nearly there, stay on course." },
];

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export const SKILL_LABELS: Record<Skill, { fr: string; en: string }> = {
  grammar: { fr: "Grammaire", en: "Grammar" },
  vocabulary: { fr: "Vocabulaire", en: "Vocabulary" },
  reading: { fr: "Compréhension écrite", en: "Reading" },
  listening: { fr: "Compréhension orale", en: "Listening" },
  speaking: { fr: "Expression orale", en: "Speaking" },
  writing: { fr: "Expression écrite", en: "Writing" },
  orthography: { fr: "Orthographe", en: "Spelling" },
};
