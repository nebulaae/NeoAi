import axios from 'axios';

// Эндпоинты, которые НЕ требуют авторизационных заголовков
// (X-Init-Data, Authorization Bearer)
const AUTH_FREE_PATHS = [
  '/api/auth/create/email',
  '/api/auth/login/email',
  '/api/auth/tma',
  '/api/auth/telegram',
];

function isAuthFreePath(url?: string): boolean {
  if (!url) return false;
  return AUTH_FREE_PATHS.some((p) => url.includes(p));
}

// Приоритет источников user_id:
// 1. auth_user_id (выставляется при любом логине — Telegram, MAX, email)
// 2. JWT decode (fallback)
// 3. tg_user в sessionStorage
function getUserId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Универсальный user_id (выставляется AuthProvider при любом логине)
    const stored = localStorage.getItem('auth_user_id');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    // 2. JWT Bearer token
    const token = localStorage.getItem('auth_token');
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64));
        const id = decoded?.user?.id ?? decoded?.id ?? decoded?.user_id ?? null;
        if (id) return id;
      }
    }

    // 3. Telegram TMA sessionStorage
    const tgUser = sessionStorage.getItem('tg_user');
    if (tgUser) {
      const user = JSON.parse(tgUser);
      if (user?.id) return user.id;
    }
  } catch {}
  return null;
}

function getBotId(): string | undefined {
  return process.env.NEXT_PUBLIC_BOT_ID;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const url = config.url || '';
    const isFree = isAuthFreePath(url);

    if (!isFree) {
      // Bearer токен
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // X-Init-Data для TMA авторизации (если нет Bearer и не в auth-эндпоинте)
      const tg = (window as any)?.Telegram?.WebApp;
      if (!token && tg?.initData) {
        config.headers['X-Init-Data'] = tg.initData;
      }
    }

    const botId = getBotId();
    const userId = getUserId();

    // Добавляем bot_id только если его ещё нет в params
    config.params = config.params || {};
    if (botId && !config.params.bot_id) {
      config.params.bot_id = botId;
    }
    if (userId && !config.params.user_id) {
      config.params.user_id = userId;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // Не редиректим на /login при ошибках на auth-эндпоинтах
    if (error.response?.status === 401 && !isAuthFreePath(url)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('session_data');
      localStorage.removeItem('session_hash');
      localStorage.removeItem('session_user');
      localStorage.removeItem('auth_user_id');
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
