'use client';

import { useParams, useRouter } from 'next/navigation';
import { usePosts } from '@/hooks/usePosts';
import { TrendDetail } from '@/components/pages/Trends'; // I'll need to export TrendDetail from Trends.tsx
import { Loader2 } from 'lucide-react';

const TrendDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const postId = params?.postId as string;
  const { data: postsData, isLoading } = usePosts({ limit: 100 });

  const post = postsData?.items?.find((p: any) => p.id === parseInt(postId));

  if (isLoading) {
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
