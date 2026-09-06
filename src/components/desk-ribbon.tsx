import { Link } from "@tanstack/react-router";
import { PUBLIC_STATE_LIST } from "@/config/states";
import { useI18n } from "@/lib/locale";

function RibbonLoop({ items }: { items: string[] }) {
  return (
    <span className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item} className="flex items-center">
          <span className="whitespace-nowrap px-3 text-xs font-medium tracking-wide sm:px-4 sm:text-sm">
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
      className="block border-b border-line bg-raised text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
      aria-label={t("ribbon.aria", { count })}
    >
      <span className="sv-desk-ribbon-static hidden min-h-8 items-center justify-center px-4 text-center text-xs font-medium sm:min-h-10 sm:text-sm">
        {access}
      </span>
      <div className="sv-desk-ribbon overflow-hidden" aria-hidden="true">
        <div className="sv-desk-ribbon-track min-h-8 sm:min-h-10">
          <RibbonLoop items={items} />
          <RibbonLoop items={items} />
        </div>
      </div>
    </Link>
  );
}
