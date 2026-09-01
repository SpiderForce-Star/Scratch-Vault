import { useEffect, useState } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiteHeader } from "@/components/site-header";
import { PromoMarquee } from "@/components/promo-marquee";
import { TicketCopyright } from "@/components/ticket-copyright";
import { SiteFooter } from "@/components/site-footer";
import { AgeGate } from "@/components/age-gate";
import { BootSplash, BOOT_FORCE_MS } from "@/components/boot-splash";
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

/** First-paint #0B0F0C until BootSplash mounts. 4s cap if React never starts. */
const BOOT_PAINT_SCRIPT = `(function(){var k="vsv.boot.shown";var r=document.documentElement;try{if(sessionStorage.getItem(k)){r.setAttribute("data-sv-boot","done");return;}}catch(e){}r.setAttribute("data-sv-boot","pending");function paint(){if(!document.body||document.getElementById("sv-boot-paint"))return;var el=document.createElement("div");el.id="sv-boot-paint";el.setAttribute("aria-hidden","true");el.style.cssText="position:fixed;inset:0;background:#0B0F0C;z-index:70;pointer-events:none";document.body.appendChild(el);}if(document.body)paint();else document.addEventListener("DOMContentLoaded",paint);setTimeout(function(){if(r.getAttribute("data-sv-boot")==="pending"){r.setAttribute("data-sv-boot","done");var n=document.getElementById("sv-boot-paint");if(n)n.remove();}},4000);})();`;

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
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/pwa-192.png?v=c8" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=c8" },
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
        <script dangerouslySetInnerHTML={{ __html: BOOT_PAINT_SCRIPT }} />
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
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    void initNativeChrome();
  }, []);

  useEffect(() => {
    void configureIap(user?.id ?? null).catch((err) => {
      console.error("[iap] configure failed", err);
    });
  }, [user?.id]);

  useEffect(() => {
    const force = window.setTimeout(() => setIntroDone(true), BOOT_FORCE_MS + 200);
    return () => window.clearTimeout(force);
  }, []);

  return (
    <div className="min-h-svh overflow-x-clip bg-bg pt-[env(safe-area-inset-top)] text-fg">
      <SiteHeader />
      <PromoMarquee />
      <TicketCopyright />
      <InstallCoach />
      <Outlet />
      <SiteFooter />
      <BootSplash onFinished={() => setIntroDone(true)} />
      {introDone ? <AgeGate /> : null}
    </div>
  );
}
