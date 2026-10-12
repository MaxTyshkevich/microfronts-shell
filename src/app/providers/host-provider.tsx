import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sessionKey, useSession, type Session, type SessionUser } from "../../entities/session";
import { getCartKey } from "../lib/guest-cart-key";

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30000, retry: false },
      mutations: { retry: false },
    },
  });
interface HostState {
  client: QueryClient;
  guestKey: string;
  identity?: string;
  generation: number;
}
interface HostContext extends HostState {
  apiBaseUrl: string;
  user: SessionUser | null;
  status: "pending" | "error" | "ready";
  error: Error | null;
  retrySession: () => void;
  refreshSession: () => Promise<void>;
  onSession: (session: Session, reset?: boolean, expectedClient?: QueryClient) => Promise<void>;
}
const Host = createContext<HostContext | null>(null);
export function useHost() {
  const host = useContext(Host);
  if (!host) throw new Error("HostProvider is required");
  return host;
}

export function HostProvider({
  apiBaseUrl,
  children,
}: {
  apiBaseUrl: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<HostState>(() => ({
    client: makeClient(),
    guestKey: getCartKey(),
    generation: 0,
  }));
  const current = useRef(state);
  const onSession = useCallback(
    async (session: Session, reset = false, expectedClient?: QueryClient) => {
      const previous = current.current;
      const identity = session.user?.id ?? "guest";
      if (expectedClient && expectedClient !== previous.client) return;
      if (previous.identity === identity && !reset) return;
      await previous.client.cancelQueries();
      if (current.current !== previous) return;
      // Resolving the initial guest must not remount a public form being filled in.
      if (previous.identity === undefined && identity === "guest" && !reset) {
        previous.client.setQueryData(sessionKey(apiBaseUrl), session);
        const next = { ...previous, identity };
        current.current = next;
        setState(next);
        return;
      }
      // A new client isolates old requests and mutations after an identity switch.
      const client = makeClient();
      client.setQueryData(sessionKey(apiBaseUrl), session);
      const next = {
        client,
        identity,
        guestKey: previous.identity === undefined ? previous.guestKey : getCartKey(true),
        generation: previous.generation + 1,
      };
      current.current = next;
      previous.client.clear();
      setState(next);
    },
    [apiBaseUrl],
  );
  return (
    <QueryClientProvider key={state.generation} client={state.client}>
      <HostSession state={state} apiBaseUrl={apiBaseUrl} onSession={onSession}>
        {children}
      </HostSession>
    </QueryClientProvider>
  );
}

function HostSession({
  state,
  apiBaseUrl,
  onSession,
  children,
}: {
  state: HostState;
  apiBaseUrl: string;
  onSession: HostContext["onSession"];
  children: ReactNode;
}) {
  const session = useSession(apiBaseUrl);
  const actualIdentity = session.data?.user?.id ?? "guest";
  const ready = session.isSuccess && state.identity === actualIdentity;
  useEffect(() => {
    if (session.isSuccess && !ready) void onSession(session.data, false, state.client);
  }, [session.isSuccess, session.data, ready, onSession, state.client]);

  async function refreshSession() {
    state.client.removeQueries({ queryKey: ["cart"] });
    await state.client.resetQueries(
      { queryKey: sessionKey(apiBaseUrl), exact: true },
      { throwOnError: true },
    );
    const confirmed = state.client.getQueryData<Session>(sessionKey(apiBaseUrl));
    // Also rotate a guest key consumed by a login in another tab.
    if (confirmed) await onSession(confirmed, true, state.client);
  }
  return (
    <Host.Provider
      value={{
        ...state,
        apiBaseUrl,
        onSession,
        refreshSession,
        user: ready ? session.data.user : null,
        status: session.isError ? "error" : ready ? "ready" : "pending",
        error: session.error,
        retrySession: () => {
          void session.refetch();
        },
      }}
    >
      {children}
    </Host.Provider>
  );
}
