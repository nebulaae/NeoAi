'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { AuthContext, TelegramUser } from '@/hooks/useAuth';
import { useBot } from './BotProvider';

export interface AuthUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: number;
  name?: string;
  email?: string;
  auth_method?: 'telegram' | 'max' | 'email' | 'session';
}

type AuthPayload = {
  id?: number;
  user_id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: number;
  name?: string;
  user?: AuthPayload;
};

function decodeJwtPayload(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64)) as AuthPayload;
}

function normalizeAuthUser(u?: AuthPayload | null): TelegramUser | null {
  const userId = u?.id ?? u?.user_id;
  if (typeof userId !== 'number') return null;
  const authUser = u as AuthPayload;

  return {
    id: userId,
    first_name: authUser.first_name || authUser.name || 'User',
    last_name: authUser.last_name,
    username: authUser.username,
    photo_url: authUser.photo_url,
    auth_date: authUser.auth_date || 0,
  };
}

function parseTelegramAuthResult(): TelegramUser | null {
  if (typeof window === 'undefined') return null;
  if (!window.location.hash.includes('tgAuthResult')) return null;

  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const tgAuthResult = hashParams.get('tgAuthResult');
  if (!tgAuthResult) return null;

  const normalized = tgAuthResult
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(tgAuthResult.length / 4) * 4, '=');

  return JSON.parse(atob(normalized)) as TelegramUser;
}

function getInitialAuthUser(): TelegramUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const decoded = decodeJwtPayload(token);
      const authUser = normalizeAuthUser(decoded?.user || decoded);
      if (authUser) {
        localStorage.setItem('auth_user_id', String(authUser.id));
        return authUser;
      }
    }

    const sessionUser = localStorage.getItem('session_user');
    if (sessionUser) {
      const authUser = normalizeAuthUser(
        JSON.parse(sessionUser) as AuthPayload
      );
      if (authUser) {
        localStorage.setItem('auth_user_id', String(authUser.id));
        return authUser;
      }
    }

    const tgUser = sessionStorage.getItem('tg_user');
    if (tgUser) {
      const authUser = normalizeAuthUser(JSON.parse(tgUser) as AuthPayload);
      if (authUser) {
        localStorage.setItem('auth_user_id', String(authUser.id));
        return authUser;
      }
    }
  } catch (e) {
    console.error('AuthProvider init error', e);
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { bot } = useBot();
  const [user, setUser] = useState<TelegramUser | null>(getInitialAuthUser);
  const isLoading = false;
  const telegramAuthInFlight = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const ref = searchParams.get('ref');
      if (ref) {
        localStorage.setItem('pending_referrer_id', ref);
      }
    } catch (e) {
      console.error('Error capturing ref parameter in AuthProvider:', e);
    }
  }, []);

  const login = useCallback((u: TelegramUser) => {
    localStorage.setItem('auth_user_id', String(u.id));
    setUser(u);
  }, []);

  const getFallbackBotId = useCallback(() => {
    if (bot?.bot_id) return bot.bot_id;

    try {
      const raw = localStorage.getItem('bot_info');
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored?.bot_id) return stored.bot_id;
      }
    } catch {}

    return process.env.NEXT_PUBLIC_BOT_ID;
  }, [bot]);

  const completeTelegramOAuth = useCallback(
    async (telegramUser: TelegramUser) => {
      if (!telegramUser?.id || telegramAuthInFlight.current) return;

      telegramAuthInFlight.current = true;
      try {
        const referrerId = localStorage.getItem('pending_referrer_id');
        const { data } = await api.post('/api/auth/telegram', {
          ...telegramUser,
          bot_id: getFallbackBotId(),
          ...(referrerId
            ? { referrer_id: Number(referrerId), ref: Number(referrerId) }
            : {}),
        });

        localStorage.setItem('auth_token', data.token);
        if (data.user?.id) {
          localStorage.setItem('auth_user_id', String(data.user.id));
        }

        localStorage.removeItem('pending_referrer_id');
        login(data.user);
        window.location.replace('/');
      } catch (err) {
        console.error('Telegram OAuth login error', err);
        telegramAuthInFlight.current = false;
      }
    },
    [getFallbackBotId, login]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const telegramUser = parseTelegramAuthResult();
      if (!telegramUser) return;

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'TELEGRAM_AUTH_SUCCESS', data: telegramUser },
          '*'
        );
        window.close();
        return;
      }

      history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
      queueMicrotask(() => completeTelegramOAuth(telegramUser));
    } catch (err) {
      console.error('Telegram OAuth result parse error', err);
    }
  }, [completeTelegramOAuth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const allowedOrigins = new Set([
      window.location.origin,
      window.location.origin.replace('://www.', '://'),
    ]);

    try {
      const currentUrl = new URL(window.location.origin);
      if (!currentUrl.hostname.startsWith('www.')) {
        currentUrl.hostname = `www.${currentUrl.hostname}`;
        allowedOrigins.add(currentUrl.origin);
      }
    } catch {}

    const handleMessage = (event: MessageEvent) => {
      if (!allowedOrigins.has(event.origin)) return;

      const eventData = (
        event.data?.type === 'TELEGRAM_AUTH_SUCCESS'
          ? event.data.data
          : event.data
      ) as TelegramUser | undefined;

      if (!eventData?.id) return;
      completeTelegramOAuth(eventData);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [completeTelegramOAuth]);

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_data');
    localStorage.removeItem('session_hash');
    localStorage.removeItem('session_user');
    localStorage.removeItem('auth_user_id');
    sessionStorage.removeItem('tg_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
