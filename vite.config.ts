import type { PluginOption } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

const __dirname =
  typeof import.meta.dirname !== "undefined"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

const isReplit = process.env.REPL_ID !== undefined;
const isProduction = process.env.NODE_ENV === "production";

const replitPlugins =
  !isProduction && isReplit
    ? [
        import("@replit/vite-plugin-cartographer").then((m: { cartographer: () => PluginOption }) => m.cartographer()),
        import("@replit/vite-plugin-dev-banner").then((m: { devBanner: () => PluginOption }) => m.devBanner()),
        import("@replit/vite-plugin-runtime-error-modal").then((m: { default: () => PluginOption }) => m.default()),
      ]
    : [];

export default defineConfig({
  plugins: [
    react(),
    ...(await Promise.all(replitPlugins)),
    tailwindcss(),
    metaImagesPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
