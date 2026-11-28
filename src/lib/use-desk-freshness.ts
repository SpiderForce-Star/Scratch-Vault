import { postCadenceFor } from "@/config/states";
import { bundledDeskAsOf } from "@/data/desk-as-of";
import { useActiveState } from "@/lib/active-state";
import { deskFreshnessLabel } from "@/lib/desk-freshness";
import { useI18n } from "@/lib/locale";

/** As-of stamp for the active state. Snapshot time wins; otherwise the committed list. */
export function useDeskStamp() {
  const { config, deskAsOf } = useActiveState();
  const { locale } = useI18n();
  const iso = deskAsOf || bundledDeskAsOf(config.id) || config.publishedAt;
  const localeTag = locale === "es" ? "es" : "en-US";
  const freshness = deskFreshnessLabel({
    fetchedAt: iso,
    cadence: postCadenceFor(config.id),
    locale: localeTag,
  });
  return {
    ...freshness,
    short: config.shortName,
    name: config.name,
    localeTag,
  };
}
