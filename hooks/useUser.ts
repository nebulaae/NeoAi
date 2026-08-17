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
    // Баланс — самое заметное число в интерфейсе, и «0» из-за упавшего запроса
    // читается пользователем как «списали все токены». Поэтому:
    //  • несколько ретраев с backoff — переживаем обрыв сети и гонку с тихим
    //    входом (первый запрос может уйти раньше, чем появится токен);
    //  • обновление при возврате в приложение и при восстановлении сети —
    //    после пополнения или переавторизации цифра подтягивается сама.
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
