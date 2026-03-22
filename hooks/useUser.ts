import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface User {
  user_id: number;
  username?: string;
  name?: string;
  tokens: number;
  balance?: number;
  lang?: string;
  premium?: boolean;
  premium_end?: number;
  tg_premium?: boolean;
}

export const useUser = () => {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: async (): Promise<{ user: User }> => {
      const { data } = await api.get('/api/user');
      return data;
    },
    staleTime: 30_000,
  });
};
