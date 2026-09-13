import { lazy, Suspense, type ComponentType } from 'react';
import { loadRemote, registerRemotes } from '@module-federation/runtime';
import { Badge, Panel } from '@microfronts/ui';
import { createPlatform, type RemoteProps } from '@microfronts/platform';
import { RemoteBoundary } from './RemoteBoundary';
import type { RuntimeConfig } from './config';

function remote(name: string) {
  return lazy(async () => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      const module = await Promise.race([
        loadRemote<{ default: ComponentType<RemoteProps> }>(name),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout: ' + name)), 20000); }),
      ]);
      if (!module?.default) throw new Error('Invalid remote module: ' + name);
      return module;
    } finally { clearTimeout(timer!); }
  });
}
export function createApp(config: RuntimeConfig) {
  registerRemotes([
    { name: 'catalog', entry: config.remotes.catalog, type: 'module' },
    { name: 'cart', entry: config.remotes.cart, type: 'module' },
  ]);
  const CatalogApp = remote('catalog/CatalogApp');
  const CartApp = remote('cart/CartApp');
  const platform = createPlatform(config);
  return function App() {
    return <main className="shell-page">
      <header className="shell-header"><div><Badge tone="green">React + Module Federation</Badge><h1>Microfronts Lab</h1></div>
        <p>Shell собирает страницу, но не владеет логикой каталога и корзины.</p></header>
      <p className="shell-environment">Учебный стенд · API: {config.apiBaseUrl} · корзины хранятся в памяти API</p>
      <div className="shell-grid">
        <Panel title="Catalog remote"><RemoteBoundary name="catalog"><Suspense fallback={<p role="status">Загружаем каталог…</p>}><CatalogApp platform={platform} /></Suspense></RemoteBoundary></Panel>
        <Panel title="Cart remote"><RemoteBoundary name="cart"><Suspense fallback={<p role="status">Загружаем корзину…</p>}><CartApp platform={platform} /></Suspense></RemoteBoundary></Panel>
      </div>
    </main>;
  };
}
