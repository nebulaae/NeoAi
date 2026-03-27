'use client';

import api from '@/lib/api';
import Image from 'next/image';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@telegram-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

// Определяем, запущены ли мы внутри Max Mini App
function isInsideMaxApp(): boolean {
  if (typeof window === 'undefined') return false;
  const maxApp =
    (window as any)?.max?.WebApp ||
    (window as any)?.MaxApp ||
    (window as any)?.VKWebApp;
  return !!maxApp?.initData;
}

// Определяем, запущены ли мы внутри Telegram WebApp
function isInsideTelegramApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any)?.Telegram?.WebApp?.initData;
}

export const Login = () => {
  const router = useRouter();
  const { user, login, isLoading } = useAuth();
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.push('/');
  }, [user, isLoading, router]);

  // Если запущены внутри мессенджера — TelegramProvider / MaxProvider уже логинят автоматически
  useEffect(() => {
    setInApp(isInsideMaxApp() || isInsideTelegramApp());
  }, []);

  const handleTelegramAuth = async (user: any) => {
    try {
      const { data } = await api.post('/api/auth/telegram', {
        ...user,
        bot_id: process.env.NEXT_PUBLIC_BOT_ID,
      });
      localStorage.setItem('auth_token', data.token);
      login(data.user);
      toast.success('Вход выполнен!');
      router.push('/');
    } catch (e: any) {
      console.error('Telegram login failed:', e);
      toast.error('Ошибка входа через Telegram');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-border border-t-foreground rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="absolute inset-0 opacity-20 z-0">
        <Image src="/background.jpg" alt="background" fill className="object-cover" />
      </div>

      <div className="w-full max-w-[320px] space-y-8 text-center z-10 relative">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Вход в аккаунт</h1>
          <p className="text-sm text-muted-foreground">Выберите способ входа</p>
        </div>

        <div className="space-y-4">
          {/* Если внутри мессенджера — показываем спиннер ожидания авто-входа */}
          {inApp ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Выполняется вход...</p>
            </div>
          ) : (
            <>
              {/* Telegram Widget Auth (для браузера) */}
              <div className="flex justify-center">
                <LoginButton
                  botUsername={process.env.NEXT_PUBLIC_TG_BOT_USERNAME || 'iamrdgbot'}
                  onAuthCallback={handleTelegramAuth}
                  showAvatar={false}
                  buttonSize="large"
                  cornerRadius={12}
                  lang="ru"
                />
              </div>

              {/* Max Messenger — инструкция для браузера */}
              <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-2">
                  {/* Логотип Max (синий кружок с M) */}
                  <div className="size-8 rounded-full bg-[#0077FF] flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm">M</span>
                  </div>
                  <span className="text-sm font-medium">Max Messenger</span>
                </div>
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Откройте этот сервис через мини-приложение в Max — вход произойдёт автоматически
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground px-4">
          Продолжая, вы соглашаетесь с условиями использования и политикой конфиденциальности.
        </p>
      </div>
    </div>
  );
};

export default Login;