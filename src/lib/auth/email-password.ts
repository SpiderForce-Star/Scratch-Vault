/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * On whenever a persistable auth database exists (Postgres, or local PGLite).
 * Off on Vercel until `DATABASE_URL` is set — production cannot use PGLite.
 *
 * Forms: `authClient.signUp.email` / `authClient.signIn.email` from
 * `@/lib/auth/client`.
 */
import { resolveAuthBackend } from "./backend";

export const emailAndPasswordEnabled = resolveAuthBackend().useEmailPassword;
