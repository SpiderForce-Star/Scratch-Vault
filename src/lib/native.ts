const AGE_KEY = "vsv.ageGate.confirmed.v1";

type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

/** True only inside the iOS/Android Capacitor shell. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as CapacitorWindow).Capacitor;
  if (typeof cap?.isNativePlatform === "function") {
    return cap.isNativePlatform();
  }
  return (
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:"
  );
}

export function hasConfirmedAge(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(AGE_KEY));
  } catch {
    return false;
  }
}

export function persistAgeConfirmation(): void {
  try {
    window.localStorage.setItem(AGE_KEY, new Date().toISOString());
  } catch {
    /* private mode — gate will reappear next launch */
  }
}

/** Block the tap that closed splash/age-gate from hitting 7 days free / pricing. */
export function freezeUiClicks(ms = 700): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-sv-freeze", "1");
  window.setTimeout(() => {
    document.documentElement.removeAttribute("data-sv-freeze");
  }, ms);
}

const GUEST_HOME_PATHS = new Set(["/pricing", "/signup", "/login", "/account"]);

export function guestShouldLandHome(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return GUEST_HOME_PATHS.has(path);
}

export async function initNativeChrome(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { configureIap } = await import("./iap");
    await configureIap();
  } catch (err) {
    console.error("[native] IAP configure skipped", err);
  }
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0B0F0C" });
  } catch {
    /* plugin missing in web preview */
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }
  try {
    const { App } = await import("@capacitor/app");
    await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        void import("@capacitor/splash-screen").then(({ SplashScreen }) =>
          SplashScreen.hide(),
        );
      }
    });
  } catch {
    /* ignore */
  }
}

export async function exitNativeApp(): Promise<void> {
  try {
    const { App } = await import("@capacitor/app");
    await App.exitApp();
  } catch {
    window.close();
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!isNativeApp()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
