import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { publicCatalog } from "@/data/states";
import {
  DEFAULT_STATE_ID,
  type StateId,
  getState,
  isPublicStateId,
} from "@/config/states";
import {
  buildGamesBoard,
  reportMap,
  soldPricePoints,
  underFiveGames,
  type HeatReport,
} from "@/lib/heat";
import { getDeskSnapshot, type DeskSnapshot } from "@/lib/desk";
import { TicketCard } from "@/components/ticket-card";
import { gamesPriceFilters, GamesBoardView } from "@/components/games-board";
import { StateSelector } from "@/components/state-selector";
import { DataModeBanner } from "@/components/data-mode-banner";
import { useAccess } from "@/lib/use-access";
import { deskPageSearch, useActiveState } from "@/lib/active-state";
import { pageHead } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/locale";

export const Route = createFileRoute("/games")({
  component: GamesCatalog,
  validateSearch: (search: Record<string, unknown>): { state?: StateId } => {
    if (isPublicStateId(search.state)) return { state: search.state };
    return {};
  },
  loaderDeps: ({ search }) => ({
    stateId: search.state ?? DEFAULT_STATE_ID,
  }),
  loader: async ({ deps }): Promise<{ desk: DeskSnapshot | null }> => {
    const desk = await getDeskSnapshot({ data: { stateId: deps.stateId } }).catch(
      () => null,
    );
    return { desk };
  },
  head: () =>
    pageHead({
      title: "Scratch-off games",
      description:
        "New, hot, warm, and skip lists for $5+ scratch-offs. Leftover prizes are the lottery’s list, not what’s in one store. 18+ (Iowa Lottery tickets are 21+).",
      path: "/games",
    }),
});

const FALLBACK_HEAT: HeatReport = {
  grand: 0,
  medium: 0,
  vault: 0,
  band: "cool",
  bust: false,
  mediumKnown: false,
  role: "jackpot",
  topRemaining: null,
  effectiveTop: null,
  midRemaining: null,
  lowRemaining: null,
  remainingUnknown: true,
};

function GamesCatalog() {
  const navigate = useNavigate({ from: "/games" });
  const search = Route.useSearch();
  const loaded = Route.useLoaderData();
  const loadedSnap = loaded?.desk ?? null;
  const { stateId, setStateId, setDeskMode } = useActiveState();
  const viewState = search.state ?? stateId;
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState<number | "all">("all");
  const { paid } = useAccess();
  const [snap, setSnap] = useState<DeskSnapshot | null>(loadedSnap);
  const locked = !(snap?.paid ?? paid);

  useEffect(() => {
    if (search.state && search.state !== stateId) {
      setStateId(search.state);
    }
  }, [search.state, setStateId, stateId]);

  useEffect(() => {
    if (!loadedSnap) return;
    setSnap(loadedSnap);
    setDeskMode(loadedSnap.dataMode);
  }, [loadedSnap, setDeskMode]);

  useEffect(() => {
    let cancelled = false;
    void getDeskSnapshot({ data: { stateId: viewState } })
      .then((next) => {
        if (cancelled) return;
        setSnap(next);
        setDeskMode(next.dataMode);
      })
      .catch(() => {
        /* keep loader snapshot */
      });
    return () => {
      cancelled = true;
    };
  }, [paid, viewState, setDeskMode]);

  const selectState = (id: StateId) => {
    setStateId(id);
    void navigate({
      to: "/games",
      search: deskPageSearch(id),
      replace: true,
    });
  };

  const catalog = snap?.games ?? publicCatalog(viewState);
  const priceFilters = useMemo(() => gamesPriceFilters(catalog), [catalog]);
  const reports = useMemo(() => {
    if (snap) return reportMap(snap.reports);
    return new Map(catalog.map((game) => [game.number, FALLBACK_HEAT]));
  }, [snap, catalog]);

  useEffect(() => {
    if (price === "all") return;
    const sold = soldPricePoints(catalog);
    if (!sold.length || sold.some((p) => p === price)) return;
    setPrice("all");
  }, [catalog, price]);

  const board = useMemo(
    () => buildGamesBoard(catalog, reports, price, query),
    [catalog, reports, price, query],
  );
  const cheap = useMemo(() => {
    const q = query.trim().toLowerCase();
    return underFiveGames(catalog).filter((g) => {
      if (!q) return true;
      return g.name.toLowerCase().includes(q) || String(g.number).includes(q);
    });
  }, [catalog, query]);

  return (
    <div>
      <StateSelector value={viewState} onChange={selectState} />
      <DataModeBanner
        state={snap ? getState(snap.stateId) : getState(viewState)}
        dataMode={snap?.dataMode}
        loadError={snap?.loadError}
        stale={snap?.stale}
      />

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("games.kicker")}
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            {t("games.title")}
          </h1>
          <p className="mt-3">
            <Link
              to="/"
              search={deskPageSearch(viewState)}
              className="text-sm text-muted underline underline-offset-2 hover:text-fg"
            >
              {t("nav.desk")}
            </Link>
          </p>

          <div className="mt-5 flex flex-wrap gap-1">
            {priceFilters.map((f) => (
              <button
                key={String(f.id)}
                type="button"
                onClick={() => setPrice(f.id)}
                className={cn(
                  "min-h-11 min-w-11 rounded-md px-3 text-sm",
                  price === f.id
                    ? "bg-gold text-accent-fg"
                    : "bg-surface text-muted hover:text-fg",
                )}
              >
                {f.labelKey ? t(f.labelKey) : f.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="sr-only" htmlFor="catalog-q">
              {t("home.search")}
            </label>
            <input
              id="catalog-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("home.searchPh")}
              className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg placeholder:text-faint sm:max-w-56"
            />
          </div>

          <GamesBoardView board={board} reports={reports} locked={locked} />

          {price === "all" && cheap.length ? (
            <details className="mt-12 border-t border-line pt-6">
              <summary className="cursor-pointer list-none font-display text-xl tracking-tight [&::-webkit-details-marker]:hidden">
                {t("games.underFive")}
                <span className="ml-3 font-sans text-sm font-normal text-muted">
                  {t("games.underFiveHint")}
                </span>
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cheap.map((game) => {
                  const heat = reports.get(game.number);
                  if (!heat) return null;
                  return (
                    <TicketCard
                      key={`u5-${game.number}`}
                      game={game}
                      heat={heat}
                      locked={locked}
                    />
                  );
                })}
              </div>
            </details>
          ) : null}
        </div>
      </section>
    </div>
  );
}
