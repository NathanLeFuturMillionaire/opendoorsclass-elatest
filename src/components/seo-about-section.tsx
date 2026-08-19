import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

type Block = { h: string; p: string };
type Faq = { q: string; a: string };

const CONTENT: Record<
  "fr" | "en" | "es",
  {
    lead: string;
    title: string;
    intro: string;
    blocks: Block[];
    skillsTitle: string;
    skills: { name: string; desc: string }[];
    faqTitle: string;
    faq: Faq[];
    links: { en: string; es: string; program: string; board: string };
  }
> = {
  fr: {
    lead: "À propos",
    title: "OpenDoorsClass, la plateforme d'évaluation et d'apprentissage des langues",
    intro:
      "OpenDoorsClass est une plateforme en ligne dédiée à l'évaluation et à l'apprentissage des langues, l'anglais et l'espagnol. Conçue par Mr Nathan, formateur basé à Libreville au Gabon, elle permet à chaque candidat de situer son niveau réel sur l'échelle du CECRL, de A1 à C2, puis de progresser avec un parcours adapté.",
    blocks: [
      {
        h: "Testez votre niveau d'anglais en ligne",
        p: "Le test de niveau d'anglais OpenDoorsClass se passe entièrement en ligne, depuis un ordinateur ou un téléphone. Les questions s'enchaînent par difficulté croissante et couvrent l'ensemble des compétences attendues à chaque palier du cadre européen.",
      },
      {
        h: "Découvrez votre niveau selon le CECRL",
        p: "Le CECRL, cadre européen commun de référence pour les langues, décrit six niveaux : A1 et A2 pour l'utilisateur débutant, B1 et B2 pour l'utilisateur indépendant, C1 et C2 pour l'utilisateur expérimenté. À la fin de l'évaluation, votre score est converti en niveau CECRL et détaillé compétence par compétence.",
      },
      {
        h: "Nos évaluations linguistiques",
        p: "Deux évaluations sont disponibles : l'English Assessment et le Spanish Assessment. Chacune suit la même logique de correction, mais s'appuie sur une banque de questions propre à la langue, avec ses audios, ses lectures et ses consignes rédigées dans la langue évaluée.",
      },
      {
        h: "Ce que reçoit le candidat",
        p: "À la fin du test, vous obtenez immédiatement votre niveau, le détail de vos résultats par compétence, des recommandations de progression et une attestation officielle OpenDoorsClass téléchargeable au format PDF, avec votre numéro de candidat.",
      },
      {
        h: "Comment fonctionnent les crédits",
        p: "L'accès au test fonctionne avec des crédits. Vous achetez un pack de crédits depuis votre espace candidat, puis un crédit est consommé au démarrage d'une session de test. Les tarifs et les packs disponibles sont affichés dans la section tarifs de cette page.",
      },
    ],
    skillsTitle: "Les compétences évaluées",
    skills: [
      { name: "Grammar", desc: "Structures, temps, accords et syntaxe." },
      { name: "Vocabulary", desc: "Richesse lexicale et usage en contexte." },
      { name: "Reading", desc: "Compréhension de textes authentiques." },
      { name: "Listening", desc: "Compréhension orale à partir d'audios réels." },
      { name: "Writing", desc: "Production écrite corrigée par intelligence artificielle." },
      { name: "Speaking", desc: "Expression orale enregistrée puis analysée." },
      { name: "Orthography", desc: "Orthographe et précision de l'écrit." },
    ],
    faqTitle: "Questions fréquentes",
    faq: [
      {
        q: "Qu'est-ce qu'OpenDoorsClass ?",
        a: "OpenDoorsClass est une plateforme d'évaluation et d'apprentissage des langues, anglais et espagnol, fondée par Mr Nathan à Libreville, au Gabon. Elle propose un test de niveau aligné sur le CECRL ainsi qu'une formation d'anglais professionnel.",
      },
      {
        q: "Comment fonctionne le test de niveau ?",
        a: "Vous créez un compte, vous activez un crédit, puis vous répondez à une série de questions de difficulté croissante en moins de trente minutes. La correction est effectuée côté serveur, les bonnes réponses ne sont jamais exposées pendant le test.",
      },
      {
        q: "Quel niveau CECRL puis-je obtenir ?",
        a: "Le résultat peut aller de A1 à C2 selon vos réponses. Le niveau est calculé à partir de votre score global et de vos performances par compétence.",
      },
      {
        q: "Quelles compétences sont évaluées ?",
        a: "Grammaire, vocabulaire, compréhension écrite, compréhension orale, expression écrite, expression orale et orthographe.",
      },
      {
        q: "Combien coûte le test ?",
        a: "L'accès se fait par crédits. Le prix du pack en vigueur, ainsi que les éventuelles promotions, sont affichés en temps réel dans la section tarifs de la page d'accueil et sur la page d'achat de crédits.",
      },
      {
        q: "Comment recevoir mon certificat ?",
        a: "Dès la fin du test, votre attestation OpenDoorsClass est générée dans votre espace candidat et peut être téléchargée au format PDF, avec votre niveau, votre score et votre numéro de candidat.",
      },
      {
        q: "Le test existe-t-il aussi en espagnol ?",
        a: "Oui. Le Spanish Assessment suit la même structure que l'évaluation d'anglais, avec sa propre banque de questions et ses propres audios.",
      },
    ],
    links: {
      en: "Passer le test de niveau d'anglais",
      es: "Découvrir le test d'espagnol",
      program: "Voir le programme de formation en anglais",
      board: "Consulter les classements des candidats",
    },
  },
  en: {
    lead: "About",
    title: "OpenDoorsClass, the language assessment and learning platform",
    intro:
      "OpenDoorsClass is an online platform dedicated to language assessment and learning, in English and Spanish. Designed by Mr Nathan, a trainer based in Libreville, Gabon, it lets every candidate measure their real level on the CEFR scale, from A1 to C2, and then progress with a suitable learning path.",
    blocks: [
      {
        h: "Test your English level online",
        p: "The OpenDoorsClass English level test runs entirely online, from a computer or a phone. Questions increase in difficulty and cover the skills expected at each step of the European framework.",
      },
      {
        h: "Discover your CEFR level",
        p: "The CEFR describes six levels: A1 and A2 for basic users, B1 and B2 for independent users, C1 and C2 for proficient users. At the end of the assessment your score is converted into a CEFR level and broken down skill by skill.",
      },
      {
        h: "Our language assessments",
        p: "Two assessments are available: the English Assessment and the Spanish Assessment. Both share the same grading logic but rely on their own question bank, audio material and instructions written in the assessed language.",
      },
      {
        h: "What candidates receive",
        p: "Right after the test you get your level, a detailed breakdown per skill, progression recommendations and an official OpenDoorsClass certificate available as a PDF with your candidate number.",
      },
      {
        h: "How credits work",
        p: "Access to the test works with credits. You buy a credit pack from your candidate area, then one credit is used when a test session starts. Current prices and packs are shown in the pricing section of this page.",
      },
    ],
    skillsTitle: "Skills assessed",
    skills: [
      { name: "Grammar", desc: "Structures, tenses, agreement and syntax." },
      { name: "Vocabulary", desc: "Lexical range and use in context." },
      { name: "Reading", desc: "Understanding of authentic texts." },
      { name: "Listening", desc: "Listening comprehension from real audio." },
      { name: "Writing", desc: "Written production graded with artificial intelligence." },
      { name: "Speaking", desc: "Recorded speech, then analysed." },
      { name: "Orthography", desc: "Spelling and written accuracy." },
    ],
    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "What is OpenDoorsClass?",
        a: "OpenDoorsClass is a language assessment and learning platform for English and Spanish, founded by Mr Nathan in Libreville, Gabon. It offers a CEFR aligned level test and a professional English training programme.",
      },
      {
        q: "How does the level test work?",
        a: "You create an account, activate a credit, then answer a series of questions of increasing difficulty in under thirty minutes. Grading happens server side and correct answers are never exposed during the test.",
      },
      {
        q: "Which CEFR level can I get?",
        a: "The result ranges from A1 to C2 depending on your answers. The level is computed from your overall score and your performance per skill.",
      },
      {
        q: "Which skills are assessed?",
        a: "Grammar, vocabulary, reading, listening, writing, speaking and orthography.",
      },
      {
        q: "How much does the test cost?",
        a: "Access works with credits. The current pack price, including any promotion, is displayed in real time in the pricing section of the homepage and on the credit purchase page.",
      },
      {
        q: "How do I get my certificate?",
        a: "As soon as the test ends, your OpenDoorsClass certificate is generated in your candidate area and can be downloaded as a PDF with your level, score and candidate number.",
      },
      {
        q: "Is the test also available in Spanish?",
        a: "Yes. The Spanish Assessment follows the same structure as the English one, with its own question bank and audio material.",
      },
    ],
    links: {
      en: "Take the English level test",
      es: "Discover the Spanish level test",
      program: "See the English training programme",
      board: "Browse the candidate leaderboards",
    },
  },
  es: {
    lead: "Acerca de",
    title: "OpenDoorsClass, la plataforma de evaluación y aprendizaje de idiomas",
    intro:
      "OpenDoorsClass es una plataforma en línea dedicada a la evaluación y al aprendizaje de idiomas, inglés y español. Creada por Mr Nathan, formador radicado en Libreville, Gabón, permite a cada candidato conocer su nivel real en la escala del MCER, de A1 a C2, y avanzar con un itinerario adaptado.",
    blocks: [
      {
        h: "Evalúa tu nivel de inglés en línea",
        p: "El test de nivel de inglés de OpenDoorsClass se realiza totalmente en línea, desde un ordenador o un teléfono. Las preguntas aumentan de dificultad y cubren las competencias esperadas en cada nivel del marco europeo.",
      },
      {
        h: "Descubre tu nivel según el MCER",
        p: "El MCER describe seis niveles: A1 y A2 para el usuario básico, B1 y B2 para el usuario independiente, C1 y C2 para el usuario competente. Al terminar la evaluación, tu puntuación se convierte en un nivel MCER y se detalla competencia por competencia.",
      },
      {
        h: "Nuestras evaluaciones lingüísticas",
        p: "Hay dos evaluaciones disponibles: English Assessment y Spanish Assessment. Ambas siguen la misma lógica de corrección, pero cuentan con su propio banco de preguntas, sus audios y sus consignas redactadas en el idioma evaluado.",
      },
      {
        h: "Lo que recibe el candidato",
        p: "Al finalizar el test obtienes tu nivel, el detalle de tus resultados por competencia, recomendaciones de progresión y un certificado oficial OpenDoorsClass descargable en PDF, con tu número de candidato.",
      },
      {
        h: "Cómo funcionan los créditos",
        p: "El acceso al test funciona con créditos. Compras un paquete desde tu espacio de candidato y se consume un crédito al iniciar una sesión de test. Los precios y paquetes vigentes aparecen en la sección de tarifas de esta página.",
      },
    ],
    skillsTitle: "Competencias evaluadas",
    skills: [
      { name: "Grammar", desc: "Estructuras, tiempos verbales y sintaxis." },
      { name: "Vocabulary", desc: "Riqueza léxica y uso en contexto." },
      { name: "Reading", desc: "Comprensión de textos auténticos." },
      { name: "Listening", desc: "Comprensión oral a partir de audios reales." },
      { name: "Writing", desc: "Producción escrita corregida con inteligencia artificial." },
      { name: "Speaking", desc: "Expresión oral grabada y analizada." },
      { name: "Orthography", desc: "Ortografía y precisión escrita." },
    ],
    faqTitle: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Qué es OpenDoorsClass?",
        a: "OpenDoorsClass es una plataforma de evaluación y aprendizaje de idiomas, inglés y español, fundada por Mr Nathan en Libreville, Gabón. Ofrece un test de nivel alineado con el MCER y una formación de inglés profesional.",
      },
      {
        q: "¿Cómo funciona el test de nivel?",
        a: "Creas una cuenta, activas un crédito y respondes a una serie de preguntas de dificultad creciente en menos de treinta minutos. La corrección se realiza en el servidor y las respuestas correctas nunca se exponen durante el test.",
      },
      {
        q: "¿Qué nivel MCER puedo obtener?",
        a: "El resultado va de A1 a C2 según tus respuestas. El nivel se calcula a partir de tu puntuación global y de tu rendimiento por competencia.",
      },
      {
        q: "¿Qué competencias se evalúan?",
        a: "Gramática, vocabulario, comprensión lectora, comprensión oral, expresión escrita, expresión oral y ortografía.",
      },
      {
        q: "¿Cuánto cuesta el test?",
        a: "El acceso funciona con créditos. El precio vigente del paquete, incluidas las promociones, se muestra en tiempo real en la sección de tarifas de la página de inicio y en la página de compra de créditos.",
      },
      {
        q: "¿Cómo recibo mi certificado?",
        a: "Al terminar el test, tu certificado OpenDoorsClass se genera en tu espacio de candidato y puede descargarse en PDF con tu nivel, tu puntuación y tu número de candidato.",
      },
      {
        q: "¿El test también existe en español?",
        a: "Sí. El Spanish Assessment sigue la misma estructura que la evaluación de inglés, con su propio banco de preguntas y sus propios audios.",
      },
    ],
    links: {
      en: "Realizar el test de nivel de inglés",
      es: "Descubrir el test de español",
      program: "Ver el programa de formación en inglés",
      board: "Consultar las clasificaciones de candidatos",
    },
  },
};

export function seoFaqLd(locale: "fr" | "en" | "es" = "fr") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CONTENT[locale].faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function SeoAboutSection() {
  const { locale } = useI18n();
  const c = CONTENT[locale] ?? CONTENT.fr;

  return (
    <section id="a-propos" className="border-t border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-green">{c.lead}</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{c.title}</h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{c.intro}</p>

        <div className="mt-10 space-y-8">
          {c.blocks.map((b) => (
            <article key={b.h}>
              <h3 className="text-lg font-bold">{b.h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.p}</p>
            </article>
          ))}
        </div>

        <h3 className="mt-12 text-lg font-bold">{c.skillsTitle}</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {c.skills.map((s) => (
            <div key={s.name} className="rounded-xl border border-border/60 bg-card p-4">
              <dt className="text-sm font-semibold">{s.name}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{s.desc}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-12 text-lg font-bold">{c.faqTitle}</h3>
        <div className="mt-4 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
          {c.faq.map((f) => (
            <details key={f.q} className="group p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>

        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-brand-blue">
          <Link to="/leveltest/$lang" params={{ lang: "en" }} className="hover:underline">
            {c.links.en}
          </Link>
          <Link to="/spanish-test" className="hover:underline">
            {c.links.es}
          </Link>
          <Link to="/formation-anglais-programme" className="hover:underline">
            {c.links.program}
          </Link>
          <Link to="/leaderboards" className="hover:underline">
            {c.links.board}
          </Link>
        </nav>
      </div>
    </section>
  );
}