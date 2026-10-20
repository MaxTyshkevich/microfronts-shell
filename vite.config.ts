import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, ".", ""), ...process.env };
  const isProduction = command === "build" && mode !== "integration";
  const origin = env.DEV_PUBLIC_ORIGIN || "http://localhost:5173";
  const apiBaseUrl = env.VITE_API_BASE_URL || "/api";
  const config = {
    apiBaseUrl,
    remotes: {
      catalog: env.VITE_CATALOG_REMOTE_URL || "http://localhost:5174/remoteEntry.js",
      cart: env.VITE_CART_REMOTE_URL || "http://localhost:5175/remoteEntry.js",
    },
  };
  if (isProduction) {
    for (const value of [env.VITE_CATALOG_REMOTE_URL, env.VITE_CART_REMOTE_URL]) {
      if (!value || !value.startsWith("https://"))
        throw new Error(
          "Production requires HTTPS VITE_CATALOG_REMOTE_URL and VITE_CART_REMOTE_URL",
        );
    }
    if (apiBaseUrl !== "/api" && !apiBaseUrl.startsWith("https://"))
      throw new Error("API must use /api or HTTPS");
  }
  // Fail at dev-server startup/build, before publishing a broken application.
  for (const [name, value] of Object.entries(config.remotes)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Invalid remote URL: " + name);
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Remote must use HTTP(S): " + name);
    if ((isProduction || origin.startsWith("https:")) && url.protocol !== "https:")
      throw new Error("HTTPS required for remote: " + name);
  }
  if (apiBaseUrl !== "/api") {
    let url: URL;
    try {
      url = new URL(apiBaseUrl);
    } catch {
      throw new Error("API must use /api or an absolute HTTP(S) URL");
    }
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("API must use HTTP(S)");
  }
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
      tailwindcss(),
      react(),
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
    build: { target: ["chrome111", "safari16.4", "firefox128"] },
  };
});
