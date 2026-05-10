'use client';

import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { useUser } from '@/hooks/useUser';
import { useUI, usePaymentLink, usePosts } from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ErrorComponent } from '@/components/states/Error';
import { localize } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Design tokens ─── */
const g = {
  ultraThin:
    'bg-zinc-950/30 backdrop-blur-2xl backdrop-saturate-150 border border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]',
  thin: 'bg-zinc-900/40 backdrop-blur-xl backdrop-saturate-150 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  regular:
    'bg-zinc-900/50 backdrop-blur-2xl backdrop-saturate-180 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_20px_rgba(0,0,0,0.30)]',
  thick:
    'bg-zinc-900/60 backdrop-blur-3xl backdrop-saturate-200 border border-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]',
};
const spring =
  'transition-all duration-[260ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

/* ─── Skeleton shimmer ─── */
const Shimmer = ({
  w,
  h,
  circle,
  rounded,
}: {
  w: string;
  h: string;
  circle?: boolean;
  rounded?: string;
}) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: circle ? '9999px' : rounded || '10px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.07)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)',
        animation: 'shimmer 1.8s infinite',
        backgroundSize: '200% 100%',
      }}
    />
  </div>
);

export const Home = () => {
  const t = useTranslations('Home');
  const router = useRouter();
  const {
    data: models,
    isLoading: modelsLoading,
    isError,
    refetch,
  } = useAIModels();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: postsData, isLoading: postsLoading } = usePosts({ limit: 4 });
  const posts = postsData?.items || [];
  const { data: userData } = useUser();
  const { data: paymentUrl } = usePaymentLink();

  const displayModels = models?.slice(0, 8) || [];
  const displayRoles = roles?.slice(0, 5) || [];
  const tokens = userData?.user?.tokens ?? 0;

  const handleModelClick = (techName: string, mainCategory?: string) =>
    router.push(`/generate?model=${techName}`);

  const handleRoleClick = (id: number) => router.push(`/chats?role=${id}`);

  const handleTrendClick = (item: any) => {
    if (item.tech_name) {
      const model = models?.find((m) => m.tech_name === item.tech_name);
      router.push(`/generate?model=${item.tech_name}`);
    } else if (item.model) {
      router.push(`/generate?model=${item.model}`);
    } else if (item.role_id) {
      router.push(`/chats?role=${item.role_id}`);
    }
  };

  if (isError)
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <ErrorComponent
          title={t('error')}
          description={t('errorLoadData')}
          onRetry={refetch}
        />
      </div>
    );

  return (
    <div className="pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] max-w-2xl mx-auto">
      {/* ── Nav ── */}
      <header
        className={`sticky top-0 z-40 flex items-center justify-between px-5 py-4 ${g.ultraThin} border-x-0 border-t-0 rounded-none`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-[9px] flex items-center justify-center ${g.thin}`}
          >
            <span className="text-[14px]">✦</span>
          </div>
          <span className="text-[20px] font-bold tracking-[-0.3px] text-white/90">
            NeoAI
          </span>
        </div>
        <div className='flex items-center gap-1'>
          <button
            onClick={() => router.push('https://t.me/cubixvpnbot?start=HYDylP')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${g.thin} ${spring} active:scale-[0.94] text-[13px] font-medium text-white/70`}
          >
            <Zap className='size-4 text-[#007AFF]' />
            <span className="text-[14px]">Vpn</span>
          </button>
          <button
            onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${g.thin} ${spring} active:scale-[0.94] text-[13px] font-medium text-white/70`}
          >
            <span className="text-[#007AFF] text-[16px]">◈</span>
            <span className=''>{Math.trunc(tokens)}</span>
          </button>
        </div>
      </header>

      {/* ── Models ── */}
      <section className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[14px] font-semibold tracking-[0.8px] uppercase text-white/40">
            {t('models')}
          </span>
          <button
            onClick={() => router.push('/models')}
            className={`text-[14px] font-medium text-white/50 px-2.5 py-1 rounded-lg ${g.ultraThin} ${spring} active:scale-[0.94]`}
          >
            {t('all')} →
          </button>
        </div>
        <div className="grid grid-cols-4 gap-y-5 gap-x-2">
          {modelsLoading
            ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Shimmer w="52px" h="52px" circle />
                <Shimmer w="40px" h="9px" />
              </div>
            ))
            : displayModels.map((m) => (
              <button
                key={m.tech_name}
                onClick={() => handleModelClick(m.tech_name, m.mainCategory)}
                className={`flex flex-col items-center gap-2 p-0 bg-transparent border-none cursor-pointer ${spring} active:scale-[0.88]`}
              >
                <div
                  className={`w-[52px] h-[52px] rounded-full overflow-hidden ${g.thin}`}
                >
                  <Avatar className="size-full">
                    <AvatarImage
                      src={
                        m.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=18181b&color=fff`
                      }
                    />
                    <AvatarFallback className="text-[14px] font-semibold bg-transparent text-white/60">
                      {m.model_name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-[12px] font-medium text-white/50 max-w-[56px] text-center truncate leading-tight">
                  {m.model_name}
                </span>
              </button>
            ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="h-px bg-white/[.06] mx-5 my-5" />

      {/* ── Assistants ── */}
      <section className="pb-2">
        <div className="flex items-center justify-between px-5 mb-4">
          <span className="text-[14px] font-semibold tracking-[0.8px] uppercase text-white/40">
            {t('aiAssistants')}
          </span>
          <button
            onClick={() => router.push('/chats')}
            className={`text-[14px] font-medium text-white/50 px-2.5 py-1 rounded-lg ${g.ultraThin} ${spring} active:scale-[0.94]`}
          >
            {t('all')} →
          </button>
        </div>
        <div
          className="flex gap-3 px-5 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {rolesLoading
            ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 flex flex-col items-center gap-2"
              >
                <Shimmer w="56px" h="56px" rounded="14px" />
                <Shimmer w="48px" h="9px" />
              </div>
            ))
            : displayRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleClick(role.id)}
                className={`shrink-0 flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer ${spring} active:scale-[0.88]`}
              >
                <div
                  className={`w-14 h-14 rounded-[16px] overflow-hidden ${g.thin}`}
                >
                  <Avatar className="size-full rounded-none">
                    <AvatarImage src={role.image || ''} />
                    <AvatarFallback className="text-[20px] bg-transparent">
                      {localize(role.label).slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-[12px] font-medium text-white/50 w-14 text-center truncate">
                  {localize(role.label)}
                </span>
              </button>
            ))}
        </div>
      </section>

      <div className="h-px bg-white/[.06] mx-5 my-5" />

      {/* ── Trending ── */}
      <section className="px-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[14px] font-semibold tracking-[0.8px] uppercase text-white/40">
            {t('trending')}
          </span>
          <button
            onClick={() => router.push('/trends')}
            className={`text-[14px] font-medium text-[#4FC3F7] ${spring} active:scale-[0.94]`}
          >
            {t('all')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          {postsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'aspect-3/4 rounded-2xl animate-pulse bg-white/5 border border-white/10'
                  )}
                />
              ))
            : posts.map((post: any) => (
                <button
                  key={post.id}
                  onClick={() => router.push(`/trends?post=${post.id}`)}
                  className={cn(
                    'relative aspect-3/4 rounded-2xl overflow-hidden text-left group',
                    g.thin,
                    spring,
                    'active:scale-[0.96]'
                  )}
                >
                  {(post.result?.url || post.result?.media?.[0]?.input) ? (
                    <img
                      src={post.result.url || post.result.media?.[0]?.input}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                      <span className="text-[32px]">✨</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/80 via-black/20 to-transparent">
                    <span className="text-[13px] font-semibold text-white/90 line-clamp-2 leading-tight">
                      {post.inputs?.text || t('trend')}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full text-[11px] font-bold text-white">
                      💎 {post.cost || 15}
                    </div>
                  </div>
                </button>
              ))}
        </div>
      </section>

      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>
    </div>
  );
};

export default Home;
