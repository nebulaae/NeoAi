'use client';

import { AlertTriangle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ErrorProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  onRetry?: () => void;
}

export const ErrorComponent = ({
  title,
  description,
  icon: Icon = AlertTriangle,
  onRetry,
}: ErrorProps) => (
  <div className="flex flex-col items-center justify-center p-6 text-center gap-4 max-w-sm mx-auto">
    <div className="size-14 rounded-3xl bg-destructive/10 flex items-center justify-center">
      <Icon className="size-6 text-destructive" />
    </div>
    <div className="space-y-1">
      <p className="text-base font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
    {onRetry && (
      <Button variant="outline" onClick={onRetry} size="sm">
        Попробовать снова
      </Button>
    )}
  </div>
);

export const NetworkError = ({ onRetry }: { onRetry?: () => void }) => (
  <ErrorComponent
    title="Ошибка соединения"
    description="Не удалось загрузить данные. Проверьте подключение."
    icon={WifiOff}
    onRetry={onRetry}
  />
);

export const NotAuthorized = () => {
  const router = useRouter();

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
          className="w-full py-4 rounded-xl bg-[#007AFF] text-white font-bold text-[15px] hover:bg-[#007AFF]/90 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,122,255,0.4)]"
        >
          Войти в аккаунт
        </button>
      </div>
    </div>
  );
};
