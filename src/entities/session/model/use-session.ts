import { useQuery } from "@tanstack/react-query";
import { sessionKey } from "@microfronts/contracts";
import { authRequest } from "../api/auth-request";

export function useSession(apiBaseUrl: string) {
  return useQuery({
    queryKey: sessionKey(apiBaseUrl),
    queryFn: ({ signal }) => authRequest(apiBaseUrl, "me", { signal }),
    staleTime: 0,
    retry: false,
  });
}
