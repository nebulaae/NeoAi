import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Вывод средств. Все роуты с префиксом /api. bot_id и user_id (или max_id)
 * автоматически добавляются интерсептором в lib/api.ts — здесь их не передаём.
 */

/**
 * Бекенд оборачивает успешные ответы в конверт { success, data: {...} }.
 * Ошибки приходят плоскими ({ success:false, error }). Разворачиваем оба вида:
 * если есть вложенный data — берём его, иначе исходный объект.
 */
function unwrap<T = any>(raw: any): T {
  return (raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw) as T;
}

export type WithdrawalStatus =
  | 'pending'
  | 'canceled'
  | 'completed'
  | 'declined';

export type WithdrawalType = 'rub' | 'crypto';

export interface WithdrawalTypeOption {
  type: WithdrawalType;
  fee_percent: number;
}

export interface WithdrawalMinAmountData {
  min_withdraw_amount: number;
  withdrawal_types: WithdrawalTypeOption[];
}

export interface Withdrawal {
  id: number;
  bot_id: number;
  user_id: number;
  amount: number;
  amount_without_fee: number;
  fee: number;
  type: WithdrawalType;
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
      const body = unwrap(data);
      if (!body.success) throw new Error(body.error || 'Failed');
      return {
        min_withdraw_amount: body.min_withdraw_amount as number,
        withdrawal_types: (body.withdrawal_types || []) as WithdrawalTypeOption[],
      } as WithdrawalMinAmountData;
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
      const body = unwrap(data);
      if (!body.success) throw new Error(body.error || 'Failed');
      return (body.items || []) as Withdrawal[];
    },
  });
};

// POST /api/withdrawal — создать запрос на вывод
export const useCreateWithdrawal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      amount: number;
      type: WithdrawalType;
      requisites?: string;
      notes?: string;
    }) => {
      const { data } = await api.post('/api/withdrawal', payload);
      const body = unwrap(data);
      if (!body.success) {
        // Бекенд возвращает {success:false, error} при недостатке средств /
        // сумме меньше минимума — пробрасываем текст ошибки.
        const err = new Error(body.error || 'Withdrawal failed') as Error & {
          apiError?: string;
        };
        err.apiError = body.error;
        throw err;
      }
      return body as {
        success: true;
        id: number;
        status: WithdrawalStatus;
        type: WithdrawalType;
        amount: number;
        amount_without_fee: number;
        fee: number;
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
      const body = unwrap(data);
      if (!body.success) {
        const err = new Error(body.error || 'Cancel failed') as Error & {
          apiError?: string;
        };
        err.apiError = body.error;
        throw err;
      }
      return body as {
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
