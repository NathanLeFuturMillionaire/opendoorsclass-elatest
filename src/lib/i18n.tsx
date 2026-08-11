import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "fr" | "en" | "es";

export type { Dict } from "@/locales/types";
import type { Dict } from "@/locales/types";
import FR from "@/locales/fr";
import EN from "@/locales/en";
import ES from "@/locales/es";

const DICTS: Record<Locale, Dict> = { fr: FR, en: EN, es: ES };

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof FR) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

function detectLocale(): Locale {
  try {
    const nav =
      typeof navigator !== "undefined"
        ? (navigator.language || (navigator as any).userLanguage || "fr").toLowerCase()
        : "fr";
    if (nav.startsWith("es")) return "es";
    if (nav.startsWith("fr")) return "fr";
    return "en";
  } catch {
    return "fr";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("odc.lang") as Locale | null;
      if (stored === "fr" || stored === "en" || stored === "es") {
        setLocaleState(stored);
        return;
      }
      setLocaleState(detectLocale());
    } catch {
      setLocaleState(detectLocale());
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Allow another part of the app (e.g. profile sync) to externally restore
  // the user's saved locale preference once it is fetched.
  useEffect(() => {
    function handleExternalSet(e: Event) {
      const detail = (e as CustomEvent<Locale>).detail;
      if (detail === "fr" || detail === "en" || detail === "es") {
        setLocaleState(detail);
        try {
          localStorage.setItem("odc.lang", detail);
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener("odc:locale:set", handleExternalSet as EventListener);
    return () =>
      window.removeEventListener("odc:locale:set", handleExternalSet as EventListener);
  }, []);

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
        try {
          window.dispatchEvent(new CustomEvent("odc:locale", { detail: l }));
        } catch {
          // ignore
        }
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