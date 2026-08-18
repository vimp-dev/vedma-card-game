import en from "./en";
import ru from "./ru";

export type Language = "ru" | "en";

type Dictionary = Record<string, string>;

const dictionaries: Record<Language, Dictionary> = { ru, en };
const fallback: Dictionary = en;

let currentLanguage: Language = "en";
let currentDict: Dictionary = en;

function detectBrowserLanguage(): Language {
  const langs = typeof navigator !== "undefined" ? navigator.languages : [];
  for (const lang of langs) {
    const code = lang.toLowerCase();
    if (code.startsWith("ru")) return "ru";
    if (code.startsWith("en")) return "en";
  }
  return "en";
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  currentDict = dictionaries[lang];
  document.documentElement.lang = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function initI18n(saved?: Language | null): void {
  setLanguage(saved ?? detectBrowserLanguage());
}

/** Returns the localized string for a key, falling back to English. */
export function t(key: string): string {
  return currentDict[key] ?? fallback[key] ?? key;
}

/** Localized with a substitution, e.g. t("handCount", { count: 5 }). */
export function tTpl(key: string, params: Record<string, string | number>): string {
  let out = t(key);
  for (const [name, value] of Object.entries(params)) {
    out = out.replace(`{{${name}}}`, String(value));
  }
  return out;
}