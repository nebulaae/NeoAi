/**
 * Нативная работа с медиа внутри Telegram/Max Mini App.
 *
 * Решает критическую проблему: раньше, чтобы переиспользовать картинку,
 * пользователь открывал сайт → скачивал → возвращался в мини-апп → загружал
 * обратно. Теперь: сохранить, поделиться и отправить в генерацию — не выходя
 * из приложения.
 *
 * Стратегия для каждой операции — от самого нативного к фолбэку:
 *  save:  Telegram WebApp.downloadFile → navigator.share(files) → blob+anchor
 *         → Telegram openLink(/api/download) → location.href
 *  share: navigator.share → Telegram shareMessage/openTelegramLink → clipboard
 *  reuse: sessionStorage + переход на /generate (без сети)
 */

import { sanitizeMediaUrl } from '@/lib/utils';
import { telemetry } from '@/lib/telemetry';

type TgWebApp = {
  downloadFile?: (
    params: { url: string; file_name: string },
    cb?: (accepted: boolean) => void
  ) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  shareMessage?: (msgId: string, cb?: (sent: boolean) => void) => void;
  version?: string;
  platform?: string;
};

function getTg(): TgWebApp | null {
  if (typeof window === 'undefined') return null;
  return (window as any)?.Telegram?.WebApp ?? null;
}

function fileNameFromUrl(url: string, fallbackExt = 'jpg'): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split('/').pop() || '';
    if (last && last.includes('.')) return last;
    return `neoai-${Date.now()}.${fallbackExt}`;
  } catch {
    return `neoai-${Date.now()}.${fallbackExt}`;
  }
}

function proxyUrl(url: string): string {
  const abs =
    typeof window !== 'undefined'
      ? new URL('/api/download', window.location.origin).toString()
      : '/api/download';
  return `${abs}?url=${encodeURIComponent(url)}`;
}

/** Сохранить медиа на устройство — нативно в Telegram, с фолбэками. */
export async function saveMediaToDevice(
  rawUrl: string,
  opts: { kind?: 'image' | 'video' | 'audio' } = {}
): Promise<{ ok: boolean; method: string }> {
  const url = sanitizeMediaUrl(rawUrl);
  if (!url) {
    telemetry.mediaError('save_empty_url', { rawUrl });
    return { ok: false, method: 'none' };
  }

  const ext =
    opts.kind === 'video' ? 'mp4' : opts.kind === 'audio' ? 'mp3' : 'jpg';
  const fileName = fileNameFromUrl(url, ext);

  // 1. Telegram нативный downloadFile (Bot API 8.0+) — системный диалог сохранения.
  const tg = getTg();
  if (tg?.downloadFile) {
    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        tg.downloadFile!({ url, file_name: fileName }, (accepted) => {
          settled = true;
          if (accepted) resolve();
          else reject(new Error('user_declined'));
        });
        // Если колбэк не пришёл (старый клиент) — считаем что диалог показан.
        setTimeout(() => !settled && resolve(), 1500);
      });
      telemetry.media('save_ok', { method: 'tg_downloadFile', kind: opts.kind });
      return { ok: true, method: 'tg_downloadFile' };
    } catch (err) {
      telemetry.media('save_decline_or_fail', {
        method: 'tg_downloadFile',
        error: (err as { message?: string })?.message,
      });
      // продолжаем к фолбэкам
    }
  }

  // 2. Web Share API с файлом — на мобильных даёт «Сохранить в фото».
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      const resp = await fetch(proxyUrl(url));
      if (resp.ok) {
        const blob = await resp.blob();
        const file = new File([blob], fileName, { type: blob.type });
        const canShareFiles =
          typeof (navigator as any).canShare === 'function'
            ? (navigator as any).canShare({ files: [file] })
            : true;
        if (canShareFiles) {
          await navigator.share({ files: [file] });
          telemetry.media('save_ok', { method: 'web_share_files' });
          return { ok: true, method: 'web_share_files' };
        }
      }
    }
  } catch (err) {
    telemetry.media('save_share_failed', {
      error: (err as { message?: string })?.message,
    });
  }

  // 3. Браузер: blob + скрытый <a download>.
  try {
    const resp = await fetch(proxyUrl(url));
    if (resp.ok) {
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      telemetry.media('save_ok', { method: 'blob_anchor' });
      return { ok: true, method: 'blob_anchor' };
    }
  } catch (err) {
    telemetry.media('save_blob_failed', {
      error: (err as { message?: string })?.message,
    });
  }

  // 4. Последний фолбэк: открыть прокси (Telegram openLink / навигация).
  try {
    if (tg?.openLink) {
      tg.openLink(proxyUrl(url));
    } else {
      window.location.href = proxyUrl(url);
    }
    telemetry.media('save_ok', { method: 'open_proxy' });
    return { ok: true, method: 'open_proxy' };
  } catch (err) {
    telemetry.mediaError('save_all_failed', {
      error: (err as { message?: string })?.message,
    });
    return { ok: false, method: 'none' };
  }
}

/** Поделиться медиа (системный share-лист), с фолбэком на ссылку/буфер. */
export async function shareMedia(
  rawUrl: string,
  text?: string
): Promise<{ ok: boolean; method: string }> {
  const url = sanitizeMediaUrl(rawUrl);
  if (!url) return { ok: false, method: 'none' };

  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      await navigator.share({ url, text });
      telemetry.media('share_ok', { method: 'web_share' });
      return { ok: true, method: 'web_share' };
    }
  } catch (err) {
    // отмена пользователем — не ошибка
    if ((err as { name?: string })?.name === 'AbortError') {
      return { ok: false, method: 'aborted' };
    }
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      telemetry.media('share_ok', { method: 'clipboard' });
      return { ok: true, method: 'clipboard' };
    }
  } catch {}

  return { ok: false, method: 'none' };
}

const PREFILL_KEY = 'generate_prefill_media';

export interface PrefillMedia {
  type: string;
  url: string;
}

/** Положить медиа в «корзину» для Generate и перейти на экран генерации. */
export function reuseMediaInGenerate(
  navigate: (path: string) => void,
  media: PrefillMedia | PrefillMedia[],
  model?: string
): void {
  const arr = Array.isArray(media) ? media : [media];
  const cleaned = arr
    .map((m) => ({ type: m.type || 'image', url: sanitizeMediaUrl(m.url) }))
    .filter((m) => m.url);
  try {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(cleaned));
  } catch {}
  telemetry.media('reuse_in_generate', { count: cleaned.length, model });
  navigate(model ? `/generate?model=${encodeURIComponent(model)}` : '/generate');
}

/** Забрать и очистить предзаполненное медиа (вызывается экраном Generate). */
export function consumePrefillMedia(): PrefillMedia[] {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return [];
    sessionStorage.removeItem(PREFILL_KEY);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
