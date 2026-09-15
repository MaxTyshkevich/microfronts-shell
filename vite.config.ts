import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, ".", ""), ...process.env };
  const isProduction = command === "build" && mode !== "integration";
  const origin = env.DEV_PUBLIC_ORIGIN || "http://localhost:5173";
  const apiBaseUrl = env.VITE_API_BASE_URL || "/api";
  const config = {
    schemaVersion: 1,
    apiBaseUrl,
    remotes: {
      catalog: env.VITE_CATALOG_REMOTE_URL || "http://localhost:5174/remoteEntry.js",
      cart: env.VITE_CART_REMOTE_URL || "http://localhost:5175/remoteEntry.js",
    },
  };
  if (isProduction) {
    for (const value of [
      env.VITE_CATALOG_REMOTE_URL,
      env.VITE_CART_REMOTE_URL,
      env.VITE_API_BASE_URL,
    ]) {
      if (!value || !value.startsWith("https://"))
        throw new Error(
          "Production requires HTTPS VITE_CATALOG_REMOTE_URL, VITE_CART_REMOTE_URL and VITE_API_BASE_URL",
        );
    }
  }
  const runtimeConfig: Plugin = {
    name: "microfronts-runtime-config",
    configureServer(server) {
      server.middlewares.use("/runtime-config.json", (_request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        response.end(JSON.stringify(config));
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "runtime-config.json",
        source: JSON.stringify(config, null, 2),
      });
    },
  };
  const allowedOrigins = (
    env.DEV_ALLOWED_ORIGINS ||
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:4173,http://localhost:4174,http://localhost:4175"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const proxy = {
    "/api": { target: env.API_PROXY_TARGET || "http://localhost:3000", changeOrigin: true },
  };
  return {
    plugins: [
      react(),
      runtimeConfig,
      federation({
        name: "shell",
        remotes: {},
        dts: false,
        shared: {
          react: { singleton: true, requiredVersion: "^19.0.0" },
          "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
          "react/jsx-runtime": { singleton: true, requiredVersion: "^19.0.0" },
          "react-dom/client": { singleton: true, requiredVersion: "^19.0.0" },
        },
      }),
    ],
    base: "/",
    server: { origin, port: 5173, strictPort: true, cors: { origin: allowedOrigins }, proxy },
    preview: { port: 4173, strictPort: true, cors: { origin: allowedOrigins }, proxy },
    build: { target: "chrome89" },
  };
});
