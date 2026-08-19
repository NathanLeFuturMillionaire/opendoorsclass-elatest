/**
 * Programme officiel de formation OpenDoorsClass (Mr Nathan).
 * Source : PDF "Programme Officiel, 3 cours par semaine".
 * Aucun tiret cadratin dans les textes affiches.
 */

export const COACH_WHATSAPP_NUMBER = "24174825725";
export const COACH_WHATSAPP_MESSAGE =
  "Hello coach, je suis intéressé par la formation de 10 mois chez OpenDoorsClass.";
export const COACH_WHATSAPP_URL = `https://wa.me/${COACH_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  COACH_WHATSAPP_MESSAGE,
)}`;

export const TRAINING_OFFER = {
  priceMonthly: 50000,
  currency: "FCFA",
  durationMonths: 10,
  sessionsPerWeek: 3,
  hoursPerSession: 2,
  format: "100 % en ligne",
} as const;

export type ProgramWeek = { title: string; items: string[] };
export type ProgramMonth = {
  index: string;
  title: string;
  level: string;
  weeks: ProgramWeek[];
};

export const PROGRAM_PILLARS = [
  { n: "01", title: "Progressivité", desc: "Chaque compétence est construite sur la précédente. Jamais de saut d'étapes." },
  { n: "02", title: "Régularité", desc: "Des séances encadrées chaque semaine, complétées par un travail personnel entre les cours." },
  { n: "03", title: "Application", desc: "Chaque structure grammaticale est immédiatement appliquée dans un contexte réel, à l'oral comme à l'écrit." },
  { n: "04", title: "Validation", desc: "Les acquis sont régulièrement évalués avant le passage aux étapes suivantes." },
];

export const PROGRAM_SESSION_STRUCTURE = [
  { label: "Cours 01", desc: "Présentation de la nouvelle leçon, explication des notions, vocabulaire cible et premières activités pratiques." },
  { label: "Cours 02", desc: "Approfondissement, exercices dirigés, production orale et écrite, puis mise en situation réelle." },
  { label: "Entre les cours", desc: "Travail personnel : révision, exercices, écoute, lecture et préparation de la séance suivante." },
  { label: "Suivi", desc: "Les productions des apprenants sont corrigées et les difficultés identifiées afin d'adapter la progression." },
];

export const PROGRAM_CERTIFICATION = [
  { tier: "Bronze", score: "Score final 90 à 109 / 130", result: "Niveau B1 validé" },
  { tier: "Silver", score: "Score final 110 à 119 / 130", result: "Niveau B1+ validé" },
  { tier: "Gold", score: "Score final 120 à 130 / 130", result: "Niveau B2 et au-delà" },
];

export const PROGRAM_MONTHS: ProgramMonth[] = [
  {
    index: "Month 01",
    title: "The Foundations",
    level: "A1",
    weeks: [
      {
        title: "Semaine 1 : bases absolues",
        items: [
          "L'alphabet anglais et la phonétique",
          "This is / That is, objets du quotidien",
          "To Be, se décrire (I am...)",
          "To Have, possessions (I have...)",
        ],
      },
      {
        title: "Semaine 2 : premiers échanges",
        items: [
          "Les pronoms personnels sujets (I, You, He, She, It, We, They)",
          "To Be avec tous les pronoms : formes affirmative, négative et interrogative",
          "Questions simples : What ? Who ? Where ? How ?",
          "Mini-dialogues de présentation naturels",
        ],
      },
      {
        title: "Semaine 3 : premières phrases",
        items: [
          "Les chiffres de 1 à 100 et au-delà",
          "Les couleurs, adjectifs et descriptions simples",
          "Les jours, mois, saisons et dates",
          "Present Simple, introduction aux habitudes et routines",
        ],
      },
      {
        title: "Semaine 4 : consolider A1",
        items: [
          "Present Simple, tous les pronoms, toutes les formes",
          "Forme négative : I don't / He doesn't / They don't",
          "Forme interrogative : Do you ? Does she ? Did they ?",
          "Weekly Summit, premier appel de groupe guidé",
        ],
      },
    ],
  },
  {
    index: "Month 02",
    title: "Building Sentences",
    level: "A1+",
    weeks: [
      {
        title: "Semaine 1 : l'action présente",
        items: [
          "Present Continuous, actions en cours (BE + V-ING)",
          "Present Simple vs Present Continuous, la distinction",
          "Les verbes statifs, jamais en forme continue",
          "Adjectifs et description de personnes et situations",
        ],
      },
      {
        title: "Semaine 2 : se situer dans l'espace et le temps",
        items: [
          "Prépositions de lieu : in, on, at, near, behind, between",
          "Prépositions de temps : at, on, in",
          "There is / There are, exprimer l'existence",
          "Questions avec Where, When, How long, How often",
        ],
      },
      {
        title: "Semaine 3 : capacités et permissions",
        items: [
          "Can / Can't, capacités et incapacités",
          "Could, politesse et possibilité dans le passé",
          "May / Might, permission et probabilité",
          "Premiers dialogues professionnels simples et naturels",
        ],
      },
      {
        title: "Semaine 4 : consolider A1+",
        items: [
          "Révision complète A1 vers A1+",
          "Production orale libre, 2 minutes minimum",
          "Correction et feedback personnalisé du coach",
          "Weekly Summit, bilan de fin de mois 2",
        ],
      },
    ],
  },
  {
    index: "Month 03",
    title: "Going Deeper",
    level: "A2 vers B1",
    weeks: [
      {
        title: "Semaine 1 : le passé et la narration",
        items: [
          "Past Simple, verbes réguliers et irréguliers",
          "Past Perfect, action avant une autre action passée",
          "Past Perfect Continuous, durée dans le passé",
          "Connecteurs narratifs : first, then, after that, finally",
        ],
      },
      {
        title: "Semaine 2 : le présent et ses nuances",
        items: [
          "Present Perfect, lien entre le passé et le présent",
          "Present Perfect Continuous, durée jusqu'au présent",
          "Question Tags, confirmation et engagement conversationnel",
          "Wish & If Only, exprimer regrets et désirs",
        ],
      },
      {
        title: "Semaine 3 : vocabulaire professionnel B1",
        items: [
          "Business Vocabulary, 50 expressions clés",
          "Academic Vocabulary, marqueurs du discours",
          "Phrasal Verbs professionnels, 30 verbes essentiels",
          "Expressions idiomatiques B1, 20 expressions",
        ],
      },
      {
        title: "Semaine 4 : communication écrite avancée",
        items: [
          "Formal Email Writing : demande, suivi, plainte professionnelle",
          "Passive Voice, le registre professionnel et diplomatique",
          "Reported Speech, rapporter les paroles avec précision",
          "Relative Clauses : who, which, where, that",
        ],
      },
    ],
  },
  {
    index: "Month 04",
    title: "Professional English",
    level: "B1",
    weeks: [
      {
        title: "Semaine 1 : conditionnels avancés",
        items: [
          "1st Conditional, réel et probable (If + Present, Will)",
          "2nd Conditional, hypothétique présent (If + Past, Would)",
          "3rd Conditional, passé irréversible (If + Past Perfect, Would Have)",
          "Mixed Conditionals, conséquences croisées passé et présent",
        ],
      },
      {
        title: "Semaine 2 : discours et présentation",
        items: [
          "Advanced Academic Discourse, marqueurs du discours soutenu",
          "Data Presentation in English, chiffres et tendances",
          "Defending an Initiative, défendre une idée sous pression",
          "Collective Decision-Making, conduire un groupe vers un accord",
        ],
      },
      {
        title: "Semaine 3 : Travel English",
        items: [
          "Airport & Check-in, l'aéroport professionnel",
          "Hotel & Professional Booking, l'hôtellerie en déplacement",
          "Transports et déplacements internationaux",
          "Networking en déplacement, Social English professionnel",
        ],
      },
      {
        title: "Semaine 4 : simulations professionnelles",
        items: [
          "Job Interview Simulation, l'entretien en anglais",
          "Business Presentation avancée, 5 minutes devant un panel",
          "Journalistic Listening, textes authentiques BBC et CNN",
          "Weekly Summit, Full Group Call simulation",
        ],
      },
    ],
  },
  {
    index: "Month 05",
    title: "Fluency & Strategy",
    level: "B1+",
    weeks: [
      {
        title: "Semaine 1 : négociation avancée",
        items: [
          "Advanced Negotiation Strategies, 5 phases de négociation",
          "Phrasal Verbs de négociation, 30 nouveaux verbes",
          "Expressions idiomatiques, 20 nouvelles expressions",
          "Simulations de négociation complexes en binôme",
        ],
      },
      {
        title: "Semaine 2 : leadership en anglais",
        items: [
          "Leadership Language, le langage de celui qui conduit",
          "Collective Decision-Making avancé, faciliter les débats",
          "Managing Conflict in English, résolution diplomatique",
          "Executive Communication, le registre du cadre dirigeant",
        ],
      },
      {
        title: "Semaine 3 : Social English & Networking",
        items: [
          "Networking & Small Talk, la conversation informelle professionnelle",
          "Conference & Event English, forums et événements",
          "Telephoning & Video Calls, professionnalisme téléphonique",
          "Social Media English : LinkedIn, Twitter, communication digitale",
        ],
      },
      {
        title: "Semaine 4 : pensée critique en anglais",
        items: [
          "Critical Thinking in English, analyser et évaluer",
          "Debating & Argumentation, le débat structuré",
          "Report Writing, rapports professionnels complets",
          "Weekly Summit, simulation intensive en groupe",
        ],
      },
    ],
  },
  {
    index: "Month 06",
    title: "Advanced Communication",
    level: "B2",
    weeks: [
      {
        title: "Semaine 1 : grammaire complexe",
        items: [
          "Inversion & Emphasis, structures de soulignement avancées",
          "Subjunctive & Advanced Conditionals",
          "Complex Noun Phrases, densité de l'information",
          "Discourse Markers avancés, cohésion et cohérence",
        ],
      },
      {
        title: "Semaine 2 : expression académique",
        items: [
          "Academic Writing, essays et papers de haut niveau",
          "Argumentative Writing, structure de l'argumentation",
          "Citation et paraphrase professionnelles et éthiques",
          "Style et registre académiques, la précision",
        ],
      },
      {
        title: "Semaine 3 : prise de parole publique",
        items: [
          "Public Speaking & Keynotes, parler devant une salle",
          "Cross-Cultural Communication, les codes culturels",
          "Media English : presse, podcasts, télévision",
          "Pitch professionnel, 5 minutes pour convaincre",
        ],
      },
      {
        title: "Semaine 4 : préparation à la certification",
        items: [
          "Industry-specific Vocabulary, votre secteur en anglais",
          "Certification Simulation, premier essai complet",
          "Feedback individualisé et axes d'amélioration",
          "Weekly Summit, débat académique structuré",
        ],
      },
    ],
  },
  {
    index: "Month 07",
    title: "Mastery in Progress",
    level: "B2+",
    weeks: [
      {
        title: "Semaine 1 : idiomes et collocations avancés",
        items: [
          "Advanced Idioms, 50 nouvelles expressions idiomatiques",
          "Collocations professionnelles, les associations naturelles",
          "Discourse Analysis, analyser et décoder un discours",
          "Persuasive Language, les techniques de la rhétorique",
        ],
      },
      {
        title: "Semaine 2 : communication executive",
        items: [
          "Executive Communication, niveau direction et conseil",
          "Boardroom English, salle de conseil en anglais",
          "Strategic Presentations, présentations de haut niveau",
          "Managing International Teams, leadership multinational",
        ],
      },
      {
        title: "Semaine 3 : écoute active avancée",
        items: [
          "Advanced Listening, compréhension au débit natif",
          "Regional Accents : britannique, américain, africain",
          "Decoding Native English Audio, les nuances cachées",
          "Complex Role Plays, simulations bilingues avancées",
        ],
      },
      {
        title: "Semaine 4 : portfolio professionnel",
        items: [
          "Building a Professional Portfolio in English",
          "International Conference Simulation",
          "Academic Conference Simulation, présenter un paper",
          "Weekly Summit, présentation de portfolio devant le groupe",
        ],
      },
    ],
  },
  {
    index: "Month 08",
    title: "Near-Native Fluency",
    level: "C1",
    weeks: [
      {
        title: "Semaine 1 : maîtrise grammaticale C1",
        items: [
          "C1 Grammar Mastery, toutes les structures sans exception",
          "Stylistic Variation & Register, adapter son registre",
          "Advanced Academic Register, l'écriture de haut niveau",
          "Complex sentence architecture, phrases élaborées",
        ],
      },
      {
        title: "Semaine 2 : compréhension native",
        items: [
          "Native-speed Listening & Comprehension",
          "Regional Accents, comprendre tous les accents anglophones",
          "Decoding idiomatic native speech, le sens caché",
          "Complex Argumentation & Rebuttals, rétorquer avec précision",
        ],
      },
      {
        title: "Semaine 3 : production avancée",
        items: [
          "Professional & Creative Writing C1",
          "Leadership Presentations, 20 minutes sans notes",
          "Full Immersion Simulations, tout en anglais",
          "Live Debate with near-native participants",
        ],
      },
      {
        title: "Semaine 4 : préparation à la certification internationale",
        items: [
          "International Certification Prep : IELTS, TOEFL, Cambridge C1",
          "Mock Exams and timed simulations",
          "Individual coaching sessions avec Mr Nathan",
          "Weekly Summit, Grand Oral blanc officiel",
        ],
      },
    ],
  },
  {
    index: "Month 09",
    title: "The Final Door",
    level: "C1 vers C2",
    weeks: [
      {
        title: "Semaine 1 : maîtrise totale C2",
        items: [
          "C2 Language Mastery, zéro lacune",
          "Advanced Rhetoric & Persuasion, l'art de convaincre",
          "Mastery of all grammatical structures without exception",
          "Native-level idiomatic expression, penser en anglais",
        ],
      },
      {
        title: "Semaine 2 : le Grand Oral",
        items: [
          "Final Grand Oral Examination, l'examen de fin de parcours",
          "Portfolio Presentation, 30 minutes devant le jury",
          "Live International Debate, débat avec intervenants natifs",
          "Peer and coach evaluation, retour collectif",
        ],
      },
      {
        title: "Semaine 3 : certification et identité professionnelle",
        items: [
          "OpenDoorsClass GOLD Certification, la cérémonie",
          "Personal Brand in English, votre marque en anglais",
          "Career Strategy in English, planifier sa carrière",
          "LinkedIn Profile et CV professionnel en anglais",
        ],
      },
      {
        title: "Semaine 4 : commencement, la porte s'ouvre",
        items: [
          "Commencement, The Open Door Ceremony",
          "Testimonial Recording, votre témoignage en anglais",
          "Community Leader Integration, rejoindre l'équipe",
          "Alumni Network Activation, réseau des diplômés ODC",
        ],
      },
    ],
  },
  {
    index: "Month 10",
    title: "Extension & Specialisation",
    level: "C2",
    weeks: [
      {
        title: "Semaine 1 : anglais sectoriel avancé",
        items: [
          "Legal English, vocabulaire et pratique juridique",
          "Medical English, communication médicale internationale",
          "Financial English : finance, investissement, marchés",
          "Tech English : IA, startups, digital, innovation",
        ],
      },
      {
        title: "Semaine 2 : conférences internationales",
        items: [
          "Conference Chairing & Facilitation, présider une conférence",
          "Panel Discussion Participation, participer à un panel",
          "International Keynote Delivery, discours d'ouverture",
          "Q&A Management Advanced, gérer les questions difficiles",
        ],
      },
      {
        title: "Semaine 3 : Media & Personal Brand",
        items: [
          "Podcast Creation in English, créer son podcast",
          "YouTube & Video Scripting, scripts vidéo professionnels",
          "Interview Technique, passer dans les médias anglophones",
          "Personal Brand Storytelling, raconter son histoire",
        ],
      },
      {
        title: "Semaine 4 : niveau expert, former les autres",
        items: [
          "Teaching English to Others, transmettre ses compétences",
          "Coaching and Mentoring Skills, accompagner les autres",
          "Translation and Interpretation Basics, initiation",
          "OpenDoorsClass Instructor Certification, devenir coach",
        ],
      },
    ],
  },
];