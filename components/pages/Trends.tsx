'use client';

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  memo,
} from 'react';

import { useTranslations } from 'next-intl';

import { useInfinitePosts, Post } from '@/hooks/usePosts';

import { useRouter, useSearchParams } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';

import {
  Sparkles,
  AlertCircle,
  Loader2,
  Play,
} from 'lucide-react';

import { useHaptic } from '@/hooks/useHaptic';

const ACCENT_BLUE = '#007AFF';

export const Trends = () => {
  const t = useTranslations('Trends');

  const router = useRouter();

  const searchParams = useSearchParams();

  const postParam =
    searchParams?.get('post');

  const haptic = useHaptic();

  const [selectedPost, setSelectedPost] =
    useState<Post | null>(null);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePosts({
    limit: 12,
  });

  const posts =
    data?.pages.flatMap(
      (page) => page.items
    ) || [];

  const observer =
    useRef<IntersectionObserver | null>(
      null
    );

  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current)
        observer.current.disconnect();

      observer.current =
        new IntersectionObserver(
          (entries) => {
            if (
              entries[0].isIntersecting &&
              hasNextPage &&
              !isFetchingNextPage
            ) {
              fetchNextPage();
            }
          },
          {
            rootMargin: '300px',
          }
        );

      if (node)
        observer.current.observe(node);
    },
    [
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
    ]
  );

  useEffect(() => {
    if (
      postParam &&
      posts.length > 0
    ) {
      const post = posts.find(
        (x) =>
          x.id === Number(postParam)
      );

      if (post)
        setSelectedPost(post);
    }
  }, [postParam, posts]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center bg-black">
        <div className="w-20 h-20 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <AlertCircle className="size-10 text-red-500" />
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          {t('error')}
        </h2>

        <p className="text-white/40 font-medium max-w-[240px]">
          {t('errorDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-32 max-w-2xl mx-auto w-full bg-black">
      <AnimatePresence mode="wait">
        {!selectedPost ? (
          <motion.div
            key="grid"
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -20,
            }}
            className="px-6 pt-12"
          >
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-[34px] font-black tracking-tight text-[#007AFF] leading-none">
                  {t('title')}
                </h1>

                <div className="w-8 h-8 rounded-xl bg-[#007AFF]/20 flex items-center justify-center">
                  <Sparkles
                    size={18}
                    className="text-[#007AFF]"
                  />
                </div>
              </div>

              <p className="text-white/40 text-[16px] font-medium leading-relaxed max-w-[320px]">
                {t('subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {isLoading
                ? Array.from({
                  length: 6,
                }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-3/4 rounded-3xl bg-zinc-900 border border-white/5 animate-pulse"
                  />
                ))
                : posts.map(
                  (
                    post,
                    index
                  ) => {
                    const isLast =
                      index ===
                      posts.length -
                      1;

                    return (
                      <div
                        key={post.id}
                        ref={
                          isLast
                            ? lastPostRef
                            : null
                        }
                      >
                        <TrendCard
                          post={post}
                        />
                      </div>
                    );
                  }
                )}
            </div>

            {isFetchingNextPage && (
              <div className="flex justify-center py-10">
                <Loader2 className="size-7 animate-spin text-white/40" />
              </div>
            )}
          </motion.div>
        ) : (
          <div />
        )}
      </AnimatePresence>
    </div>
  );
};

const TrendCard = memo(
  ({ post }: { post: Post }) => {
    const t =
      useTranslations('Trends');

    const router = useRouter();

    const haptic = useHaptic();

    const onClick = useCallback(() => {
      haptic.light();

      router.push(
        `/trend/${post.id}`
      );
    }, [post.id, router, haptic]);

    const result = post.result as any;

    const media =
      result?.media?.[0] || result;

    const isVideo =
      media?.type === 'video' ||
      (typeof media?.input === 'string' &&
        media.input.includes('.mp4'));

    const mediaUrl =
      media?.url ||
      media?.input ||
      result?.url;

    const trendName =
      (post as any).name ||
      post.inputs?.text ||
      t('trend');

    return (
      <motion.button
        whileHover={{
          scale: 1.02,
        }}
        whileTap={{
          scale: 0.96,
        }}
        onClick={onClick}
        className="group relative aspect-3/4 rounded-3xl overflow-hidden cursor-pointer border border-white/10 bg-zinc-900 transition-all duration-500 hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full"
      >
        {mediaUrl ? (
          isVideo ? (
            <video
              src={mediaUrl}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              muted
              loop
              playsInline
              onMouseEnter={(e) =>
                e.currentTarget.play()
              }
              onMouseLeave={(e) =>
                e.currentTarget.pause()
              }
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
            <span className="text-[32px] animate-pulse">
              ✨
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

        <div className="absolute top-3 right-3">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
            <span className="text-[11px] font-black text-white">
              {post.cost ?? 15}
            </span>

            <span className="text-[10px] text-[#007AFF]">
              ◈
            </span>
          </div>
        </div>

        {isVideo && (
          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
              <Play className="size-4 fill-white text-white" />
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3 text-start">
          <h3 className="text-white text-[14px] font-bold line-clamp-1 leading-tight group-hover:text-[#007AFF] transition-colors">
            {trendName}
          </h3>

          {post.model_name && (
            <p className="text-[10px] text-white/40 font-medium mt-0.5">
              by {post.model_name}
            </p>
          )}
        </div>
      </motion.button>
    );
  }
);

TrendCard.displayName = 'TrendCard';

export default Trends;