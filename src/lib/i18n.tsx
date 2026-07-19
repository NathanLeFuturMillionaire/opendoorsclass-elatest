import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "fr" | "en";

type Dict = Record<string, string>;

const FR: Dict = {
  // Header / nav
  "nav.home": "Accueil",
  "nav.how": "Comment ça marche",
  "nav.testimonials": "Témoignages",
  "nav.founder": "Le fondateur",
  "nav.worldwide": "Accessible partout",
  "nav.admin": "Administration",
  "nav.space": "Mon espace",
  "nav.signout": "Déconnexion",
  "nav.signin": "Se connecter",
  "nav.start": "Commencer le test",
  "nav.menu": "Menu",
  "lang.switch": "Langue",

  // Hero
  "hero.badge": "Nouvelle plateforme officielle OpenDoorsClass",
  "hero.title.a": "Évaluez avec précision votre",
  "hero.title.b": "niveau réel d'anglais",
  "hero.title.c": ", en moins de trente minutes.",
  "hero.desc":
    "Un examen complet, rigoureusement aligné sur le Cadre européen commun de référence pour les langues (CECRL, A1 à C2). Une évaluation conçue par le professeur Nathan Harysthote pour les apprenants francophones d'Afrique et d'ailleurs, exigeante, bienveillante, immédiatement exploitable.",
  "hero.cta.start": "Passer le test maintenant",
  "hero.cta.how": "Découvrir la démarche",
  "hero.tag.instant": "Résultat immédiat",
  "hero.tag.pdf": "Attestation officielle",
  "hero.tag.mobile": "Compatible mobile",
  "hero.preview.step": "Aperçu du test",
  "hero.preview.q": "Choose the correct sentence:",
  "hero.preview.count": "Question 12 / 30",
  "hero.preview.remaining": "24:12 restantes",
  "hero.preview.level": "Niveau ciblé, B1",

  // How it works
  "how.badge": "Comment ça marche",
  "how.title": "Trois étapes, une évaluation claire.",
  "how.desc":
    "Un parcours simple et fluide, pensé pour être suivi indifféremment sur téléphone ou sur ordinateur.",
  "how.step": "Étape",
  "how.s1.title": "Créez votre espace personnel",
  "how.s1.text":
    "Une inscription en moins de trente secondes, avec Google ou par adresse électronique.",
  "how.s2.title": "Passez le test CECRL",
  "how.s2.text":
    "Environ trente minutes, difficulté progressive de A1 à C2, grammaire, vocabulaire, compréhension écrite et compréhension orale.",
  "how.s3.title": "Recevez votre niveau",
  "how.s3.text":
    "Résultat détaillé instantané, attestation PDF téléchargeable et recommandations personnalisées.",

  // Benefits
  "why.badge": "Pourquoi OpenDoorsClass",
  "why.title": "Une évaluation exigeante, taillée pour vous.",
  "why.b1.title": "Référentiel CECRL reconnu",
  "why.b1.text":
    "Une notation alignée sur les six niveaux internationaux, du débutant (A1) à la maîtrise (C2).",
  "why.b2.title": "Rapide, précis, sans concession",
  "why.b2.text":
    "Environ trente minutes pour obtenir une image fidèle et détaillée de votre niveau réel.",
  "why.b3.title": "Compréhension orale authentique",
  "why.b3.text":
    "Des extraits audio issus de situations réelles, jusqu'à cinq écoutes par question, casque recommandé.",
  "why.b4.title": "Attestation officielle téléchargeable",
  "why.b4.text":
    "Un document PDF nominatif, prêt à être présenté à une école, un employeur ou une ambassade.",

  // Worldwide
  "world.badge": "Accessible partout",
  "world.title": "Un test que vous pouvez passer depuis n'importe quel pays.",
  "world.desc":
    "OpenDoorsClass est une plateforme entièrement en ligne. Où que vous soyez, en Afrique, en Europe, en Amérique, en Asie ou en Océanie, vous pouvez composer votre test dès aujourd'hui, sans déplacement, sans rendez-vous, sans intermédiaire.",
  "world.stat.countries": "pays desservis",
  "world.stat.langs": "langues d'interface",
  "world.stat.access": "accès 24 h / 24",
  "world.map.hint":
    "Passez votre souris sur les points pour explorer les régions couvertes.",
  "world.list.title": "Un extrait des pays où nos candidats se connectent",

  // Testimonials
  "tm.badge": "Témoignages",
  "tm.title": "Ils ont passé le test.",
  "tm.desc": "Retours authentiques de candidats OpenDoorsClass.",

  // Founder
  "fd.badge": "Le fondateur",
  "fd.title.a": "MAYUKWA Nathan Harysthote,",
  "fd.title.b": "professeur d'anglais engagé et passionné.",
  "fd.p1":
    "Formateur au Gabon, Nathan accompagne depuis plusieurs années des élèves, des étudiants et des professionnels vers un anglais véritablement utile, celui qui ouvre les portes de l'école, du travail et du voyage.",
  "fd.p2":
    "OpenDoorsClass est né d'une conviction simple : chaque apprenant mérite de connaître son vrai niveau avant de choisir son parcours. Ce test en est la toute première étape.",
  "fd.cta.test": "Passer le test",
  "fd.cta.wa": "Contacter sur WhatsApp",

  // Final CTA
  "cta.title": "Prêt à découvrir votre vrai niveau d'anglais ?",
  "cta.desc":
    "Créez votre espace, composez le test, recevez votre attestation.",
  "cta.start": "Commencer maintenant",
};

const EN: Dict = {
  "nav.home": "Home",
  "nav.how": "How it works",
  "nav.testimonials": "Testimonials",
  "nav.founder": "The founder",
  "nav.worldwide": "Worldwide access",
  "nav.admin": "Admin",
  "nav.space": "My space",
  "nav.signout": "Sign out",
  "nav.signin": "Sign in",
  "nav.start": "Take the test",
  "nav.menu": "Menu",
  "lang.switch": "Language",

  "hero.badge": "The official OpenDoorsClass platform",
  "hero.title.a": "Discover your",
  "hero.title.b": "true English proficiency",
  "hero.title.c": " in under thirty minutes.",
  "hero.desc":
    "A rigorous assessment strictly aligned with the Common European Framework of Reference (CEFR, A1 to C2). Designed by Professor Nathan Harysthote for learners across French-speaking Africa and beyond: demanding, supportive and immediately actionable.",
  "hero.cta.start": "Take the test now",
  "hero.cta.how": "See how it works",
  "hero.tag.instant": "Instant result",
  "hero.tag.pdf": "Official certificate",
  "hero.tag.mobile": "Mobile friendly",
  "hero.preview.step": "Test preview",
  "hero.preview.q": "Choose the correct sentence:",
  "hero.preview.count": "Question 12 / 30",
  "hero.preview.remaining": "24:12 left",
  "hero.preview.level": "Target level, B1",

  "how.badge": "How it works",
  "how.title": "Three steps, one clear result.",
  "how.desc": "A smooth path, built to be completed on phone or laptop alike.",
  "how.step": "Step",
  "how.s1.title": "Create your account",
  "how.s1.text": "Sign up in under thirty seconds, with Google or email.",
  "how.s2.title": "Sit the CEFR test",
  "how.s2.text":
    "About thirty minutes, gradual difficulty from A1 to C2, covering grammar, vocabulary, reading and listening.",
  "how.s3.title": "Receive your level",
  "how.s3.text":
    "Detailed result on the spot, downloadable PDF certificate and personalised recommendations.",

  "why.badge": "Why OpenDoorsClass",
  "why.title": "A demanding assessment, tailored to you.",
  "why.b1.title": "Recognised CEFR standard",
  "why.b1.text":
    "Scoring aligned with the six international levels, from beginner (A1) to mastery (C2).",
  "why.b2.title": "Fast, precise, no shortcuts",
  "why.b2.text": "About thirty minutes for a faithful picture of your real proficiency.",
  "why.b3.title": "Authentic listening",
  "why.b3.text":
    "Real-life audio extracts, up to five plays per question, headphones recommended.",
  "why.b4.title": "Official downloadable certificate",
  "why.b4.text":
    "A named PDF you can send to a school, an employer or an embassy.",

  "world.badge": "Worldwide access",
  "world.title": "Take the test from anywhere in the world.",
  "world.desc":
    "OpenDoorsClass is a fully online platform. Wherever you live, in Africa, Europe, the Americas, Asia or Oceania, you can sit the test today: no travel, no appointment, no middleman.",
  "world.stat.countries": "countries served",
  "world.stat.langs": "interface languages",
  "world.stat.access": "24/7 access",
  "world.map.hint": "Hover the dots to explore the regions we serve.",
  "world.list.title": "A snapshot of countries where our candidates connect",

  "tm.badge": "Testimonials",
  "tm.title": "They took the test.",
  "tm.desc": "Genuine feedback from OpenDoorsClass candidates.",

  "fd.badge": "The founder",
  "fd.title.a": "MAYUKWA Nathan Harysthote,",
  "fd.title.b": "a devoted English teacher.",
  "fd.p1":
    "Based in Gabon, Nathan has spent years guiding pupils, students and professionals toward truly useful English, the kind that opens the doors of school, work and travel.",
  "fd.p2":
    "OpenDoorsClass was born of a simple belief: every learner deserves to know their real level before choosing a path. This test is the very first step.",
  "fd.cta.test": "Take the test",
  "fd.cta.wa": "Chat on WhatsApp",

  "cta.title": "Ready to discover your real English level?",
  "cta.desc": "Create your account, take the test, receive your certificate.",
  "cta.start": "Start now",
};

const DICTS: Record<Locale, Dict> = { fr: FR, en: EN };

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof FR) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("odc.lang") as Locale | null;
      if (stored === "fr" || stored === "en") {
        setLocaleState(stored);
        return;
      }
      const nav =
        typeof navigator !== "undefined"
          ? (navigator.language || (navigator as any).userLanguage || "fr").toLowerCase()
          : "fr";
      setLocaleState(nav.startsWith("fr") ? "fr" : "en");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale: (l) => {
        try {
          localStorage.setItem("odc.lang", l);
        } catch {
          // ignore
        }
        setLocaleState(l);
      },
      t: (key) => DICTS[locale][key] ?? DICTS.fr[key] ?? String(key),
    }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback so components rendered outside provider still function.
    return {
      locale: "fr",
      setLocale: () => {},
      t: (k) => FR[k] ?? String(k),
    };
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}