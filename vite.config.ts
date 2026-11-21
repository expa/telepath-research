import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import modulato from "@modulato/vite";
import { DECK_GATE_ROUTES, gateMiddleware } from "./lib/deck-gate.mjs";

export default defineConfig({
  plugins: [
    react(),
    // On Vercel, /deck without the unlock cookie is routed to the password gate (lib/deck-gate.mjs); the gate's function
    // is written into .vercel/output by scripts/deck-gate-output.mjs after this build.
    modulato(process.env.VERCEL ? { vercel: { routes: DECK_GATE_ROUTES } } : {}),
    // The same gate in dev, so /deck behaves locally as it does in production.
    { name: "deck-gate", configureServer: (server) => void server.middlewares.use(gateMiddleware) },
  ],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
