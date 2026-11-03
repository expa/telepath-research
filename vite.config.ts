import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import modulato from "@modulato/vite";

export default defineConfig({
  plugins: [react(), modulato()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
