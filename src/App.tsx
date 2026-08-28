import { lazy, Suspense } from "react";
import { Badge, Panel } from "@microfronts/ui";

const CatalogApp = lazy(() => import("catalog/CatalogApp"));
const CartApp = lazy(() => import("cart/CartApp"));

export function App() {
  return (
    <main className="shell-page">
      <header className="shell-header">
        <div>
          <Badge tone="green">React + Module Federation</Badge>
          <h1>Microfronts Lab</h1>
        </div>
        <p>Shell собирает страницу, но не владеет логикой каталога и корзины.</p>
      </header>

      <div className="shell-grid">
        <Panel title="Catalog remote">
          <Suspense fallback={<div className="loading">Загружаем каталог...</div>}>
            <CatalogApp />
          </Suspense>
        </Panel>

        <Panel title="Cart remote">
          <Suspense fallback={<div className="loading">Загружаем корзину...</div>}>
            <CartApp />
          </Suspense>
        </Panel>
      </div>
    </main>
  );
}

