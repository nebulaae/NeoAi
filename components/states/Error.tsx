'use client';

import { AlertTriangle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
