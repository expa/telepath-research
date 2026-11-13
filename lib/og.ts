// Crawlers want an absolute og:image. This site is served publicly from telepath-research.vercel.app; Vercel's
// production-domain setting (VERCEL_PROJECT_PRODUCTION_URL) points at www.telepath.com, a different site that
// 404s these images, so it isn't used. Set OG_HOST (e.g. "telepath.com") once this site moves to its own domain.
// Locally, off Vercel, the URL stays relative.
const env = typeof process !== "undefined" ? process.env : undefined;
export const OG_HOST = env?.OG_HOST ?? (env?.VERCEL ? "telepath-research.vercel.app" : undefined);

/** Social-card meta tags for a PNG in public/og/. */
export function ogImage(name: string) {
  const url = `${OG_HOST ? `https://${OG_HOST}` : ""}/og/${name}.png`;
  return [
    { property: "og:image", content: url },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: url },
  ];
}
