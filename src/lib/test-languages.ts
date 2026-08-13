/**
 * Registry of the languages that can be ASSESSED by an OpenDoorsClass level test.
 *
 * Important: this is the TEST language (`testLanguage`), which is a different
 * concept from the SITE interface language (`interfaceLanguage`) handled by
 * `src/lib/i18n.tsx`. A visitor can browse the site in French and still take
 * the Spanish Level Test.
 *
 * Adding a new assessed language later (de, pt, it, zh, ...) only requires a
 * new entry here plus its translation keys.
 */
export type TestLanguageCode = "en" | "es";

export type TestLanguageStatus = "available" | "coming-soon";

export type TestLanguage = {
  /** Stable identifier stored/passed around as `testLanguage`. */
  code: TestLanguageCode;
  flag: string;
  /** English label, used for SEO and as a fallback. */
  label: string;
  status: TestLanguageStatus;
  /** i18n keys, resolved with the current interface language. */
  titleKey: string;
  descKey: string;
  ctaKey: string;
  /** Marks a recently launched assessment (discreet NEW badge). */
  isNew?: boolean;
};

export const TEST_LANGUAGES: TestLanguage[] = [
  {
    code: "en",
    flag: "🇬🇧",
    label: "English Level Test",
    status: "available",
    titleKey: "testlang.en.title",
    descKey: "testlang.en.desc",
    ctaKey: "testlang.en.cta",
  },
  {
    code: "es",
    flag: "🇪🇸",
    label: "Spanish Level Test",
    status: "coming-soon",
    titleKey: "testlang.es.title",
    descKey: "testlang.es.desc",
    ctaKey: "testlang.es.cta",
    isNew: true,
  },
];

export function isTestLanguageCode(value: string): value is TestLanguageCode {
  return TEST_LANGUAGES.some((l) => l.code === value);
}

export function getTestLanguage(code: string): TestLanguage | undefined {
  return TEST_LANGUAGES.find((l) => l.code === code);
}
