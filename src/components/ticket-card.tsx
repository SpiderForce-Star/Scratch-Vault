import { Link } from "@tanstack/react-router";
import { DATA_AS_OF, money, moneyFull, postedBook, type Game } from "@/data/games";
import { type HeatReport } from "@/lib/heat";
import { TicketFace } from "@/components/ticket-face";
import { useActiveState } from "@/lib/active-state";
import { useI18n } from "@/lib/locale";
import { heatBandKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function TicketCard({
  game,
  heat,
  locked = false,
}: {
  game: Game;
  heat: HeatReport;
  locked?: boolean;
}) {
  const { stateId } = useActiveState();
  const { t } = useI18n();
  const topLeft = heat.effectiveTop ?? heat.topRemaining;
  const midLeft = heat.midRemaining;
  const book = postedBook(game);

  return (
    <Link
      to="/game/$number"
      params={{ number: String(game.number) }}
      search={{ state: stateId }}
      className={cn(
        "group block overflow-hidden border bg-surface",
        "rounded-xl transition-transform duration-200",
        "hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        heat.bust && "border-bust/40",
      )}
    >
      <div className="relative overflow-hidden">
        <TicketFace game={game} />
        <BandChip band={heat.band} className="absolute top-3 right-3 z-10" />
        <span className="absolute top-3 left-3 z-10 rounded-sm border border-gold/50 bg-bg/80 px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-gold uppercase">
          {t("heat.score", { score: Math.round(heat.vault) })}
        </span>
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
              {book.topPool == null ? "—" : money(book.topPool)}
            </dd>
          </div>
          <div>
            <dt className="text-faint">{t("card.retailTops")}</dt>
            <dd className="font-mono text-sm text-fg">
              {topLeft == null ? "—" : topLeft.toLocaleString()}
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
          {t("card.updated", { week: DATA_AS_OF })}
        </p>
        {heat.bust ? (
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
    hot: "border border-hot/50 bg-hot-ink text-hot",
    warm: "border border-warm/50 bg-warm-ink text-warm",
    cool: "border border-cool/40 bg-cool-ink text-cool",
    bust: "border border-bust/50 bg-bust-ink text-bust",
  };
  return (
    <span
      className={cn(
        "rounded-sm px-2 py-1 text-xs font-semibold tracking-[0.12em] uppercase",
        map[band],
        className,
      )}
    >
      {t(heatBandKey(band))}
    </span>
  );
}
