import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { sessionKey } from "@microfronts/contracts";
import { authenticate, logout } from "./session-api";
import type { Session } from "../model/session";

export const sessionMutations = {
  authenticate: (api: string, mode: "login" | "register", client: QueryClient) =>
    mutationOptions({
      mutationKey: ["session", api, mode],
      mutationFn: (fields: { email: string; password: string; name?: string }) =>
        authenticate(api, mode, fields),
      retry: false,
      onMutate: () => client.cancelQueries({ queryKey: sessionKey(api), exact: true }),
      onSuccess: async (session: Session) => {
        // A /me refetch started during login must not overwrite its result.
        await client.cancelQueries({ queryKey: sessionKey(api), exact: true });
        client.setQueryData(sessionKey(api), session);
      },
      onError: () => {
        void client.invalidateQueries({ queryKey: sessionKey(api), exact: true });
      },
    }),
  logout: (api: string, client: QueryClient) => mutationOptions({
    mutationKey: ["session", api, "logout"],
    mutationFn: () => logout(api),
    retry: false,
    onMutate: () => client.cancelQueries({ queryKey: sessionKey(api), exact: true }),
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: sessionKey(api), exact: true });
      client.setQueryData<Session>(sessionKey(api), { user: null });
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: sessionKey(api), exact: true });
    },
  }),
};
