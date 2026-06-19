'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Download, Share2, Wand2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { SmartImage } from './SmartImage';
import {
  saveMediaToDevice,
  shareMedia,
  reuseMediaInGenerate,
} from '@/lib/telegramMedia';
import { useHaptic } from '@/hooks/useHaptic';

export interface MediaViewerItem {
  url: string;
  type?: 'image' | 'video' | 'audio' | string;
}

/**
 * Полноэкранный просмотр медиа с нативными действиями внутри мини-аппа:
 * сохранить на устройство, поделиться, отправить в генерацию.
 * Заменяет сценарий «уйти на сайт → скачать → вернуться → загрузить».
 */
export function MediaViewer({
  item,
  onClose,
  allowReuse = true,
  model,
}: {
  item: MediaViewerItem | null;
  onClose: () => void;
  allowReuse?: boolean;
  model?: string;
}) {
  const router = useRouter();
  const haptic = useHaptic();
  const [busy, setBusy] = useState<null | 'save' | 'share'>(null);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  if (!item) return null;

  const kind = (item.type as 'image' | 'video' | 'audio') || 'image';

  const handleSave = async () => {
    haptic.selection();
    setBusy('save');
    const res = await saveMediaToDevice(item.url, { kind });
    setBusy(null);
    if (res.ok) {
      haptic.success();
      toast.success('Сохранено');
    } else if (res.method !== 'aborted') {
      toast.error('Не удалось сохранить');
    }
  };

  const handleShare = async () => {
    haptic.selection();
    setBusy('share');
    const res = await shareMedia(item.url);
    setBusy(null);
    if (res.method === 'clipboard') toast.success('Ссылка скопирована');
    else if (!res.ok && res.method !== 'aborted')
      toast.error('Не удалось поделиться');
  };

  const handleReuse = () => {
    haptic.medium();
    reuseMediaInGenerate(
      (p) => router.push(p),
      { type: kind, url: item.url },
      model
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in-0"
      onClick={onClose}
    >
      <div className="flex justify-end p-4 pt-[calc(16px+env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-90 transition-all"
        >
          <X size={20} />
        </button>
      </div>

      <div
        className="flex-1 flex items-center justify-center px-4 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {kind === 'video' ? (
          <video
            src={item.url}
            controls
            playsInline
            className="max-h-full max-w-full rounded-2xl"
          />
        ) : kind === 'audio' ? (
          <audio src={item.url} controls className="w-full max-w-md" />
        ) : (
          <SmartImage
            src={item.url}
            loading="eager"
            className="max-h-full max-w-full flex items-center justify-center"
            imgClassName="!object-contain max-h-[75vh] rounded-2xl"
          />
        )}
      </div>

      <div
        className="flex items-center justify-center gap-3 p-6 pb-[calc(24px+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <ActionButton
          icon={busy === 'save' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          label="Сохранить"
          onClick={handleSave}
          disabled={busy !== null}
        />
        <ActionButton
          icon={busy === 'share' ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
          label="Поделиться"
          onClick={handleShare}
          disabled={busy !== null}
        />
        {allowReuse && kind === 'image' && (
          <ActionButton
            icon={<Wand2 size={18} />}
            label="В генерацию"
            primary
            onClick={handleReuse}
            disabled={busy !== null}
          />
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        'flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl border transition-all active:scale-95 disabled:opacity-50 ' +
        (primary
          ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-[0_0_20px_rgba(0,122,255,0.4)]'
          : 'bg-white/10 border-white/15 text-white')
      }
    >
      {icon}
      <span className="text-[11px] font-bold">{label}</span>
    </button>
  );
}

export default MediaViewer;
