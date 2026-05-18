'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { usePaymentLink, usePosts } from '@/hooks/useApiExtras';
import { PaymentDialog } from '@/components/dialogs/PaymentDialog';
import { useTranslations } from 'next-intl';
import { Zap, Play } from 'lucide-react';
import Image from 'next/image';

export const Home = () => {
  const t = useTranslations('Home');
  const router = useRouter();
  const { data: userData } = useUser();
  const { data: paymentUrl } = usePaymentLink();
  const { data: postsData, isLoading: postsLoading } = usePosts({ limit: 12 });
  const posts = postsData?.items || [];
  const tokens = userData?.user?.tokens ?? 0;
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const handleTrendClick = (id: number) => {
    router.push(`/trend/${id}`);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-black/60 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-none border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <Image
              src="/logo-neo.jpg"
              alt=""
              width={38}
              height={38}
              className="rounded-xl"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-black text-white">
              Neo<span className="text-[#007AFF]">AI</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* <button
            onClick={() => router.push('https://t.me/cubixvpnbot?start=HYDylP')}
            className="flex items-center gap-1 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[13px] font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            <Zap className='size-4 fill-blue-400' />
            <span>VPN</span>
          </button> */}
          <button
            onClick={() => {
              if (paymentUrl) setIsPaymentOpen(true);
            }}
            className="flex items-center gap-1 px-4 py-2 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/30 text-[#007AFF] text-[13px] font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,122,255,0.3)]"
          >
            <span className="ml-1 opacity-60 font-medium">
              {t('buy') || 'Buy'}
            </span>
            <span className="text-[16px]">◈</span>
            <span>{Math.trunc(tokens)}</span>
          </button>
        </div>
      </header>

      {/* ── Trends (Higgsfield Style) ── */}
      <section className="px-4 pt-6">
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
          {postsLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-3xl animate-pulse bg-white/5 border border-white/10"
                />
              ))
            : posts.map((post: any) => {
                const media = post.result?.media?.[0] || post.result;
                const isVideo =
                  media?.type === 'video' ||
                  (media?.input &&
                    typeof media.input === 'string' &&
                    media.input.includes('.mp4'));
                const mediaUrl = media?.url || media?.input || post.result?.url;
                const trendName = post.name || post.inputs?.text || t('trend');

                return (
                  <button
                    key={post.id}
                    onClick={() => handleTrendClick(post.id)}
                    className="group relative aspect-3/4 rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                  >
                    {mediaUrl ? (
                      isVideo ? (
                        <video
                          src={mediaUrl}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => e.currentTarget.pause()}
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

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                    {/* Content */}
                    <div className="absolute inset-x-0 bottom-0 p-5 transform transition-transform duration-500">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                          {isVideo ? 'Video' : 'Image'}
                        </div>
                        {post.model_name && (
                          <span className="text-[10px] text-white/40 font-medium">
                            by {post.model_name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-[14px] text-start font-bold text-white line-clamp-2 leading-tight group-hover:text-[#007AFF] transition-colors">
                        {trendName}
                      </h3>
                    </div>

                    {/* Cost Badge */}
                    <div className="absolute top-4 right-4">
                      <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-3 py-1 rounded-full text-[12px] font-bold text-white shadow-lg">
                        ◈ {post.cost || 15}
                      </div>
                    </div>

                    {/* Play icon for video */}
                    {isVideo && (
                      <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                          <Play className="size-4 fill-white text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
        </div>
      </section>

      {/* ── Empty State ── */}
      {!postsLoading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 px-10">
          <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-white/20 flex items-center justify-center mb-4">
            <span className="text-2xl">⚡️</span>
          </div>
          <p className="text-[14px] font-medium">
            {t('noTrends') || 'No trends yet'}
          </p>
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>
      
      {paymentUrl && (
        <PaymentDialog
          url={paymentUrl}
          open={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
        />
      )}
    </div>
  );
};

export default Home;
