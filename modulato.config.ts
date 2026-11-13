import { defineConfig } from "modulato/config";

export default defineConfig({
  head: {
    lang: "en",
    link: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400..700&display=swap" },
      // The deck's mark (a pill over two circles). The SVG is black, and Telepath orange in dark mode rather than white:
      // a white dark-mode variant once got picked in light tab bars, and orange reads on both. The black PNG is the
      // fallback for browsers without SVG favicons (Safari); the touch icon sits on paper so iOS doesn't fill it black.
      { rel: "icon", type: "image/png", sizes: "64x64", href: "/favicon.png" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    meta: [{ property: "og:site_name", content: "Telepath Research" }],
  },
  breakpoints: { phone: "(max-width: 760px)" },
});
