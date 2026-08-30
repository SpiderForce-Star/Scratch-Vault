import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Store binaries ship with bundled web assets (webDir) and NO remote
 * server.url — Apple/Google review the binary, not a live website.
 *
 * Live-reload against `npm run dev` only when CAP_LIVE_RELOAD=1.
 * First Play internal AAB: CAP_PLAY_INTERNAL=1 loads https://scratch-vault.com
 * so testers see the live desk instead of the native stub page.
 */
const liveReload = process.env.CAP_LIVE_RELOAD === "1";
const playInternal = process.env.CAP_PLAY_INTERNAL === "1";
const liveUrl = process.env.CAP_DEV_URL?.trim() || "http://localhost:8080";

const config: CapacitorConfig = {
  appId: "com.webbspinnervisions.scratchvault",
  appName: "Scratch Vault",
  webDir: "dist",
  backgroundColor: "#0B0F0C",
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "Scratch Vault",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0B0F0C",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#0B0F0C",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0B0F0C",
    },
  },
};

if (liveReload) {
  config.server = {
    url: liveUrl,
    cleartext: true,
  };
} else if (playInternal) {
  config.server = {
    url: "https://scratch-vault.com",
    cleartext: false,
  };
}

export default config;
