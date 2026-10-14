import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { logout as endSession } from "../../entities/session";
import { useHost } from "../providers/host-provider";

export function useLogout() {
  const host = useHost();
  const navigate = useNavigate();
  return useMutation({
    retry: false,
    mutationFn: () => endSession(host.apiBaseUrl),
    onSuccess: async () => {
      await host.onSession({ user: null });
      navigate("/", { replace: true });
    },
  });
}
