import { ticketArt, type Game } from "@/data/games";
import { TicketChromeFace } from "@/components/ticket-chrome";
import { getState, parsePublicStateId } from "@/config/states";
import { useActiveState } from "@/lib/active-state";
import { useI18n } from "@/lib/locale";
import { cn } from "@/lib/utils";

/** Named TN reconstruction, or original chrome unique to this game. */
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
  const art = ticketArt(game);
  const desk = getState(parsePublicStateId(game.stateId ?? config.id));
  const href = officialUrl ?? desk.remainingPrizesUrl;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-raised",
        full ? "aspect-[3/2]" : "aspect-[16/7]",
        className,
      )}
    >
      {art ? (
        <img
          src={art}
          alt={`Independent reconstruction of ${game.name} #${game.number}`}
          className={cn(
            "h-full w-full object-cover",
            full ? "object-center" : "object-[center_18%]",
          )}
        />
      ) : (
        <TicketChromeFace game={game} />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-bg via-bg/70 to-transparent px-3 pt-10 pb-2.5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
              #{game.number}
            </p>
            {full ? (
              <p className="truncate font-display text-base leading-tight text-fg sm:text-lg">
                {game.name}
              </p>
            ) : null}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="mt-1 inline-flex min-h-8 items-center font-mono text-[10px] tracking-[0.12em] text-gold uppercase underline underline-offset-4 hover:text-paper"
              >
                {t("card.officialTable")}
              </a>
            ) : null}
          </div>
          <span className="shrink-0 rounded-sm bg-accent px-2 py-1 font-mono text-xs text-accent-fg">
            ${game.price}
          </span>
        </div>
        {full ? (
          <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-faint uppercase">
            {t("card.reconstruction")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
