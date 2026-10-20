import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authenticate, sessionKey, type Session } from "../../../entities/session";
import type { AuthFields, AuthMode } from "./auth-schema";

export function useAuthentication({ api, mode, guestKey, onSession, returnTo }: {
  api: string;
  mode: AuthMode;
  guestKey: string;
  onSession: (session: Session) => Promise<void>;
  returnTo: string;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    retry: false,
    mutationFn: async (fields: AuthFields) => {
      // A delayed anonymous /me response must not overwrite a successful login.
      await queryClient.cancelQueries({ queryKey: sessionKey(api), exact: true });
      try {
        return await authenticate(api, mode, fields, guestKey);
      } catch (error) {
        void queryClient.invalidateQueries({ queryKey: sessionKey(api), exact: true });
        throw error;
      }
    },
    onSuccess: async (session) => {
      await onSession(session);
      navigate(returnTo, { replace: true });
    },
  });
}
