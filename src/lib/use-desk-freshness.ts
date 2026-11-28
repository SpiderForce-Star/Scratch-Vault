import { useMatches } from "@tanstack/react-router";
import type { StateId } from "@/config/states";
import { useActiveState } from "@/lib/active-state";
import { deskStampFor } from "@/lib/desk-stamp";
import { useI18n } from "@/lib/locale";

function matchedDeskClock(
  matches: ReturnType<typeof useMatches>,
  stateId: StateId,
): { fetchedAt: string | null; judgedAt?: number } {
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const data = matches[i]?.loaderData as
      | {
          desk?: {
            stateId?: string;
            fetchedAt?: string | null;
            judgedAt?: number;
          } | null;
        }
      | undefined;
    const desk = data?.desk;
    if (desk && desk.stateId === stateId) {
      return { fetchedAt: desk.fetchedAt ?? null, judgedAt: desk.judgedAt };
    }
  }
  return { fetchedAt: null };
}

/**
 * As-of stamp for the active URL state. The route loader's fetchedAt is the
 * same on the server and the client, so the label does not change after hydration.
 */
export function useDeskStamp() {
  const { config } = useActiveState();
  const { locale } = useI18n();
  const matches = useMatches();
  const clock = matchedDeskClock(matches, config.id);
  const localeTag = locale === "es" ? "es" : "en-US";
  return {
    ...deskStampFor({
      stateId: config.id,
      fetchedAt: clock.fetchedAt,
      now: clock.judgedAt,
      locale: localeTag,
    }),
    localeTag,
  };
}
