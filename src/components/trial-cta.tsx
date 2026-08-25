import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { TRIAL_CTA } from "@/lib/trial";
import { useI18n } from "@/lib/locale";

export { TRIAL_CTA };

export function TrialCta({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Link
      to="/pricing"
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md bg-gold px-3 text-sm font-medium text-accent-fg sm:px-4",
        className,
      )}
    >
      {compact ? t("cta.trialCompact") : t("cta.trial")}
    </Link>
  );
}
