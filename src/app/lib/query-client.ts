import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30000, retry: false },
      mutations: { retry: false },
    },
  });
}
