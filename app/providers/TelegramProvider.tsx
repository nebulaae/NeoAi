'use client';

import api from '@/lib/api';
import { useEffect, useRef } from 'react';

declare global {
    interface Window {
        Telegram?: {
            WebApp: any;
        };
    }
}

export const TelegramProvider = ({ children }: { children: React.ReactNode }) => {
    const sentRef = useRef(false);

    useEffect(() => {
        const tryInit = () => {
            const tg = window?.Telegram?.WebApp;
            if (tg) {
                tg.ready();
                tg.expand();
                if (tg.isVersionAtLeast('7.7')) {
                    tg.disableVerticalSwipes();
                }
                tg.enableClosingConfirmation();
            }

            if (!tg) return false;

            tg.ready();
            tg.expand();

            if (!tg.initData || sentRef.current) return false;

            sentRef.current = true;

            api
                .post('/api/auth/tma', {
                    initData: tg.initData,
                    bot_id: process.env.NEXT_PUBLIC_BOT_ID
                })
                .then((res) => {
                    localStorage.setItem('token', res.data.token)
                })
                .catch((err) => {
                    console.error('Telegram WebApp auth error', err);
                    sentRef.current = false;
                });

            return true;
        };

        // пробуем сразу
        if (tryInit()) return;

        // fallback — ждём Telegram
        const interval = setInterval(() => {
            if (tryInit()) clearInterval(interval);
        }, 300);

        return () => clearInterval(interval);
    }, []);

    return <>{children}</>;
};