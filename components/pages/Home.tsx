'use client';

import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { useUser } from '@/hooks/useUser';
import { useUI, usePaymentLink } from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ErrorComponent } from '@/components/states/Error';
import { localize } from '@/lib/utils';
import { useTranslations } from 'next-intl';

/* ─── Design tokens ─── */
const g = {
  ultraThin:
    'bg-zinc-950/30 backdrop-blur-2xl backdrop-saturate-150 border border-white/[.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]',
  thin: 'bg-zinc-900/40 backdrop-blur-xl backdrop-saturate-150 border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  regular:
    'bg-zinc-900/50 backdrop-blur-2xl backdrop-saturate-180 border border-white/[.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_20px_rgba(0,0,0,0.30)]',
  thick:
    'bg-zinc-900/60 backdrop-blur-3xl backdrop-saturate-200 border border-white/[.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]',
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
  const { data: trends, isLoading: trendsLoading } = useUI('trends');
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: userData } = useUser();
  const { data: paymentUrl } = usePaymentLink();

  const displayModels = models?.slice(0, 8) || [];
  const displayRoles = roles?.slice(0, 5) || [];
  const tokens = userData?.user?.tokens ?? 0;

  const handleModelClick = (techName: string, mainCategory?: string) =>
    mainCategory === 'text'
      ? router.push(`/chats?model=${techName}`)
      : router.push(`/generate?model=${techName}`);

  const handleRoleClick = (id: number) => router.push(`/chats?role=${id}`);

  const handleTrendClick = (item: any) => {
    if (item.tech_name) {
      const model = models?.find((m) => m.tech_name === item.tech_name);
      if (model) {
        model.mainCategory === 'text'
          ? router.push(`/chats?model=${item.tech_name}`)
          : router.push(`/generate?model=${item.tech_name}`);
      } else {
        const textKeywords = [
          'gpt',
          'claude',
          'gemini',
          'llama',
          'mistral',
          'chat',
        ];
        const isText = textKeywords.some((kw) =>
          item.tech_name.toLowerCase().includes(kw)
        );
        router.push(
          isText
            ? `/chats?model=${item.tech_name}`
            : `/generate?model=${item.tech_name}`
        );
      }
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
            className={`w-7 h-7 rounded-[9px] flex items-center justify-center ${g.thin}`}
          >
            <span className="text-[13px]">✦</span>
          </div>
          <span className="text-[17px] font-semibold tracking-[-0.3px] text-white/90">
            NeoAI
          </span>
        </div>
        <button
          onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${g.thin} ${spring} active:scale-[0.94] text-[13px] font-medium text-white/70`}
        >
          <span className="text-[11px]">◈</span>
          <span>{tokens}</span>
        </button>
      </header>

      {/* ── Models ── */}
      <section className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold tracking-[0.8px] uppercase text-white/40">
            {t('models')}
          </span>
          <button
            onClick={() => router.push('/models')}
            className={`text-[12px] font-medium text-white/50 px-2.5 py-1 rounded-lg ${g.ultraThin} ${spring} active:scale-[0.94]`}
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
                      <AvatarFallback className="text-[12px] font-semibold bg-transparent text-white/60">
                        {m.model_name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-[10px] font-medium text-white/50 max-w-[56px] text-center truncate leading-tight">
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
          <span className="text-[11px] font-semibold tracking-[0.8px] uppercase text-white/40">
            {t('aiAssistants')}
          </span>
          <button
            onClick={() => router.push('/chats')}
            className={`text-[12px] font-medium text-white/50 px-2.5 py-1 rounded-lg ${g.ultraThin} ${spring} active:scale-[0.94]`}
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
                  <span className="text-[10px] font-medium text-white/50 w-14 text-center truncate">
                    {localize(role.label)}
                  </span>
                </button>
              ))}
        </div>
      </section>

      <div className="h-px bg-white/[.06] mx-5 my-5" />

      {/* ── Trending ── */}
      <section className="px-5 pb-4">
        <span className="block text-[11px] font-semibold tracking-[0.8px] uppercase text-white/40 mb-4">
          {t('trending')}
        </span>
        <div className="flex flex-col gap-2">
          {trendsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Shimmer key={i} w="100%" h="54px" rounded="16px" />
              ))
            : ((trends as any[]) || []).length === 0
              ? (
                  [
                    {
                      icon: '✦',
                      title: t('trend1'),
                      href: '/generate',
                    },
                    { icon: '◈', title: t('trend2'), href: '/chats' },
                    { icon: '▶', title: t('trend3'), href: '/generate' },
                    { icon: '♫', title: t('trend4'), href: '/generate' },
                  ] as any[]
                ).map((item) => (
                  <button
                    key={item.title}
                    onClick={() => router.push(item.href)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl w-full text-left ${g.thin} ${spring} active:scale-[0.985] active:bg-white/8`}
                  >
                    <span className="text-white/40 text-[15px] w-6 text-center shrink-0">
                      {item.icon}
                    </span>
                    <span className="text-[14px] font-medium text-white/80 flex-1">
                      {item.title}
                    </span>
                    <span className="text-white/20 text-[12px]">›</span>
                  </button>
                ))
              : (trends as any[]).map((item: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleTrendClick(item)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl w-full text-left ${g.thin} ${spring} active:scale-[0.985] active:bg-white/8`}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="w-8 h-8 rounded-[10px] object-cover shrink-0"
                      />
                    ) : (
                      <span className="text-white/40 text-[15px] w-6 text-center shrink-0">
                        ✦
                      </span>
                    )}
                    <span className="text-[14px] font-medium text-white/80 flex-1">
                      {localize(item.title)}
                    </span>
                    <span className="text-white/20 text-[12px]">›</span>
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
