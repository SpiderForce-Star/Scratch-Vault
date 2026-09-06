import { Link } from "@tanstack/react-router";
import { PUBLIC_STATE_LIST } from "@/config/states";
import { useI18n } from "@/lib/locale";

function RibbonLoop({ items }: { items: string[] }) {
  return (
    <span className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item} className="flex items-center">
          <span className="whitespace-nowrap px-4 text-[0.95rem] font-semibold tracking-wide sm:px-5 sm:text-lg">
            {item}
          </span>
          <span className="text-gold/40" aria-hidden>
            ·
          </span>
        </span>
      ))}
    </span>
  );
}

export function DeskRibbon() {
  const { t } = useI18n();
  const count = PUBLIC_STATE_LIST.length;
  const desks = PUBLIC_STATE_LIST.map((state) => state.name).join(" · ");
  const access = t("ribbon.access", { count });
  const items = [access, desks, t("ribbon.trial")];

  return (
    <Link
      to="/pricing"
      className="block border-y border-gold/70 bg-gradient-to-r from-[#132016] via-[#243d28] to-[#132016] text-[#f0dc9a] shadow-[inset_0_1px_0_rgb(243,231,176,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
      aria-label={t("ribbon.aria", { count })}
    >
      <span className="sv-desk-ribbon-static hidden min-h-12 items-center justify-center px-4 text-center text-[0.95rem] font-semibold sm:min-h-14 sm:text-lg">
        {access}
      </span>
      <div className="sv-desk-ribbon overflow-hidden" aria-hidden="true">
        <div className="sv-desk-ribbon-track min-h-12 sm:min-h-14">
          <RibbonLoop items={items} />
          <RibbonLoop items={items} />
        </div>
      </div>
    </Link>
  );
}
