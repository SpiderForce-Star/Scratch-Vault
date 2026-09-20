import type { Game } from "@/data/games";
import { useI18n } from "@/lib/locale";

/** Compact skip-row identity: price, then the same #{number} stamp ticket cards use. */
export function SkipGameLabel({
  game,
  hideName,
}: {
  game: Game;
  hideName: boolean;
}) {
  const { t } = useI18n();
  return (
    <span className="flex min-w-0 items-center gap-2 truncate text-sm">
      <span className="shrink-0">${game.price} ·</span>
      {hideName ? (
        <span
          className="inline-block max-w-[14rem] truncate blur-[8px] select-none"
          aria-hidden
        >
          {t("home.skipHidden")}
        </span>
      ) : (
        <span className="min-w-0 truncate">
          <span className="font-mono text-muted">#{game.number}</span>
          <span className="text-muted"> · </span>
          <span>{game.name}</span>
        </span>
      )}
    </span>
  );
}
