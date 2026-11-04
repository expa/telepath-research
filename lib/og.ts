// Crawlers want an absolute og:image; Vercel exposes the production host. Locally it falls back to a relative path.
const host = typeof process !== "undefined" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : undefined;

/** Social-card meta tags for a PNG in public/og/ (rendered by scripts/og.mjs). */
export function ogImage(name: string) {
  const url = `${host ? `https://${host}` : ""}/og/${name}.png`;
  return [
    { property: "og:image", content: url },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: url },
  ];
}
