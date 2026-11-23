export type RwTraceGrammarInput = {
  point: string;
  explanation_fr?: string;
  example?: string;
  level: string;
  title: string;
};

type Theme = "learning" | "family" | "health" | "culture" | "work" | "technology" | "environment" | "life";

const themeLabels: Record<Theme, string> = {
  learning: "new ideas",
  family: "family life",
  health: "healthy habits",
  culture: "cultural traditions",
  work: "working life",
  technology: "digital life",
  environment: "the environment",
  life: "daily life",
};

function traceTheme(title: string): Theme {
  const value = title.toLowerCase();
  if (/family|parent|mother|father|grandmother|respect|identity/.test(value)) return "family";
  if (/health|medicine|mosquito|food|diet|body/.test(value)) return "health";
  if (/culture|tradition|language|wedding|country|world/.test(value)) return "culture";
  if (/business|money|work|employment|shop|market/.test(value)) return "work";
  if (/digital|technology|message|media|internet|screen/.test(value)) return "technology";
  if (/nature|environment|climate|water|earth/.test(value)) return "environment";
  if (/education|learn|school|student|read|book|knowledge|skill|study/.test(value)) return "learning";
  return "life";
}

function classifyGrammar(point: string, explanation: string) {
  const value = `${point} ${explanation}`.toLowerCase();
  if (/conditional inversion|inversion with were/.test(value)) return "inversion";
  if (/future perfect/.test(value)) return "futurePerfect";
  if (/could have|might have|should have|must have|modal perfect/.test(value)) return "modalPerfect";
  if (/first conditional|if \+|if clause|provided|unless|logical implication/.test(value)) return "conditional";
  if (/negative.*does|does not|doesn't|did not|didn't need/.test(value)) return "negative";
  if (/compar|more than|less .*than|better|faster|worth more|not so much|much as|less about/.test(value)) return "comparative";
  if (/neither|negative inversion|\bnor\b|nowhere|inversion after negative/.test(value)) return "neither";
  if (/not only|both\.\.\.|both\.\.\. and/.test(value)) return "correlative";
  if (/although|concession|concessive|nevertheless|however|even when|despite/.test(value)) return "concession";
  if (/embedded questions|whether/.test(value)) return "embedded";
  if (/relative clauses|defining relative|non-defining relative/.test(value)) return "relative";
  if (/passive/.test(value)) return "passive";
  if (/emphatic do|fronting/.test(value)) return "emphasis";
  if (/enough \+ to/.test(value)) return "enough";
  if (/present perfect/.test(value)) return "presentPerfect";
  if (/future|\bwill\b|going to/.test(value)) return "future";
  if (/past simple|past tense/.test(value)) return "past";
  if (/imperative/.test(value)) return "imperative";
  if (/gerund|verb.*ing|verb-ing|by \+|instead of|rather than|while followed/.test(value)) return "gerund";
  if (/possessive/.test(value)) return "possessive";
  if (/in \+ country|i am from|i live in/.test(value)) return "place";
  if (/on \+ day|in the morning|prepositions of time/.test(value)) return "time";
  if (/first|next|finally|meanwhile|on the other hand|conversely|sequence words/.test(value)) return "sequence";
  if (/because|reason/.test(value)) return "reason";
  if (/adverbs of frequency|always and every day|present simple|habits|routines/.test(value)) return "present";
  if (/adjectives after/.test(value)) return "adjectives";
  if (/need not|\bmust\b|\bcan\b|\bmay\b|\bcould\b|modal|be likely to|possible to/.test(value)) return "modal";
  return "fallback";
}

const banks: Record<string, string[]> = {
  modal: [
    "I can learn from this lesson.",
    "We can discuss new ideas together.",
    "She can explain the rule clearly.",
    "You can use this structure in a conversation.",
    "A careful reader can understand the main idea.",
  ],
  present: [
    "I read about new ideas every day.",
    "We discuss the lesson after class.",
    "She writes new words in her notebook.",
    "He checks his answers before dinner.",
    "They practise English every evening.",
  ],
  negative: [
    "I do not skip my reading practice.",
    "We do not ignore difficult words.",
    "She does not rush through the text.",
    "He does not forget his notebook.",
    "They do not stop after one mistake.",
  ],
  comparative: [
    "This short sentence is easier than the last one.",
    "My reading is better than it was last month.",
    "This book is more interesting than that one.",
    "She writes more carefully than before.",
    "The new exercise is more challenging than the first.",
  ],
  conditional: [
    "If I read every day, I learn new words.",
    "If you need help, ask your coach.",
    "If we practise together, we can improve.",
    "If she checks the context, she understands better.",
    "If they finish early, they will review the rule.",
  ],
  inversion: [
    "Were I to practise daily, I would improve.",
    "Were she to ask for help, we would answer.",
    "Were the text more difficult, I would read slowly.",
    "Were we to review the rule, we would remember it.",
    "Were they to continue, they would gain confidence.",
  ],
  futurePerfect: [
    "By Friday, I will have finished this text.",
    "By next week, we will have learnt five rules.",
    "By June, she will have read twenty lessons.",
    "By the end of the month, he will have improved.",
    "By next year, they will have completed the programme.",
  ],
  modalPerfect: [
    "I could have missed an important detail.",
    "She might have understood the question.",
    "He should have checked the context.",
    "We must have learnt this rule before.",
    "They could have completed the exercise earlier.",
  ],
  neither: [
    "Neither the title nor the picture tells the whole story.",
    "Neither speed nor guessing improves my reading.",
    "I have neither forgotten the rule nor ignored it.",
    "Neither answer is complete without evidence.",
    "Nowhere is careful practice more valuable than here.",
  ],
  correlative: [
    "Both reading and writing help me learn.",
    "She is both patient and curious.",
    "The exercise is not only useful but also enjoyable.",
    "We practise both at home and at school.",
    "He not only reads the text but also explains it.",
  ],
  concession: [
    "Although the sentence is short, it is meaningful.",
    "Although I was tired, I finished the exercise.",
    "The rule seems difficult, yet I can learn it.",
    "Even when she makes a mistake, she continues.",
    "Nevertheless, careful practice brings steady progress.",
  ],
  embedded: [
    "I ask who wrote the text.",
    "She wonders whether the answer is correct.",
    "We check where the idea appears.",
    "He explains why the example matters.",
    "They ask whether the evidence is reliable.",
  ],
  relative: [
    "The student who reads daily improves quickly.",
    "I like books that teach useful ideas.",
    "The coach who guides us is patient.",
    "This is the rule which we studied yesterday.",
    "Learners who ask questions understand more.",
  ],
  passive: [
    "The text is read by the whole class.",
    "New words are written in a notebook.",
    "The answers are checked by the coach.",
    "The rule was explained clearly.",
    "Five sentences will be traced today.",
  ],
  emphasis: [
    "I do read every evening.",
    "She does check her answers.",
    "We do value careful practice.",
    "It is precisely because I practise that I improve.",
    "They do understand the importance of reading.",
  ],
  enough: [
    "I am confident enough to read aloud.",
    "She knows the rule well enough to use it.",
    "We have enough time to finish.",
    "He is patient enough to try again.",
    "They are skilled enough to explain the idea.",
  ],
  presentPerfect: [
    "I have read the first paragraph.",
    "We have learnt a useful rule.",
    "She has checked every answer.",
    "He has improved since January.",
    "They have completed five sentences.",
  ],
  future: [
    "I will read the next text tomorrow.",
    "We will practise after dinner.",
    "She is going to write five sentences.",
    "He will ask his coach for advice.",
    "They will review the rule next week.",
  ],
  past: [
    "I read the text yesterday.",
    "We learnt a new rule last week.",
    "She wrote the answer carefully.",
    "He asked a useful question.",
    "They finished the exercise on time.",
  ],
  imperative: [
    "Read the first sentence carefully.",
    "Follow the grey model with your finger.",
    "Stay inside the tracing frame.",
    "Check each letter before continuing.",
    "Try again when the trace is incorrect.",
  ],
  gerund: [
    "Reading every day builds confidence.",
    "I improve by practising regularly.",
    "Instead of guessing, check the context.",
    "She learns by asking useful questions.",
    "Rather than rushing, we read carefully.",
  ],
  possessive: [
    "My notebook contains new words.",
    "Her reading improves every week.",
    "Our teacher explains the rule.",
    "His answer is clear and correct.",
    "Their class practises together.",
  ],
  place: [
    "I am from Gabon.",
    "She lives in Libreville.",
    "We study in a quiet room.",
    "He works in a small shop.",
    "They read in the library.",
  ],
  time: [
    "On Monday, I read a new text.",
    "In the morning, I review my notes.",
    "In the afternoon, we practise together.",
    "At night, she writes in her notebook.",
    "On Saturday, they complete the exercise.",
  ],
  sequence: [
    "First, I read the title.",
    "Next, I study the grammar rule.",
    "Then, I trace the first sentence.",
    "After that, I check my work.",
    "Finally, I review my result.",
  ],
  reason: [
    "I practise because I want to improve.",
    "She checks the context because the word is new.",
    "We read slowly because the idea is complex.",
    "He asks for help because the rule is difficult.",
    "They review their work because accuracy matters.",
  ],
  adjectives: [
    "The lesson is useful.",
    "I am ready to learn.",
    "She is careful with every letter.",
    "The exercise seems enjoyable.",
    "They are proud of their progress.",
  ],
  fallback: [
    "I study the example carefully.",
    "We use the structure in class.",
    "She explains the idea clearly.",
    "He writes another correct example.",
    "They remember the rule after practice.",
  ],
};

const advancedModal = [
  "A careful reader can question an unsupported claim.",
  "We may discover several meanings in one word.",
  "The coach could explain the nuance more fully.",
  "Learners must consider the context before answering.",
  "A reliable argument can withstand close examination.",
];

function cleanSentence(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2012\u2013\u2014\u2015\u2011]/g, ", ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function usableExample(example?: string) {
  const cleaned = cleanSentence(example ?? "");
  if (cleaned.length < 12 || cleaned.length > 110 || cleaned.includes("...")) return "";
  const first = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  return first.split(/\s+/).length >= 3 ? first : "";
}

/** Five stable, curriculum-based sentences. No randomness and no AI calls. */
export function buildRwTraceSentences(input: RwTraceGrammarInput): string[] {
  const category = classifyGrammar(input.point, input.explanation_fr ?? "");
  const theme = themeLabels[traceTheme(input.title)];
  let source = banks[category] ?? banks.fallback!;
  if (category === "modal" && /^(B2|C1|C2)$/.test(input.level)) source = advancedModal;
  const themed = source.map((sentence, index) =>
    index < 2 && /^(modal|present|past|conditional|future|presentPerfect)$/.test(category)
      ? sentence.replace(/new ideas|this lesson/g, theme)
      : sentence,
  );
  const example = usableExample(input.example);
  const candidates = example ? [...themed.slice(0, 4), example] : themed;
  const unique = [...new Set(candidates.map(cleanSentence).filter(Boolean))];
  for (const extra of banks.fallback!) {
    if (unique.length >= 5) break;
    if (!unique.includes(extra)) unique.push(extra);
  }
  return unique.slice(0, 5).map((sentence) => /[.!?]$/.test(sentence) ? sentence : `${sentence}.`);
}

export function rwTraceExerciseKey(lessonId: string, grammarIndex: number) {
  return `${lessonId}:${grammarIndex}`;
}
