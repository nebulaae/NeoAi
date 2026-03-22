import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

// --- File upload (supports iPhone .heic) ---
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

// --- Chat history with auto-polling while processing ---
export const useChatHistory = (dialogueId: string | null) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.chatHistory(dialogueId!),
    queryFn: async () => {
      const { data } = await api.get('/api/history', {
        params: { dialogue_id: dialogueId },
      });
      return data.messages || [];
    },
    enabled: !!dialogueId,
    refetchInterval: (query) => {
      const msgs: any[] = query.state.data || [];
      const isProcessing = msgs.some((m) => m.status === 'processing');
      if (isProcessing) return 2000;

      // When all done, refresh user tokens
      if (msgs.length > 0 && !isProcessing) {
        const wasProcessing = msgs.some((m) => m._wasProcessing);
        if (wasProcessing) {
          queryClient.invalidateQueries({ queryKey: queryKeys.user });
        }
      }
      return false;
    },
  });
};

// --- UI blocks (trends, recommendations) ---
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

// --- Dashboard / gallery ---
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

// --- Referral system ---
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

// --- Payment link ---
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

// --- Like a post ---
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
