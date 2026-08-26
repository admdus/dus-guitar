import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "node:path";

const webOnly = process.env.WEB_ONLY === "1";

export default defineConfig({
  plugins: [
    react(),
    ...(!webOnly
      ? [
          electron({
            main: {
              entry: "electron/main.ts",
            },
            preload: {
              input: "electron/preload.ts",
            },
            renderer: {},
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
});
