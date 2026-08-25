import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import { parseBillingProfileInput, type BillingProfile } from "./profile";

export const getBillingProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BillingProfile> => {
    const { loadBillingProfile } = await import("./profile.server");
    return loadBillingProfile(context.userId);
  });

export const saveBillingProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => parseBillingProfileInput(data))
  .handler(async ({ data, context }): Promise<BillingProfile> => {
    const { persistBillingProfile } = await import("./profile.server");
    return persistBillingProfile(context.userId, data);
  });
