import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sessionKey, type Session } from "../../entities/session";
import { getCartKey } from "../lib/guest-cart-key";
import { makeClient } from "./query-client";

interface HostState {
  client: QueryClient;
  guestKey: string;
  identity?: string;
  generation: number;
}
interface HostContext extends HostState {
  onSession: (session: Session, reset?: boolean, expectedClient?: QueryClient) => Promise<void>;
}
const Host = createContext<HostContext | null>(null);
export function useHost() {
  const host = useContext(Host);
  if (!host) throw new Error("HostProvider is required");
  return host;
}

export function HostProvider({ apiBaseUrl, children }: { apiBaseUrl: string; children: ReactNode }) {
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
      // New client separates even non-cancellable, already submitted mutations.
      const client = makeClient();
      client.setQueryData(sessionKey(apiBaseUrl), session);
      const next = {
        client,
        identity,
        generation: previous.generation + 1,
        guestKey: previous.identity === undefined ? previous.guestKey : getCartKey(true),
      };
      current.current = next;
      previous.client.clear();
      setState(next);
    },
    [apiBaseUrl],
  );
  return (
    <Host.Provider value={{ ...state, onSession }}>
      <QueryClientProvider key={state.generation} client={state.client}>
        {children}
      </QueryClientProvider>
    </Host.Provider>
  );
}
