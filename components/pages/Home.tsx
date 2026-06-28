'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { useInfinitePosts } from '@/hooks/usePosts';
import { useLikePost } from '@/hooks/usePosts';
import { useTranslations } from 'next-intl';
import { Play, Loader2, Heart } from 'lucide-react';
import Image from 'next/image';

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export const Home = () => {
  const t = useTranslations('Home');
  const router = useRouter();

  const { data: userData } = useUser();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfinitePosts({ limit: 12 });

  const posts = data?.pages.flatMap((page) => page.items) || [];
  const tokens = userData?.user?.tokens ?? 0;
  const userId = userData?.user?.user_id ?? 0;

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
      {/* NAV */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4">
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

        <button
          onClick={() => router.push('/pay')}
          className="flex items-center gap-1 px-4 py-2 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/30 text-[#007AFF] text-[13px] font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,122,255,0.3)]"
        >
          <span className="ml-1 opacity-60 font-medium">
            {t('buy') || 'Buy'}
          </span>
          <span className="text-[16px]">◈</span>
          <span>{Math.trunc(tokens)}</span>
        </button>
      </header>

      {/* CONTENT */}
      <section className="px-4 pt-6 pb-32">
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-[24px] font-black text-[#007AFF] tracking-tight">
            {t('trending')}
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
                        <span
                          key={post.tag}
                          className="backdrop-blur-md bg-black/50 border border-white/15 px-2 py-0.5 rounded-full text-[9px] font-black text-white/95 shadow-md uppercase tracking-wider"
                        >
                          {post.tag}
                        </span>
                        <h3 className="text-base text-start font-black text-white line-clamp-2 leading-tight group-hover:text-[#007AFF] transition-colors">
                          {trendName}
                        </h3>

                      </div>
                    </div>

                    {/* Variables badges — top right */}
                    {post.tag && post.tag.length > 0 && (
                      <div className="absolute top-3.5 right-3.5 flex flex-wrap gap-1 justify-end max-w-[85%] z-10">
                        {/* Like button — top right */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <LikeButton
                            postId={post.id}
                            botId={post.bot_id}
                            userId={userId}
                            liked={post.liked}
                            likes={post.likes}
                          />
                        </div>
                      </div>
                    )}

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
      </section>
    </div>
  );
};

export default Home;
