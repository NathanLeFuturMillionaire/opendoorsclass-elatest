/** Registry of OpenDoorsClass services. Add a new entry here to show a future service everywhere at once. */
export type ServiceEntry = {
  id: "assessment" | "reading-workshop";
  name: string;
  short: string;
  tagline: string;
  description: string;
  features: string[];
  cta: string;
  to: "/leveltest/en" | "/reading-workshop";
  capture: { desktop: string; mobile: string; alt: string };
  status: "available";
};

export const SERVICES: ServiceEntry[] = [
  {
    id: "assessment",
    name: "OpenDoorsClass English Level Assessment",
    short: "English Level Assessment",
    tagline: "Connaître son niveau réel d'anglais",
    description:
      "Une évaluation structurée sur l'échelle CECRL, de A1 à C2, pour identifier votre niveau et mieux orienter votre apprentissage.",
    features: [
      "Évaluation du niveau d'anglais",
      "Identification du niveau CECRL",
      "Expérience de test structurée",
      "Résultats consultables",
      "Orientation de votre apprentissage",
    ],
    cta: "Évaluer mon niveau",
    to: "/leveltest/en",
    capture: { desktop: "/showcase/assessment.webp", mobile: "/showcase/assessment-mobile.webp", alt: "Page réelle de l'English Level Assessment" },
    status: "available",
  },
  {
    id: "reading-workshop",
    name: "OpenDoorsClass Reading Workshop",
    short: "Reading Workshop",
    tagline: "Progresser en lisant, chaque semaine",
    description:
      "Un atelier numérique de lecture accompagnée : textes adaptés à votre niveau, outils interactifs et retours de coach.",
    features: [
      "Textes adaptés aux niveaux A1 à C1",
      "Lecture interactive et lecteur audio",
      "Dictionnaire et traduction contextuelle",
      "Exercices de compréhension notés sur 20",
      "Soumission des lectures au coach",
      "Suivi des performances et bilans",
    ],
    cta: "Découvrir le Reading Workshop",
    to: "/reading-workshop",
    capture: { desktop: "/showcase/workshop.webp", mobile: "/showcase/workshop-mobile.webp", alt: "Page réelle du Reading Workshop" },
    status: "available",
  },
];
