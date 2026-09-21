import { registerRemotes } from "@module-federation/runtime";
import type { RuntimeConfig } from "../../config/runtime-config";
import type { CatalogProps, CartProps } from "./remote-props";
import { remote } from "./load-remote";

export function createRemotes(config: RuntimeConfig) {
  registerRemotes([
    { name: "catalog", entry: config.remotes.catalog, type: "module" },
    { name: "cart", entry: config.remotes.cart, type: "module" },
  ]);
  const CatalogApp = remote<CatalogProps>("catalog/CatalogApp");
  const CartApp = remote<CartProps>("cart/CartApp");
  return { CatalogApp, CartApp };
}

export type Remotes = ReturnType<typeof createRemotes>;
