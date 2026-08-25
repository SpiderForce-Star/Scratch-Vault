import { Link } from "@tanstack/react-router";
import type { StateId } from "@/config/states";
import type { TonightCard } from "@/lib/heat";
import { BandChip } from "@/components/ticket-card";
import { useI18n } from "@/lib/locale";
import { cn } from "@/lib/utils";

export function TonightHeatStrip({
  stateId,
  cards,
  depleted,
}: {
  stateId: StateId;
  cards: TonightCard[];
  depleted: boolean;
}) {
  const { t } = useI18n();
  if (!cards.length) return null;

  return (
    <section className="overflow-x-hidden border-b border-line">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6">
        <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("heatTonight.kicker")}
        </p>
        <h2 className="mt-1 font-display text-xl tracking-tight sm:text-2xl">
          {t("heatTonight.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          {t("heatTonight.sub")}
        </p>
        {depleted ? (
          <p className="mt-2 text-sm text-faint">{t("heatTonight.depleted")}</p>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.number}
              to="/game/$number"
              params={{ number: String(card.number) }}
              search={{ state: stateId }}
              className={cn(
                "flex min-h-11 min-w-0 flex-col justify-center rounded-lg border border-line bg-surface px-3 py-3",
                "hover:border-gold/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-gold">${card.price}</span>
                <BandChip band={card.band} />
              </div>
              <p className="mt-2 truncate font-display text-lg leading-snug">
                {card.name}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-wide text-faint uppercase">
                {t("heatTonight.retailTop", {
                  count:
                    card.effectiveTop == null
                      ? "—"
                      : card.effectiveTop.toLocaleString(),
                })}
                {card.secondaryRemaining != null
                  ? ` · ${t("heatTonight.secondary", {
                      count: card.secondaryRemaining.toLocaleString(),
                    })}`
                  : ""}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
