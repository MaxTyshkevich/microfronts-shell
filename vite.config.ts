import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "shell",
      remotes: {
        catalog: {
          type: "module",
          name: "catalog",
          entry: "http://localhost:5174/remoteEntry.js",
          shareScope: "default"
        },
        cart: {
          type: "module",
          name: "cart",
          entry: "http://localhost:5175/remoteEntry.js",
          shareScope: "default"
        }
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true }
      }
    })
  ],
  server: {
    origin: "http://localhost:5173",
    port: 5173
  },
  build: {
    target: "chrome89"
  }
});
