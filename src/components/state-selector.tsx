import { STATE_LIST, type StateId } from "@/config/states";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/locale";

export function StateSelector({
  value,
  onChange,
}: {
  value: StateId;
  onChange: (id: StateId) => void;
}) {
  const { t } = useI18n();
  return (
    <section id="states" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6">
        <p className="font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
          {t("states.kicker")}
        </p>

        <div
          role="group"
          aria-label={t("states.kicker")}
          className="mt-3 flex w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:hidden"
        >
          {STATE_LIST.map((state) => (
            <StatePill
              key={state.id}
              state={state}
              selected={state.id === value}
              onChange={onChange}
              compact
            />
          ))}
        </div>

        <div
          role="group"
          aria-label={t("states.kicker")}
          className="mt-3 hidden grid-cols-6 gap-2 sm:grid"
        >
          {STATE_LIST.map((state) => (
            <StatePill
              key={state.id}
              state={state}
              selected={state.id === value}
              onChange={onChange}
            />
          ))}
        </div>

        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-faint">
          {t("states.body")}{" "}
          {t("age.help")}{" "}
          <a className="underline underline-offset-2" href="tel:18005224700">
            1-800-GAMBLER
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function StatePill({
  state,
  selected,
  onChange,
  compact = false,
}: {
  state: (typeof STATE_LIST)[number];
  selected: boolean;
  onChange: (id: StateId) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(state.id)}
      aria-pressed={selected}
      aria-label={state.name}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border text-center",
        compact
          ? "min-h-11 shrink-0 snap-start px-3 py-1.5"
          : "min-h-14 min-w-0 px-1 py-2",
        selected
          ? "border-gold bg-gold text-accent-fg"
          : "border-line bg-raised text-muted hover:border-gold hover:text-gold",
      )}
    >
      <span className="font-display text-base leading-none tracking-tight">
        {state.shortName}
      </span>
      {compact ? null : (
        <span
          className={cn(
            "mt-1 w-full truncate text-[10px] leading-tight sm:text-xs",
            selected ? "text-accent-fg/90" : "text-faint",
          )}
        >
          {state.name}
        </span>
      )}
    </button>
  );
}
