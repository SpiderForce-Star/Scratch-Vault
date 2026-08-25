import { useEffect } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AgeGate } from "@/components/age-gate";
import { InstallCoach } from "@/components/install-coach";
import { ActiveStateProvider } from "@/lib/active-state";
import { LocaleProvider } from "@/lib/locale";
import { initNativeChrome } from "@/lib/native";
import { configureIap } from "@/lib/iap";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import {
  SITE_DESCRIPTION,
  SITE_JSON_LD,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TITLE,
  absoluteUrl,
} from "@/lib/site";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "robots", content: "index, follow" },
      { name: "author", content: "Webb Spinner Visions" },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
      { name: "theme-color", content: "#0B0F0C" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "en_US" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:url", content: SITE_ORIGIN },
      { property: "og:image", content: absoluteUrl("/og.jpg") },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
    ],
    links: [
      { rel: "canonical", href: SITE_ORIGIN },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/pwa-192.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <ActiveStateProvider>
            <LocaleProvider>
              <NativeRoot />
            </LocaleProvider>
          </ActiveStateProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});

function NativeRoot() {
  const user = useCurrentUser();

  useEffect(() => {
    void initNativeChrome();
  }, []);

  useEffect(() => {
    void configureIap(user?.id ?? null).catch((err) => {
      console.error("[iap] configure failed", err);
    });
  }, [user?.id]);

  return (
    <div className="min-h-svh overflow-x-clip bg-bg pt-[env(safe-area-inset-top)] text-fg">
      <SiteHeader />
      <InstallCoach />
      <Outlet />
      <SiteFooter />
      <AgeGate />
    </div>
  );
}
