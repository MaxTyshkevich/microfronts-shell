import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { sessionMutations } from "../../entities/session";
import { config } from "../config/config";

export function useLogout() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const options = sessionMutations.logout(config.apiBaseUrl, client);
  return useMutation({
    ...options,
    onSuccess: async (...args) => {
      await options.onSuccess?.(...args);
      // Commit the route before RequireAuth can redirect the signed-out user.
      await navigate("/", { replace: true, flushSync: true });
    },
  });
}
