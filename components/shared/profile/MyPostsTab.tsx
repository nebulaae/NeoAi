'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useInfiniteAllPosts } from '@/hooks/usePosts';
import { TrendCard } from '@/components/pages/Trends';
import { useUser } from '@/hooks/useUser';
import { useHaptic } from '@/hooks/useHaptic';
import { Loader2, ImageIcon } from 'lucide-react';

export function MyPostsTab() {
  const t = useTranslations('Profile');
  const haptic = useHaptic();
  const { data: userData } = useUser();
  const userId = userData?.user?.user_id ?? (userData?.user as any)?.id ?? 0;

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAllPosts(
    { user_id: userId, limit: 12 },
    { enabled: !!userId }
  );

  const posts = data?.pages.flatMap((page) => page.items) || [];
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
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-white/30">
          {t('myPostsTitle') || 'Мои посты'}
        </h3>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-3/4 rounded-3xl bg-zinc-900 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {posts.map((post, index) => {
            const isLast = index === posts.length - 1;
            return (
              <div key={post.id} ref={isLast ? lastPostRef : null}>
                <TrendCard post={post} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center gap-3 opacity-25">
          <ImageIcon size={40} />
          <p className="text-[13px] font-bold uppercase tracking-widest text-center px-4">
            {t('noMyPosts') || 'Постов пока нет'}
          </p>
        </div>
      )}

      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-7 animate-spin text-white/40" />
        </div>
      )}
    </div>
  );
}
