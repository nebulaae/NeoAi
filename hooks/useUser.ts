import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getUserAnalyticsParams } from '@/lib/platform';

export interface User {
  user_id: number;
  username?: string;
  name?: string;
  tokens: number;
  balance?: number;
  total_rewards?: number; // всего заработано
  total_withdrawals?: number; // всего выведено
  lang?: string;
  premium?: boolean;
  premium_end?: number;
  tg_premium?: boolean;
}

export const useUser = () => {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: async (): Promise<{ user: User }> => {
      // name, username, tg_premium, lang (+ inviter при реферальном переходе)
      // нужны для аналитики на бэкенде
      const { data } = await api.get('/api/user', {
        params: getUserAnalyticsParams(),
      });
      return data;
    },
    staleTime: 30_000,
  });
};
