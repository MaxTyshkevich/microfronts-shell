import { lazy, Suspense, useCallback, useState, type ComponentType } from "react";
import { loadRemote, registerRemotes } from "@module-federation/runtime";
import { Badge, Panel } from "@microfronts/ui";
import { getCartKey } from "./cart-key";
import type { CatalogProps, CartProps } from "./remote-props";
import { RemoteBoundary } from "./RemoteBoundary";
import type { RuntimeConfig } from "./config";

function remote<Props extends object>(name: string) {
  return lazy(async () => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      const module = await Promise.race([
        loadRemote<{ default: ComponentType<Props> }>(name),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Timeout: " + name)), 20000);
        }),
      ]);
      if (!module?.default) throw new Error("Invalid remote module: " + name);
      return module;
    } finally {
      clearTimeout(timer!);
    }
  });
}
export function createApp(config: RuntimeConfig) {
  registerRemotes([
    { name: "catalog", entry: config.remotes.catalog, type: "module" },
    { name: "cart", entry: config.remotes.cart, type: "module" },
  ]);
  const CatalogApp = remote<CatalogProps>("catalog/CatalogApp");
  const CartApp = remote<CartProps>("cart/CartApp");
  const cartKey = getCartKey();
  return function App() {
    const [cartVersion, setCartVersion] = useState(0);
    const onCartChanged = useCallback(() => setCartVersion((version) => version + 1), []);
    return (
      <main className="shell-page">
        <header className="shell-header">
          <div>
            <Badge tone="green">React + Module Federation</Badge>
            <h1>Microfronts Lab</h1>
          </div>
          <p>Shell собирает страницу, но не владеет логикой каталога и корзины.</p>
        </header>
        <p className="shell-environment">
          Учебный стенд · API: {config.apiBaseUrl} · корзины хранятся в памяти API
        </p>
        <div className="shell-grid">
          <Panel title="Catalog remote">
            <RemoteBoundary name="catalog">
              <Suspense fallback={<p role="status">Загружаем каталог…</p>}>
                <CatalogApp apiBaseUrl={config.apiBaseUrl} cartKey={cartKey} onCartChanged={onCartChanged} />
              </Suspense>
            </RemoteBoundary>
          </Panel>
          <Panel title="Cart remote">
            <RemoteBoundary name="cart">
              <Suspense fallback={<p role="status">Загружаем корзину…</p>}>
                <CartApp apiBaseUrl={config.apiBaseUrl} cartKey={cartKey} refreshVersion={cartVersion} />
              </Suspense>
            </RemoteBoundary>
          </Panel>
        </div>
      </main>
    );
  };
}
