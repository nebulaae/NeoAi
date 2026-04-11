'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// MAX Bridge SDK выставляет window.WebApp (не window.max.WebApp и не window.MaxApp)
// https://st.max.ru/js/max-web-app.js
export const MaxProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, login } = useAuth();
  const pathname = usePathname();
  const expanded = useRef(false);

  useEffect(() => {
    // Правильное обращение к MAX Bridge SDK
    const maxWA = (window as any)?.WebApp;
    if (!maxWA?.initData) return;

    if (!expanded.current) {
      try {
        maxWA.ready?.();
        maxWA.expand?.();
      } catch { }
      expanded.current = true;
    }

    if (user) return;
    if (pathname?.includes('/login')) return;

    const token = localStorage.getItem('auth_token');
    if (token) return;

    api
      .post('/api/auth/tma', {
        initData: maxWA.initData,
        platform: 'max',
        bot_id: process.env.NEXT_PUBLIC_MAX_BOT_ID,
      })
      .then(({ data }) => {
        localStorage.setItem('auth_token', data.token);
        if (data.user?.id)
          localStorage.setItem('auth_user_id', String(data.user.id));
        login(data.user);
      })
      .catch(() => { });
  }, [pathname, user]);

  return <>{children}</>;
};