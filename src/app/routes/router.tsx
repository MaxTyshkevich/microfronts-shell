import { Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";
import { Button, Panel } from "@microfronts/ui";
import type { Destination } from "@microfronts/contracts";
import { AuthPage, safeReturnTo } from "../../pages/auth";
import { HomePage } from "../../pages/home";
import { AccountPage } from "../../pages/account";
import type { Remotes } from "../integrations/remotes/register-remotes";
import { RemoteBoundary } from "../integrations/remotes/remote-boundary";
import { useHost } from "../providers/host-provider";
import { ShellLayout } from "../ui/shell-layout";

export function createRouter(remotes: Remotes) {
  return createBrowserRouter([
    {
      element: <ShellLayout />,
      children: [
        { index: true, element: <HomePage /> },
        // Public forms never wait for /auth/me. Redirect only a confirmed user.
        {
          element: <GuestOnly />,
          children: [
            { path: "login", element: <AuthRoute mode="login" /> },
            { path: "register", element: <AuthRoute mode="register" /> },
          ],
        },
        // Catalog/cart support guests, but need a resolved cache/session scope.
        {
          element: <SessionBoundary />,
          children: [
            { path: "catalog", element: <RemoteRoute name="catalog" remotes={remotes} /> },
            { path: "cart", element: <RemoteRoute name="cart" remotes={remotes} /> },
            {
              element: <RequireAuth />,
              children: [{ path: "account", element: <AccountRoute /> }],
            },
          ],
        },
        {
          path: "*",
          element: (
            <div className="shell:[&>.mf-panel]:min-h-[340px] shell:[&>.mf-panel]:p-5 shell:[&>.mf-panel]:border shell:[&>.mf-panel]:border-[#d8dee8] shell:[&>.mf-panel]:rounded-lg shell:[&>.mf-panel]:bg-white shell:[&>.mf-panel>h2]:mb-4 shell:[&>.mf-panel>h2]:text-lg">
              <Panel title="Страница не найдена">
                <NavLink to="/catalog">Перейти в каталог</NavLink>
              </Panel>
            </div>
          ),
        },
      ],
    },
  ]);
}

function GuestOnly() {
  const host = useHost();
  const location = useLocation();
  return host.status === "ready" && host.user ? (
    <Navigate to={safeReturnTo(new URLSearchParams(location.search).get("returnTo"))} replace />
  ) : (
    <Outlet />
  );
}

function SessionBoundary() {
  const host = useHost();
  if (host.status === "error")
    return (
      <div role="alert">
        Не удалось проверить сессию. {host.error?.message}{" "}
        <Button onClick={host.retrySession}>Повторить проверку</Button>
      </div>
    );
  return host.status === "ready" ? <Outlet /> : <p role="status">Проверяем сессию…</p>;
}

function RequireAuth() {
  const host = useHost();
  const location = useLocation();
  return host.user ? (
    <Outlet />
  ) : (
    <Navigate
      to={
        "/login?returnTo=" + encodeURIComponent(location.pathname + location.search + location.hash)
      }
      replace
    />
  );
}

function AuthRoute({ mode }: { mode: "login" | "register" }) {
  const host = useHost();
  return (
    <AuthPage
      key={mode}
      mode={mode}
      api={host.apiBaseUrl}
      guestKey={host.guestKey}
      onSession={host.onSession}
    />
  );
}

function AccountRoute() {
  const host = useHost();
  return host.user ? <AccountPage user={host.user} /> : null;
}

function RemoteRoute({
  name,
  remotes: { CatalogApp, CartApp },
}: {
  name: "catalog" | "cart";
  remotes: Remotes;
}) {
  const host = useHost();
  const navigate = useNavigate();
  const scope = host.user ? "user:" + host.user.id : "guest:" + host.guestKey;
  const props = {
    apiBaseUrl: host.apiBaseUrl,
    cartKey: host.guestKey,
    queryClient: host.client,
    sessionScope: scope,
    onNavigate: (destination: Destination) => navigate("/" + destination),
    onUnauthorized: () => {
      void host.refreshSession().catch(() => {
        /* SessionBoundary offers retry. */
      });
    },
  };
  return (
    <div className="shell:[&>.mf-panel]:min-h-[340px] shell:[&>.mf-panel]:p-5 shell:[&>.mf-panel]:border shell:[&>.mf-panel]:border-[#d8dee8] shell:[&>.mf-panel]:rounded-lg shell:[&>.mf-panel]:bg-white shell:[&>.mf-panel>h2]:mb-4 shell:[&>.mf-panel>h2]:text-lg">
      <Panel title={name === "catalog" ? "Каталог товаров" : "Ваша корзина"}>
        <RemoteBoundary name={name} key={scope + name}>
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
