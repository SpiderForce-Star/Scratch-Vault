import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/locale";
import { useDeskStamp } from "@/lib/use-desk-freshness";

function MarqueeLoop({ items }: { items: string[] }) {
  return (
    <span className="flex shrink-0 items-center">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="flex items-center">
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

export function PromoMarquee() {
  const { t } = useI18n();
  const { name, when } = useDeskStamp();
  const line = t("marquee.sweep", { state: name, when });
  const items = [line, line];

  return (
    <Link
      to="/pricing"
      className="block border-b border-gold/35 bg-plum text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
      aria-label={line}
    >
      <span className="sv-marquee-static hidden min-h-14 items-center justify-center px-4 text-center text-base font-bold sm:min-h-22 sm:text-lg md:text-xl">
        {line}
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
