import { Link } from "@tanstack/react-router";
import { PUBLIC_STATE_LIST } from "@/config/states";
import { useI18n } from "@/lib/locale";

const NEW_DESK_IDS = new Set(["mi", "oh"]);

function RibbonLoop({ items }: { items: string[] }) {
  return (
    <span className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item} className="flex items-center">
          <span className="whitespace-nowrap px-4 text-[0.95rem] font-semibold tracking-wide sm:px-5 sm:text-lg">
            {item}
          </span>
          <span className="text-[#f7edd4]/45" aria-hidden>
            ·
          </span>
        </span>
      ))}
    </span>
  );
}

/** Home ribbon: Michigan and Ohio just opened, plus the other public leftover states. */
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
      className="block border-y border-[#f0c36a]/80 bg-gradient-to-r from-[#6b2408] via-[#c45c18] to-[#6b2408] text-[#f7edd4] shadow-[inset_0_1px_0_rgb(247,237,212,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#f0c36a]"
      aria-label={t("coverage.aria")}
    >
      <span className="sv-desk-ribbon-static hidden min-h-12 items-center justify-center px-4 text-center text-[0.95rem] font-semibold sm:min-h-14 sm:text-lg">
        {t("coverage.miOh")} · {t("coverage.plusTen")}
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
