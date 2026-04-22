'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModelsEmpty } from '@/components/states/Empty';
import { ErrorComponent } from '@/components/states/Error';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const g = {
  ultraThin:
    'bg-zinc-950/30 backdrop-blur-2xl border border-white/[.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  thin: 'bg-zinc-900/40 backdrop-blur-xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  thick:
    'bg-zinc-900/60 backdrop-blur-3xl border border-white/[.13] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_32px_rgba(0,0,0,0.32)]',
};
const spring =
  'transition-all duration-[260ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

const SkeletonRow = () => (
  <div className="flex items-center gap-3.5 px-5 py-3.5 border-b border-white/[.05]">
    <div
      className={cn(
        'w-11 h-11 rounded-[13px] shrink-0',
        g.thin,
        'animate-[pulse-opacity_1.6s_ease-in-out_infinite]'
      )}
    />
    <div className="flex-1 flex flex-col gap-1.5">
      <div
        className={cn(
          'w-[40%] h-3 rounded-md',
          g.thin,
          'animate-[pulse-opacity_1.6s_ease-in-out_0.1s_infinite]'
        )}
      />
      <div
        className={cn(
          'w-[22%] h-2.5 rounded-md',
          g.thin,
          'animate-[pulse-opacity_1.6s_ease-in-out_0.2s_infinite]'
        )}
      />
    </div>
    <div
      className={cn(
        'w-10 h-5 rounded-full',
        g.thin,
        'animate-[pulse-opacity_1.6s_ease-in-out_0.15s_infinite]'
      )}
    />
  </div>
);

export const Models = () => {
  const t = useTranslations('Models');
  const [tab, setTab] = useState<string>('all');
  const router = useRouter();
  const haptic = useHaptic();
  const { data: models, isLoading, isError, refetch } = useAIModels();

  const TABS = [
    { key: 'all', label: t('tabAll') },
    { key: 'text', label: t('tabText') },
    { key: 'image', label: t('tabImage') },
    { key: 'video', label: t('tabVideo') },
    { key: 'audio', label: t('tabAudio') },
  ] as const;

  const CATEGORY_LABEL: Record<string, string> = {
    text: t('catText'),
    image: t('catImage'),
    video: t('catVideo'),
    audio: t('catAudio'),
  };
  const CAT_ICON: Record<string, string> = {
    text: '✦',
    image: '◈',
    video: '▶',
    audio: '♫',
  };

  if (isError)
    return (
      <div className="flex items-center justify-center min-h-svh p-6">
        <ErrorComponent
          title={t('error')}
          description={t('errorDescription')}
          onRetry={refetch}
        />
      </div>
    );

  const filtered =
    tab === 'all'
      ? models || []
      : (models || []).filter(
          (m) => m.categories?.includes(tab) || m.mainCategory === tab
        );

  const handleModelClick = (techName: string, mainCategory?: string) => {
    haptic.light();
    mainCategory === 'text'
      ? router.push(`/chats?model=${techName}`)
      : router.push(`/generate?model=${techName}`);
  };

  return (
    <div className="flex flex-col min-h-svh pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] overflow-x-hidden">
      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-40 px-5 py-4',
          g.ultraThin,
          'border-x-0 border-t-0 rounded-none'
        )}
      >
        <div className="max-w-2xl mx-auto">
          <span className="text-[24px] font-bold tracking-[-0.4px] text-white/90">
            {t('title')}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div
        className={cn(
          'sticky top-[57px] z-39',
          g.ultraThin,
          'border-x-0 border-t-0 rounded-none border-b border-white/[.07]'
        )}
      >
        <div
          className="max-w-2xl mx-auto flex gap-1.5 px-4 py-2.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {TABS.map((tabItem) => {
            const active = tab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                onClick={() => {
                  haptic.selection();
                  setTab(tabItem.key);
                }}
                className={cn(
                  'shrink-0 px-3.5 py-1.5 rounded-full text-[14px] font-medium cursor-pointer whitespace-nowrap',
                  spring,
                  'active:scale-[0.93]',
                  active
                    ? cn(g.thick, 'text-white/90')
                    : cn(g.thin, 'text-white/40')
                )}
              >
                {tabItem.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1">
        <div className="max-w-2xl mx-auto">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filtered.length === 0 ? (
            <div className="p-12">
              <ModelsEmpty />
            </div>
          ) : (
            filtered.map((m, idx) => {
              const defVersion =
                m.versions?.find((v) => v.default) || m.versions?.[0];
              const cost = defVersion?.cost ?? 1;
              const catKey = m.mainCategory || '';
              const catLabel = CATEGORY_LABEL[catKey] || 'AI';
              const catIcon = CAT_ICON[catKey] || '✦';
              const avatarUrl =
                m.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=18181b&color=ffffff&size=128`;
              const isLast = idx === filtered.length - 1;
              return (
                <button
                  key={m.tech_name}
                  onClick={() => handleModelClick(m.tech_name, m.mainCategory)}
                  className={cn(
                    'flex items-center gap-3.5 px-5 py-3.5 w-full text-left bg-transparent border-none cursor-pointer',
                    !isLast && 'border-b border-white/5',
                    spring,
                    'hover:bg-white/3 active:bg-white/5 active:scale-[0.985]'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-[13px] overflow-hidden shrink-0',
                      g.thin
                    )}
                  >
                    <Avatar className="size-full">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="text-[12px] font-semibold bg-transparent text-white/50">
                        {m.model_name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-white/85 truncate tracking-[-0.2px]">
                      {m.model_name}
                    </p>
                    <p className="text-[12px] text-white/35 mt-0.5 flex items-center gap-1.5">
                      <span className="text-[12px]">{catIcon}</span>
                      <span>{catLabel}</span>
                      {m.versions && m.versions.length > 1 && (
                        <>
                          <span className="opacity-40 font-extrabold">·</span>
                          <span>
                            {t('versions', { count: m.versions.length })}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[13px] font-medium text-white/35',
                        g.thin
                      )}
                    >
                      ◈ {cost}
                    </div>
                    <span className="text-white/20 text-[13px]">›</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      <style>{`@keyframes pulse-opacity{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  );
};

export default Models;
