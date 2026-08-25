import { useEffect, useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useDeskAlert } from "@/lib/use-desk-alert";
import { TrialCta } from "@/components/trial-cta";
import { SpiderMark } from "@/components/mechanical-spider";
import { useAccess } from "@/lib/use-access";
import { useActiveState } from "@/lib/active-state";
import { useI18n } from "@/lib/locale";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV: {
  to: "/" | "/pricing" | "/disclaimer";
  hash?: string;
  key: MessageKey;
}[] = [
  { to: "/", hash: "desk", key: "nav.desk" },
  { to: "/", hash: "games", key: "nav.games" },
  { to: "/pricing", key: "nav.pricing" },
  { to: "/disclaimer", key: "nav.responsible" },
];

export function SiteHeader() {
  const { unseen, markSeen } = useDeskAlert();
  const { config } = useActiveState();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const status =
    config.dataMode === "sample"
      ? t("header.demoData")
      : config.dataMode === "compiled"
        ? t("header.compiled")
        : t("header.independent");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl flex-nowrap items-center justify-between gap-1 overflow-hidden px-3 sm:gap-2 sm:px-6">
        <Link
          to="/"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 overflow-hidden"
          onClick={() => setOpen(false)}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-raised font-display text-sm text-fg">
            SV
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-sm tracking-tight sm:text-base">
              Scratch Vault
            </span>
            <span className="hidden truncate font-mono text-[10px] tracking-[0.12em] text-faint uppercase sm:block">
              {config.shortName} · {status}
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 flex-nowrap items-center gap-1">
          <LanguageToggle className="hidden md:inline-flex" />
          <HeaderTrial />
          <HeaderAuth />
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <nav
            aria-label={t("nav.primary")}
            className="hidden items-center md:flex"
          >
            <NavLinks unseen={unseen} markSeen={markSeen} onNavigate={() => setOpen(false)} />
            <StudioLink />
          </nav>
        </div>
      </div>

      {open ? (
        <div
          id={menuId}
          className="border-t border-line bg-bg px-3 py-3 md:hidden"
        >
          <nav aria-label={t("nav.mobile")} className="flex flex-col">
            <LanguageToggle className="justify-start px-2" />
            <NavLinks
              unseen={unseen}
              markSeen={markSeen}
              onNavigate={() => setOpen(false)}
              stacked
            />
            <StudioLink stacked />
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function LanguageToggle({ className }: { className?: string }) {
  const { locale, toggleLocale, t } = useI18n();
  const toEs = locale === "en";
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-2 text-sm text-fg sm:px-3",
        className,
      )}
      aria-label={toEs ? t("lang.ariaToEs") : t("lang.ariaToEn")}
      onClick={toggleLocale}
    >
      {toEs ? t("lang.toEs") : t("lang.toEn")}
    </button>
  );
}

function NavLinks({
  unseen,
  markSeen,
  onNavigate,
  stacked = false,
}: {
  unseen: boolean;
  markSeen: () => void;
  onNavigate: () => void;
  stacked?: boolean;
}) {
  const { t } = useI18n();
  return (
    <>
      {NAV.map((item) => {
        const label = t(item.key);
        const isDesk = item.key === "nav.desk";
        const className = stacked
          ? "relative inline-flex min-h-11 items-center px-2 text-sm text-muted hover:text-fg"
          : "relative inline-flex min-h-11 items-center px-2.5 text-sm text-muted hover:text-fg sm:px-3";
        const pip =
          isDesk && unseen ? (
            <span
              className="ml-1.5 inline-block size-1.5 rounded-full bg-gold"
              aria-label={t("nav.newDesk")}
            />
          ) : null;
        return item.hash ? (
          <a
            key={item.key}
            href={`${item.to}#${item.hash}`}
            className={className}
            onClick={() => {
              if (isDesk && unseen) markSeen();
              onNavigate();
            }}
          >
            {label}
            {pip}
          </a>
        ) : (
          <Link key={item.key} to={item.to} className={className} onClick={onNavigate}>
            {label}
            {pip}
          </Link>
        );
      })}
    </>
  );
}

function HeaderTrial() {
  const { paid, isPending } = useAccess();
  if (isPending || paid) return null;
  return (
    <TrialCta
      compact
      className="shrink-0 whitespace-nowrap px-2 text-xs sm:px-3 sm:text-sm"
    />
  );
}

function HeaderAuth() {
  const { user, isPending } = useCurrentUserState();
  const { t } = useI18n();

  if (!authEnabled) return null;

  if (isPending) {
    return (
      <span className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm text-faint">
        …
      </span>
    );
  }

  if (!user) {
    return (
      <Link
        to="/login"
        search={{ next: "/" }}
        className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-2 text-sm text-fg"
      >
        {t("nav.signIn")}
      </Link>
    );
  }

  return (
    <Link
      to="/account"
      className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-2 text-sm text-fg"
    >
      {t("nav.account")}
    </Link>
  );
}

function StudioLink({ stacked = false }: { stacked?: boolean }) {
  return (
    <a
      href="https://webbspinnervisions.net"
      target="_blank"
      rel="noopener noreferrer"
      className={
        stacked
          ? "inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-muted hover:text-gold"
          : "inline-flex min-h-11 items-center gap-1.5 px-2.5 text-sm text-muted hover:text-gold sm:px-3"
      }
    >
      <SpiderMark className="size-4 shrink-0 text-gold" />
      <span>Webb Spinner Visions</span>
    </a>
  );
}
