'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { NotAuthorizedPage } from '@/components/shared/NotAuthorizedPage';
import { isAuthSettled, onAuthSettled } from '@/lib/authState';

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

// Жёсткий потолок ожидания тихого входа — на случай, если провайдер вообще
// не запустил авторизацию (initData ждётся до 8с + ретраи). Без него лоадер
// мог бы висеть бесконечно.
const AUTH_GRACE_CAP_MS = 9000;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  // grace = идёт тихий вход внутри WebApp, рано показывать экран входа.
  // Снимается по сигналу markAuthSettled() (успех/исчерпаны ретраи) или по
  // жёсткому таймауту. Вне WebApp грейс не нужен.
  const [grace, setGrace] = useState<boolean>(
    () => isInsideWebApp() && !isAuthSettled()
  );

  useEffect(() => {
    if (!grace) return;
    const unsub = onAuthSettled(() => setGrace(false));
    const cap = setTimeout(() => setGrace(false), AUTH_GRACE_CAP_MS);
    return () => {
      unsub();
      clearTimeout(cap);
    };
  }, [grace]);

  if (isLoading || (!user && grace)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-foreground/10 animate-pulse" />
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const pathWithoutLocale =
    pathname?.replace(/^\/[a-z]{2}(-[A-Z]{2})?(\/|$)/, '/') || '/';

  const isPublic =
    pathWithoutLocale === '/' ||
    pathWithoutLocale.startsWith('/trends') ||
    pathWithoutLocale.startsWith('/trend');

  if (!user) {
    if (isPublic) return <>{children}</>;
    return <NotAuthorizedPage />;
  }

  return <>{children}</>;
}
