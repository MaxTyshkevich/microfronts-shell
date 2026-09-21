import { Suspense } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import type { Destination } from "@microfronts/contracts";
import { sessionKey, type Session } from "../../entities/session";
import { AuthPage, safeReturnTo } from "../../pages/auth";
import { AccountPage } from "../../pages/account";
import { RemotePage } from "../../pages/remote";
import { useHost } from "../providers/host-provider";
import type { RuntimeConfig } from "../config/runtime-config";
import type { Remotes } from "../integrations/remotes/register-remotes";
import { RemoteBoundary } from "../integrations/remotes/remote-boundary";

export function createRouteAdapters(config: RuntimeConfig, { CatalogApp, CartApp }: Remotes) {
  function RemoteRoute({ name }: { name: "catalog" | "cart" }) {
    const host = useHost();
    const navigate = useNavigate();
    const scope = host.identity === "guest" ? "guest:" + host.guestKey : "user:" + host.identity;
    const props = {
      apiBaseUrl: config.apiBaseUrl,
      cartKey: host.guestKey,
      queryClient: host.client,
      sessionScope: scope,
      onNavigate: (destination: Destination) => navigate("/" + destination),
      onUnauthorized: () => {
        // Hide private views until the session has been verified again. Old
        // responses remain attached to the retired QueryClient after a switch.
        host.client.removeQueries({ queryKey: ["cart"] });
        void host.client
          .resetQueries({ queryKey: sessionKey(config.apiBaseUrl) }, { throwOnError: true })
          .then(() => {
            const session = host.client.getQueryData<Session>(sessionKey(config.apiBaseUrl));
            // A consumed guest key can survive in another tab even when the user
            // is already logged out. Recover it even if identity stays "guest".
            if (session) return host.onSession(session, true, host.client);
          })
          .catch(() => {
            /* Layout displays the session query error and retry. */
          });
      },
    };
    return (
      <RemotePage name={name}>
        <RemoteBoundary name={name} key={scope + name}>
          <Suspense
            fallback={<p role="status">Загружаем {name === "catalog" ? "каталог" : "корзину"}…</p>}
          >
            {name === "catalog" ? <CatalogApp {...props} /> : <CartApp {...props} />}
          </Suspense>
        </RemoteBoundary>
      </RemotePage>
    );
  }
  function AuthRoute({ mode }: { mode: "login" | "register" }) {
    const host = useHost();
    const location = useLocation();
    if (host.identity !== "guest")
      return (
        <Navigate to={safeReturnTo(new URLSearchParams(location.search).get("returnTo"))} replace />
      );
    return (
      <AuthPage
        key={mode}
        mode={mode}
        api={config.apiBaseUrl}
        guestKey={host.guestKey}
        onSession={host.onSession}
      />
    );
  }
  function Account() {
    const host = useHost();
    const location = useLocation();
    const session = host.client.getQueryData<Session>(sessionKey(config.apiBaseUrl));
    if (!session?.user)
      return (
        <Navigate
          to={"/login?returnTo=" + encodeURIComponent(location.pathname + location.search)}
          replace
        />
      );
    return <AccountPage user={session.user} />;
  }
  return { RemoteRoute, AuthRoute, Account };
}
