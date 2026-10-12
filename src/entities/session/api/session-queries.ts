import { queryOptions, useQuery } from "@tanstack/react-query";
import { sessionKey } from "@microfronts/contracts";
import { getSession } from "./auth-request";

export const sessionQueries = {
  current: (api: string) => queryOptions({
    queryKey: sessionKey(api),
    queryFn: ({ signal }) => getSession(api, signal),
    staleTime: 30000,
    retry: false,
  }),
};

export function useSession(api: string) {
  return useQuery(sessionQueries.current(api));
}
