import { useId, useState } from "react";
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
  return <DeskSwitcher value={value} onChange={onChange} variant="page" />;
}

/** Public leftover-state picker. Page chrome is sm+; the phone menu reuses the same catalog. */
export function DeskSwitcher({
  value,
  onChange,
  variant = "page",
}: {
  value: StateId;
  onChange: (id: StateId) => void;
  variant?: "page" | "menu";
}) {
  const { t } = useI18n();
  const menu = variant === "menu";
  const [open, setOpen] = useState(menu);
  const listId = useId();
  const selected =
    PUBLIC_STATE_LIST.find((state) => state.id === value) ?? PUBLIC_STATE_LIST[0];
  const roster = PUBLIC_STATE_LIST.length;

  const pick = (id: StateId) => {
    onChange(id);
    setOpen(false);
  };

  const trigger = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
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
        {t("states.leftoverRoster", { count: roster })}
      </p>
    </div>
  );

  const list = (
    <div id={listId} hidden={!open} className={open ? "mt-3" : undefined}>
      <div
        role="group"
        aria-label={t("states.kicker")}
        className={cn("grid w-full gap-2", menu ? "grid-cols-2" : "grid-cols-5")}
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

      {menu ? null : (
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-faint">
          {t("states.body")}{" "}
          {t("age.help")}{" "}
          <a className="underline underline-offset-2" href="tel:18005224700">
            1-800-GAMBLER
          </a>
          .
        </p>
      )}
    </div>
  );

  if (menu) {
    return (
      <div className="px-2 pb-3">
        {trigger}
        {list}
      </div>
    );
  }

  return (
    <section id="states" className="hidden border-b border-line sm:block">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6">
        {trigger}
        {list}
      </div>
    </section>
  );
}

function StatePill({
  state,
  selected,
  onChange,
}: {
  state: (typeof PUBLIC_STATE_LIST)[number];
  selected: boolean;
  onChange: (id: StateId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(state.id)}
      aria-pressed={selected}
      aria-label={state.name}
      className={cn(
        "flex min-h-14 min-w-0 flex-col items-center justify-center rounded-lg border px-1 py-2 text-center",
        selected
          ? "border-gold bg-gold text-accent-fg"
          : "border-line bg-raised text-muted hover:border-gold hover:text-gold",
      )}
    >
      <span className="font-display text-base leading-none tracking-tight">
        {state.shortName}
      </span>
      <span
        className={cn(
          "mt-1 w-full truncate text-[10px] leading-tight sm:text-xs",
          selected ? "text-accent-fg/90" : "text-faint",
        )}
      >
        {state.name}
      </span>
    </button>
  );
}
