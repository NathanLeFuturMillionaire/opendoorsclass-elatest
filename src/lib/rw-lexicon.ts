import {
  glossCacheKey,
  readPersistentGloss,
  writePersistentGloss,
  type RwGloss,
} from "./rw-gloss-cache";

export type { RwGloss } from "./rw-gloss-cache";

export type RwLexiconSense = {
  p: string;
  t: string[];
  d?: string;
  e?: string[];
};

export type RwLexiconEntry = {
  h: string;
  f: string;
  s: RwLexiconSense[];
};

export type RwLexiconShard = {
  v: number;
  e: Record<string, RwLexiconEntry>;
  a: Record<string, string>;
};

export type RwShardLoader = (key: string) => Promise<RwLexiconShard>;

type Compromise = (typeof import("compromise"))["default"];
type Token = { text: string; start: number; end: number };
type FoundEntry = { entry: RwLexiconEntry; lookupText: string };
type ContextRule = { pattern: RegExp; translations: string[] };

const DASHES = /[\u2011\u2012\u2013\u2014\u2015]/g;
const shardPromises = new Map<string, Promise<RwLexiconShard>>();
const memoryGloss = new Map<string, RwGloss>();
let compromisePromise: Promise<Compromise> | null = null;

const STOP_WORDS = new Set(
  "a an the and or but if then than that this these those it its is are was were be been being to of in on at by for from with without as into about across after before during between through over under again further once here there when where why how all any both each few more most other some such no nor not only own same so too very can will just should now i you he she they we them their our your my me him her us".split(" "),
);

const PARTICLES = new Set([
  "about", "after", "along", "around", "aside", "at", "away", "back", "by", "down", "for",
  "forward", "in", "into", "off", "on", "out", "over", "round", "through", "to", "together",
  "under", "up", "with", "without",
]);

const CONTEXT_RULES: Record<string, ContextRule[]> = {
  run: [
    { pattern: /\b(engine|machine|computer|system|program|device|server|software)\b/i, translations: ["fonctionner", "marcher", "opérer"] },
    { pattern: /\b(race|athlete|sport|fast|feet|park|morning|children)\b/i, translations: ["courir"] },
    { pattern: /\b(business|company|project|organisation|organization|operation|shop)\b/i, translations: ["exploiter", "opérer", "diriger", "gérer"] },
  ],
  light: [
    { pattern: /\b(fire|candle|lamp|match|ignite)\b/i, translations: ["allumer", "enflammer"] },
    { pattern: /\b(bag|weight|heavy|carry|feather|suitcase)\b/i, translations: ["léger", "faible"] },
    { pattern: /\b(room|colour|color|bright|pale|sky)\b/i, translations: ["clair", "lumineux"] },
    { pattern: /\b(sun|sunlight|lamp|dark|darkness|shine)\b/i, translations: ["lumière"] },
  ],
  book: [
    { pattern: /\b(reserve|reservation|hotel|flight|ticket|table)\b/i, translations: ["réserver", "retenir"] },
    { pattern: /\b(read|page|chapter|author|library|novel)\b/i, translations: ["livre", "ouvrage"] },
  ],
  play: [
    { pattern: /\b(music|instrument|guitar|piano|song)\b/i, translations: ["jouer", "interpréter"] },
    { pattern: /\b(game|children|football|team|toy)\b/i, translations: ["jouer"] },
    { pattern: /\b(theatre|theater|actor|stage|role)\b/i, translations: ["pièce", "jouer", "interpréter"] },
  ],
  watch: [
    { pattern: /\b(clock|wrist|time|wear)\b/i, translations: ["montre"] },
    { pattern: /\b(film|movie|television|tv|screen|carefully)\b/i, translations: ["regarder", "observer"] },
  ],
  bank: [
    { pattern: /\b(money|account|loan|cash|savings|finance)\b/i, translations: ["banque", "banquier"] },
    { pattern: /\b(river|riverbank|water|shore)\b/i, translations: ["rive", "berge"] },
  ],
  charge: [
    { pattern: /\b(battery|phone|electric|electricity|charger)\b/i, translations: ["charger", "charge"] },
    { pattern: /\b(price|fee|cost|pay|money)\b/i, translations: ["facturer", "frais", "prix"] },
    { pattern: /\b(responsible|responsibility|control|command)\b/i, translations: ["charge", "responsabilité"] },
  ],
  match: [
    { pattern: /\b(football|sport|team|score|game)\b/i, translations: ["match", "rencontre"] },
    { pattern: /\b(colour|color|same|similar|pair|correspond)\b/i, translations: ["correspondre", "assortir"] },
    { pattern: /\b(fire|candle|light|strike)\b/i, translations: ["allumette"] },
  ],
  present: [
    { pattern: /\b(gift|birthday|give|offered)\b/i, translations: ["cadeau", "présent"] },
    { pattern: /\b(now|currently|today|moment)\b/i, translations: ["présent", "actuel"] },
    { pattern: /\b(show|introduce|report|audience)\b/i, translations: ["présenter", "exposer"] },
  ],
  train: [
    { pattern: /\b(railway|station|rail|carriage|travel)\b/i, translations: ["train"] },
    { pattern: /\b(practice|exercise|learn|coach|athlete|skills)\b/i, translations: ["entraîner", "former", "s'entraîner"] },
  ],
  fall: [
    { pattern: /\b(autumn|leaves|season|october)\b/i, translations: ["automne"] },
    { pattern: /\b(drop|fell|ground|slip|rain|prices)\b/i, translations: ["tomber", "chuter", "baisser"] },
  ],
  spring: [
    { pattern: /\b(season|flowers|march|april|summer)\b/i, translations: ["printemps"] },
    { pattern: /\b(water|source|fountain)\b/i, translations: ["source"] },
    { pattern: /\b(coil|elastic|metal|bounce)\b/i, translations: ["ressort"] },
  ],
  right: [
    { pattern: /\b(left|direction|turn|hand)\b/i, translations: ["droite", "droit"] },
    { pattern: /\b(correct|true|answer|wrong)\b/i, translations: ["correct", "juste", "bon"] },
    { pattern: /\b(law|human|legal|vote|freedom)\b/i, translations: ["droit"] },
  ],
  second: [
    { pattern: /\b(minute|hour|time|clock|wait)\b/i, translations: ["seconde"] },
    { pattern: /\b(first|third|place|position|rank)\b/i, translations: ["deuxième", "second"] },
  ],
  subject: [
    { pattern: /\b(school|maths|mathematics|english|science|course)\b/i, translations: ["matière"] },
    { pattern: /\b(topic|discussion|talk|about|theme)\b/i, translations: ["sujet", "thème"] },
  ],
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/’/g, "'").replace(/\s+/g, " ");
}

function cleanDisplay(value: string) {
  return value.replace(DASHES, ", ").replace(/ ,/g, ",").trim();
}

export function rwLexiconShardKey(value: string) {
  const letters = normalize(value).match(/[a-z]/g) ?? [];
  return letters.length ? letters.slice(0, 2).join("") : "other";
}

function defaultShardLoader(key: string): Promise<RwLexiconShard> {
  const existing = shardPromises.get(key);
  if (existing) return existing;
  const pending = fetch(`/rw-lexicon/${key}.json`, {
    credentials: "same-origin",
    cache: "force-cache",
  })
    .then(async (response) => {
      if (response.status === 404) return { v: 1, e: {}, a: {} };
      if (!response.ok) throw new Error("Le dictionnaire local est momentanément indisponible.");
      const data = (await response.json()) as RwLexiconShard;
      if (data.v !== 1 || !data.e || !data.a) throw new Error("Le dictionnaire local est illisible.");
      return data;
    })
    .catch((error) => {
      shardPromises.delete(key);
      throw error;
    });
  shardPromises.set(key, pending);
  return pending;
}

function loadCompromise() {
  if (!compromisePromise) {
    compromisePromise = import("compromise").then((module) => module.default);
  }
  return compromisePromise;
}

export function clearRwLexiconCache() {
  shardPromises.clear();
  memoryGloss.clear();
}

export function getCachedRwGloss(word: string, sentence: string): RwGloss | null {
  const key = glossCacheKey(word, sentence);
  const memory = memoryGloss.get(key);
  if (memory) return memory;
  if (typeof window === "undefined") return null;
  try {
    const stored = readPersistentGloss(key, window.localStorage);
    if (stored) memoryGloss.set(key, stored);
    return stored;
  } catch {
    return null;
  }
}

function rememberGloss(word: string, sentence: string, gloss: RwGloss) {
  const key = glossCacheKey(word, sentence);
  memoryGloss.set(key, gloss);
  if (typeof window === "undefined") return;
  try {
    writePersistentGloss(key, gloss, window.localStorage);
  } catch {
    // The in-memory cache remains available when browser storage is blocked.
  }
}

async function lookupEntry(candidate: string, loadShard: RwShardLoader): Promise<RwLexiconEntry | null> {
  const key = normalize(candidate);
  if (!key) return null;
  const shard = await loadShard(rwLexiconShardKey(key));
  const direct = shard.e[key];
  if (direct) return direct;
  const target = shard.a[key];
  if (!target) return null;
  const targetShard = await loadShard(rwLexiconShardKey(target));
  return targetShard.e[target] ?? null;
}

function adjectiveCandidates(word: string) {
  const irregular: Record<string, string> = {
    best: "good", better: "good", worst: "bad", worse: "bad", farthest: "far",
    furthest: "far", least: "little", most: "much",
  };
  const result = [irregular[word] ?? ""];
  if (word.endsWith("iest")) result.push(`${word.slice(0, -4)}y`);
  if (word.endsWith("est")) result.push(word.slice(0, -3), `${word.slice(0, -3)}e`);
  if (word.endsWith("er")) result.push(word.slice(0, -2), `${word.slice(0, -2)}e`);
  return result
    .map((value) => value.replace(/([bcdfghjklmnpqrstvwxyz])\1$/, "$1"))
    .filter(Boolean);
}

function baseForms(nlp: Compromise, value: string) {
  const verb = nlp(value);
  verb.verbs().toInfinitive();
  const noun = nlp(value);
  noun.nouns().toSingular();
  const normalized = normalize(value);
  return Array.from(new Set([
    normalized,
    normalized.replace(/'s$/, ""),
    normalize(verb.text()),
    normalize(noun.text()),
    ...adjectiveCandidates(normalized),
  ])).filter(Boolean);
}

function sentenceTokens(sentence: string): Token[] {
  return Array.from(sentence.matchAll(/[A-Za-z]+(?:['’\-][A-Za-z]+)*/g)).map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function clickedTokenIndex(tokens: Token[], word: string) {
  const normalized = normalize(word);
  const index = tokens.findIndex((token) => normalize(token.text) === normalized);
  return index;
}

async function findExpression(
  nlp: Compromise,
  word: string,
  sentence: string,
  loadShard: RwShardLoader,
): Promise<FoundEntry | null> {
  const tokens = sentenceTokens(sentence);
  const clicked = clickedTokenIndex(tokens, word);
  if (clicked < 0) return null;
  const candidates: { raw: string; bases: string[] }[] = [];
  for (let length = Math.min(5, tokens.length); length >= 2; length--) {
    for (let start = Math.max(0, clicked - length + 1); start <= Math.min(clicked, tokens.length - length); start++) {
      const slice = tokens.slice(start, start + length);
      if (!slice.every((token, index) => index === 0 || /^\s+$/.test(sentence.slice(slice[index - 1]!.end, token.start)))) continue;
      const raw = sentence.slice(slice[0]!.start, slice[slice.length - 1]!.end);
      candidates.push({ raw, bases: baseForms(nlp, raw) });
    }
  }
  for (const candidate of candidates) {
    for (const form of candidate.bases) {
      const entry = await lookupEntry(form, loadShard);
      if (entry) return { entry, lookupText: candidate.raw };
    }
  }
  return null;
}

function tagsForWord(nlp: Compromise, word: string, sentence: string): string[] {
  const documents = nlp(sentence).json() as { terms?: { text?: string; normal?: string; tags?: string[] }[] }[];
  const terms = documents[0]?.terms ?? [];
  const normalized = normalize(word);
  const term = terms.find((item) => normalize(item.text ?? "") === normalized)
    ?? terms.find((item) => normalize(item.normal ?? "") === normalized);
  return term?.tags ?? [];
}

function grammaticalCategory(tags: string[]) {
  if (tags.includes("Verb")) return "verb";
  if (tags.includes("Noun") || tags.includes("Pronoun")) return "noun";
  if (tags.includes("Adjective")) return "adjective";
  if (tags.includes("Adverb")) return "adverb";
  if (tags.includes("Preposition")) return "preposition";
  if (tags.includes("Conjunction")) return "conjunction";
  if (tags.includes("Determiner")) return "determiner";
  return "";
}

function refinedCategory(nlp: Compromise, word: string, sentence: string, tags: string[]) {
  const tokens = sentenceTokens(sentence);
  const index = clickedTokenIndex(tokens, word);
  const previous = index > 0 ? tokens[index - 1]?.text.toLowerCase() ?? "" : "";
  const next = index >= 0 && index < tokens.length - 1 ? tokens[index + 1]?.text.toLowerCase() ?? "" : "";
  if (["please", "to", "will", "would", "can", "could", "may", "might", "must", "shall", "should"].includes(previous)) return "verb";
  if (["i", "you", "we", "they", "he", "she", "it"].includes(previous) && next) return "verb";
  const isolatedDocuments = nlp(word).json() as { terms?: { tags?: string[] }[] }[];
  const isolated = grammaticalCategory(isolatedDocuments[0]?.terms?.[0]?.tags ?? []);
  const determiners = ["the", "a", "an", "this", "that", "these", "those", "my", "your", "our", "their"];
  if (isolated === "verb" && word.toLowerCase().endsWith("s") && previous && next && !determiners.includes(previous)) return "verb";
  return grammaticalCategory(tags) || isolated;
}

const POS_FR: Record<string, string> = {
  noun: "nom",
  verb: "verbe",
  adjective: "adjectif",
  adverb: "adverbe",
  preposition: "préposition",
  conjunction: "conjonction",
  determiner: "déterminant",
  pronoun: "pronom",
  phrase: "expression",
  interjection: "interjection",
};

function lexicalStem(value: string) {
  return normalize(value)
    .replace(/'s$/, "")
    .replace(/(ies)$/, "y")
    .replace(/(ing|ed|es|s)$/, "");
}

function contextOverlap(sentence: string, sense: RwLexiconSense) {
  const context = new Set(sentenceTokens(sentence).map((token) => lexicalStem(token.text)).filter((token) => token && !STOP_WORDS.has(token)));
  const senseWords = `${sense.d ?? ""} ${(sense.e ?? []).join(" ")}`;
  const tokens = new Set(sentenceTokens(senseWords).map((token) => lexicalStem(token.text)).filter((token) => token && !STOP_WORDS.has(token)));
  let score = 0;
  for (const token of tokens) {
    if (context.has(token)) score += 2;
  }
  return Math.min(6, score);
}

function ruleScore(headword: string, sentence: string, sense: RwLexiconSense) {
  const rules = CONTEXT_RULES[headword] ?? [];
  const translations = sense.t.map(normalize);
  for (const rule of rules) {
    if (!rule.pattern.test(sentence)) continue;
    if (rule.translations.some((translation) => translations.some((value) => value.includes(normalize(translation))))) return 12;
  }
  return 0;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(cleanDisplay).filter(Boolean)));
}

function conciseTranslations(sense: RwLexiconSense) {
  const concise = sense.t.filter((value) => value.trim().split(/\s+/).length <= 2);
  return concise.length ? concise : sense.t;
}

function properNounGloss(word: string, sentence: string): RwGloss {
  return {
    translation_fr: cleanDisplay(word),
    phonetic: "",
    part_of_speech_fr: "nom propre",
    note_fr: "Nom propre conservé sans traduction.",
    meaning_in_context_fr: `« ${cleanDisplay(word)} » désigne ici un nom propre, pas un mot courant à traduire.`,
    other_meanings_fr: [],
    base_form: cleanDisplay(word),
    example_en: cleanDisplay(sentence),
    example_fr: "Les noms propres sont conservés dans leur forme d'origine.",
    lookup_text: cleanDisplay(word),
  };
}

export async function lookupRwWord(
  word: string,
  sentence: string,
  loadShard: RwShardLoader = defaultShardLoader,
): Promise<RwGloss> {
  const cached = getCachedRwGloss(word, sentence);
  if (cached) return cached;
  const nlp = await loadCompromise();
  const tags = tagsForWord(nlp, word, sentence);
  const category = refinedCategory(nlp, word, sentence, tags);

  let found = await findExpression(nlp, word, sentence, loadShard);
  if (!found) {
    for (const candidate of baseForms(nlp, word)) {
      const entry = await lookupEntry(candidate, loadShard);
      if (entry) {
        found = { entry, lookupText: word };
        break;
      }
    }
  }
  if (!found) {
    const proper = /^\p{Lu}/u.test(word) && tags.some((tag) => ["ProperNoun", "Person", "Place", "Organization"].includes(tag));
    if (proper) {
      const gloss = properNounGloss(word, sentence);
      rememberGloss(word, sentence, gloss);
      return gloss;
    }
    throw new Error("Ce mot ne figure pas encore dans la base lexicale locale. Aucun appel IA n'a été effectué.");
  }

  const { entry, lookupText } = found;
  const effectiveCategory = category || (entry.s.every((sense) => sense.p === entry.s[0]?.p) ? entry.s[0]?.p ?? "" : "");
  const scored = entry.s.map((sense, index) => {
    const posScore = effectiveCategory && sense.p === effectiveCategory ? 20 : effectiveCategory && sense.p ? -10 : 0;
    return {
      sense,
      index,
      score: posScore + ruleScore(entry.h, sentence, sense) + contextOverlap(sentence, sense),
    };
  }).sort((a, b) => b.score - a.score || a.index - b.index);
  const topScore = scored[0]?.score ?? 0;
  const top = scored.filter((item) => item.score === topScore).slice(0, 3);
  const selected = top.length > 1 ? top : scored.slice(0, 1);
  const ambiguous = selected.length > 1;
  const translations = unique(selected.flatMap((item) => conciseTranslations(item.sense).slice(0, ambiguous ? 2 : 4))).slice(0, 6);
  if (!translations.length) throw new Error("Aucune traduction fiable n'est disponible pour ce mot.");
  const selectedSet = new Set(selected.map((item) => item.index));
  const otherMeanings = unique(scored.filter((item) => !selectedSet.has(item.index)).flatMap((item) => item.sense.t)).slice(0, 6);
  const primary = selected[0]?.sense;
  const isExpression = sentenceTokens(lookupText).length > 1;
  const lastToken = sentenceTokens(lookupText).at(-1)?.text.toLowerCase() ?? "";
  const partOfSpeech = isExpression
    ? primary?.p === "verb" && PARTICLES.has(lastToken) ? "verbe à particule" : "expression"
    : POS_FR[effectiveCategory] ?? POS_FR[primary?.p ?? ""] ?? "";
  const translation = translations.join(ambiguous ? " · " : ", ");
  const gloss: RwGloss = {
    translation_fr: translation,
    phonetic: cleanDisplay(entry.f),
    part_of_speech_fr: partOfSpeech,
    note_fr: ambiguous
      ? "Le contexte ne permet pas de retenir un seul sens. Plusieurs traductions possibles sont affichées, sans en inventer une."
      : isExpression
        ? "Expression reconnue dans son ensemble, sans traduction mot à mot."
        : normalize(entry.h) !== normalize(word)
          ? `Forme retrouvée dans la base lexicale : ${cleanDisplay(entry.h)}.`
          : "",
    meaning_in_context_fr: ambiguous
      ? `Sens possibles dans cette phrase : ${translation}.`
      : `Dans cette phrase, le sens retenu est : ${translation}.`,
    other_meanings_fr: otherMeanings,
    base_form: cleanDisplay(entry.h),
    example_en: cleanDisplay(primary?.e?.[0] ?? sentence),
    example_fr: `Dans cet exemple, « ${cleanDisplay(lookupText)} » renvoie à : ${translation}.`,
    lookup_text: cleanDisplay(lookupText).slice(0, 80),
  };
  if (primary?.d) gloss.definition_en = cleanDisplay(primary.d);
  rememberGloss(word, sentence, gloss);
  return gloss;
}
