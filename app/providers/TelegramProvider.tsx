'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { getAppSource } from '@/lib/source';
import { waitForPlatformInitData } from '@/lib/platform';
import { markAuthSettled } from '@/lib/authState';
import { telemetry } from '@/lib/telemetry';

export const TelegramProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, login } = useAuth();
  const { bot } = useBot();
  const pathname = usePathname();
  const router = useRouter();
  const expanded = useRef(false);
  const attempted = useRef(false);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const doAuth = useCallback(
    async (botId: number) => {
      if (attempted.current) return;
      attempted.current = true;

      // Expand/ready сразу
      if (!expanded.current) {
        try {
          (window as any)?.Telegram?.WebApp?.ready?.();
          (window as any)?.Telegram?.WebApp?.expand?.();
        } catch {}
        expanded.current = true;
      }

      // Ждём initData — до 8 секунд
      const initData = await waitForPlatformInitData(8000);

      if (!initData) {
        telemetry.authError('tma_initdata_missing', {
          platform: 'telegram',
          attempt: retryCount.current + 1,
          max: MAX_RETRIES,
        });
        attempted.current = false;
        retryCount.current++;

        if (retryCount.current < MAX_RETRIES) {
          // Ретрай через 1 секунду
          retryTimeout.current = setTimeout(() => {
            doAuth(botId);
          }, 1000);
        } else {
          // Ретраи исчерпаны — снимаем «грейс» в AuthGuard, чтобы не висел лоадер.
          markAuthSettled();
        }
        return;
      }

      // Expand ещё раз после получения initData
      if (!expanded.current) {
        try {
          (window as any)?.Telegram?.WebApp?.ready?.();
          (window as any)?.Telegram?.WebApp?.expand?.();
        } catch {}
        expanded.current = true;
      }

      try {
        const referrerId = localStorage.getItem('pending_referrer_id');
        const { data } = await api.post(
          '/api/auth/tma',
          {
            initData,
            platform: 'telegram',
            bot_id: botId,
            ...(referrerId
              ? { referrer_id: Number(referrerId), ref: Number(referrerId) }
              : {}),
          },
          {
            headers: {
              'x-init-data': initData,
              'x-bot-id': String(botId),
              'x-platform': 'telegram',
            },
          }
        );
        localStorage.setItem('auth_token', data.token);
        if (data.user?.id) {
          localStorage.setItem('auth_user_id', String(data.user.id));
        }
        localStorage.removeItem('pending_referrer_id'); // Clear on successful login
        telemetry.auth('tma_success', { platform: 'telegram' });
        markAuthSettled();
        login(data.user);
      } catch (err) {
        telemetry.authError('tma_failed', {
          platform: 'telegram',
          attempt: retryCount.current + 1,
          status:
            (err as { response?: { status?: number } })?.response?.status ??
            null,
          error: (err as { message?: string })?.message,
        });
        attempted.current = false;
        retryCount.current++;

        if (retryCount.current < MAX_RETRIES) {
          retryTimeout.current = setTimeout(() => {
            doAuth(botId);
          }, 1500);
        } else {
          markAuthSettled();
        }
      }
    },
    [login]
  );

  useEffect(() => {
    const source = getAppSource();
    if (source !== 'tg') return;

    if (user) return;
    if (pathname?.includes('/login')) return;

    const token = localStorage.getItem('auth_token');
    if (token) return;

    if (!bot?.bot_id) return;

    doAuth(bot.bot_id);

    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, [pathname, user, bot, doAuth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only process start_param once per app lifetime in this session to prevent redirect loops when navigating back
    if (sessionStorage.getItem('start_param_processed')) return;

    const checkAndRedirect = () => {
      let startParam = '';

      // 1. Check window.Telegram.WebApp.initDataUnsafe
      try {
        const tg = (window as any)?.Telegram?.WebApp;
        if (tg?.initDataUnsafe?.start_param) {
          startParam = tg.initDataUnsafe.start_param;
        }
      } catch (e) {
        console.error('Error reading start_param from Telegram WebApp:', e);
      }

      // 2. Fallback: check query parameter tgWebAppStartParam
      if (!startParam) {
        try {
          const searchParams = new URLSearchParams(window.location.search);
          const urlParam = searchParams.get('tgWebAppStartParam');
          if (urlParam) {
            startParam = urlParam;
          }
        } catch (e) {
          console.error(
            'Error reading tgWebAppStartParam from search params:',
            e
          );
        }
      }

      if (startParam) {
        // Case 1: Post deep link (e.g. post-123, post-123_ref-456, post-123-ref-456)
        if (startParam.startsWith('post-')) {
          const match = startParam.match(/^post-(\d+)/);
          if (match) {
            const postId = match[1];
            sessionStorage.setItem('start_param_processed', 'true');

            // Also extract referrer if present in post parameter
            const refMatch = startParam.match(/[_-]ref-(\d+)/);
            if (refMatch) {
              const referrerId = refMatch[1];
              localStorage.setItem('pending_referrer_id', referrerId);
            }

            router.replace(`/trend/${postId}`);
          }
        }
        // Case 2: Pure referral link (e.g. start_param is just user ID, or starts with ref-456)
        else {
          const refMatch = startParam.match(/^(?:ref-)?(\d+)$/);
          if (refMatch) {
            const referrerId = refMatch[1];
            localStorage.setItem('pending_referrer_id', referrerId);
          }
        }
      }
    };

    // Check immediately
    checkAndRedirect();

    // Check again after a short delay to account for asynchronous SDK initialization
    const timer = setTimeout(checkAndRedirect, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return <>{children}</>;
};
