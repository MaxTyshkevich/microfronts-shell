import { useQuery } from "@tanstack/react-query";
import { sessionKey, type User } from "@microfronts/contracts";
import { getSession } from "../api/auth-request";

export type UserRole = "USER" | "ADMIN";
export interface SessionUser extends User {
  role: UserRole;
}
export interface Session {
  user: SessionUser | null;
}

export function useSession(api: string) {
  return useQuery({
    queryKey: sessionKey(api),
    queryFn: ({ signal }) => getSession(api, signal),
    staleTime: 30000,
    retry: false,
  });
}
