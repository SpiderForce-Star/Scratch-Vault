import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  authClient,
  authEnabled,
  GROK_PROVIDERS,
  signIn,
} from "@/lib/auth/client";
import type { PublicAuthStatus } from "@/lib/auth/status";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { pageHead } from "@/lib/site";
import { useI18n } from "@/lib/locale";

function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

const UNAVAILABLE: PublicAuthStatus = {
  database: false,
  oauth: false,
  email: false,
};

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<PublicAuthStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/status", { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) throw new Error("status");
        return (await res.json()) as PublicAuthStatus;
      })
      .then((nextStatus) => {
        if (!cancelled) setStatus(nextStatus);
      })
      .catch(() => {
        if (!cancelled) setStatus(UNAVAILABLE);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isPending && user) {
    return <Navigate to={safeNext(next) as "/"} />;
  }

  const oauthOn = Boolean(authEnabled && status?.oauth);
  const emailOn = Boolean(authEnabled && status?.email);
  const checking = authEnabled && status === null;
  const unavailable = authEnabled && status !== null && !oauthOn && !emailOn;

  async function submitEmail(mode: "in" | "up") {
    setBusy(mode);
    setError(null);
    try {
      if (mode === "up") {
        const name = email.split("@")[0]?.trim() || "Member";
        const signedUp = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (signedUp.error) {
          throw new Error(signedUp.error.message ?? t("login.failed"));
        }
      }
      const signedIn = await authClient.signIn.email({
        email,
        password,
        callbackURL: next || "/",
      });
      if (signedIn.error) {
        throw new Error(signedIn.error.message ?? t("login.failed"));
      }
      await authClient.getSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failed"));
      setBusy(null);
    }
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
      ) : checking ? (
        <p className="mt-8 text-sm text-muted">{t("login.checking")}</p>
      ) : unavailable ? (
        <p className="mt-8 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          {t("login.unavailable")}
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {oauthOn
            ? GROK_PROVIDERS.map((provider) => (
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
              ))
            : null}

          {oauthOn && emailOn ? (
            <p className="py-1 text-center font-mono text-xs tracking-[0.16em] text-faint uppercase">
              {t("login.or")}
            </p>
          ) : null}

          {emailOn ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitEmail("in");
              }}
            >
              <label className="block text-sm">
                <span className="text-muted">{t("login.email")}</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 min-h-12 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">{t("login.password")}</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 min-h-12 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg"
                />
                <span className="mt-1 block text-xs text-faint">{t("login.passwordHint")}</span>
              </label>
              <button
                type="submit"
                disabled={busy !== null || isPending}
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-60"
              >
                {busy === "in" ? t("login.working") : t("login.submit")}
              </button>
              <button
                type="button"
                disabled={busy !== null || isPending}
                onClick={() => void submitEmail("up")}
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-medium text-fg disabled:opacity-60"
              >
                {busy === "up" ? t("login.working") : t("login.create")}
              </button>
            </form>
          ) : null}
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
