import { Link } from "@tanstack/react-router";
import { PUBLIC_STATE_LIST } from "@/config/states";
import { useI18n } from "@/lib/locale";

const NEW_DESK_IDS = new Set(["mi", "oh"]);

function MarqueeLoop({ items }: { items: string[] }) {
  return (
    <span className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item} className="flex items-center">
          <span className="whitespace-nowrap px-4 text-lg font-bold tracking-wide sm:px-6 sm:text-xl md:text-2xl">
            {item}
          </span>
          <span className="text-gold/50" aria-hidden>
            ·
          </span>
        </span>
      ))}
    </span>
  );
}

/** Home tape: Michigan and Ohio just opened, plus the other public leftover desks. */
export function CoverageMarquee() {
  const { t } = useI18n();
  const others = PUBLIC_STATE_LIST.filter((state) => !NEW_DESK_IDS.has(state.id))
    .map((state) => state.name)
    .join(" · ");
  const items = [t("coverage.miOh"), t("coverage.plusTen"), others, t("coverage.recipe")];

  return (
    <Link
      to="/"
      hash="states"
      className="block border-b border-gold/35 bg-plum text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
      aria-label={t("coverage.aria")}
    >
      <span className="sv-marquee-static hidden min-h-14 items-center justify-center px-4 text-center text-lg font-bold sm:min-h-22 sm:text-xl md:text-2xl">
        {t("coverage.miOh")} · {t("coverage.plusTen")}
      </span>
      <div className="sv-marquee overflow-hidden" aria-hidden="true">
        <div className="sv-marquee-track min-h-14 sm:min-h-22">
          <MarqueeLoop items={items} />
          <MarqueeLoop items={items} />
        </div>
      </div>
    </Link>
  );
}
