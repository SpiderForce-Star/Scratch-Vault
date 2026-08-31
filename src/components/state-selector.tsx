import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PUBLIC_STATE_LIST, type StateId } from "@/config/states";
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
  const [open, setOpen] = useState(false);
  const selected =
    PUBLIC_STATE_LIST.find((state) => state.id === value) ?? PUBLIC_STATE_LIST[0];
  const others = PUBLIC_STATE_LIST.length - 1;

  const pick = (id: StateId) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <section id="states" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="state-desk-list"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gold bg-gold px-3 text-sm font-medium text-accent-fg"
          >
            {selected.name}
            <ChevronDown
              className={cn("size-4 shrink-0", open && "rotate-180")}
              aria-hidden
            />
          </button>
          <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
            {t("states.otherDesks", { count: others })}
          </p>
        </div>

        <div id="state-desk-list" hidden={!open} className={open ? "mt-3" : undefined}>
          <div
            role="group"
            aria-label={t("states.kicker")}
            className="flex w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:hidden"
          >
            {PUBLIC_STATE_LIST.map((state) => (
              <StatePill
                key={state.id}
                state={state}
                selected={state.id === value}
                onChange={pick}
                compact
              />
            ))}
          </div>

          <div
            role="group"
            aria-label={t("states.kicker")}
            className="hidden grid-cols-5 gap-2 sm:grid"
          >
            {PUBLIC_STATE_LIST.map((state) => (
              <StatePill
                key={state.id}
                state={state}
                selected={state.id === value}
                onChange={pick}
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
  state: (typeof PUBLIC_STATE_LIST)[number];
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
