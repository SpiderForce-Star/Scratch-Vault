import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/locale";

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

export function PromoMarquee() {
  const { t } = useI18n();
  const items = [
    t("marquee.dead"),
    t("marquee.posted"),
    t("marquee.intel"),
    t("marquee.sweep"),
    t("marquee.trial"),
  ];

  return (
    <Link
      to="/pricing"
      className="block border-b border-gold/35 bg-plum text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
      aria-label={t("marquee.aria")}
    >
      <span className="sv-marquee-static hidden min-h-14 items-center justify-center px-4 text-center text-lg font-bold sm:min-h-22 sm:text-xl md:text-2xl">
        {t("marquee.dead")} · {t("marquee.trial")}
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
