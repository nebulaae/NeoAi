'use client';

import { useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export const MaxProvider = ({ children }: { children: React.ReactNode }) => {
    const { login } = useAuth();
    const sent = useRef(false);

    useEffect(() => {
        const init = async () => {
            const maxApp =
                (window as any)?.max?.WebApp ||
                (window as any)?.MaxApp ||
                (window as any)?.VKWebApp;

            if (!maxApp?.initData || sent.current) return;

            sent.current = true;

            try {
                maxApp.ready?.();
                maxApp.expand?.();
            } catch { }

            try {
                const res = await api.post('/api/auth/tma', {
                    initData: maxApp.initData,
                    bot_id: process.env.NEXT_PUBLIC_BOT_ID,
                });

                localStorage.setItem('auth_token', res.data.token);
                login(res.data.user);
            } catch (e) {
                console.error('Max auth failed', e);
                sent.current = false;
            }
        };

        init();
        const interval = setInterval(init, 400);
        return () => clearInterval(interval);
    }, []);

    return children;
};