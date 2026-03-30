import axios from 'axios';

function getUserId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem('tg_user');
    if (stored) {
      const user = JSON.parse(stored);
      return user?.id ?? null;
    }
    const token = localStorage.getItem('auth_token');
    if (token) {
      const base64 = token.split('.')[1];
      if (base64) {
        const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
        const decoded = JSON.parse(json);
        return decoded?.user?.id ?? null;
      }
    }
  } catch { }
  return null;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const tg = (window as any)?.Telegram?.WebApp;
    if (!token && tg?.initData) {
      config.headers['X-Init-Data'] = tg.initData;
    }

    const botId = process.env.NEXT_PUBLIC_BOT_ID;
    const userId = getUserId();

    config.params = {
      ...config.params,
      bot_id: botId,
      ...(userId ? { user_id: userId } : {}),
    };
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('tg_user');
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.includes('/login')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;