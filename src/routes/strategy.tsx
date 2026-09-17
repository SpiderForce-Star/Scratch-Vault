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
  skipChipBand,
  soldPricePoints,
  type HeatReport,
  type PriceFilter,
  type PricePoint,
} from "@/lib/heat";
import { displayedHeat } from "@/lib/pace";
import { getDeskSnapshot, type DeskSnapshot } from "@/lib/desk";
import { BandChip, PaceChip } from "@/components/ticket-card";
import { FullCatalogLink } from "@/components/full-catalog-link";
import { StateSelector } from "@/components/state-selector";
import { DataModeBanner } from "@/components/data-mode-banner";
import { useAccess } from "@/lib/use-access";
import { deskPageSearch, deskSearch, useActiveState } from "@/lib/active-state";
import { pageHead } from "@/lib/site";
import { cn } from "@/lib/utils";
import { skipNameLocked } from "@/lib/skip-teaser";
import { useI18n } from "@/lib/locale";
import type { MessageKey } from "@/lib/i18n";
import {
  STRATEGY_BUDGETS,
  STRATEGY_IDS,
  buildStrategyDesk,
  pinStrategyDeskB,
  strategyWinner,
  type StrategyGoal,
  type StrategyId,
  type StrategyPlan,
  type StrategyRow,
} from "@/lib/strategy-desk";

export const Route = createFileRoute("/strategy")({
  component: StrategyDeskPage,
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
      title: "Leftover look-at strategies",
      description:
        "Compare Heat, leftover tops, leftover cash, fast claims, and spread the rack on the live leftover-prize desk. Remaining counts do not improve your odds of winning any prize. Printed odds never change. 18+ (Iowa tickets 21+).",
      path: "/strategy",
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

const STRATEGY_NAME: Record<StrategyId, MessageKey> = {
  heat: "strategy.heat",
  grand: "strategy.grand",
  cash: "strategy.cash",
  fast: "strategy.fast",
  spread: "strategy.spread",
};

const GOAL_LABEL: Record<StrategyGoal, MessageKey> = {
  mixed: "strategy.goalMixed",
  grand: "strategy.goalGrand",
  cash: "strategy.goalCash",
};

function StrategyDeskPage() {
  const navigate = useNavigate({ from: "/strategy" });
  const search = Route.useSearch();
  const loaded = Route.useLoaderData();
  const loadedSnap = loaded?.desk ?? null;
  const { stateId, setStateId, setDeskMode } = useActiveState();
  const viewState = search.state ?? stateId;
  const { t } = useI18n();
  const [filter, setFilter] = useState<PriceFilter>("all");
  const [budget, setBudget] = useState<number>(50);
  const [goal, setGoal] = useState<StrategyGoal>("mixed");
  const [deskA] = useState<StrategyId>("heat");
  const [deskB, setDeskB] = useState<StrategyId>("grand");
  const { paid } = useAccess();
  const [snap, setSnap] = useState<DeskSnapshot | null>(loadedSnap);
  const locked = !(snap?.paid ?? paid);

  useEffect(() => {
    if (search.state && search.state !== stateId) {
      setStateId(search.state);
    }
  }, [search.state, setStateId, stateId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("state");
    if (raw && !isPublicStateId(raw)) {
      void navigate({ to: "/strategy", search: {}, replace: true });
    }
  }, [navigate]);

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
      to: "/strategy",
      search: deskPageSearch(id),
      replace: true,
    });
  };

  useEffect(() => {
    setDeskB((current) => pinStrategyDeskB(goal, deskA, current));
  }, [goal, deskA]);

  const catalog = snap?.games ?? publicCatalog(viewState);
  const sold = useMemo(() => soldPricePoints(catalog), [catalog]);
  const deskState = snap ? getState(snap.stateId) : getState(viewState);
  const noSnapshot = catalog.length === 0;

  const reports = useMemo(() => {
    if (snap) return reportMap(snap.reports);
    return new Map(catalog.map((game) => [game.number, FALLBACK_HEAT]));
  }, [snap, catalog]);

  const plans = useMemo(
    () =>
      buildStrategyDesk({
        games: catalog,
        reports,
        filter,
        budget,
        goal,
        locked,
      }),
    [catalog, reports, filter, budget, goal, locked],
  );

  const planA = plans[deskA];
  const planB = plans[deskB];
  const winner = strategyWinner(planA, planB);
  const goalLabel = t(GOAL_LABEL[goal]);

  const slotB = (id: StrategyId) => {
    if (id === deskA || id === deskB) return;
    setDeskB(id);
  };

  return (
    <div>
      <StateSelector value={viewState} onChange={selectState} />
      <DataModeBanner
        leftover
        state={deskState}
        dataMode={snap?.dataMode}
        loadError={snap?.loadError}
        stale={snap?.stale}
      />

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("strategy.kicker")}
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            {t("strategy.title")}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            {t("strategy.body")}
          </p>
          <p className="mt-2 font-display text-lg tracking-tight">{t("hero.titleAll")}</p>

          {sold.length ? (
            <PriceChipBar sold={sold} filter={filter} onSelect={setFilter} />
          ) : null}

          <p className="mt-5 font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("strategy.budget")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {STRATEGY_BUDGETS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setBudget(amount)}
                className={cn(
                  "min-h-11 min-w-11 rounded-md px-3 text-sm",
                  budget === amount
                    ? "bg-gold text-accent-fg"
                    : "bg-surface text-muted hover:text-fg",
                )}
              >
                ${amount}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-1">
            {(["mixed", "grand", "cash"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setGoal(id)}
                className={cn(
                  "min-h-11 rounded-md px-3 text-sm",
                  goal === id
                    ? "bg-gold text-accent-fg"
                    : "bg-surface text-muted hover:text-fg",
                )}
              >
                {t(GOAL_LABEL[id])}
              </button>
            ))}
          </div>
        </div>
      </section>

      {noSnapshot ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <p className="text-muted">{t("home.noSnapshot")}</p>
          </div>
        </section>
      ) : (
        <>
          <section className="border-b border-line">
            <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {STRATEGY_IDS.map((id) => {
                  const plan = plans[id];
                  const slotted = id === deskA || id === deskB;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => slotB(id)}
                      aria-pressed={slotted}
                      className={cn(
                        "min-h-11 rounded-lg border px-3 py-3 text-left",
                        slotted
                          ? "border-gold bg-raised/40"
                          : "border-line bg-surface hover:border-gold/60",
                      )}
                    >
                      <p className="font-mono text-[10px] tracking-[0.14em] text-gold uppercase">
                        {t(STRATEGY_NAME[id])}
                      </p>
                      <p className="mt-1 font-display text-lg tracking-tight">
                        {t("strategy.fit", { goal: goalLabel })} {Math.round(plan.fit)}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted">
                        {plan.ticketCount} · {t("strategy.spent", { amount: plan.spent })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="border-b border-line">
            <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2">
              <DeskColumn
                label={t("strategy.deskA")}
                plan={planA}
                locked={locked}
                stateId={viewState}
                goalLabel={goalLabel}
              />
              <DeskColumn
                label={t("strategy.deskB")}
                plan={planB}
                locked={locked}
                stateId={viewState}
                goalLabel={goalLabel}
              />
            </div>
          </section>

          <section className="border-b border-line bg-raised/30">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
              {!planA.empty || !planB.empty ? (
                <p className="font-display text-xl tracking-tight sm:text-2xl">
                  {t("strategy.verdict", {
                    winner: t(STRATEGY_NAME[winner]),
                    goal: goalLabel,
                    state: deskState.name,
                  })}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-muted">
                {t("strategy.spendLine", {
                  name: t(STRATEGY_NAME[deskA]),
                  spent: planA.spent,
                  count: planA.ticketCount,
                })}
              </p>
              <p className="mt-1 text-sm text-muted">
                {t("strategy.spendLine", {
                  name: t(STRATEGY_NAME[deskB]),
                  spent: planB.spent,
                  count: planB.ticketCount,
                })}
              </p>
              <p className="mt-3 text-sm text-gold">{t("strategy.notOdds")}</p>
            </div>
          </section>
        </>
      )}

      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            {t("strategy.footnote")}
          </p>
          <p className="mt-3">
            <Link
              to="/disclaimer"
              className="text-sm text-muted underline underline-offset-2 hover:text-fg"
            >
              {t("home.fullDisclaimer")}
            </Link>
          </p>
          <p className="mt-3">
            <FullCatalogLink
              locked={locked}
              className="font-mono text-sm tracking-wide text-gold underline underline-offset-4 hover:text-paper"
            >
              {t("games.seeAll")}
            </FullCatalogLink>
          </p>
        </div>
      </section>
    </div>
  );
}

function DeskColumn({
  label,
  plan,
  locked,
  stateId,
  goalLabel,
}: {
  label: string;
  plan: StrategyPlan;
  locked: boolean;
  stateId: StateId;
  goalLabel: string;
}) {
  const { t } = useI18n();
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-4">
      <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">{label}</p>
      <h2 className="mt-1 font-display text-2xl tracking-tight">
        {t(STRATEGY_NAME[plan.id])}
      </h2>
      <p className="mt-1 text-sm text-gold">
        {t("strategy.fit", { goal: goalLabel })} {Math.round(plan.fit)}
      </p>
      <p className="mt-1 font-mono text-xs text-muted">
        {t("strategy.spent", { amount: plan.spent })} · {plan.ticketCount}
      </p>

      {plan.empty ? (
        <p className="mt-4 text-sm text-muted">
          {t("strategy.empty", { strategy: t(STRATEGY_NAME[plan.id]) })}
        </p>
      ) : (
        <>
          <p className="mt-4 font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
            {t("strategy.lookAt")}
          </p>
          <ul className="mt-2 divide-y divide-line border border-line">
            {plan.lookAt.map((row) => (
              <LookAtRow
                key={`${plan.id}-look-${row.game.number}`}
                row={row}
                locked={locked}
                stateId={stateId}
              />
            ))}
          </ul>

          {plan.stubs.length ? (
            <div className="mt-3" aria-label={t("strategy.sampleSpend")}>
              <div className="flex flex-wrap gap-1">
                {plan.stubs.map((price, i) => (
                  <span
                    key={`${plan.id}-stub-${i}`}
                    className="inline-flex min-h-8 items-center rounded-md bg-raised px-2 font-mono text-xs text-gold"
                  >
                    ${price}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {plan.ticketCount > 0 ? (
            <p className="mt-3 font-mono text-[11px] tracking-wide text-muted">
              {t("strategy.mix", {
                grand: Math.round(plan.mix.grand),
                medium: Math.round(plan.mix.medium),
                cash: Math.round(plan.mix.cash),
              })}
            </p>
          ) : null}
        </>
      )}

      <p className="mt-4 font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
        {t("strategy.walkPast")}
      </p>
      {plan.walkPast.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{t("home.skipEmpty")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line border border-line">
          {plan.walkPast.map((row, index) => (
            <WalkPastRow
              key={`${plan.id}-walk-${row.game.number}`}
              row={row}
              index={index}
              locked={locked}
              stateId={stateId}
              skipChip={plan.id === "heat" || plan.id === "spread"}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LookAtRow({
  row,
  locked,
  stateId,
}: {
  row: StrategyRow;
  locked: boolean;
  stateId: StateId;
}) {
  const { t } = useI18n();
  const deskId = row.game.stateId ?? stateId;
  const cashLeft = row.heat.lowRemaining;
  const topLeft = row.heat.effectiveTop;
  const pace = row.heat.leftoverPct;
  return (
    <li>
      <Link
        to="/game/$number"
        params={{ number: String(row.game.number) }}
        search={deskSearch(deskId)}
        className="flex min-h-11 flex-col gap-2 px-3 py-3 hover:bg-raised"
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm">
            <span className="shrink-0 font-mono text-gold">${row.game.price} × {row.count}</span>
            <span className="mx-2 text-muted">·</span>
            <span className="truncate">{row.game.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="hidden font-mono text-[10px] tracking-[0.12em] text-gold uppercase sm:inline">
              {t("heat.score", { score: displayedHeat(row.heat) })}
            </span>
            <BandChip band={row.heat.band} className="min-h-8 px-2 py-1 text-xs" />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PaceChip
            band={row.heat.paceBand}
            leftoverNow={locked ? null : row.heat.leftoverNow}
            className="min-h-8 px-2 py-1 text-xs"
          />
          {!locked ? (
            <span className="font-mono text-[11px] text-muted">
              {t("strategy.paidLine", {
                top: topLeft == null ? "—" : topLeft.toLocaleString(),
                cash: cashLeft == null ? "—" : cashLeft.toLocaleString(),
                pace: pace == null ? "—" : pace.toFixed(1),
              })}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function WalkPastRow({
  row,
  index,
  locked,
  stateId,
  skipChip,
}: {
  row: StrategyRow;
  index: number;
  locked: boolean;
  stateId: StateId;
  skipChip: boolean;
}) {
  const { t } = useI18n();
  const hideName = skipNameLocked(index, !locked);
  const deskId = row.game.stateId ?? stateId;
  const chip = (
    <BandChip
      band={skipChip ? skipChipBand(row.heat) : row.heat.band}
      className="min-h-8 px-2 py-1 text-xs"
    />
  );
  const label = (
    <span className="flex min-w-0 items-center gap-2 truncate text-sm">
      <span className="shrink-0">${row.game.price} ·</span>
      {hideName ? (
        <span
          className="inline-block max-w-[14rem] truncate blur-[8px] select-none"
          aria-hidden
        >
          {t("home.skipHidden")}
        </span>
      ) : (
        <span className="truncate">{row.game.name}</span>
      )}
    </span>
  );
  return (
    <li>
      {hideName ? (
        <Link
          to="/pricing"
          aria-label={t("home.skipLockedAria")}
          className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 hover:bg-raised"
        >
          {label}
          {chip}
        </Link>
      ) : (
        <Link
          to="/game/$number"
          params={{ number: String(row.game.number) }}
          search={deskSearch(deskId)}
          className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 hover:bg-raised"
        >
          {label}
          {chip}
        </Link>
      )}
    </li>
  );
}

function PriceChipBar({
  sold,
  filter,
  onSelect,
}: {
  sold: PricePoint[];
  filter: PriceFilter;
  onSelect: (next: PriceFilter) => void;
}) {
  const { t } = useI18n();
  const chips: { id: PriceFilter; label: string }[] = [
    { id: "all", label: t("strategy.allPrices") },
    ...sold.map((price) => ({
      id: String(price) as PriceFilter,
      label: `$${price}`,
    })),
  ];
  return (
    <div className="mb-2 mt-4 flex flex-wrap gap-1">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onSelect(chip.id)}
          className={cn(
            "min-h-11 rounded-md px-3 text-sm",
            filter === chip.id
              ? "bg-gold text-accent-fg"
              : "bg-surface text-muted hover:text-fg",
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
