import { defineConfig } from "modulato/config";

export default defineConfig({
  head: {
    lang: "en",
    link: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400..700&display=swap" },
      // Same icons as telepath.com
      { rel: "icon", href: "/favicon-light.png", media: "(prefers-color-scheme: light)" },
      { rel: "icon", href: "/favicon-dark.png", media: "(prefers-color-scheme: dark)" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    meta: [{ property: "og:site_name", content: "Telepath Research" }],
  },
  breakpoints: { phone: "(max-width: 760px)" },
});
