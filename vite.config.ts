import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2018",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    chunkSizeWarningLimit: 200,
  },
  server: {
    port: 5173,
    host: true,
  },
});