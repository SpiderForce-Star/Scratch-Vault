import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { authEnabled, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { pageHead } from "@/lib/site";
import { useI18n } from "@/lib/locale";

function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: safeNext(search.next),
  }),
  component: LoginPage,
  head: () =>
    pageHead({
      title: "Sign in",
      path: "/login",
      noindex: true,
    }),
});

function LoginPage() {
  const { next } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isPending && user) {
    return <Navigate to={safeNext(next) as "/"} />;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">
        {t("login.kicker")}
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{t("login.title")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {t("login.lead")}
      </p>

      {!authEnabled ? (
        <p className="mt-8 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          {t("login.off")}
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {GROK_PROVIDERS.map((provider) => (
            <button
              key={provider.providerId}
              type="button"
              disabled={busy !== null || isPending}
              onClick={() => {
                setBusy(provider.providerId);
                setError(null);
                void signIn(provider.providerId, {
                  callbackURL: next || "/",
                  errorCallbackURL: "/login",
                }).catch((err) => {
                  setError(err instanceof Error ? err.message : t("login.failed"));
                  setBusy(null);
                });
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-60"
            >
              {busy === provider.providerId
                ? t("login.opening")
                : t("login.continueWith", { provider: provider.label })}
            </button>
          ))}
        </div>
      )}

      {error ? <p className="mt-4 text-sm text-bust">{error}</p> : null}

      <p className="mt-8 text-sm text-faint">
        {t("login.new")}{" "}
        <Link to="/pricing" className="underline underline-offset-2 hover:text-fg">
          {t("login.seePricing")}
        </Link>
        . {t("login.only18")}{" "}
        <Link to="/terms" className="underline underline-offset-2 hover:text-fg">
          {t("footer.terms")}
        </Link>
        {" · "}
        <Link to="/privacy" className="underline underline-offset-2 hover:text-fg">
          {t("footer.privacy")}
        </Link>
        .
      </p>
    </div>
  );
}
