import { GenerationRequest, RequestItem } from '@/components/pages/Profile';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return 'только что';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} м`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч`;
  return `${Math.floor(diff / 86_400_000)} д`;
}

export function localize(v: any, lang = 'ru'): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v[lang] || v.en || v.ru || Object.values(v)[0] || '';
}

/** Normalise a raw GenerationRequest into the internal RequestItem */
export function normalise(req: GenerationRequest): RequestItem {
  const result = (req.result as Record<string, unknown> | null) ?? null;
  let previewUrl: string | null = null;

  if (result) {
    // Real backend format: result.media = [{ type: "image", input: "https://...", format: "url" }]
    // Suno returns audio + image — pick first entry where type === "image"
    const mediaArr = result.media as
      | Array<Record<string, unknown>>
      | null
      | undefined;
    if (Array.isArray(mediaArr)) {
      for (const m of mediaArr) {
        if (m.type === 'image' && typeof m.input === 'string' && m.input) {
          previewUrl = m.input;
          break;
        }
      }
    }

    // Fallback: flat keys result.url / result.image / result.output
    if (!previewUrl) {
      for (const key of ['url', 'image', 'output']) {
        const v = result[key];
        if (typeof v === 'string' && v) {
          previewUrl = v;
          break;
        }
      }
    }
  }

  // For error status: show input image as preview so the card isn't blank
  let inputPreview: string | null = null;
  const inputMedia = req.inputs?.media as
    | Array<Record<string, unknown>>
    | null
    | undefined;
  if (!previewUrl && Array.isArray(inputMedia)) {
    for (const m of inputMedia) {
      const inner = m.input as Record<string, unknown> | null | undefined;
      if (inner && typeof inner.input === 'string' && inner.input) {
        inputPreview = inner.input;
        break;
      }
    }
  }

  return {
    id: req.id,
    dialogue_id: req.dialogue_id ?? 0,
    model: req.model ?? '',
    version: req.version,
    cost: req.cost,
    status: req.status,
    text: req.inputs?.text ?? null,
    hasMedia:
      Array.isArray(req.inputs?.media) && (req.inputs?.media?.length ?? 0) > 0,
    previewUrl: previewUrl ?? inputPreview,
    created_at: req.created_at,
  };
}
