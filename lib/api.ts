const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const BOT_ID = process.env.NEXT_PUBLIC_BOT_ID || '';

function getInitData(): string {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
        return (window as any).Telegram.WebApp.initData;
    }
    return '';
}

async function request<T>(endpoint: string, options: {
    method?: string;
    params?: Record<string, any>;
    body?: any;
} = {}): Promise<T> {
    const url = new URL(endpoint, BASE_URL || window.location.origin);
    url.searchParams.set('bot_id', BOT_ID);

    if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        });
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Init-Data': getInitData(),
    };

    const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
    };

    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url.toString(), fetchOptions);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

export const api = {
    getModels: () => request<{ success: boolean; categories: Record<string, Model[]> }>('/api/models'),

    getParams: (techName: string, version?: string) =>
        request<{ success: boolean; params: Param[]; limit_media: Record<string, number> }>('/api/params', {
            params: { tech_name: techName, version },
        }),

    getUser: () => request<{ success: boolean; user: User }>('/api/user'),

    getChats: (limit = 20, offset = 0) =>
        request<{ success: boolean; chats: Chat[] }>('/api/chats', {
            params: { limit, offset },
        }),

    getHistory: (dialogueId: string, limit = 50, offset = 0) =>
        request<{ success: boolean; messages: Message[] }>('/api/history', {
            params: { dialogue_id: dialogueId, limit, offset },
        }),

    getRequests: (limit = 20, offset = 0) =>
        request<{ success: boolean; requests: GenerationRequest[] }>('/api/requests', {
            params: { limit, offset },
        }),

    setChatTitle: (dialogueId: string, title: string) =>
        request<{ success: boolean }>('/api/chat/title', {
            method: 'POST',
            body: { dialogue_id: dialogueId, title },
        }),

    generate: (data: GeneratePayload) =>
        request<{ success: boolean; dialogue_id?: string; result?: any; status?: string; cost?: number; error?: string }>('/api/generate', {
            method: 'POST',
            body: data,
        }),

    getUI: (blockName: string) =>
        request<{ success: boolean; content: any[] }>(`/api/ui/${blockName}`),

    getRoles: () =>
        request<{ success: boolean; roles: Role[] }>('/api/roles'),

    getDashboard: () =>
        request<{ success: boolean; posts: Post[] }>('/api/dashboard'),

    likePost: (postId: string) =>
        request<{ success: boolean }>(`/api/like/${postId}`, { method: 'POST' }),

    getReferrals: (period = 'all', level = 'all', limit = 50, offset = 0) =>
        request<{ success: boolean; referrals: Referral[]; stats: ReferralStats; levelStats: any[]; hasMore: boolean }>('/api/referrals', {
            params: { period, level, limit, offset },
        }),

    getBotInfo: () =>
        request<{ success: boolean; bot: BotInfo }>('/api/bot-info'),

    getPaymentLink: () =>
        request<{ success: boolean; url: string }>('/api/payment-link'),

    uploadFile: async (file: File) => {
        const url = new URL('/api/upload', BASE_URL || window.location.origin);
        url.searchParams.set('bot_id', BOT_ID);

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'X-Init-Data': getInitData() },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Upload failed');
        return data as { success: boolean; url: string; type: string; format: string };
    },
};

// Types
export interface Model {
    tech_name: string;
    model_name: string;
    avatar?: string;
    input: string[];
    categories: string[];
    mainCategory?: string;
    versions: ModelVersion[];
}

export interface ModelVersion {
    label: string;
    cost: number;
    default?: boolean;
    limit_media?: Record<string, number>;
}

export interface Param {
    name: string;
    type: 'select' | 'input';
    values?: string[];
    default?: string;
    regex?: string;
}

export interface User {
    tokens: number;
    premium?: boolean;
    premium_end?: number;
}

export interface Chat {
    dialogue_id: string;
    model: string;
    version: string;
    title?: string;
    avatar?: string;
    last_activity?: string;
    started_at?: string;
}

export interface Message {
    inputs?: { text?: string; media?: any[] };
    result?: { text?: string; media?: any[] };
    status: 'completed' | 'processing' | 'error';
    cost?: number;
    error?: string;
    role_id?: number;
}

export interface GenerationRequest {
    model: string;
    version: string;
    status: 'completed' | 'processing' | 'error';
    cost: number;
    created_at: string;
}

export interface GeneratePayload {
    tech_name: string;
    version?: string;
    inputs: { text?: string | null; media?: any[] };
    params?: Record<string, any>;
    dialogue_id?: string;
    role_id?: number;
}

export interface Role {
    id: number;
    image?: string;
    label: Record<string, string> | string;
    description: Record<string, string> | string;
}

export interface Post {
    post_id: string;
    inputs: any;
    likes?: number;
}

export interface Referral {
    referral_id: string;
    tokens_reward: number;
    level: number;
    percent: number;
    created_at: string;
}

export interface ReferralStats {
    total_tokens: number;
    total_referrals: number;
    unique_referrals: number;
}

export interface BotInfo {
    bot_username: string;
    bot_name: string;
}