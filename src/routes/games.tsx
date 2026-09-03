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
  reportMap,
  sortGames,
  type HeatReport,
  type SortKey,
} from "@/lib/heat";
import { getDeskSnapshot, type DeskSnapshot } from "@/lib/desk";
import { TicketCard } from "@/components/ticket-card";
import { StateSelector } from "@/components/state-selector";
import { DataModeBanner } from "@/components/data-mode-banner";
import { useAccess } from "@/lib/use-access";
import { useActiveState } from "@/lib/active-state";
import { pageHead } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/locale";
import type { MessageKey } from "@/lib/i18n";

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
      title: "Scratch-off catalog",
      description:
        "Full remaining-prize catalog of tracked scratch-off games. Remaining counts do not improve odds. 18+ (Iowa Lottery tickets are 21+).",
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
};

const SORTS: { id: SortKey; labelKey: MessageKey }[] = [
  { id: "heat", labelKey: "home.sortHeat" },
  { id: "medium", labelKey: "home.sortMedium" },
  { id: "safest", labelKey: "home.sortSafest" },
  { id: "grand", labelKey: "home.sortGrand" },
  { id: "price", labelKey: "home.sortPrice" },
  { id: "name", labelKey: "home.sortName" },
];

function GamesCatalog() {
  const navigate = useNavigate({ from: "/games" });
  const search = Route.useSearch();
  const loaded = Route.useLoaderData();
  const loadedSnap = loaded?.desk ?? null;
  const { stateId, setStateId, config, setDeskMode } = useActiveState();
  const { t } = useI18n();
  const [sort, setSort] = useState<SortKey>("heat");
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
    void getDeskSnapshot({ data: { stateId } })
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
  }, [paid, stateId, setDeskMode]);

  const selectState = (id: StateId) => {
    setStateId(id);
    void navigate({
      to: "/games",
      search: id === DEFAULT_STATE_ID ? {} : { state: id },
      replace: true,
    });
  };

  const catalog = snap?.games ?? publicCatalog(stateId);
  const reports = useMemo(() => {
    if (snap) return reportMap(snap.reports);
    return new Map(catalog.map((game) => [game.number, FALLBACK_HEAT]));
  }, [snap, catalog]);

  const prices = useMemo(() => {
    const set = new Set(catalog.map((g) => g.price));
    return [...set].sort((a, b) => a - b);
  }, [catalog]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = catalog.filter((g) => {
      if (price !== "all" && g.price !== price) return false;
      if (!q) return true;
      return g.name.toLowerCase().includes(q) || String(g.number).includes(q);
    });
    return sortGames(filtered, sort, reports);
  }, [catalog, sort, query, reports, price]);

  return (
    <div>
      <StateSelector value={stateId} onChange={selectState} />
      <DataModeBanner
        state={snap ? getState(snap.stateId) : config}
        dataMode={snap?.dataMode}
        loadError={snap?.loadError}
        stale={snap?.stale}
      />

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("home.allGames")}
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            {t("home.catalogLine", {
              short: config.shortName,
              count: catalog.length,
            })}
          </h1>
          <p className="mt-3">
            <Link
              to="/"
              search={stateId === DEFAULT_STATE_ID ? {} : { state: stateId }}
              className="text-sm text-muted underline underline-offset-2 hover:text-fg"
            >
              {t("nav.desk")}
            </Link>
          </p>

          <div className="mt-5 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setPrice("all")}
              className={cn(
                "min-h-11 rounded-md px-3 text-sm",
                price === "all"
                  ? "bg-gold text-accent-fg"
                  : "bg-surface text-muted hover:text-fg",
              )}
            >
              {t("home.filterAll")}
            </button>
            {prices.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrice(p)}
                className={cn(
                  "min-h-11 min-w-11 rounded-md px-3 text-sm",
                  price === p
                    ? "bg-gold text-accent-fg"
                    : "bg-surface text-muted hover:text-fg",
                )}
              >
                ${p}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
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
            <label className="sr-only" htmlFor="catalog-sort">
              {t("home.sort")}
            </label>
            <select
              id="catalog-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="min-h-11 rounded-md border border-line bg-surface px-3 text-sm text-fg"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.labelKey)}
                </option>
              ))}
            </select>
          </div>

          {list.length === 0 ? (
            <p className="mt-6 text-muted">{t("home.none")}</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((game) => {
                const heat = reports.get(game.number);
                if (!heat) return null;
                return (
                  <TicketCard
                    key={game.number}
                    game={game}
                    heat={heat}
                    locked={locked}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
