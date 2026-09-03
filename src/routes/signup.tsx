import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import type { PublicAuthStatus } from "@/lib/auth/status";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { pageHead } from "@/lib/site";
import { useI18n } from "@/lib/locale";

function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/account?complete=1";
  if (!value.startsWith("/") || value.startsWith("//")) return "/account?complete=1";
  return value;
}

const UNAVAILABLE: PublicAuthStatus = {
  database: false,
  oauth: false,
  email: false,
};

function humanAuthError(message: string, exists: string, fallback: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already") || lower.includes("exists") || lower.includes("duplicate")) {
    return exists;
  }
  if (
    lower.includes("invalid input") ||
    lower.includes("body.email") ||
    lower.includes("body.password")
  ) {
    return fallback;
  }
  return message || fallback;
}

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: safeNext(search.next),
  }),
  component: SignupPage,
  head: () =>
    pageHead({
      title: "Create account",
      path: "/signup",
      noindex: true,
    }),
});

function SignupPage() {
  const { next } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    const plan = next.includes("plan=annual") ? ("annual" as const) : ("monthly" as const);
    return <Navigate to="/account" search={{ complete: "1" as const, plan }} />;
  }

  const emailOn = Boolean(authEnabled && status?.email);
  const checking = authEnabled && status === null;
  const unavailable = authEnabled && status !== null && !emailOn;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    if (!name) {
      setError(t("signup.nameNeeded"));
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError(t("login.invalidCreds"));
      return;
    }
    if (password.length < 8) {
      setError(t("login.invalidCreds"));
      return;
    }
    if (password !== confirm) {
      setError(t("signup.mismatch"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const signedUp = await authClient.signUp.email({
        email,
        password,
        name,
      });
      if (signedUp.error) {
        throw new Error(signedUp.error.message ?? t("login.failed"));
      }
      const signedIn = await authClient.signIn.email({
        email,
        password,
        callbackURL: next || "/account?complete=1",
      });
      if (signedIn.error) {
        throw new Error(signedIn.error.message ?? t("login.failed"));
      }
      await authClient.getSession();
      window.location.assign(next || "/account?complete=1");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("login.failed");
      setError(humanAuthError(message, t("signup.exists"), t("login.invalidCreds")));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">
        {t("signup.kicker")}
      </p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{t("signup.title")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{t("signup.lead")}</p>

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
        <form className="mt-8 flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm">
            <span className="text-muted">{t("signup.name")}</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              required
              className="mt-1 min-h-12 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("login.email")}</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="mt-1 min-h-12 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("login.password")}</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 min-h-12 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg"
            />
            <span className="mt-1 block text-xs text-faint">{t("login.passwordHint")}</span>
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("signup.confirm")}</span>
            <input
              type="password"
              name="confirm"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 min-h-12 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg"
            />
          </label>
          <button
            type="submit"
            disabled={busy || isPending}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-60"
          >
            {busy ? t("login.working") : t("signup.submit")}
          </button>
        </form>
      )}

      {error ? <p className="mt-4 text-sm text-bust">{error}</p> : null}

      <p className="mt-8 text-sm text-faint">
        {t("signup.hasAccount")}{" "}
        <Link
          to="/login"
          search={{ next: "/account" }}
          className="underline underline-offset-2 hover:text-fg"
        >
          {t("signup.signIn")}
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
