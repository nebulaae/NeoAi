import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Вывод средств. Все роуты с префиксом /api. bot_id и user_id (или max_id)
 * автоматически добавляются интерсептором в lib/api.ts — здесь их не передаём.
 */

export type WithdrawalStatus =
  | 'pending'
  | 'canceled'
  | 'completed'
  | 'declined';

export interface Withdrawal {
  id: number;
  bot_id: number;
  user_id: number;
  amount: number;
  status: WithdrawalStatus;
  requisites: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// GET /api/withdrawal/min-amount
export const useMinWithdrawAmount = () => {
  return useQuery({
    queryKey: queryKeys.withdrawalMin,
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawal/min-amount');
      if (!data.success) throw new Error(data.error || 'Failed');
      return data.min_withdraw_amount as number;
    },
    staleTime: 5 * 60_000,
  });
};

// GET /api/withdrawal  (опциональный фильтр по статусу: "pending,completed")
export const useWithdrawals = (status?: string) => {
  return useQuery({
    queryKey: queryKeys.withdrawals(status),
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawal', {
        params: status ? { status } : {},
      });
      if (!data.success) throw new Error(data.error || 'Failed');
      return (data.items || []) as Withdrawal[];
    },
  });
};

// POST /api/withdrawal — создать запрос на вывод
export const useCreateWithdrawal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      amount: number;
      requisites?: string;
      notes?: string;
    }) => {
      const { data } = await api.post('/api/withdrawal', payload);
      if (!data.success) {
        // Бекенд возвращает {success:false, error} при недостатке средств /
        // сумме меньше минимума — пробрасываем текст ошибки.
        const err = new Error(data.error || 'Withdrawal failed') as Error & {
          apiError?: string;
        };
        err.apiError = data.error;
        throw err;
      }
      return data as {
        success: true;
        id: number;
        status: WithdrawalStatus;
        amount: number;
        requisites: string | null;
        notes: string | null;
        balance: number;
      };
    },
    onSuccess: () => {
      // Баланс и список выводов изменились.
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: ['withdrawal'] });
    },
  });
};

// POST /api/withdrawal/cancel — отменить (только pending), сумма вернётся в баланс
export const useCancelWithdrawal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post('/api/withdrawal/cancel', null, {
        params: { id },
      });
      if (!data.success) {
        const err = new Error(data.error || 'Cancel failed') as Error & {
          apiError?: string;
        };
        err.apiError = data.error;
        throw err;
      }
      return data as {
        success: true;
        id: number;
        status: WithdrawalStatus;
        balance: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: ['withdrawal'] });
    },
  });
};
