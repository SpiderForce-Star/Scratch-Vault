import { createMiddleware } from "@tanstack/react-start";

/**
 * Like authMiddleware, but signed-out callers get `userId: null` instead of 401.
 * Used to decide whether the desk is unlocked.
 */
export const optionalAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("./client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { getSessionUser } = await import("./verify.server");
    const user = await getSessionUser(context.bearerToken);
    return next({
      context: {
        userId: user?.id ?? null,
        email: user?.email ?? null,
      },
    });
  });
