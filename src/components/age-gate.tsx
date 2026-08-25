import { useEffect, useState } from "react";
import {
  exitNativeApp,
  hasConfirmedAge,
  isNativeApp,
  persistAgeConfirmation,
} from "@/lib/native";
import { useI18n } from "@/lib/locale";

/** First-visit 18+ confirmation on web and in the native shells. */
export function AgeGate() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasConfirmedAge()) setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/92 px-4 py-6 sm:items-center"
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl">
        <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
          {t("age.kicker")}
        </p>
        <h2
          id="age-gate-title"
          className="mt-3 font-display text-2xl tracking-tight text-fg"
        >
          {t("age.title")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("age.body")}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("age.help")}{" "}
          <a className="underline underline-offset-2" href="tel:18005224700">
            1-800-GAMBLER
          </a>{" "}
          (1-800-522-4700).
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
            onClick={() => {
              persistAgeConfirmation();
              setOpen(false);
            }}
          >
            {t("age.continue")}
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-line px-4 text-sm text-muted hover:text-fg"
            onClick={() => {
              if (isNativeApp()) {
                void exitNativeApp();
                return;
              }
              window.location.assign("https://www.ncpgambling.org/");
            }}
          >
            {t("age.leave")}
          </button>
        </div>
      </div>
    </div>
  );
}
