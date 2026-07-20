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

  // Footer
  "footer.tagline":
    "La plateforme d'évaluation de niveau d'anglais du professeur Nathan Harysthote, pensée pour l'Afrique et le monde.",
  "footer.platform": "Plateforme",
  "footer.signup": "Créer un compte",
  "footer.contact": "Contact",
  "footer.location": "Libreville, Gabon",
  "footer.rights": "Tous droits réservés.",

  // Auth
  "auth.signin": "Se connecter",
  "auth.signup": "Créer un compte",
  "auth.desc": "Accédez au test de niveau d'anglais OpenDoorsClass.",
  "auth.gift": "Offert à l'inscription : 1 crédit gratuit pour un premier test.",
  "auth.google": "Continuer avec Google",
  "auth.or": "ou",
  "auth.tab.signin": "Connexion",
  "auth.tab.signup": "Inscription",
  "auth.fullname": "Nom complet",
  "auth.email": "E-mail",
  "auth.password": "Mot de passe",
  "auth.submit.signin": "Se connecter",
  "auth.submit.signup": "Créer mon compte",
  "auth.loading": "Un instant...",
  "auth.terms": "En continuant, vous acceptez nos conditions d'utilisation.",
  "auth.back": "Retour à l'accueil",
  "auth.welcome": "Bienvenue !",
  "auth.created": "Compte créé, vérifiez votre e-mail pour confirmer.",

  // Dashboard
  "dash.title": "Mon espace",
  "dash.desc": "Retrouvez ici vos tests, vos crédits et vos résultats.",
  "dash.profile": "Mon profil",
  "dash.credits": "Crédits disponibles",
  "dash.credits.hint": "1 crédit = 1 test complet.",
  "dash.recharge": "Recharger",
  "dash.buy": "Acheter des crédits",
  "dash.take.title": "Passer le test de niveau",
  "dash.take.desc":
    "30 minutes, questions CECRL de A1 à C2, avec une section de compréhension orale.",
  "dash.start": "Commencer le test",
  "dash.buy.one": "Acheter un crédit pour commencer",
  "dash.best": "Meilleur niveau atteint",
  "dash.best.hint": "Sur {n} test(s) terminé(s).",
  "dash.history": "Historique des tests",
  "dash.history.empty":
    "Aucun test pour le moment. Lancez votre premier test dès maintenant.",
  "dash.col.date": "Date",
  "dash.col.status": "Statut",
  "dash.col.level": "Niveau",
  "dash.col.score": "Score",
  "dash.col.cert": "Attestation",
  "dash.status.done": "Terminé",
  "dash.status.progress": "En cours",
  "dash.view": "Voir",

  // Buy credits
  "buy.badge": "Offre d'accès aux tests",
  "buy.title": "Recharger votre compte OpenDoorsClass",
  "buy.desc":
    "Un crédit vaut un test complet de niveau CECRL. Vos crédits n'expirent pas.",
  "buy.recommended": "Recommandé",
  "buy.plan.title": "{n} tests de niveau",
  "buy.plan.subtitle":
    "Idéal pour un candidat, une famille ou un petit groupe.",
  "buy.feature.1": "Test complet: grammaire, vocabulaire, lecture, écoute.",
  "buy.feature.2": "Niveau CECRL de A1 à C2 avec détail par compétence.",
  "buy.feature.3":
    "Recommandations de formation adaptées à votre niveau.",
  "buy.feature.4":
    "Paiement sécurisé: Mobile Money, cartes, virements.",
  "buy.candidate": "Informations du candidat",
  "buy.candidate.hint":
    "Ces informations sont utilisées pour la confirmation du paiement et le certificat de niveau.",
  "buy.firstname": "Prénom",
  "buy.lastname": "Nom",
  "buy.country": "Pays",
  "buy.phone": "Numéro de téléphone",
  "buy.pay": "Payer et recevoir mes crédits",
  "buy.paying": "Redirection vers le paiement...",
  "buy.pay.hint": "Vous serez redirigé vers notre page de paiement sécurisée.",
  "buy.credits.avail": "Crédits disponibles",
  "buy.credits.rule": "Chaque test consomme 1 crédit au démarrage.",
  "buy.back.dash": "Retour au tableau de bord",
  "buy.take.now": "Passer un test maintenant",
  "buy.team": "Besoin d'une facture ou d'une offre équipe ?",
  "buy.team.desc":
    "Écrivez-nous sur WhatsApp au +241 74 82 57 25, nous préparons une offre adaptée à votre structure.",
  "buy.err.name": "Veuillez saisir votre nom et prénom.",
  "buy.err.default": "Impossible de démarrer le paiement.",
  "buy.price.note":
    "Prix affiché en FCFA. Conversion locale indicative selon votre région.",

  // Payment return
  "pay.checking": "Vérification de votre paiement",
  "pay.checking.desc":
    "Nous confirmons votre transaction. Cela prend quelques secondes.",
  "pay.success": "Paiement confirmé",
  "pay.success.desc": "{n} crédits viennent d'être ajoutés à votre compte.",
  "pay.success.start": "Commencer un test",
  "pay.success.back": "Retour au tableau de bord",
  "pay.pending": "Paiement en cours de traitement",
  "pay.pending.desc":
    "La confirmation prend un peu plus de temps que prévu. Vos crédits seront ajoutés automatiquement dès la validation, actualisez cette page dans un instant.",
  "pay.failed": "Paiement non abouti",
  "pay.failed.desc.cancelled":
    "La transaction a été annulée. Vous pouvez réessayer sans frais.",
  "pay.failed.desc.failed":
    "La transaction a été refusée. Vous pouvez réessayer sans frais.",
  "pay.retry": "Réessayer le paiement",
  "pay.unknown": "Statut indisponible",
  "pay.unknown.desc":
    "Nous n'avons pas retrouvé ce paiement. Contactez-nous sur WhatsApp si des crédits manquent.",
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

  "footer.tagline":
    "Professor Nathan Harysthote's English proficiency platform, built for Africa and the world.",
  "footer.platform": "Platform",
  "footer.signup": "Create an account",
  "footer.contact": "Contact",
  "footer.location": "Libreville, Gabon",
  "footer.rights": "All rights reserved.",

  "auth.signin": "Sign in",
  "auth.signup": "Create an account",
  "auth.desc": "Access the OpenDoorsClass English proficiency test.",
  "auth.gift": "Free on signup: 1 credit to take a first test.",
  "auth.google": "Continue with Google",
  "auth.or": "or",
  "auth.tab.signin": "Sign in",
  "auth.tab.signup": "Sign up",
  "auth.fullname": "Full name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.submit.signin": "Sign in",
  "auth.submit.signup": "Create my account",
  "auth.loading": "One moment...",
  "auth.terms": "By continuing, you accept our terms of use.",
  "auth.back": "Back to home",
  "auth.welcome": "Welcome!",
  "auth.created": "Account created, check your email to confirm.",

  "dash.title": "My space",
  "dash.desc": "Find here your tests, credits and results.",
  "dash.profile": "My profile",
  "dash.credits": "Available credits",
  "dash.credits.hint": "1 credit = 1 complete test.",
  "dash.recharge": "Top up",
  "dash.buy": "Buy credits",
  "dash.take.title": "Take the proficiency test",
  "dash.take.desc":
    "30 minutes, CEFR questions from A1 to C2, with a listening section.",
  "dash.start": "Start the test",
  "dash.buy.one": "Buy a credit to start",
  "dash.best": "Highest level reached",
  "dash.best.hint": "Across {n} completed test(s).",
  "dash.history": "Test history",
  "dash.history.empty": "No tests yet. Start your first test now.",
  "dash.col.date": "Date",
  "dash.col.status": "Status",
  "dash.col.level": "Level",
  "dash.col.score": "Score",
  "dash.col.cert": "Certificate",
  "dash.status.done": "Completed",
  "dash.status.progress": "In progress",
  "dash.view": "View",

  "buy.badge": "Test access offer",
  "buy.title": "Top up your OpenDoorsClass account",
  "buy.desc":
    "One credit equals one full CEFR level test. Credits never expire.",
  "buy.recommended": "Recommended",
  "buy.plan.title": "{n} proficiency tests",
  "buy.plan.subtitle": "Great for a candidate, a family or a small group.",
  "buy.feature.1":
    "Full test: grammar, vocabulary, reading, listening.",
  "buy.feature.2":
    "CEFR level from A1 to C2 with per-skill breakdown.",
  "buy.feature.3": "Training recommendations tailored to your level.",
  "buy.feature.4": "Secure payments: Mobile Money, cards, transfers.",
  "buy.candidate": "Candidate information",
  "buy.candidate.hint":
    "This information is used for payment confirmation and the level certificate.",
  "buy.firstname": "First name",
  "buy.lastname": "Last name",
  "buy.country": "Country",
  "buy.phone": "Phone number",
  "buy.pay": "Pay and receive my credits",
  "buy.paying": "Redirecting to payment...",
  "buy.pay.hint": "You will be redirected to our secure payment page.",
  "buy.credits.avail": "Available credits",
  "buy.credits.rule": "Each test uses 1 credit at start.",
  "buy.back.dash": "Back to dashboard",
  "buy.take.now": "Take a test now",
  "buy.team": "Need an invoice or a team plan?",
  "buy.team.desc":
    "Message us on WhatsApp at +241 74 82 57 25, we will prepare an offer for your organisation.",
  "buy.err.name": "Please enter your first and last name.",
  "buy.err.default": "Unable to start the payment.",
  "buy.price.note":
    "Price shown in XAF (CFA franc). Local conversion is indicative.",

  "pay.checking": "Verifying your payment",
  "pay.checking.desc": "We are confirming your transaction. It takes a few seconds.",
  "pay.success": "Payment confirmed",
  "pay.success.desc": "{n} credits have just been added to your account.",
  "pay.success.start": "Start a test",
  "pay.success.back": "Back to dashboard",
  "pay.pending": "Payment being processed",
  "pay.pending.desc":
    "Confirmation is taking longer than expected. Your credits will be added automatically once validated, refresh this page shortly.",
  "pay.failed": "Payment not completed",
  "pay.failed.desc.cancelled":
    "The transaction was cancelled. You can retry at no cost.",
  "pay.failed.desc.failed":
    "The transaction was declined. You can retry at no cost.",
  "pay.retry": "Retry payment",
  "pay.unknown": "Status unavailable",
  "pay.unknown.desc":
    "We could not find this payment. Contact us on WhatsApp if credits are missing.",
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