import { ticketArt, type Game } from "@/data/games";
import { TicketChromeFace } from "@/components/ticket-chrome";
import { getState, parsePublicStateId } from "@/config/states";
import { ticketChrome } from "@/lib/ticket-chrome";
import { useActiveState } from "@/lib/active-state";
import { useI18n } from "@/lib/locale";
import { cn } from "@/lib/utils";

/** Opens the lottery remaining-prize table without following a wrapping card link. */
export function OfficialTableControl({ href, className }: { href: string; className?: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
      className={cn(
        "inline-flex min-h-8 items-center font-mono text-[10px] tracking-[0.12em] text-gold uppercase underline underline-offset-4 hover:text-paper",
        className,
      )}
    >
      {t("card.officialTable")}
    </button>
  );
}

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
  const spec = ticketChrome(game);
  const portrait = !art && spec.orientation !== "landscape";

  const officialLink =
    href && full ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="inline-flex min-h-8 items-center font-mono text-[10px] tracking-[0.12em] text-gold uppercase underline underline-offset-4 hover:text-paper"
      >
        {t("card.officialTable")}
      </a>
    ) : null;

  return (
    <div className={cn("relative w-full overflow-hidden bg-bg", className)}>
      <div
        className={cn(
          "mx-auto w-full",
          portrait && "max-w-[14.5rem] sm:max-w-[16rem] lg:max-w-[18rem]",
        )}
      >
        {art ? (
          <img
            src={art}
            alt={`Independent reconstruction of ${game.name} #${game.number}`}
            className="block h-auto w-full object-contain object-left"
          />
        ) : (
          <div className="relative w-full" style={{ aspectRatio: spec.aspect }}>
            <TicketChromeFace game={game} />
          </div>
        )}
      </div>
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
