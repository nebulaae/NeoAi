'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { getAppSource } from '@/lib/source';
import { getPlatformInitData } from '@/lib/platform';

export const TelegramProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, login } = useAuth();
  const { bot } = useBot(); // 👈 берём bot_id из провайдера
  const pathname = usePathname();
  const expanded = useRef(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setRetry((r) => r + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const source = getAppSource();
    if (source !== 'tg') return;

    const initData = getPlatformInitData();
    if (!initData) return;

    if (!expanded.current) {
      try {
        (window as any)?.Telegram?.WebApp?.ready?.();
        (window as any)?.Telegram?.WebApp?.expand?.();
      } catch { }
      expanded.current = true;
    }

    if (user) return;
    if (pathname?.includes('/login')) return;

    const token = localStorage.getItem('auth_token');
    if (token) return;

    if (!bot?.bot_id) return;

    api
      .post('/api/auth/tma', {
        initData,           // ← из хелпера
        platform: 'telegram',
        bot_id: bot.bot_id,
      }, {
        headers: {
          'x-init-data': initData,
          'x-bot-id': String(bot.bot_id),
          'x-platform': 'telegram',
        }
      })
      .then(({ data }) => {
        localStorage.setItem('auth_token', data.token);
        if (data.user?.id) localStorage.setItem('auth_user_id', String(data.user.id));
        login(data.user);
      })
      .catch(() => { });
  }, [pathname, user, bot, retry]);

  return <>{children}</>;
};
