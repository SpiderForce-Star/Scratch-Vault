import { useEffect, useState } from "react";
import { getAccessState } from "./billing";
import { useCurrentUserState } from "./auth/use-current-user";
import { isNativeApp } from "./native";
import { configureIap, getNativeAccess } from "./iap";

/**
 * Full desk unlocks when:
 *   - native: RevenueCat entitlement `vsv_full_access`, or
 *   - web/native: Stripe status is trialing/active
 *
 * The sandbox dev user never unlocks a production build.
 */
export function useAccess() {
  const { user, isPending } = useCurrentUserState();
  const [paid, setPaid] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (isPending) return;

      if (user?.isDevFallback && import.meta.env.DEV && !isNativeApp()) {
        setPaid(true);
        setChecking(false);
        return;
      }

      setChecking(true);
      try {
        let unlocked = false;
        if (isNativeApp()) {
          await configureIap(user?.id ?? null);
          const native = await getNativeAccess();
          unlocked = native.paid;
        }
        if (!unlocked && user && !user.isDevFallback) {
          const stripe = await getAccessState();
          unlocked = Boolean(stripe.paid);
        }
        if (!cancelled) setPaid(unlocked);
      } catch {
        if (!cancelled) setPaid(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [user, isPending]);

  return {
    user,
    signedIn: Boolean(user),
    paid,
    isPending: isPending || checking,
  };
}
