import { lazy, Suspense, useCallback, useEffect, useRef, useState, createContext, useContext, type ComponentType } from 'react';
import { loadRemote, registerRemotes } from '@module-federation/runtime';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Badge, Button, Panel } from '@microfronts/ui';
import { sessionKey, type CatalogProps, type CartProps, type Destination } from '@microfronts/contracts';
import { getCartKey } from './cart-key';
import { RemoteBoundary } from './RemoteBoundary';
import type { RuntimeConfig } from './config';
import { authRequest, type Session } from './auth-api';
import { AuthPage, safeReturnTo } from './AuthPage';

function remote<Props extends object>(name: string) {
  return lazy(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const module = await Promise.race([
        loadRemote<{ default: ComponentType<Props> }>(name),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout: ' + name)), 20000); }),
      ]);
      if (!module?.default) throw new Error('Invalid remote module: ' + name);
      return module;
    } finally { clearTimeout(timer); }
  });
}
const makeClient = () => new QueryClient({ defaultOptions: {
  queries: { staleTime: 30000, retry: false }, mutations: { retry: false },
} });
interface HostState { client: QueryClient; guestKey: string; identity?: string; generation: number }
interface HostContext extends HostState { onSession: (session: Session, reset?: boolean, expectedClient?: QueryClient) => Promise<void> }
const Host = createContext<HostContext | null>(null);
const useHost = () => useContext(Host)!;

export function createApp(config: RuntimeConfig) {
  registerRemotes([
    { name: 'catalog', entry: config.remotes.catalog, type: 'module' },
    { name: 'cart', entry: config.remotes.cart, type: 'module' },
  ]);
  const CatalogApp = remote<CatalogProps>('catalog/CatalogApp');
  const CartApp = remote<CartProps>('cart/CartApp');
  function useSession() {
    return useQuery({ queryKey: sessionKey(config.apiBaseUrl), queryFn: ({ signal }) => authRequest(config.apiBaseUrl, 'me', { signal }), staleTime: 0, retry: false });
  }
  function Layout() {
    const host = useHost();
    const session = useSession();
    const navigate = useNavigate();
    const actualIdentity = session.data?.user?.id ?? 'guest';
    useEffect(() => {
      if (session.isSuccess && host.identity !== actualIdentity) void host.onSession(session.data);
    }, [session.isSuccess, actualIdentity, host.identity, host.onSession, session.data]);
    const logout = useMutation({ mutationFn: () => authRequest(config.apiBaseUrl, 'logout', { method: 'POST' }), onSuccess: async data => { await host.onSession(data); navigate('/catalog', { replace: true }); } });
    const ready = session.isSuccess && host.identity === actualIdentity && !logout.isPending;
    return <main className="shell-page">
      <header className="shell-header"><div><Badge tone="green">Microfronts Lab</Badge><h1>Магазин</h1></div><p>Каталог, корзина и ваш аккаунт.</p></header>
      <nav className="shell-nav" aria-label="Основная навигация">
        <NavLink to="/catalog">Каталог</NavLink><NavLink to="/cart">Корзина</NavLink>
        {ready && session.data.user ? <><NavLink to="/account">Мой аккаунт</NavLink><Button onClick={() => logout.mutate()} disabled={logout.isPending}>Выйти</Button></> : <><NavLink to="/login">Вход</NavLink><NavLink to="/register">Регистрация</NavLink></>}
      </nav>
      {logout.error && <p role="alert">{logout.error.message}</p>}
      {session.isError ? <div role="alert">Не удалось проверить сессию. {session.error.message} <Button onClick={() => void session.refetch()}>Повторить проверку</Button></div> : !ready ? <p role="status">Проверяем сессию…</p> : <Outlet />}
    </main>;
  }
  function RemotePage({ name }: { name: 'catalog' | 'cart' }) {
    const host = useHost();
    const navigate = useNavigate();
    const scope = host.identity === 'guest' ? 'guest:' + host.guestKey : 'user:' + host.identity;
    const props = {
      apiBaseUrl: config.apiBaseUrl, cartKey: host.guestKey, queryClient: host.client, sessionScope: scope,
      onNavigate: (destination: Destination) => navigate('/' + destination),
      onUnauthorized: () => {
        // Hide private views until the session has been verified again. Old
        // responses remain attached to the retired QueryClient after a switch.
        host.client.removeQueries({ queryKey: ['cart'] });
        void host.client.resetQueries({ queryKey: sessionKey(config.apiBaseUrl) }, { throwOnError: true }).then(() => {
          const session = host.client.getQueryData<Session>(sessionKey(config.apiBaseUrl));
          // A consumed guest key can survive in another tab even when the user
          // is already logged out. Recover it even if identity stays "guest".
          if (session) return host.onSession(session, true, host.client);
        }).catch(() => { /* Layout displays the session query error and retry. */ });
      },
    };
    return <Panel title={name === 'catalog' ? 'Каталог товаров' : 'Ваша корзина'}><RemoteBoundary name={name} key={scope + name}>
      <Suspense fallback={<p role="status">Загружаем {name === 'catalog' ? 'каталог' : 'корзину'}…</p>}>
        {name === 'catalog' ? <CatalogApp {...props} /> : <CartApp {...props} />}
      </Suspense>
    </RemoteBoundary></Panel>;
  }
  function AuthRoute({ mode }: { mode: 'login' | 'register' }) {
    const host = useHost();
    const location = useLocation();
    if (host.identity !== 'guest') return <Navigate to={safeReturnTo(new URLSearchParams(location.search).get('returnTo'))} replace />;
    return <AuthPage key={mode} mode={mode} api={config.apiBaseUrl} guestKey={host.guestKey} onSession={host.onSession} />;
  }
  function Account() {
    const host = useHost();
    const location = useLocation();
    const session = host.client.getQueryData<Session>(sessionKey(config.apiBaseUrl));
    if (!session?.user) return <Navigate to={'/login?returnTo=' + encodeURIComponent(location.pathname + location.search)} replace />;
    return <Panel title="Мой аккаунт"><h2>{session.user.name}</h2><p>{session.user.email}</p><p>Ваша корзина сохранена в аккаунте.</p></Panel>;
  }
  const router = createBrowserRouter([{ element: <Layout />, children: [
    { index: true, element: <Navigate to="/catalog" replace /> },
    { path: 'catalog', element: <RemotePage name="catalog" /> },
    { path: 'cart', element: <RemotePage name="cart" /> },
    { path: 'login', element: <AuthRoute mode="login" /> },
    { path: 'register', element: <AuthRoute mode="register" /> },
    { path: 'account', element: <Account /> },
    { path: '*', element: <Panel title="Страница не найдена"><NavLink to="/catalog">Перейти в каталог</NavLink></Panel> },
  ] }]);
  return function App() {
    const [state, setState] = useState<HostState>(() => ({ client: makeClient(), guestKey: getCartKey(), generation: 0 }));
    const current = useRef(state);
    const onSession = useCallback(async (session: Session, reset = false, expectedClient?: QueryClient) => {
      const previous = current.current;
      const identity = session.user?.id ?? 'guest';
      if (expectedClient && expectedClient !== previous.client) return;
      if (previous.identity === identity && !reset) return;
      await previous.client.cancelQueries();
      if (current.current !== previous) return;
      // New client separates even non-cancellable, already submitted mutations.
      const client = makeClient();
      client.setQueryData(sessionKey(config.apiBaseUrl), session);
      const next = { client, identity, generation: previous.generation + 1, guestKey: previous.identity === undefined ? previous.guestKey : getCartKey(true) };
      current.current = next;
      previous.client.clear();
      setState(next);
    }, []);
    return <Host.Provider value={{ ...state, onSession }}><QueryClientProvider key={state.generation} client={state.client}><RouterProvider router={router} /></QueryClientProvider></Host.Provider>;
  };
}
