import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/locale";

/** Compact leftover-accounting hook. Sits under the leftover banner, above three tickets. */
export function MethodsCallout() {
  const { t } = useI18n();
  return (
    <aside className="border-b border-gold/40 bg-raised/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("methods.kicker")}
          </p>
          <p className="mt-1 font-display text-lg tracking-tight sm:text-xl">
            {t("methods.homeTitle")}
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            {t("methods.homeBody")}
          </p>
        </div>
        <Link
          to="/methods"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-gold px-4 text-sm text-accent-fg hover:bg-gold/90"
        >
          {t("methods.explain")}
        </Link>
      </div>
    </aside>
  );
}
