import { QueryClient } from "@tanstack/react-query";

export const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30000, retry: false },
      mutations: { retry: false },
    },
  });
