import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/locale";

export function TicketCopyright() {
  const { t } = useI18n();
  return (
    <p className="border-b border-line bg-raised/40 px-4 py-2 text-center text-xs leading-relaxed text-faint sm:px-6">
      {t("ticket.copyright")}{" "}
      <Link
        to="/disclaimer"
        className="text-muted underline underline-offset-2 hover:text-paper"
      >
        {t("nav.responsible")}
      </Link>
    </p>
  );
}
