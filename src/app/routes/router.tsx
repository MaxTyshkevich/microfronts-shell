import { Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createBrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router";
import { Button, Panel } from "@microfronts/ui";
import type { Destination } from "@microfronts/contracts";
import { useSession, sessionKey, type SessionUser } from "../../entities/session";
import { AuthPage, safeReturnTo } from "../../pages/auth";
import { HomePage } from "../../pages/home";
import { AccountPage } from "../../pages/account";
import { config } from "../config/config";
import type { Remotes } from "../integrations/remotes/register-remotes";
import { RemoteBoundary } from "../integrations/remotes/remote-boundary";
import { AuthenticatedQueryProvider } from "../providers/authenticated-query-provider";
import { ShellLayout } from "../ui/shell-layout";

interface AuthenticatedRouteContext {
  user: SessionUser;
  refreshSession: () => void;
}

export function createRouter(remotes: Remotes) {
  return createBrowserRouter([
    {
      element: <ShellLayout />,
      children: [
        {
          element: <GuestOnly />,
          children: [
            { index: true, element: <HomePage /> },
            { path: "login", element: <AuthPage key="login" mode="login" api={config.apiBaseUrl} /> },
            { path: "register", element: <AuthPage key="register" mode="register" api={config.apiBaseUrl} /> },
          ],
        },
        {
          element: <RequireAuth />,
          children: [
            { path: "catalog", element: <RemoteRoute name="catalog" remotes={remotes} /> },
            { path: "cart", element: <RemoteRoute name="cart" remotes={remotes} /> },
            { path: "account", element: <AccountRoute /> },
          ],
        },
        {
          path: "*",
          element: (
            <div className="shell:[&>.mf-panel]:min-h-[340px] shell:[&>.mf-panel]:p-5 shell:[&>.mf-panel]:border shell:[&>.mf-panel]:border-[#d8dee8] shell:[&>.mf-panel]:rounded-lg shell:[&>.mf-panel]:bg-white shell:[&>.mf-panel>h2]:mb-4 shell:[&>.mf-panel>h2]:text-lg">
              <Panel title="Страница не найдена">
                <NavLink to="/">На главную</NavLink>
              </Panel>
            </div>
          ),
        },
      ],
    },
  ]);
}

function GuestOnly() {
  const session = useSession(config.apiBaseUrl);
  const location = useLocation();
  // Public forms remain usable while the session is loading or API is down.
  return session.isSuccess && session.data.user ? (
    <Navigate to={safeReturnTo(new URLSearchParams(location.search).get("returnTo"))} replace />
  ) : (
    <Outlet />
  );
}

function RequireAuth() {
  const session = useSession(config.apiBaseUrl);
  const client = useQueryClient();
  const location = useLocation();
  if (session.isError)
    return (
      <div role="alert">
        Не удалось проверить сессию. {session.error.message}{" "}
        <Button onClick={() => void session.refetch()}>Повторить проверку</Button>
      </div>
    );
  if (session.isPending) return <p role="status">Проверяем сессию…</p>;
  if (!session.data.user)
    return (
      <Navigate
        to={"/login?returnTo=" + encodeURIComponent(location.pathname + location.search + location.hash)}
        replace
      />
    );
  const context: AuthenticatedRouteContext = {
    user: session.data.user,
    refreshSession: () => {
      // Reset hides private content until /me confirms the current identity.
      void client.resetQueries(
        { queryKey: sessionKey(config.apiBaseUrl), exact: true },
        { throwOnError: true },
      ).catch(() => { /* The route offers retry after a failed session check. */ });
    },
  };
  return (
    <AuthenticatedQueryProvider key={context.user.id}>
      <Outlet context={context} />
    </AuthenticatedQueryProvider>
  );
}

function AccountRoute() {
  const { user } = useOutletContext<AuthenticatedRouteContext>();
  return <AccountPage user={user} />;
}

function RemoteRoute({
  name,
  remotes: { CatalogApp, CartApp },
}: {
  name: "catalog" | "cart";
  remotes: Remotes;
}) {
  const { user, refreshSession } = useOutletContext<AuthenticatedRouteContext>();
  const client = useQueryClient();
  const navigate = useNavigate();
  const props = {
    apiBaseUrl: config.apiBaseUrl,
    // Required by the existing remote contract. Authenticated backend requests
    // choose the cart from the cookie and ignore this legacy guest field.
    cartKey: "",
    queryClient: client,
    sessionScope: "user:" + user.id,
    onNavigate: (destination: Destination) => navigate("/" + destination),
    onUnauthorized: refreshSession,
  };
  return (
    <div className="shell:[&>.mf-panel]:min-h-[340px] shell:[&>.mf-panel]:p-5 shell:[&>.mf-panel]:border shell:[&>.mf-panel]:border-[#d8dee8] shell:[&>.mf-panel]:rounded-lg shell:[&>.mf-panel]:bg-white shell:[&>.mf-panel>h2]:mb-4 shell:[&>.mf-panel>h2]:text-lg">
      <Panel title={name === "catalog" ? "Каталог товаров" : "Ваша корзина"}>
        <RemoteBoundary name={name} key={user.id + name}>
          <Suspense
            fallback={<p role="status">Загружаем {name === "catalog" ? "каталог" : "корзину"}…</p>}
          >
            {name === "catalog" ? <CatalogApp {...props} /> : <CartApp {...props} />}
          </Suspense>
        </RemoteBoundary>
      </Panel>
    </div>
  );
}
