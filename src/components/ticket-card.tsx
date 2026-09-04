import { Link } from "@tanstack/react-router";
import {
  isNewCatalogGame,
  money,
  moneyFull,
  postedBook,
  type Game,
} from "@/data/games";
import { type HeatReport } from "@/lib/heat";
import { TicketFace } from "@/components/ticket-face";
import { deskSearch, useActiveState } from "@/lib/active-state";
import { useI18n } from "@/lib/locale";
import { heatBandKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
  const topLeft = heat.effectiveTop ?? heat.topRemaining;
  const midLeft = heat.midRemaining;
  const book = postedBook(game);
  const isNew = isNewCatalogGame(game);
  const unposted = heat.band === "new";

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
      <div className="relative overflow-hidden">
        <TicketFace game={game} />
        <BandChip band={forceBand ?? heat.band} className="absolute top-3 right-3 z-10" />
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1">
          {isNew ? <NewGameChip /> : null}
          {unposted ? null : (
            <span className="hidden min-h-9 items-center rounded-sm border border-gold/50 bg-bg/80 px-3 py-1.5 font-mono text-base font-bold tracking-[0.14em] text-gold uppercase sm:inline-flex sm:text-lg">
              {t("heat.score", { score: Math.round(heat.vault) })}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <h2 className="font-display text-lg leading-snug tracking-tight text-fg">
            {game.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t("odds.topPrinted", {
              prize: moneyFull(game.topPrize),
              odds: game.odds.toFixed(2),
            })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Meter label={t("heat.grandShort")} value={heat.grand} tone="grand" />
          <Meter
            label={heat.mediumKnown ? t("heat.mediumShort") : t("heat.mediumEst")}
            value={heat.medium}
            tone="medium"
          />
        </div>

        <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
          <div>
            <dt className="text-faint">{t("card.topListed")}</dt>
            <dd className="font-mono text-sm text-fg">
              {locked || book.topPool == null ? "—" : money(book.topPool)}
            </dd>
          </div>
          <div>
            <dt className="text-faint">{t("card.retailTops")}</dt>
            <dd className="font-mono text-sm text-fg">
              {locked || topLeft == null ? "—" : topLeft.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-faint">{t("card.midBook")}</dt>
            <dd className="font-mono text-sm text-fg">
              {locked
                ? t("card.vault")
                : midLeft == null
                  ? "—"
                  : midLeft.toLocaleString()}
            </dd>
          </div>
        </dl>

        <p className="font-mono text-[10px] tracking-wide text-faint uppercase">
          {t("card.updated")}
        </p>
        {unposted ? (
          <p className="text-xs text-gold">{t("card.unposted")}</p>
        ) : heat.bust ? (
          <p className="text-xs text-bust">
            {t("card.skip")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function Meter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "grand" | "medium";
}) {
  const color = tone === "grand" ? "bg-hot" : "bg-warm";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-faint">
        <span>{label}</span>
        <span className="font-mono text-muted">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${Math.max(4, value)}%` }}
        />
      </div>
    </div>
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
