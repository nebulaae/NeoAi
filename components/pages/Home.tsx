'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useCallback } from 'react';
import { useBalance } from '@/hooks/useBalance';
import { useUser } from '@/hooks/useUser';
import { useAIModels } from '@/hooks/useModels';
import { useInfinitePosts, usePosts, type Post } from '@/hooks/usePosts';
import { useLikePost } from '@/hooks/usePosts';
import { buildPostGroups } from '@/lib/postGroups';
import { PromoBanners } from '@/components/home/PromoBanners';
import { TrendRail } from '@/components/home/TrendRail';
import { useHaptic } from '@/hooks/useHaptic';
import { useTranslations } from 'next-intl';
import {
  Play,
  Loader2,
  Heart,
  ChevronRight,
  ImageIcon,
  Video,
  Music,
  MessageCircle,
  Sparkles,
  Plus,
  RotateCw,
} from 'lucide-react';
import Image from 'next/image';

// Быстрый старт по типу результата. Пользователь думает «хочу видео», а не
// «хочу Kling 2.5» — поэтому вход в генерацию сначала по типу, а список
// моделей уже внутри (?cat= открывает нужную вкладку).
const CREATE_KINDS = [
  { cat: 'image', labelKey: 'createPhoto', icon: ImageIcon },
  { cat: 'video', labelKey: 'createVideo', icon: Video },
  { cat: 'audio', labelKey: 'createAudio', icon: Music },
  { cat: 'text', labelKey: 'createText', icon: MessageCircle },
] as const;

// ─── Like Button ──────────────────────────────────────────────────────────────

function LikeButton({
  postId,
  botId,
  userId,
  liked,
  likes,
}: {
  postId: number;
  botId: number;
  userId: number;
  liked?: boolean;
  likes: number;
}) {
  const { mutate: likePost, isPending } = useLikePost();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;
    likePost({ post_id: postId, bot_id: botId, user_id: userId });
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md border transition-all duration-200 active:scale-90
        ${liked
          ? 'bg-red-500/20 border-red-500/40 text-red-400'
          : 'bg-black/40 border-white/10 text-white/50 hover:text-white/80 hover:bg-black/60'
        }
      `}
    >
      <Heart
        size={13}
        className={`transition-all duration-200 ${liked ? 'fill-red-400 text-red-400' : ''}`}
      />
      {likes > 0 && (
        <span className="text-[11px] font-bold leading-none">{likes}</span>
      )}
    </button>
  );
}

// ─── Balance chip ─────────────────────────────────────────────────────────────

/**
 * Баланс в шапке.
 *
 * Пока баланс неизвестен — «···», а не «0»: раньше упавший или ещё не
 * пришедший запрос выглядел как обнулённый счёт, и это была одна из самых
 * частых жалоб. Если запрос упал совсем — чип превращается в кнопку повтора.
 */
function BalanceChip() {
  const t = useTranslations('Home');
  const router = useRouter();
  const haptic = useHaptic();
  const { tokens, known, isError, isFetching, refetch } = useBalance();

  if (isError && !known) {
    return (
      <button
        onClick={() => refetch()}
        aria-label={t('balanceUnknown')}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[13px] font-bold text-white/50 transition-all active:scale-95"
      >
        <RotateCw size={13} className={isFetching ? 'animate-spin' : ''} />
        <span className="text-[16px] leading-none">◈</span>
        <span>···</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        haptic.light();
        router.push('/pay');
      }}
      className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/30 text-[#007AFF] text-[13px] font-black transition-all hover:scale-[1.03] active:scale-95 shadow-[0_0_15px_rgba(0,122,255,0.25)]"
    >
      <span className="text-[15px] leading-none">◈</span>
      <span className="tabular-nums min-w-[1ch]">{known ? tokens : '···'}</span>
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#007AFF] text-white">
        <Plus size={12} strokeWidth={3} />
        {t('topUp')}
      </span>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const Home = () => {
  const t = useTranslations('Home');
  const router = useRouter();
  const haptic = useHaptic();

  const { data: userData } = useUser();
  const { data: allModels } = useAIModels();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfinitePosts({ limit: 12 });

  const posts = data?.pages.flatMap((page) => page.items) || [];
  const userId = userData?.user?.user_id ?? 0;

  // Отдельная выборка под полки: из 12 постов первой страницы ленты
  // осмысленных групп не собрать, а грузить ради этого всю ленту нельзя.
  //
  // skipUserId обязателен — ровно как в ленте. Без него перехватчик подставляет
  // в /api/posts текущий user_id, и авторизованному пользователю возвращаются
  // только его собственные посты: у большинства их нет, выборка приходит
  // пустой, и полки просто не отрисовываются (в браузере без входа при этом
  // всё работало — оттого баг и не был виден сразу).
  const { data: sample } = usePosts({ limit: 60, skipUserId: true });

  const groups = useMemo(() => {
    const source = (sample?.items as Post[]) || [];
    // Если выборка ещё не пришла или упала — строим полки из того, что уже
    // загружено лентой. Лучше меньше полок, чем пустая главная.
    const input = source.length ? source : posts;
    return buildPostGroups(input, {
      popular: t('groupPopular'),
      video: t('groupVideo'),
      photo: t('groupPhoto'),
    });
  }, [sample, posts, t]);

  // Сколько моделей и какие — прямо на плитке. Раньше узнать состав можно было,
  // только зайдя в генерацию; показ сразу заметно снижает порог входа.
  const modelsByCat = useMemo(() => {
    const models = allModels || [];
    const map: Record<string, { count: number; names: string[] }> = {};
    for (const { cat } of CREATE_KINDS) {
      const list = models.filter(
        (m) => m.mainCategory === cat || m.categories?.includes(cat)
      );
      map[cat] = {
        count: list.length,
        names: list.slice(0, 3).map((m) => m.model_name),
      };
    }
    return map;
  }, [allModels]);

  const go = useCallback(
    (href: string) => {
      haptic.light();
      router.push(href);
    },
    [haptic, router]
  );

  const observer = useRef<IntersectionObserver | null>(null);

  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { rootMargin: '300px' }
      );
      if (node) observer.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  return (
    <div className="min-h-screen">
      {/* Фон — общий для всех экранов, живёт в app/(root)/layout.tsx */}

      {/* NAV */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 px-5 pb-4 pt-[calc(1rem+var(--sa-top))]  ">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <Image
              src="/logo-neo.jpg"
              alt=""
              width={38}
              height={38}
              className="rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-black text-white">
            Neo<span className="text-[#007AFF]">AI</span>
          </h1>
        </div>

        <BalanceChip />
      </header>

      {/* CONTENT */}
      {/* min-w-0: внутри лежат горизонтальные скроллеры, а у flex/grid-детей
          min-width по умолчанию auto — без этого широкая полка растягивает
          колонку и весь экран уезжает вправо. */}
      <section className="min-w-0 px-5 pt-5 pb-32 flex flex-col gap-10">
        {/* ── Промо ───────────────────────────────────────────────────────
            Веб-версия, партнёрка, лента, пополнение — офферы, о которых
            раньше нельзя было узнать, не полазив по меню. */}
        <PromoBanners />

        {/* ── С чего начать ──────────────────────────────────────────────
            Ответ на «зашёл, а что делать». Два маршрута: готовый тренд
            (загрузил фото — получил результат) и свободная генерация.
            Раньше на главной был только грид трендов без объяснения. */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-2">
            {t('startTitle')}
          </h2>

          <button
            onClick={() => go('/trends')}
            className="flex items-center gap-4 p-4 rounded-3xl bg-[#007AFF]/10 border border-[#007AFF]/30 text-left transition-all active:scale-[0.98] hover:border-[#007AFF]/50"
          >
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-[#007AFF] flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-black text-white">
                {t('startTemplate')}
              </p>
              <p className="text-[13px] font-medium text-white/40 truncate">
                {t('startTemplateHint')}
              </p>
            </div>
            <ChevronRight size={18} className="text-[#007AFF] shrink-0" />
          </button>

          <button
            onClick={() => go('/generate')}
            className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-900/50 border border-white/[.08] text-left transition-all active:scale-[0.98] hover:border-white/20"
          >
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Plus size={20} className="text-white/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-black text-white">
                {t('startScratch')}
              </p>
              <p className="text-[13px] font-medium text-white/40 truncate">
                {t('startScratchHint')}
              </p>
            </div>
            <ChevronRight size={18} className="text-white/20 shrink-0" />
          </button>
        </div>

        {/* ── Что создаём ────────────────────────────────────────────────
            Вход в генерацию по типу результата, с составом моделей на
            плитке — видно, что внутри, ещё до перехода. */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-2">
            {t('createTitle')}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {CREATE_KINDS.map(({ cat, labelKey, icon: Icon }) => {
              const info = modelsByCat[cat];
              return (
                <button
                  key={cat}
                  onClick={() => go(`/generate?cat=${cat}`)}
                  className="flex flex-col gap-2 p-4 rounded-3xl bg-zinc-900/50 border border-white/[.08] text-left transition-all active:scale-[0.97] hover:border-[#007AFF]/40 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#007AFF]/40 transition-colors">
                    <Icon size={17} className="text-[#007AFF]" />
                  </div>
                  <p className="text-[15px] font-black text-white">
                    {t(labelKey)}
                  </p>
                  {/* Список моделей, пока он не загрузился — пусто, а не
                      «0 моделей»: пустой счётчик выглядит как «раздел
                      пустой». Высота фиксирована, чтобы плитки не прыгали. */}
                  <p className="text-[11px] font-medium text-white/30 line-clamp-2 leading-snug min-h-[2.2em]">
                    {info?.names.length
                      ? info.names.join(', ')
                      : info?.count
                        ? t('modelsCount', { count: info.count })
                        : ''}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Полки по темам ─────────────────────────────────────────────
            Раньше здесь сразу шёл сплошной грид из полутора тысяч постов, в
            котором видео, фото-шаблоны и разные нейросети лежали вперемешку.
            Теперь контент разложен по полкам — видно, что вообще есть, и в
            каждую можно провалиться целиком. Общая лента осталась ниже. */}
        {groups.length > 0 && (
          <div className="flex flex-col gap-8">
            <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-2">
              {t('trending')}
            </h2>
            {groups.map((group) => (
              <TrendRail
                key={group.id}
                groupId={group.id}
                title={group.title}
                posts={group.posts}
                allLabel={t('all')}
                fallbackTitle={t('trend')}
              />
            ))}
          </div>
        )}

        {/* ── Лента ──────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-[24px] font-black text-[#007AFF] tracking-tight">
              {t('feedTitle')}
            </h2>
            <button
              onClick={() => router.push('/trends')}
              className="text-[14px] font-medium text-white/40 hover:text-white transition-colors"
            >
              {t('all')} →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-3/4 rounded-3xl animate-pulse bg-white/5 border border-white/10"
                />
              ))
              : posts.map((post, index) => {
                const result = post.result as any;
                const media = result?.media?.[0] || result;
                const isVideo =
                  media?.type === 'video' ||
                  (typeof media?.input === 'string' &&
                    media.input.includes('.mp4'));
                const mediaUrl = media?.url || media?.input || result?.url;
                const trendName =
                  (post as any).name || post.inputs?.text || t('trend');
                const isLast = index === posts.length - 1;

                return (
                  <div key={post.id} ref={isLast ? lastPostRef : null}>
                    <div
                      onClick={() => router.push(`/trend/${post.id}`)}
                      className="group relative aspect-3/4 rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full cursor-pointer"
                    >
                      {/* Media */}
                      {mediaUrl ? (
                        isVideo ? (
                          <video
                            src={mediaUrl}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="auto"
                          />
                        ) : (
                          <img
                            src={mediaUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        )
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                          <span className="text-[40px] animate-pulse">✨</span>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-linear-to-t from-neutral-950/90 via-neutral-950/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                      {/* Bottom info */}
                      <div className="absolute inset-x-0 bottom-0 p-4 transform transition-transform duration-500">
                        <div className="flex flex-col items-start justify-between gap-2">
                          {post.tag && (
                            <span className="backdrop-blur-md bg-black/50 border border-white/15 px-2 py-0.5 rounded-full text-[9px] font-black text-white/95 shadow-md uppercase tracking-wider">
                              {post.tag}
                            </span>
                          )}
                          <h3 className="text-base text-start font-black text-white line-clamp-2 leading-tight group-hover:text-[#007AFF] transition-colors">
                            {trendName}
                          </h3>
                        </div>
                      </div>

                      {/* Top right: like button + variable badges */}
                      <div className="absolute top-3.5 right-3.5 flex flex-col items-end gap-1.5 z-10">
                        <div onClick={(e) => e.stopPropagation()}>
                          <LikeButton
                            postId={post.id}
                            botId={post.bot_id}
                            userId={userId}
                            liked={post.liked}
                            likes={post.likes}
                          />
                        </div>
                        {post.variables && post.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-end">
                            {post.variables.map((v: string) => (
                              <span
                                key={v}
                                className="backdrop-blur-md bg-black/50 border border-white/15 px-2 py-0.5 rounded-full text-[9px] font-bold text-white/60 shadow-md"
                              >
                                {`{${v}}`}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Video play icon — top left */}
                      {isVideo && (
                        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                            <Play className="size-4 fill-white text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {isFetchingNextPage && (
            <div className="flex justify-center py-10">
              <Loader2 className="size-7 animate-spin text-white/40" />
            </div>
          )}

          {!isLoading && posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 px-10">
              <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-white/20 flex items-center justify-center mb-4">
                <span className="text-2xl">⚡️</span>
              </div>
              <p className="text-[14px] font-medium">
                {t('noTrends') || 'No trends yet'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
