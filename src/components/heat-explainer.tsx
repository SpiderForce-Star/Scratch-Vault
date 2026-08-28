import { useI18n } from "@/lib/locale";

export function HeatExplainer() {
  const { t } = useI18n();
  return (
    <section className="border-b border-line bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <h2 className="font-display text-xl tracking-tight sm:text-2xl">
          {t("heat.whatTitle")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          {t("heat.whatBody")}
        </p>
        <p className="mt-2 text-xs text-faint">{t("heat.whatAge")}</p>
      </div>
    </section>
  );
}
