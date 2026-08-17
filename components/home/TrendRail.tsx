'use client';

import { useRouter } from 'next/navigation';
import { Play, Camera, ChevronRight } from 'lucide-react';
import type { Post } from '@/hooks/usePosts';
import {
  isVideoPost,
  needsUserPhoto,
  postMediaUrl,
  postTitle,
} from '@/lib/postGroups';
import { useHaptic } from '@/hooks/useHaptic';
import { useDragScroll } from '@/hooks/useDragScroll';

/**
 * Горизонтальная полка трендов — одна тема, один ряд.
 *
 * Карточки намеренно узкие: из-за края экрана всегда видно «половину»
 * следующей, и ряд читается как прокручиваемый без отдельной подсказки.
 */
export function TrendRail({
  groupId,
  title,
  posts,
  allLabel,
  fallbackTitle,
}: {
  groupId: string;
  title: string;
  posts: Post[];
  allLabel: string;
  fallbackTitle: string;
}) {
  const router = useRouter();
  const haptic = useHaptic();
  // На ПК тача нет: без этого полку можно листать только полосой прокрутки.
  // Хук добавляет колесо и перетаскивание мышью и гасит клик после драга,
  // чтобы протяжка не открывала карточку под курсором.
  const trackRef = useDragScroll<HTMLDivElement>();

  if (!posts.length) return null;

  // В тематической полке («Селфи», «Портрет») название совпадает с заголовком
  // ряда и на каждой карточке повторяется одно и то же слово. В таком случае
  // подписываем карточку нейросетью — это единственное, чем они различаются.
  const uniform =
    posts.length > 1 &&
    posts.every(
      (p) => postTitle(p, fallbackTitle) === postTitle(posts[0], fallbackTitle)
    );

  return (
    <section className="min-w-0 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3 className="text-[24px] font-black tracking-tight text-[#007AFF] truncate">
          {title}
        </h3>
        <button
          onClick={() => {
            haptic.selection();
            router.push(`/trends?group=${encodeURIComponent(groupId)}`);
          }}
          className="shrink-0 flex items-center gap-0.5 text-[13px] font-bold text-white/35 hover:text-white transition-colors"
        >
          {allLabel}
          <ChevronRight size={14} />
        </button>
      </div>

      {/* -mx-5/px-5: полка идёт от края до края, а отступы держат первую и
          последнюю карточку на одной линии с остальным контентом. */}
      <div
        ref={trackRef}
        className="-mx-5 px-5 scroll-pl-5 flex gap-3 overflow-x-auto snap-x snap-mandatory cursor-grab active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((post) => {
          const url = postMediaUrl(post);
          const video = isVideoPost(post);
          return (
            <button
              key={post.id}
              onClick={() => {
                haptic.light();
                router.push(`/trend/${post.id}`);
              }}
              // Две карточки в видимой области на телефоне и три на широком
              // экране: на 375px треть ширины — это уже нечитаемая марка.
              // Вычитаемое — суммарная ширина зазоров gap-3 (0.75rem каждый).
              className="group relative shrink-0 snap-start w-[calc((100%-0.75rem)*0.5)] sm:w-[calc((100%-1.5rem)*0.3333)] aspect-3/4 rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 text-left transition-all active:scale-[0.97] hover:border-white/25"
            >
              {url ? (
                video ? (
                  // Видео в полке проигрывается само: неподвижный первый кадр
                  // не отличить от фото, и весь смысл раздела «Видео»
                  // пропадает. muted обязателен — иначе браузер заблокирует
                  // автозапуск.
                  <video
                    src={url}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5 text-[28px]">
                  ✨
                </div>
              )}

              <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />

              <div className="absolute top-2 left-2 flex gap-1">
                {video && (
                  <span className="w-6 h-6 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center">
                    <Play size={11} className="fill-white text-white" />
                  </span>
                )}
                {needsUserPhoto(post) && (
                  <span className="w-6 h-6 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center">
                    <Camera size={11} className="text-white" />
                  </span>
                )}
              </div>

              <p className="absolute inset-x-0 bottom-0 p-2.5 text-[12px] font-black leading-tight text-white line-clamp-2 group-hover:text-[#007AFF] transition-colors">
                {uniform
                  ? post.model_name || ''
                  : postTitle(post, fallbackTitle)}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
