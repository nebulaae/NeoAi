'use client';

import { useParams, useRouter } from 'next/navigation';
import { usePost, Post } from '@/hooks/usePosts';
import { TrendDetail } from '@/components/pages/Trends';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const TrendDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const postId = params?.postId as string;

  // 1. Сначала пробуем из sessionStorage (кликнул из Trends)
  const [cachedPost, setCachedPost] = useState<Post | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`trend_post_${postId}`);
      if (raw) setCachedPost(JSON.parse(raw));
    } catch {}
    setCacheChecked(true);
  }, [postId]);

  // 2. Фоллбэк через API /posts/one
  const { data: apiPost, isLoading } = usePost(postId);

  const post = cachedPost ?? apiPost;

  // Ждём проверки кэша, потом ждём API если нет кэша
  const loading = !cacheChecked || (!cachedPost && isLoading);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="size-10 text-[#007AFF] animate-spin" />
      </div>
    );
  }

  if (!post) {
    router.replace('/trends');
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      <TrendDetail post={post} onBack={() => router.back()} />
    </div>
  );
};

export default TrendDetailPage;
