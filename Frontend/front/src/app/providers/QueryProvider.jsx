import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

export function QueryProvider({ children }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}