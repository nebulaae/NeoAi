'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Базовый staleTime: при возврате на уже посещённый экран данные
      // берутся из кэша вместо повторного запроса (меньше «водопада»
      // запросов и подвисаний UI). Запросы, которым нужна свежесть
      // (история чата, статус генерации), переопределяют это локально.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

export const QueryProvider = ({ children }: any) => {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
