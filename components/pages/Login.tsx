'use client';

import api from '@/lib/api';
import Image from 'next/image';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@telegram-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

type AppEnv = 'telegram' | 'max' | 'browser';

function detectEnv(): AppEnv {
  if (typeof window === 'undefined') return 'browser';
  const tg = (window as any)?.Telegram?.WebApp;
  if (tg?.initData) return 'telegram';
  const max =
    (window as any)?.max?.WebApp ||
    (window as any)?.MaxApp ||
    (window as any)?.VKWebApp;
  if (max?.initData) return 'max';
  return 'browser';
}

async function authViaTMA(initData: string, platform: 'telegram' | 'max') {
  const { data } = await api.post('/api/auth/tma', {
    initData,
    platform,
    bot_id: process.env.NEXT_PUBLIC_BOT_ID,
  });
  return data as { token: string; user: any };
}

export const Login = () => {
  const router = useRouter();
  const { user, login, isLoading } = useAuth();
  const [env, setEnv] = useState<AppEnv>('browser');
  const [autoLogging, setAutoLogging] = useState(false);
  const [autoError, setAutoError] = useState(false);
  const attempted = useRef(false);

  // Если уже авторизован — сразу на главную
  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  // Определяем окружение после гидрации
  useEffect(() => {
    setEnv(detectEnv());
  }, []);

  // Авто-вход через initData если находимся внутри WebApp
  useEffect(() => {
    if (env === 'browser' || attempted.current || isLoading) return;
    if (user) return;

    const tg = (window as any)?.Telegram?.WebApp;
    const max =
      (window as any)?.max?.WebApp ||
      (window as any)?.MaxApp ||
      (window as any)?.VKWebApp;

    const initData = env === 'telegram' ? tg?.initData : max?.initData;
    if (!initData) return;

    attempted.current = true;
    setAutoLogging(true);

    // Разворачиваем WebApp на весь экран
    try {
      if (env === 'telegram') { tg.ready(); tg.expand(); }
      else { max?.ready?.(); max?.expand?.(); }
    } catch { }

    authViaTMA(initData, env)
      .then(({ token, user: u }) => {
        localStorage.setItem('auth_token', token);
        login(u);
        router.replace('/');
      })
      .catch((e) => {
        console.error('TMA auto-login failed', e);
        setAutoLogging(false);
        setAutoError(true);
        attempted.current = false;
      });
  }, [env, isLoading, user]);

  // Вход через Telegram Widget (браузер)
  const handleTelegramAuth = async (tgUser: any) => {
    try {
      const { data } = await api.post('/api/auth/telegram', {
        ...tgUser,
        bot_id: process.env.NEXT_PUBLIC_BOT_ID,
      });
      localStorage.setItem('auth_token', data.token);
      login(data.user);
      toast.success('Вход выполнен!');
      router.replace('/');
    } catch {
      toast.error('Ошибка входа через Telegram');
    }
  };

  // --- Лоадер (первичная загрузка или авто-вход) ---
  if (isLoading || autoLogging) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image src="/background.jpg" alt="background" fill className="object-cover opacity-20" />
        </div>
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-foreground/60" />
          <p className="text-sm text-muted-foreground">
            {autoLogging ? 'Выполняется вход...' : 'Загрузка...'}
          </p>
        </div>
      </div>
    );
  }

  if (user) return null;

  // --- Страница логина ---
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden p-6">
      {/* Фон */}
      <div className="absolute inset-0 z-0">
        <Image src="/background.jpg" alt="background" fill className="object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="w-full max-w-[320px] space-y-8 text-center z-10">
        {/* Заголовок */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Sibneuro</h1>
          <p className="text-sm text-muted-foreground">AI-платформа нового поколения</p>
        </div>

        {/* Кнопки входа */}
        <div className="space-y-3">
          {/* Telegram Widget */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              {/* Telegram icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#229ED9" />
                <path d="M5.5 11.5l2.8 1 1.1 3.4 1.7-2 3.4 2.5 2.5-9.4-11.5 4.5z" fill="white" />
                <path d="M8.3 12.5l.3 3.4 1.7-2" fill="#B0D8F5" />
              </svg>
              <span className="text-sm font-semibold">Telegram</span>
            </div>
            <LoginButton
              botUsername={process.env.NEXT_PUBLIC_TG_BOT_USERNAME || 'iamrdgbot'}
              onAuthCallback={handleTelegramAuth}
              showAvatar={false}
              buttonSize="large"
              cornerRadius={12}
              lang="ru"
            />
          </div>

          {/* Max Messenger */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-[#0077FF] flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-[11px]">M</span>
              </div>
              <span className="text-sm font-semibold">Max Messenger</span>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Откройте сервис через мини-приложение в Max — вход произойдёт автоматически
            </p>
          </div>

          {/* Ошибка авто-входа */}
          {autoError && (
            <p className="text-xs text-red-400 text-center">
              Не удалось войти автоматически. Попробуйте через кнопку выше.
            </p>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground px-4 leading-relaxed">
          Продолжая, вы соглашаетесь с условиями использования и политикой конфиденциальности.
        </p>
      </div>
    </div>
  );
};

export default Login;