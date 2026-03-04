import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api, GeneratePayload } from '../lib/api';

// Query keys
export const queryKeys = {
    models: ['models'] as const,
    params: (techName: string, version?: string) => ['params', techName, version] as const,
    user: ['user'] as const,
    chats: ['chats'] as const,
    history: (dialogueId: string) => ['history', dialogueId] as const,
    requests: ['requests'] as const,
    roles: ['roles'] as const,
    dashboard: ['dashboard'] as const,
    recommendations: ['ui', 'recommendations'] as const,
    trends: ['ui', 'trends'] as const,
    referrals: (period: string, level: string) => ['referrals', period, level] as const,
    botInfo: ['bot-info'] as const,
    paymentLink: ['payment-link'] as const,
};

// Models
export function useModels() {
    return useQuery({
        queryKey: queryKeys.models,
        queryFn: () => api.getModels(),
        staleTime: 5 * 60 * 1000,
    });
}

// Params
export function useParams(techName: string, version?: string) {
    return useQuery({
        queryKey: queryKeys.params(techName, version),
        queryFn: () => api.getParams(techName, version),
        enabled: !!techName,
        staleTime: 2 * 60 * 1000,
    });
}

// User
export function useUser() {
    return useQuery({
        queryKey: queryKeys.user,
        queryFn: () => api.getUser(),
        staleTime: 30 * 1000,
    });
}

// Chats (infinite)
export function useChats() {
    return useInfiniteQuery({
        queryKey: queryKeys.chats,
        queryFn: ({ pageParam = 0 }) => api.getChats(20, pageParam as number),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.flatMap(p => p.chats || []).length;
            return (lastPage.chats?.length ?? 0) >= 20 ? loaded : undefined;
        },
    });
}

// Chat history
export function useChatHistory(dialogueId: string) {
    return useQuery({
        queryKey: queryKeys.history(dialogueId),
        queryFn: () => api.getHistory(dialogueId),
        enabled: !!dialogueId,
    });
}

// Requests / Generations (infinite)
export function useRequests() {
    return useInfiniteQuery({
        queryKey: queryKeys.requests,
        queryFn: ({ pageParam = 0 }) => api.getRequests(20, pageParam as number),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.flatMap(p => p.requests || []).length;
            return (lastPage.requests?.length ?? 0) >= 20 ? loaded : undefined;
        },
    });
}

// Roles
export function useRoles() {
    return useQuery({
        queryKey: queryKeys.roles,
        queryFn: () => api.getRoles(),
        staleTime: 10 * 60 * 1000,
    });
}

// Dashboard
export function useDashboard() {
    return useQuery({
        queryKey: queryKeys.dashboard,
        queryFn: () => api.getDashboard(),
        staleTime: 2 * 60 * 1000,
    });
}

// UI blocks
export function useRecommendations() {
    return useQuery({
        queryKey: queryKeys.recommendations,
        queryFn: () => api.getUI('recommendations'),
        staleTime: 5 * 60 * 1000,
    });
}

export function useTrends() {
    return useQuery({
        queryKey: queryKeys.trends,
        queryFn: () => api.getUI('trends'),
        staleTime: 5 * 60 * 1000,
    });
}

// Referrals
export function useReferrals(period = 'all', level = 'all') {
    return useQuery({
        queryKey: queryKeys.referrals(period, level),
        queryFn: () => api.getReferrals(period, level),
        staleTime: 1 * 60 * 1000,
    });
}

// Bot info
export function useBotInfo() {
    return useQuery({
        queryKey: queryKeys.botInfo,
        queryFn: () => api.getBotInfo(),
        staleTime: 30 * 60 * 1000,
    });
}

// Payment link
export function usePaymentLink() {
    return useQuery({
        queryKey: queryKeys.paymentLink,
        queryFn: () => api.getPaymentLink(),
        staleTime: 10 * 60 * 1000,
    });
}

// Mutations
export function useGenerate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: GeneratePayload) => api.generate(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.user });
        },
    });
}

export function useSetChatTitle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ dialogueId, title }: { dialogueId: string; title: string }) =>
            api.setChatTitle(dialogueId, title),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.chats });
        },
    });
}

export function useLikePost() {
    return useMutation({
        mutationFn: (postId: string) => api.likePost(postId),
    });
}

export function useUploadFile() {
    return useMutation({
        mutationFn: (file: File) => api.uploadFile(file),
    });
}