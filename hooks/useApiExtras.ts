import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export const useUpload = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!data.success) throw new Error(data.error || 'Upload failed');
      return data as { success: true; url: string; type: string };
    },
  });
};

// Polling каждые 2 сек пока есть хоть одно processing сообщение
export const useChatHistory = (dialogueId: string | null) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.chatHistory(dialogueId!),
    queryFn: async () => {
      const { data } = await api.get('/api/history', {
        params: { dialogue_id: dialogueId },
      });
      return (data.messages || []) as any[];
    },
    enabled: !!dialogueId,
    refetchInterval: (query) => {
      const msgs: any[] = query.state.data || [];
      const isProcessing = msgs.some((m) => m.status === 'processing');
      if (isProcessing) {
        // Инвалидируем токены когда всё завершится
        return 2000;
      }
      // Если был processing а теперь нет — обновляем баланс
      return false;
    },
    // После успешного обновления проверяем — если processing исчез, обновляем юзера
    select: (msgs: any[]) => {
      return msgs;
    },
  });
};

// Отдельный хук для одного запроса с polling — для Generate страницы
export const useGenerationStatus = (dialogueId: string | null, enabled: boolean) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...queryKeys.chatHistory(dialogueId!), 'status'],
    queryFn: async () => {
      const { data } = await api.get('/api/history', {
        params: { dialogue_id: dialogueId, limit: 1, offset: 0 },
      });
      const msgs: any[] = data.messages || [];
      const last = msgs[msgs.length - 1];
      return last || null;
    },
    enabled: !!dialogueId && enabled,
    refetchInterval: (query) => {
      const last = query.state.data;
      if (!last) return 2000;
      if (last.status === 'processing') return 2000;
      // Завершилось — обновляем данные
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatHistory(dialogueId!) });
      return false;
    },
  });
};

export const useUI = (blockName: string) => {
  return useQuery({
    queryKey: queryKeys.ui(blockName),
    queryFn: async () => {
      const { data } = await api.get(`/api/ui/${blockName}`);
      return data.content || [];
    },
    staleTime: 5 * 60_000,
  });
};

export const useDashboard = () => {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const { data } = await api.get('/api/dashboard');
      return data.posts || [];
    },
    staleTime: 60_000,
  });
};

export const useReferrals = (period = 'all', level = 'all') => {
  return useQuery({
    queryKey: queryKeys.referrals(period, level),
    queryFn: async () => {
      const { data } = await api.get('/api/referrals', {
        params: { period, level },
      });
      return data;
    },
  });
};

export const usePaymentLink = () => {
  return useQuery({
    queryKey: queryKeys.paymentLink,
    queryFn: async () => {
      const { data } = await api.get('/api/payment-link');
      if (!data.success) throw new Error(data.error);
      return data.url as string;
    },
    staleTime: 5 * 60_000,
  });
};

export const useLikePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string | number) => {
      const { data } = await api.post(`/api/like/${postId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};