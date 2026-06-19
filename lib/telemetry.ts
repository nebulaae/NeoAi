/**
 * Лёгкая структурированная телеметрия для фронтенда.
 *
 * Цель: при следующем инциденте можно было за минуты понять причину по логам.
 * Каждое событие несёт session_id (стабильный на вкладку) и request_id
 * (уникальный на операцию), уровень, область (scope) и произвольные поля.
 *
 * Сейчас вывод идёт в console в виде одной JSON-строки на событие
 * (легко грепать и парсить). Когда появится бекенд-приёмник логов —
 * достаточно реализовать flush() ниже, формат событий менять не нужно.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SESSION_KEY = 'neo_session_id';

function genId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** Стабильный идентификатор сессии (на вкладку). */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = genId('s');
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'nostorage';
  }
}

/** Уникальный id отдельной операции (запрос, загрузка медиа, попытка авторизации). */
export function newRequestId(): string {
  return genId('r');
}

export interface LogEvent {
  level: LogLevel;
  scope: string;
  msg: string;
  [key: string]: unknown;
}

export function logEvent(event: LogEvent): void {
  const enriched = {
    ts: new Date().toISOString(),
    session_id: getSessionId(),
    source: typeof window !== 'undefined' ? window.location.pathname : 'ssr',
    ...event,
  };

  // Единый JSON-лог — удобно фильтровать в консоли / eruda / при экспорте.
  try {
    const line = JSON.stringify(enriched);
    if (event.level === 'error') console.error('[neo]', line);
    else if (event.level === 'warn') console.warn('[neo]', line);
    else console.log('[neo]', line);
  } catch {
    // Циклические структуры и т.п. — не роняем приложение из-за логирования
    console.log('[neo]', event.scope, event.msg);
  }
}

export const telemetry = {
  /** Загрузка/доступность медиа (preview, fullscreen, генерация). */
  media(msg: string, fields: Record<string, unknown> = {}): void {
    logEvent({ level: 'info', scope: 'media', msg, ...fields });
  },
  mediaError(msg: string, fields: Record<string, unknown> = {}): void {
    logEvent({ level: 'error', scope: 'media', msg, ...fields });
  },
  /** Авторизация (tma / telegram / max / email). */
  auth(msg: string, fields: Record<string, unknown> = {}): void {
    logEvent({ level: 'info', scope: 'auth', msg, ...fields });
  },
  authError(msg: string, fields: Record<string, unknown> = {}): void {
    logEvent({ level: 'error', scope: 'auth', msg, ...fields });
  },
  /** Загрузка файлов (upload). */
  upload(msg: string, fields: Record<string, unknown> = {}): void {
    logEvent({ level: 'info', scope: 'upload', msg, ...fields });
  },
  uploadError(msg: string, fields: Record<string, unknown> = {}): void {
    logEvent({ level: 'error', scope: 'upload', msg, ...fields });
  },
};
