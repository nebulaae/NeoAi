'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const QueryProvider = ({ children }: any) => {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
