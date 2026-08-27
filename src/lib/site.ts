/** Canonical public origin after the Vercel project rename. */
export const SITE_ORIGIN = "https://scratch-vault.vercel.app";

/** Checkout / auth hosts. Keep the previous Vercel alias working. */
export const SITE_HOSTS = [
  "scratch-vault.vercel.app",
  "volunteer-scratch-vault.vercel.app",
] as const;
export const SITE_NAME = "Scratch Vault";
export const SITE_MARK = "SV";

export const SITE_TITLE =
  "Scratch-off remaining prizes · Scratch Vault";

export const SITE_DESCRIPTION =
  "See which scratch-offs still have cash posted at $5, $10, $20, $25, $30, and $50. Skip drained games. Independent remaining-prize desk for Tennessee and 15 other state lotteries. Counts do not improve odds. 18+ to use; Arizona and Iowa lottery tickets are 21+.";

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageHead({
  title,
  description = SITE_DESCRIPTION,
  path,
  noindex = false,
}: {
  title: string;
  description?: string;
  path: string;
  noindex?: boolean;
}) {
  const url = absoluteUrl(path);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
  return {
    meta: [
      { title: fullTitle },
      { name: "description" as const, content: description },
      {
        name: "robots" as const,
        content: noindex ? "noindex, nofollow" : "index, follow",
      },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:title" as const, content: fullTitle },
      { name: "twitter:description" as const, content: description },
    ],
    links: [{ rel: "canonical" as const, href: url }],
  };
}

export const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      alternateName: "Scratch Vault",
      url: SITE_ORIGIN,
      description: SITE_DESCRIPTION,
      inLanguage: "en-US",
      publisher: {
        "@type": "Organization",
        name: "Webb Spinner Visions",
        url: "https://webbspinnervisions.net",
      },
    },
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_ORIGIN,
      applicationCategory: "ReferenceApplication",
      operatingSystem: "Web",
      audience: {
        "@type": "PeopleAudience",
        suggestedMinAge: 18,
      },
      isAccessibleForFree: true,
      description: SITE_DESCRIPTION,
    },
  ],
};
