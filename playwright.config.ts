import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:5187";

export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.pw.spec.ts",
  use: { baseURL, browserName: "chromium" },
  webServer: {
    command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187 --strictPort",
    url: baseURL,
    reuseExistingServer: false,
  },
});
