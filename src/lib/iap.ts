import { isNativeApp } from "./native";
import type { Plan } from "./subscription";

/** RevenueCat entitlement that unlocks the full desk. */
export const ENTITLEMENT_ID = "vsv_full_access";

/** Store product identifiers — create these in App Store Connect / Play Console. */
export const IAP_PRODUCTS = {
  monthly: "monthly",
  annual: "annual",
} as const;

export type NativeAccess = {
  paid: boolean;
  plan: Plan | null;
  status: "trialing" | "active" | "expired" | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  willRenew: boolean;
  productId: string | null;
};

const EMPTY_ACCESS: NativeAccess = {
  paid: false,
  plan: null,
  status: null,
  trialEnd: null,
  currentPeriodEnd: null,
  willRenew: false,
  productId: null,
};

type RcEntitlement = {
  isActive?: boolean;
  identifier?: string;
  productIdentifier?: string;
  expirationDate?: string | null;
  willRenew?: boolean;
  periodType?: string;
};

type RcCustomerInfo = {
  entitlements?: {
    active?: Record<string, RcEntitlement>;
    all?: Record<string, RcEntitlement>;
  };
};

type RcPackage = {
  identifier: string;
  packageType?: string;
  product: { identifier: string };
};

let configureLock: Promise<void> | null = null;
let lastAppUserId: string | null = null;

async function loadPurchases() {
  return import("@revenuecat/purchases-capacitor");
}

function appleKey(): string {
  return String(import.meta.env.VITE_REVENUECAT_APPLE_API_KEY ?? "").trim();
}

function googleKey(): string {
  return String(import.meta.env.VITE_REVENUECAT_GOOGLE_API_KEY ?? "").trim();
}

export async function configureIap(appUserId?: string | null): Promise<void> {
  if (!isNativeApp()) return;

  if (!configureLock) {
    configureLock = (async () => {
      const { Capacitor } = await import("@capacitor/core");
      const { Purchases, LOG_LEVEL } = await loadPurchases();
      const platform = Capacitor.getPlatform();
      const apiKey = platform === "ios" ? appleKey() : googleKey();
      if (!apiKey) {
        throw new Error(
          "RevenueCat public API key is missing. Set VITE_REVENUECAT_APPLE_API_KEY / VITE_REVENUECAT_GOOGLE_API_KEY.",
        );
      }
      try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
      } catch {
        /* older plugin builds */
      }
      await Purchases.configure({
        apiKey,
        appUserID: appUserId || undefined,
      });
      lastAppUserId = appUserId ?? null;
    })();
  }

  await configureLock;

  if (appUserId && appUserId !== lastAppUserId) {
    const { Purchases } = await loadPurchases();
    await Purchases.logIn({ appUserID: appUserId });
    lastAppUserId = appUserId;
  }
}

function planFromProductId(id: string | null | undefined): Plan | null {
  if (!id) return null;
  const lower = id.toLowerCase();
  if (lower.includes("annual") || lower.includes("year")) return "annual";
  if (lower.includes("month")) return "monthly";
  if (lower === IAP_PRODUCTS.annual) return "annual";
  if (lower === IAP_PRODUCTS.monthly) return "monthly";
  return null;
}

function accessFromCustomerInfo(info: RcCustomerInfo | null | undefined): NativeAccess {
  const active = info?.entitlements?.active?.[ENTITLEMENT_ID];
  if (!active?.isActive && !info?.entitlements?.active?.[ENTITLEMENT_ID]) {
    return EMPTY_ACCESS;
  }
  const ent = active ?? info?.entitlements?.active?.[ENTITLEMENT_ID];
  if (!ent) return EMPTY_ACCESS;
  const period = String(ent.periodType ?? "").toLowerCase();
  const trialing = period === "trial" || period === "intro";
  return {
    paid: true,
    plan: planFromProductId(ent.productIdentifier),
    status: trialing ? "trialing" : "active",
    trialEnd: trialing ? (ent.expirationDate ?? null) : null,
    currentPeriodEnd: ent.expirationDate ?? null,
    willRenew: Boolean(ent.willRenew),
    productId: ent.productIdentifier ?? null,
  };
}

export async function getNativeAccess(): Promise<NativeAccess> {
  if (!isNativeApp()) return EMPTY_ACCESS;
  try {
    await configureIap();
    const { Purchases } = await loadPurchases();
    const { customerInfo } = await Purchases.getCustomerInfo();
    return accessFromCustomerInfo(customerInfo as RcCustomerInfo);
  } catch (err) {
    console.error("[iap] getNativeAccess failed", err);
    return EMPTY_ACCESS;
  }
}

function matchPackage(pkg: RcPackage, plan: Plan): boolean {
  const productId = pkg.product.identifier.toLowerCase();
  const ident = pkg.identifier.toLowerCase();
  const type = String(pkg.packageType ?? "").toUpperCase();
  if (plan === "annual") {
    return (
      productId === IAP_PRODUCTS.annual ||
      productId.includes("annual") ||
      ident.includes("annual") ||
      type === "ANNUAL"
    );
  }
  return (
    productId === IAP_PRODUCTS.monthly ||
    productId.includes("month") ||
    ident.includes("month") ||
    type === "MONTHLY"
  );
}

export async function purchasePlan(plan: Plan): Promise<NativeAccess> {
  if (!isNativeApp()) {
    throw new Error("Native IAP is only available in the iOS and Android apps.");
  }
  await configureIap();
  const { Purchases } = await loadPurchases();
  const offerings = await Purchases.getOfferings();
  const packages = (offerings.current?.availablePackages ?? []) as RcPackage[];
  const pkg = packages.find((item) => matchPackage(item, plan));
  if (!pkg) {
    throw new Error(
      `No ${plan} package is available yet. Create product "${IAP_PRODUCTS[plan]}" in App Store Connect / Play Console and attach it to entitlement ${ENTITLEMENT_ID}.`,
    );
  }
  try {
    const result = await Purchases.purchasePackage({
      aPackage: pkg as never,
    });
    return accessFromCustomerInfo(result.customerInfo as RcCustomerInfo);
  } catch (err) {
    if (isUserCancel(err)) {
      throw new Error("Purchase canceled.");
    }
    throw err instanceof Error ? err : new Error("Purchase failed.");
  }
}

export async function restoreNativePurchases(): Promise<NativeAccess> {
  if (!isNativeApp()) return EMPTY_ACCESS;
  await configureIap();
  const { Purchases } = await loadPurchases();
  const { customerInfo } = await Purchases.restorePurchases();
  return accessFromCustomerInfo(customerInfo as RcCustomerInfo);
}

export async function manageNativeSubscription(): Promise<void> {
  if (!isNativeApp()) return;
  const { Capacitor } = await import("@capacitor/core");
  const { openExternalUrl } = await import("./native");
  const url =
    Capacitor.getPlatform() === "ios"
      ? "https://apps.apple.com/account/subscriptions"
      : "https://play.google.com/store/account/subscriptions";
  await openExternalUrl(url);
}

function isUserCancel(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { code?: string | number; userCancelled?: boolean; message?: string };
  if (rec.userCancelled) return true;
  const code = String(rec.code ?? "");
  const message = String(rec.message ?? "").toLowerCase();
  return (
    code.includes("PURCHASE_CANCELLED") ||
    code === "1" ||
    message.includes("cancelled") ||
    message.includes("canceled")
  );
}
