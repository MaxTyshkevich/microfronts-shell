import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { sessionMutations } from "../../../entities/session";
import type { AuthMode } from "./auth-schema";

export function useAuthentication({ api, mode, returnTo }: {
  api: string;
  mode: AuthMode;
  returnTo: string;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const options = sessionMutations.authenticate(api, mode, queryClient);
  return useMutation({
    ...options,
    onSuccess: async (...args) => {
      await options.onSuccess?.(...args);
      navigate(returnTo, { replace: true });
    },
  });
}
