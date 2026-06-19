'use client';

import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ImageIcon,
  Clapperboard,
  MessageCircle,
  Music,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useInfinitePosts } from '@/hooks/usePosts';
import { useAIModels } from '@/hooks/useModels';
import { SmartImage } from '@/components/shared/SmartImage';
import { sanitizeMediaUrl } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ACCENT = '#007AFF';

function getPostImage(post: any): string | null {
  const media = post?.result?.media;
  if (Array.isArray(media)) {
    for (const m of media) {
      if ((m.type === 'image' || !m.type) && typeof m.input === 'string') {
        const u = sanitizeMediaUrl(m.input);
        if (u) return u;
      }
    }
  }
  const flat = post?.result?.url;
  return flat ? sanitizeMediaUrl(flat) : null;
}

const BENEFITS = [
  { icon: ImageIcon, title: 'Генерация фото', desc: 'Nano Banana, Seedream, GPT Image' },
  { icon: Clapperboard, title: 'Видео из идей', desc: 'Kling, Seedance — за минуту' },
  { icon: MessageCircle, title: 'AI-чаты', desc: 'GPT, Claude, Gemini, DeepSeek' },
  { icon: Music, title: 'Музыка', desc: 'Suno — треки по описанию' },
];

/**
 * Единый гостевой экран. Показывается всем неавторизованным пользователям
 * вместо пустых страниц и технических сообщений. Объясняет ценность сервиса
 * и ведёт к регистрации/входу. Адаптирован под Telegram Mini App и мобильные.
 */
export function NotAuthorizedPage({
  title = 'Создавайте с AI — фото, видео, музыка и чаты',
  subtitle = 'Один сервис для всех нейросетей. Опишите идею — получите результат за секунды.',
}: {
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const haptic = useHaptic();

  // Публичные посты (auth-free) — реальные примеры генераций для витрины.
  const { data: postsData } = useInfinitePosts({ limit: 9, min_likes: 1 });
  const examples = ((postsData as any)?.pages?.[0]?.items || [])
    .map(getPostImage)
    .filter(Boolean)
    .slice(0, 9) as string[];

  // Модели — если бекенд отдаёт публично, покажем популярные; иначе секция скрыта.
  const { data: models } = useAIModels();
  const popularModels = (models || []).slice(0, 8);

  const goLogin = () => {
    haptic.medium();
    router.push('/login');
  };

  return (
    <div className="flex flex-col w-full min-h-svh pb-32" style={{ background: 'var(--page-bg)' }}>
      {/* HERO */}
      <div className="relative px-6 pt-[calc(48px+env(safe-area-inset-top))] pb-10 overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full opacity-30 blur-[90px]"
          style={{ background: `radial-gradient(circle, ${ACCENT}, transparent 70%)` }}
        />
        <div className="relative flex flex-col items-center text-center gap-5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <Sparkles size={14} className="text-[#007AFF]" />
            <span className="text-[12px] font-bold text-white/70">
              Neo<span className="text-[#007AFF]">AI</span>
            </span>
          </div>
          <h1 className="text-[30px] leading-[1.1] font-black tracking-tight text-white max-w-[340px]">
            {title}
          </h1>
          <p className="text-[15px] font-medium text-white/50 max-w-[320px] leading-relaxed">
            {subtitle}
          </p>
          <div className="flex flex-col w-full max-w-[320px] gap-3 mt-2">
            <button
              onClick={goLogin}
              className="w-full h-14 rounded-2xl bg-[#007AFF] text-white font-black text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(0,122,255,0.45)]"
            >
              Начать бесплатно <ArrowRight size={18} />
            </button>
            <button
              onClick={goLogin}
              className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold text-[14px] active:scale-[0.98] transition-all"
            >
              У меня уже есть аккаунт
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-white/30 font-medium mt-1">
            <ShieldCheck size={13} /> Вход через Telegram или Email
          </div>
        </div>
      </div>

      {/* BENEFITS */}
      <div className="grid grid-cols-2 gap-3 px-6">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="flex flex-col gap-2 p-4 rounded-[22px] bg-zinc-900/50 border border-white/[.08] backdrop-blur-xl"
          >
            <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center">
              <b.icon size={18} className="text-[#007AFF]" />
            </div>
            <p className="text-[15px] font-black text-white">{b.title}</p>
            <p className="text-[12px] font-medium text-white/40 leading-snug">
              {b.desc}
            </p>
          </div>
        ))}
      </div>

      {/* EXAMPLE GENERATIONS */}
      {examples.length > 0 && (
        <div className="flex flex-col gap-4 px-6 mt-10">
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30">
            Примеры генераций
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {examples.map((url, i) => (
              <SmartImage
                key={i}
                src={url}
                className="aspect-square rounded-2xl border border-white/[.06]"
              />
            ))}
          </div>
        </div>
      )}

      {/* POPULAR MODELS */}
      {popularModels.length > 0 && (
        <div className="flex flex-col gap-4 px-6 mt-10">
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30">
            Популярные модели
          </h2>
          <div className="flex flex-wrap gap-2">
            {popularModels.map((m) => (
              <div
                key={m.tech_name}
                className="flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full bg-zinc-900/60 border border-white/[.08]"
              >
                <Avatar className="w-7 h-7">
                  <AvatarImage src={m.avatar} />
                  <AvatarFallback>{m.model_name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-[13px] font-bold text-white/80">
                  {m.model_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STICKY CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/90 to-transparent">
        <button
          onClick={goLogin}
          className="w-full h-14 rounded-2xl bg-[#007AFF] text-white font-black text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(0,122,255,0.45)] max-w-md mx-auto"
        >
          Создать первую генерацию <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default NotAuthorizedPage;
