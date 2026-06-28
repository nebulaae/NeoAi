import axios from 'axios';
import { getAppSource } from '@/lib/source';
import { getPlatformInitData } from './platform';
import { newRequestId, logEvent } from '@/lib/telemetry';

const AUTH_FREE_PATHS = [
  '/api/auth/create/email',
  '/api/auth/login/email',
  '/api/auth/tma',
  '/api/auth/telegram',
  '/api/bot',
  '/api/posts',
];

function isAuthFreePath(url?: string): boolean {
  if (!url) return false;
  if (
    url.includes('/api/posts/publish') ||
    url.includes('/api/posts/like') ||
    url.includes('/api/posts/comment') ||
    url.includes('/api/posts/all')
  ) {
    return false;
  }
  return AUTH_FREE_PATHS.some((p) => url.includes(p));
}

function getUserId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('auth_user_id');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    const token = localStorage.getItem('auth_token');
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64));
        return decoded?.user?.id ?? decoded?.id ?? decoded?.user_id ?? null;
      }
    }

    const tgUser = sessionStorage.getItem('tg_user');
    if (tgUser) {
      const user = JSON.parse(tgUser);
      if (user?.id) return user.id;
    }
  } catch {}

  return null;
}

function getBotId(): number | string | undefined {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_BOT_ID;

  try {
    const raw = localStorage.getItem('bot_info');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.bot_id) return parsed.bot_id;
    }
  } catch {}

  return process.env.NEXT_PUBLIC_BOT_ID;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Защита от «зависших» запросов: без таймаута упавшая сеть держит UI
  // в состоянии загрузки бесконечно (одна из причин ощущения «приложение зависло»).
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;

  const url = config.url || '';
  const isFree = isAuthFreePath(url);

  // Сквозной request_id для трассировки: уходит на бекенд и попадает в логи.
  const requestId = newRequestId();
  config.headers['X-Request-Id'] = requestId;
  (config as any).metadata = { requestId, startedAt: Date.now() };

  if (!isFree) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    const initData = getPlatformInitData();
    if (initData) {
      config.headers['X-Init-Data'] = initData;
    }
  }

  const botId = getBotId();
  const userId = getUserId();
  const source = getAppSource();

  config.params = config.params || {};

  const skipUserId = config.params.skipUserId;

  // 8782963451 - конкретное айди для прогрузки трендов в дев режиме

  if (botId && !config.params.bot_id) {
    config.params.bot_id = 8782963451;
  }

  if (userId && !skipUserId && !config.params.user_id) {
    config.params.user_id = userId;
  }

  if (source) {
    config.params.source = source;
  }

  if (config.params.skipUserId) {
    delete config.params.skipUserId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const meta = (response.config as any)?.metadata;
    if (meta) {
      const ms = Date.now() - meta.startedAt;
      // Логируем только заметно медленные ответы, чтобы не засорять консоль.
      if (ms > 1500) {
        logEvent({
          level: 'warn',
          scope: 'api',
          msg: 'slow_response',
          request_id: meta.requestId,
          url: response.config.url,
          status: response.status,
          ms,
        });
      }
    }
    return response;
  },
  (error) => {
    const url = error.config?.url || '';
    const meta = (error.config as any)?.metadata;

    logEvent({
      level: 'error',
      scope: 'api',
      msg: 'request_failed',
      request_id: meta?.requestId,
      url,
      method: error.config?.method,
      status: error.response?.status ?? null,
      code: error.code ?? null,
      ms: meta ? Date.now() - meta.startedAt : null,
      error: error.message,
    });

    if (error.response?.status === 401 && !isAuthFreePath(url)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('session_data');
      localStorage.removeItem('session_hash');
      localStorage.removeItem('session_user');
      localStorage.removeItem('auth_user_id');
      sessionStorage.removeItem('tg_user');
    }

    return Promise.reject(error);
  }
);

export default api;
