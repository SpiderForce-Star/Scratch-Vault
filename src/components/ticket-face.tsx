import type { Game } from "@/data/games";
import { useActiveState } from "@/lib/active-state";
import { useI18n } from "@/lib/locale";
import { cn } from "@/lib/utils";

/** Original Vault chrome — never official lottery ticket art. */
export function TicketFace({
  game,
  className,
  full = false,
  officialUrl,
}: {
  game: Game;
  className?: string;
  full?: boolean;
  officialUrl?: string | null;
}) {
  const { config } = useActiveState();
  const { t } = useI18n();
  const href = officialUrl ?? config.remainingPrizesUrl;

  return (
    <div
      className={cn(
        "relative overflow-hidden border-b border-gold/25 bg-raised",
        full ? "aspect-[3/2]" : "aspect-[16/7]",
        className,
      )}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 320 140"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <rect width="320" height="140" fill="#0b0f0c" />
        <rect x="8" y="8" width="304" height="124" fill="none" stroke="#c4a574" strokeOpacity="0.35" />
        <rect x="14" y="14" width="292" height="112" fill="none" stroke="#7c9a72" strokeOpacity="0.2" />
        {Array.from({ length: 11 }, (_, i) => (
          <line
            key={i}
            x1={-20 + i * 36}
            y1="0"
            x2={40 + i * 36}
            y2="140"
            stroke="#c4a574"
            strokeOpacity="0.08"
          />
        ))}
        <path d="M24 70 H296" stroke="#7c9a72" strokeOpacity="0.25" />
        <circle cx="278" cy="28" r="10" fill="none" stroke="#c4a574" strokeOpacity="0.4" />
        <circle cx="42" cy="112" r="6" fill="none" stroke="#7c9a72" strokeOpacity="0.35" />
      </svg>

      <div className="relative z-10 flex h-full flex-col justify-between px-3 py-3 sm:px-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-display text-lg tracking-tight sm:text-xl" aria-hidden="true">
            <span className="text-gold">$</span>
            <span className="text-sage">V</span>
          </span>
          <span className="rounded-sm bg-accent px-2 py-1 font-mono text-xs text-accent-fg">
            ${game.price}
          </span>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
            #{game.number}
          </p>
          <p className="mt-1 truncate font-display text-lg leading-tight text-paper sm:text-xl">
            {game.name}
          </p>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="mt-2 inline-flex min-h-8 items-center font-mono text-[10px] tracking-[0.12em] text-gold uppercase underline underline-offset-4 hover:text-paper"
            >
              {t("card.officialTable")}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
