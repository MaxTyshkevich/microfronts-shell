import { createBrowserRouter, Navigate, NavLink } from "react-router";
import { Panel } from "@microfronts/ui";
import type { RuntimeConfig } from "../config/runtime-config";
import type { Remotes } from "../integrations/remotes/register-remotes";
import { ShellLayout } from "../ui/shell-layout";
import { createRouteAdapters } from "./route-adapters";

export function createRouter(config: RuntimeConfig, remotes: Remotes) {
  const { RemoteRoute, AuthRoute, Account } = createRouteAdapters(config, remotes);
  return createBrowserRouter([
    {
      element: <ShellLayout apiBaseUrl={config.apiBaseUrl} />,
      children: [
        { index: true, element: <Navigate to="/catalog" replace /> },
        { path: "catalog", element: <RemoteRoute name="catalog" /> },
        { path: "cart", element: <RemoteRoute name="cart" /> },
        { path: "login", element: <AuthRoute mode="login" /> },
        { path: "register", element: <AuthRoute mode="register" /> },
        { path: "account", element: <Account /> },
        {
          path: "*",
          element: (
            <Panel title="Страница не найдена">
              <NavLink to="/catalog">Перейти в каталог</NavLink>
            </Panel>
          ),
        },
      ],
    },
  ]);
}
