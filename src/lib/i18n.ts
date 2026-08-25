import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

export type Locale = "en" | "es";
export type MessageKey = keyof typeof en;
export type TranslateFn = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

export const LOCALE_STORAGE_KEY = "vsv.locale";
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "es";
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* private mode */
  }
  try {
    const lang = window.navigator.language?.toLowerCase() ?? "";
    if (lang.startsWith("es")) return "es";
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function persistLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
}

export function applyDocumentLang(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: ["en", "es"],
  interpolation: { escapeValue: false },
  keySeparator: false,
  nsSeparator: false,
  returnNull: false,
  react: { useSuspense: false },
});

i18n.on("languageChanged", (lng) => {
  if (!isLocale(lng)) return;
  persistLocale(lng);
  applyDocumentLang(lng);
});

export function heatBandKey(
  band: "hot" | "warm" | "cool" | "bust",
): MessageKey {
  if (band === "hot") return "heat.hot";
  if (band === "warm") return "heat.warm";
  if (band === "cool") return "heat.cool";
  return "heat.pass";
}

export default i18n;
