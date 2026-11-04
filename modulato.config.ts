import { defineConfig } from "modulato/config";

export default defineConfig({
  head: {
    lang: "en",
    link: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400..700&display=swap" },
      // telepath.com's black icon, unconditionally: a prefers-color-scheme: dark
      // variant (white glyph) got picked in light tab bars and drawn on a black backplate.
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    meta: [{ property: "og:site_name", content: "Telepath Research" }],
  },
  breakpoints: { phone: "(max-width: 760px)" },
});
