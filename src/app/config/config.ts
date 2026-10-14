export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  remoteLoadTimeoutMs: 20_000,
  remotes: {
    catalog: {
      name: "catalog",
      entry: import.meta.env.VITE_CATALOG_REMOTE_URL || "http://localhost:5174/remoteEntry.js",
      type: "module",
      moduleId: "catalog/CatalogApp",
    },
    cart: {
      name: "cart",
      entry: import.meta.env.VITE_CART_REMOTE_URL || "http://localhost:5175/remoteEntry.js",
      type: "module",
      moduleId: "cart/CartApp",
    },
  },
} as const;
export type AppConfig = typeof config;
