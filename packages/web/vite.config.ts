import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Library build — the only artifact that ships inside `.hebbsmod`. Outputs
// dist/index.mjs + dist/index.css (non-hashed), which the shell dynamic-imports
// at /modules/vcbrain/ui/index.mjs. The entry exports the `vcbrainUI` PluginUI.
// React, Router, QueryClient and @boringos/ui are provided by the shell — keep
// them external so we don't fork the React tree.

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/ui.ts"),
      formats: ["es"],
      fileName: () => "index.mjs",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react-router-dom",
        "@tanstack/react-query",
        "@boringos/ui",
      ],
      output: {
        entryFileNames: "index.mjs",
        assetFileNames: (info) => {
          const name = info.name ?? "";
          if (name === "style.css" || name.endsWith(".css")) return "index.css";
          return "assets/[name]-[hash][extname]";
        },
        chunkFileNames: "assets/[name]-[hash].js",
      },
    },
    emptyOutDir: true,
    sourcemap: false,
  },
});
