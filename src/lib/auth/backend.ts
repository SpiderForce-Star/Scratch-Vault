/**
 * Auth backend selection — no Better Auth / pg / PGLite imports.
 *
 * Production (Vercel) cannot persist OAuth state or sessions in PGLite: the
 * default file is `/var/task/pglite.data` (read-only) and an in-memory DB does
 * not survive the Google/X round-trip across serverless isolates.
 *
 * The baked `grok_preview` broker client only allows `*.grok-sandbox.com`
 * callbacks, so production must not federate through it.
 */
import type { PublicAuthStatus } from "./status";

export type { PublicAuthStatus } from "./status";

/** Same id as `PREVIEW_CLIENT_ID` in `./preview` — duplicated to stay secret-free. */
const PREVIEW_CLIENT_ID = "grok_preview";

export type AuthBackend = {
  databaseUrl: string | undefined;
  onVercel: boolean;
  grokClientId: string;
  usingPreviewClient: boolean;
  usePostgres: boolean;
  usePglite: boolean;
  useBrokerOAuth: boolean;
  useEmailPassword: boolean;
  persistable: boolean;
};

export function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Neon session-mode hosts exhaust a 15-client cap on Hobby. Prefer PgBouncer. */
export function preferPooledDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith(".neon.tech")) return url;
    if (parsed.hostname.includes("-pooler.")) return url;
    parsed.hostname = parsed.hostname.replace(/^([^.]+)\./, "$1-pooler.");
    return parsed.toString();
  } catch {
    return url;
  }
}

function isPooledUrl(url: string): boolean {
  return /-pooler\.|[?&]pgbouncer=true/i.test(url);
}

/** Postgres URL for Better Auth + app SQL. `POSTGRES_URL` is the Vercel/Neon alias. */
export function resolveDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const candidates = [
    trimEnv(env.DATABASE_URL),
    trimEnv(env.POSTGRES_URL),
    trimEnv(env.POSTGRES_PRISMA_URL),
  ].filter((value): value is string => Boolean(value));
  if (!candidates.length) return undefined;
  const pooled = candidates.find(isPooledUrl);
  return preferPooledDatabaseUrl(pooled ?? candidates[0]);
}

export function resolveAuthBackend(
  env: Record<string, string | undefined> = process.env,
): AuthBackend {
  const databaseUrl = resolveDatabaseUrl(env);
  const onVercel = Boolean(trimEnv(env.VERCEL) || trimEnv(env.VERCEL_ENV));
  const grokClientId = trimEnv(env.GROK_AUTH_CLIENT_ID) ?? PREVIEW_CLIENT_ID;
  const usingPreviewClient = grokClientId === PREVIEW_CLIENT_ID;
  const usePostgres = Boolean(databaseUrl);
  const usePglite = !usePostgres && !onVercel;
  const persistable = usePostgres || usePglite;
  // Preview client is grok-sandbox only. A real GROK_AUTH_CLIENT_ID works anywhere.
  const useBrokerOAuth = persistable && (!usingPreviewClient || !onVercel);
  const useEmailPassword = persistable;
  return {
    databaseUrl,
    onVercel,
    grokClientId,
    usingPreviewClient,
    usePostgres,
    usePglite,
    useBrokerOAuth,
    useEmailPassword,
    persistable,
  };
}

export function publicAuthStatus(
  env: Record<string, string | undefined> = process.env,
): PublicAuthStatus {
  const backend = resolveAuthBackend(env);
  return {
    database: backend.usePostgres,
    oauth: backend.useBrokerOAuth,
    email: backend.useEmailPassword,
  };
}
