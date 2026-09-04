import { Link } from "@tanstack/react-router";
import {
  isNewCatalogGame,
  moneyFull,
  type Game,
} from "@/data/games";
import { type HeatReport } from "@/lib/heat";
import { getState } from "@/config/states";
import { TicketFace } from "@/components/ticket-face";
import { deskSearch, useActiveState } from "@/lib/active-state";
import { useI18n } from "@/lib/locale";
import { heatBandKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function remainingText(locked: boolean, value: number | null): string {
  if (locked || value == null) return "—";
  return value.toLocaleString();
}

export function TicketCard({
  game,
  heat,
  locked = false,
  forceBand,
}: {
  game: Game;
  heat: HeatReport;
  locked?: boolean;
  forceBand?: HeatReport["band"];
}) {
  const { stateId } = useActiveState();
  const deskId = game.stateId ?? stateId;
  const { t } = useI18n();
  const state = getState(deskId);
  const showStoreJackpot = Boolean(state.holdback && state.holdback.subtractTop > 0);
  const isNew = isNewCatalogGame(game);
  const unposted = heat.band === "new";
  const topTier = game.tiers[1];
  const midTier = game.tiers[2];
  const midLeft = midTier?.remaining ?? heat.midRemaining;
  const middleNone = !locked && midLeft == null;

  return (
    <Link
      to="/game/$number"
      params={{ number: String(game.number) }}
      search={deskSearch(deskId)}
      className={cn(
        "group block overflow-hidden border bg-surface",
        "rounded-xl transition-transform duration-200",
        "hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        heat.bust && "border-bust/40",
        isNew && "border-gold/50",
      )}
    >
      <div className="px-4 pt-4 pb-2">
        <h2 className="font-display text-lg leading-snug tracking-tight text-fg">
          {game.name}
        </h2>
        <p className="mt-1 font-mono text-xs tracking-wide text-muted">
          #{game.number} · ${game.price}
        </p>
      </div>

      <TicketFace game={game} />

      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {unposted ? (
            <NewGameChip />
          ) : (
            <>
              <span className="inline-flex min-h-9 items-center font-mono text-base font-bold tracking-[0.14em] text-gold uppercase sm:text-lg">
                {t("heat.score", { score: Math.round(heat.vault) })}
              </span>
              <BandChip band={forceBand ?? heat.band} />
              {isNew ? <NewGameChip /> : null}
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
          <div>
            <p className="text-faint">{t("card.grandPrize")}</p>
            <p className="mt-1 font-mono text-sm text-fg">{moneyFull(game.topPrize)}</p>
            <p className="mt-0.5 font-mono text-sm text-fg">
              {remainingText(locked, heat.topRemaining)}
            </p>
            {showStoreJackpot && !locked ? (
              <p className="mt-1 text-[11px] leading-snug text-muted">
                {t("card.inStore", {
                  count: heat.effectiveTop == null ? "—" : heat.effectiveTop.toLocaleString(),
                })}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-faint">{t("card.topTier")}</p>
            {topTier ? (
              <>
                <p className="mt-1 font-mono text-sm text-fg">{moneyFull(topTier.amount)}</p>
                <p className="mt-0.5 font-mono text-sm text-fg">
                  {remainingText(locked, topTier.remaining)}
                </p>
              </>
            ) : (
              <p className="mt-1 font-mono text-sm text-muted">{t("card.none")}</p>
            )}
          </div>
          <div>
            {middleNone ? (
              <p className="font-mono text-sm leading-snug text-muted">{t("card.middleNone")}</p>
            ) : (
              <>
                <p className="text-faint">{t("card.middleTier")}</p>
                {midTier ? (
                  <p className="mt-1 font-mono text-sm text-fg">{moneyFull(midTier.amount)}</p>
                ) : null}
                <p className="mt-0.5 font-mono text-sm text-fg">
                  {remainingText(locked, midLeft)}
                </p>
              </>
            )}
          </div>
        </div>

        <p className="font-mono text-[10px] tracking-wide text-faint uppercase">
          {t("card.updated")}
        </p>
        {unposted ? (
          <p className="text-xs text-gold">{t("card.unposted")}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function BandChip({
  band,
  className,
}: {
  band: HeatReport["band"];
  className?: string;
}) {
  const { t } = useI18n();
  const map = {
    hot: "border-hot bg-hot-ink text-hot",
    warm: "border-warm bg-warm-ink text-warm",
    cool: "border-cool bg-cool-ink text-cool",
    bust: "border-bust bg-bust-ink text-bust",
    new: "border-gold bg-[#14240c] text-[#c8e08a]",
  };
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-md border-2 px-3 py-1.5 text-sm font-bold tracking-[0.12em] uppercase",
        map[band],
        className,
      )}
    >
      {t(heatBandKey(band))}
    </span>
  );
}

export function NewGameChip({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-md border-2 border-gold bg-[#14240c] px-3 py-1.5 text-sm font-bold tracking-[0.14em] text-[#c8e08a] uppercase",
        className,
      )}
    >
      {t("card.newGame")}
    </span>
  );
}
