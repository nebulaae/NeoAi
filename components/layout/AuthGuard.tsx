'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

function isInsideWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  const tg = (window as any)?.Telegram?.WebApp;
  if (tg?.initData) return true;
  const max =
    (window as any)?.max?.WebApp ||
    (window as any)?.MaxApp ||
    (window as any)?.VKWebApp;
  return !!max?.initData;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  // Даём провайдерам чуть времени на тихий авто-вход внутри WebApp
  const graceRef = useRef<boolean>(true);

  useEffect(() => {
    // Если мы внутри WebApp — даём 1.5с провайдерам залогинить до редиректа
    if (isInsideWebApp()) {
      const t = setTimeout(() => {
        graceRef.current = false;
      }, 1500);
      return () => clearTimeout(t);
    }
    graceRef.current = false;
  }, []);

  useEffect(() => {
    if (isLoading) return;
    // Remove the router.replace('/login') to keep all pages open
  }, [user, isLoading]);

  if (isLoading || (!user && isInsideWebApp())) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-foreground/10 animate-pulse" />
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user && !graceRef.current) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6 min-h-[80vh] w-full">
        <div className="p-8 rounded-[32px] bg-zinc-900/60 border border-white/5 flex flex-col items-center text-center gap-6 shadow-2xl backdrop-blur-3xl backdrop-saturate-200 max-w-sm w-full material-chrome">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <span className="text-[32px]">🔒</span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-[22px] font-black tracking-tight text-white">
              Вы не зарегистрированы
            </h2>
            <p className="text-[14px] text-white/50 font-medium leading-relaxed">
              Пожалуйста, войдите в аккаунт, чтобы получить полный доступ ко
              всем функциям платформы.
            </p>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-4 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-[15px] hover:bg-white/15 active:scale-95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            Войти в аккаунт
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
