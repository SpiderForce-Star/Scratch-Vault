import { useI18n } from "@/lib/locale";

/** Age, helpline, and independence. Shown on the home page and pricing. */
export function ComplianceLine({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <p className={`text-xs leading-relaxed text-muted ${className}`}>
      {t("compliance.age")}{" "}
      {t("compliance.help")}{" "}
      <a className="underline underline-offset-2" href="tel:18005224700">
        1-800-GAMBLER
      </a>
      . {t("compliance.independent")}
    </p>
  );
}
