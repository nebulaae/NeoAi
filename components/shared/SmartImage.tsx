'use client';

import { useState } from 'react';
import { ImageOff, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeMediaUrl } from '@/lib/utils';
import { telemetry } from '@/lib/telemetry';

/**
 * Надёжная картинка вместо «голого» <img>.
 *
 * Чинит сценарий «чёрный экран → белый экран → пусто»: даёт явный скелетон
 * на время загрузки, фолбэк с кнопкой «повторить» при ошибке и автоматический
 * ретрай (битый CDN/таймаут). Также чистит URL (%0A, пробелы) и пишет
 * телеметрию по каждой неудачной загрузке — видно в логах какой URL не открылся.
 */
export function SmartImage({
  src,
  alt = '',
  className,
  imgClassName,
  onClick,
  loading = 'lazy',
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
}) {
  const clean = sanitizeMediaUrl(src);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    'loading'
  );
  const [attempt, setAttempt] = useState(0);

  // Сброс состояния при смене src — рекомендованный React-паттерн
  // (правка состояния во время рендера вместо setState в эффекте).
  const [prevSrc, setPrevSrc] = useState(clean);
  if (clean !== prevSrc) {
    setPrevSrc(clean);
    setStatus('loading');
    setAttempt(0);
  }

  if (!clean) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-zinc-900 text-white/20',
          className
        )}
      >
        <ImageOff size={20} />
      </div>
    );
  }

  // Кэш-бастер только для повторных попыток, чтобы обойти «залипший» битый ответ.
  const finalSrc = attempt > 0 ? `${clean}${clean.includes('?') ? '&' : '?'}r=${attempt}` : clean;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 animate-pulse">
          <Loader2 size={18} className="animate-spin text-white/30" />
        </div>
      )}

      {status === 'error' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStatus('loading');
            setAttempt((a) => a + 1);
          }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900 text-white/40"
        >
          <RefreshCw size={18} />
          <span className="text-[11px] font-bold">Повторить</span>
        </button>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={finalSrc}
          alt={alt}
          loading={loading}
          onClick={onClick}
          onLoad={() => setStatus('loaded')}
          onError={() => {
            // Одна тихая авто-попытка, затем — видимый фолбэк.
            if (attempt < 1) {
              setAttempt((a) => a + 1);
              return;
            }
            telemetry.mediaError('image_load_failed', {
              url: clean,
              attempts: attempt + 1,
            });
            setStatus('error');
          }}
          className={cn(
            'size-full object-cover transition-opacity duration-200',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName
          )}
        />
      )}
    </div>
  );
}

export default SmartImage;
