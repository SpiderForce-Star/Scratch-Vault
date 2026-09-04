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

  const inner = art ? (
    <img
      src={art}
      alt={`Independent reconstruction of ${game.name} #${game.number}`}
      className="absolute inset-0 h-full w-full object-cover object-center"
    />
  ) : (
    <TicketChromeFace game={game} />
  );

  const officialLink = href ? (
    full ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="inline-flex min-h-8 items-center font-mono text-[10px] tracking-[0.12em] text-gold uppercase underline underline-offset-4 hover:text-paper"
      >
        {t("card.officialTable")}
      </a>
    ) : (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          window.open(href, "_blank", "noopener,noreferrer");
        }}
        className="absolute bottom-1.5 left-1.5 z-10 inline-flex min-h-7 items-center rounded-sm bg-bg/70 px-1.5 font-mono text-[9px] tracking-[0.12em] text-gold uppercase underline underline-offset-2 hover:text-paper"
      >
        {t("card.officialTable")}
      </button>
    )
  ) : null;

  return (
    <div className={cn("relative w-full overflow-hidden bg-raised", className)}>
      {full ? (
        <div className="relative aspect-[3/4] w-full">{inner}</div>
      ) : (
        <div className="relative aspect-[3/2] w-full overflow-hidden">
          <div className="absolute inset-x-0 top-0 aspect-[3/4] w-full">{inner}</div>
          {officialLink}
        </div>
      )}
      {full ? (
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          {officialLink ?? <span />}
          <p className="font-mono text-[9px] tracking-[0.08em] text-faint uppercase">
            {t("card.reconstruction")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
