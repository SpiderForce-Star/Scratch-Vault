import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, {
  DEFAULT_LOCALE,
  applyDocumentLang,
  detectLocale,
  isLocale,
  type Locale,
  type MessageKey,
  type TranslateFn,
} from "@/lib/i18n";

export function LocaleProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const next = detectLocale();
    applyDocumentLang(next);
    if (i18n.resolvedLanguage !== next) {
      void i18n.changeLanguage(next);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function useI18n() {
  const { t: tr, i18n: instance } = useTranslation();

  const locale: Locale = isLocale(instance.resolvedLanguage)
    ? instance.resolvedLanguage
    : isLocale(instance.language)
      ? instance.language
      : DEFAULT_LOCALE;

  const t = useCallback<TranslateFn>(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      vars ? String(tr(key, { replace: vars })) : String(tr(key)),
    [tr],
  );

  const setLocale = useCallback(
    (next: Locale) => {
      applyDocumentLang(next);
      void instance.changeLanguage(next);
    },
    [instance],
  );

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "es" : "en");
  }, [locale, setLocale]);

  return useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );
}
