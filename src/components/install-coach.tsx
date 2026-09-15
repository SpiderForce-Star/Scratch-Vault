import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native";
import { useI18n } from "@/lib/locale";

const DISMISS_KEY = "vsv.install.coach.dismissed";

type PromptEvent = Event & { prompt: () => Promise<void> };

export function InstallCoach() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isNativeApp()) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* continue */
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) return;

    const ua = navigator.userAgent;
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
    if (!mobile) return;

    const isIos = /iPhone|iPad|iPod/i.test(ua);
    setIos(isIos);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as PromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (isIos) setOpen(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!open) return null;

  return (
    <div className="border-b border-line bg-raised/80 px-4 py-3 sm:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("install.kicker")}
        </p>
        {ios ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>{t("install.ios1")}</li>
            <li>{t("install.ios2")}</li>
            <li>{t("install.ios3")}</li>
          </ol>
        ) : (
          <p className="text-sm text-muted">
            {t("install.android")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {!ios && prompt ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-md bg-gold px-4 text-sm font-medium text-accent-fg"
              onClick={() => {
                void prompt.prompt();
                dismiss();
              }}
            >
              {t("install.add")}
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex min-h-11 items-center px-3 text-sm text-muted underline underline-offset-4"
            onClick={() => dismiss()}
          >
            {t("install.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }
}
