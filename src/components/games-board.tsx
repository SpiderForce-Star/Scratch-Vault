import type { Game } from "@/data/games";
import {
  PRICE_POINTS,
  groupByDeskPrice,
  type GamesBoard,
  type HeatReport,
} from "@/lib/heat";
import { TicketCard } from "@/components/ticket-card";
import { useI18n } from "@/lib/locale";
import type { MessageKey } from "@/lib/i18n";

function TicketGrid({
  games,
  reports,
  locked,
}: {
  games: Game[];
  reports: Map<number, HeatReport>;
  locked: boolean;
}) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => {
        const heat = reports.get(game.number);
        if (!heat) return null;
        return (
          <TicketCard
            key={`${game.stateId ?? "g"}-${game.number}`}
            game={game}
            heat={heat}
            locked={locked}
          />
        );
      })}
    </div>
  );
}

function PriceGrouped({
  games,
  reports,
  locked,
}: {
  games: Game[];
  reports: Map<number, HeatReport>;
  locked: boolean;
}) {
  const { t } = useI18n();
  const groups = groupByDeskPrice(games);
  if (!groups.length) return null;
  return (
    <div className="mt-4 flex flex-col gap-8">
      {groups.map((group) => (
        <div key={group.price}>
          <h3 className="font-mono text-sm tracking-[0.14em] text-gold uppercase">
            {t("games.priceGroup", { price: group.price })}
          </h3>
          <TicketGrid games={group.games} reports={reports} locked={locked} />
        </div>
      ))}
    </div>
  );
}

export function GamesBoardView({
  board,
  reports,
  locked,
}: {
  board: GamesBoard;
  reports: Map<number, HeatReport>;
  locked: boolean;
}) {
  const { t } = useI18n();
  const empty =
    !board.newGames.length && !board.hot.length && !board.warm.length && !board.skip.length;

  if (empty) {
    return <p className="mt-6 text-muted">{t("games.empty")}</p>;
  }

  return (
    <div className="mt-8 flex flex-col gap-12">
      {board.newGames.length ? (
        <section>
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("games.newKicker")}
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-tight sm:text-3xl">
            {t("games.newTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted">{t("games.newUnposted")}</p>
          <PriceGrouped games={board.newGames} reports={reports} locked={locked} />
        </section>
      ) : null}

      {board.hot.length ? (
        <section>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            {t("games.hotTitle")}
          </h2>
          <PriceGrouped games={board.hot} reports={reports} locked={locked} />
        </section>
      ) : null}

      {board.warm.length ? (
        <section>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            {t("games.warmTitle")}
          </h2>
          <PriceGrouped games={board.warm} reports={reports} locked={locked} />
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-4xl tracking-[0.16em] text-gold uppercase sm:text-6xl [text-shadow:0_0_28px_rgb(196,92,74,0.45)]">
          {t("home.skipKicker")}
        </h2>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          {t("home.skipTitle")}
        </p>
        {board.skip.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("home.skipEmpty")}</p>
        ) : (
          <PriceGrouped games={board.skip} reports={reports} locked={locked} />
        )}
      </section>
    </div>
  );
}

export const GAMES_PRICE_FILTERS: { id: number | "all"; labelKey?: MessageKey; label?: string }[] =
  [{ id: "all", labelKey: "home.filterAll" }, ...PRICE_POINTS.map((p) => ({ id: p, label: `$${p}` }))];
