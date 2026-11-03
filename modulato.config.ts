import { defineConfig } from "modulato/config";

export default defineConfig({
  head: {
    lang: "en",
    link: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400..700&display=swap" },
    ],
    meta: [{ property: "og:site_name", content: "Telepath Research" }],
  },
  breakpoints: { phone: "(max-width: 760px)" },
});
