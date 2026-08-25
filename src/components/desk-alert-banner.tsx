import { DESK_META } from "@/data/desk-meta";
import { useDeskAlert } from "@/lib/use-desk-alert";
import { TrialCta } from "@/components/trial-cta";
import { useI18n } from "@/lib/locale";

/** Subscriber live banner, or unpaid SELL card. Never a fake personal alert. */
export function DeskAlertBanner() {
  const { unseen, subscriber, isPending, markSeen, reviewDesk } = useDeskAlert();
  const { t } = useI18n();

  if (isPending) return null;

  if (!subscriber) {
    return (
      <div className="border-b border-line bg-raised/50">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm leading-relaxed text-muted">
            {t("alert.sell")}
          </p>
          <TrialCta className="shrink-0" />
        </div>
      </div>
    );
  }

  if (!unseen) return null;

  return (
    <div className="border-b border-gold/40 bg-gold/10">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm leading-relaxed text-paper">
          {t("alert.updated", {
            week: DESK_META.weekLabel,
            summary: DESK_META.summary,
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => reviewDesk()}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-gold px-4 text-sm font-medium text-accent-fg"
          >
            {t("alert.review")}
          </button>
          <button
            type="button"
            onClick={() => markSeen()}
            className="inline-flex min-h-11 items-center justify-center px-3 text-sm text-muted underline underline-offset-4 hover:text-paper"
          >
            {t("hero.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
