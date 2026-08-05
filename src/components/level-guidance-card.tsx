import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "24174825725";

type Guidance = {
  title: string;
  levelName: string;
  intro: string;
  bullets: string[];
  closing: string;
  cta: string;
  community: string;
  gradient: string;
  accent: string;
};

const GUIDANCE: Record<string, Guidance> = {
  A1: {
    title: "🎉 Félicitations pour cette première étape !",
    levelName: "A1 (Débutant)",
    intro:
      "Vous venez de terminer votre test de niveau. Vous avez franchi une étape importante. Votre résultat montre que vous devez encore consolider les bases essentielles :",
    bullets: [
      "Grammaire",
      "Vocabulaire",
      "Compréhension orale",
      "Compréhension écrite",
      "Expression orale",
      "Expression écrite",
    ],
    closing:
      "Avec une pratique régulière, votre progression peut être rapide. Nous vous invitons à rejoindre la communauté OpenDoorsClass destinée aux débutants afin de pratiquer dans un environnement motivant et bienveillant.",
    cta: "Rejoindre OpenDoorsClass A1-A2",
    community: "OpenDoorsClass A1-A2",
    gradient: "from-sky-500/15 via-sky-400/5 to-transparent",
    accent: "text-sky-600 dark:text-sky-400",
  },
  A2: {
    title: "🎉 Belle progression, continuez sur cette lancée !",
    levelName: "A2 (Élémentaire)",
    intro:
      "Vous venez de terminer votre test de niveau. Vous comprenez déjà des situations simples du quotidien. Pour aller plus loin, il vous faut renforcer :",
    bullets: [
      "Grammaire",
      "Vocabulaire courant",
      "Compréhension orale",
      "Compréhension écrite",
      "Expression orale",
      "Expression écrite",
    ],
    closing:
      "Avec une pratique régulière et encadrée, le passage au niveau intermédiaire est tout à fait accessible. Rejoignez la communauté OpenDoorsClass A1-A2 pour pratiquer chaque semaine.",
    cta: "Rejoindre OpenDoorsClass A1-A2",
    community: "OpenDoorsClass A1-A2",
    gradient: "from-teal-500/15 via-teal-400/5 to-transparent",
    accent: "text-teal-600 dark:text-teal-400",
  },
  B1: {
    title: "🚀 Vous progressez !",
    levelName: "B1 (Intermédiaire)",
    intro:
      "Vous tenez déjà une conversation sur des sujets familiers. L'objectif désormais est de gagner en aisance. Nous travaillerons ensemble :",
    bullets: [
      "La fluidité à l'oral",
      "La confiance en situation réelle",
      "L'enrichissement du vocabulaire",
      "La conversation spontanée",
    ],
    closing:
      "La communauté OpenDoorsClass B1 vous permet de pratiquer régulièrement avec des candidats de votre niveau et un accompagnement structuré.",
    cta: "Rejoindre OpenDoorsClass B1",
    community: "OpenDoorsClass B1",
    gradient: "from-indigo-500/15 via-indigo-400/5 to-transparent",
    accent: "text-indigo-600 dark:text-indigo-400",
  },
  B2: {
    title: "🌟 Très beau résultat !",
    levelName: "B2 (Intermédiaire avancé)",
    intro:
      "Vous communiquez déjà avec assurance. L'étape suivante consiste à professionnaliser votre anglais. Nous mettrons l'accent sur :",
    bullets: [
      "L'anglais professionnel",
      "La précision grammaticale et lexicale",
      "La communication internationale",
      "La prise de parole en réunion et en présentation",
    ],
    closing:
      "La communauté OpenDoorsClass B2 vous accompagne vers un usage professionnel et international de l'anglais.",
    cta: "Rejoindre OpenDoorsClass B2",
    community: "OpenDoorsClass B2",
    gradient: "from-violet-500/15 via-violet-400/5 to-transparent",
    accent: "text-violet-600 dark:text-violet-400",
  },
  C1: {
    title: "🏆 Excellent niveau !",
    levelName: "C1 (Autonome)",
    intro:
      "Votre maîtrise de l'anglais est déjà remarquable. Le travail portera sur l'excellence et la nuance :",
    bullets: [
      "Maîtrise avancée de la langue",
      "Anglais académique",
      "Anglais professionnel de haut niveau",
      "Argumentation et nuance",
    ],
    closing:
      "La communauté OpenDoorsClass C1 réunit des profils exigeants qui pratiquent un anglais de haut niveau.",
    cta: "Rejoindre OpenDoorsClass C1",
    community: "OpenDoorsClass C1",
    gradient: "from-amber-500/18 via-amber-400/5 to-transparent",
    accent: "text-amber-600 dark:text-amber-400",
  },
  C2: {
    title: "👑 Niveau exceptionnel !",
    levelName: "C2 (Maîtrise)",
    intro:
      "Votre résultat vous place parmi les meilleurs candidats de la plateforme. Nous vous proposons un accompagnement d'excellence :",
    bullets: [
      "Excellence linguistique",
      "Maîtrise quasi native",
      "Style, registre et subtilité",
      "Communauté Elite OpenDoorsClass",
    ],
    closing:
      "La communauté OpenDoorsClass C2 Elite est réservée aux profils d'excellence souhaitant maintenir et affiner leur maîtrise.",
    cta: "Rejoindre OpenDoorsClass C2 Elite",
    community: "OpenDoorsClass C2 Elite",
    gradient: "from-rose-500/15 via-rose-400/5 to-transparent",
    accent: "text-rose-600 dark:text-rose-400",
  },
};

function whatsappLink(level: string, community: string) {
  const message = [
    "Bonjour Mr Nathan,",
    "",
    `J'ai effectué mon test de niveau sur OpenDoorsClass et j'ai obtenu un niveau ${level}.`,
    "",
    `Je souhaite rejoindre la communauté ${community} afin d'améliorer mon anglais.`,
    "",
    "Merci.",
  ].join("\n");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function LevelGuidanceCard({ level }: { level: string | null | undefined }) {
  const key = (level ?? "").toUpperCase();
  const g = GUIDANCE[key];
  if (!g) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${g.gradient} p-6 shadow-sm sm:p-8 print:hidden`}
    >
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{g.title}</h2>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        Votre niveau actuel est{" "}
        <strong className={g.accent}>{g.levelName}</strong>.
      </p>
      <p className="mt-3 text-sm leading-relaxed sm:text-base">{g.intro}</p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {g.bullets.map((b) => (
          <motion.li
            key={b}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm"
          >
            <span className={`text-lg leading-none ${g.accent}`}>•</span>
            <span>{b}</span>
          </motion.li>
        ))}
      </ul>

      <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">{g.closing}</p>

      <Button
        asChild
        size="lg"
        className="mt-6 w-full bg-[#25D366] text-white hover:bg-[#1EBE5A] sm:w-auto"
      >
        <a href={whatsappLink(key, g.community)} target="_blank" rel="noreferrer">
          <MessageCircle className="mr-2 size-5" />
          {g.cta}
        </a>
      </Button>
    </motion.section>
  );
}
