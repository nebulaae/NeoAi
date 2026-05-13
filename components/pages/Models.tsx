'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModelsEmpty } from '@/components/states/Empty';
import { ErrorComponent } from '@/components/states/Error';
import { useHaptic } from '@/hooks/useHaptic';
import { cn, localize } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const SkeletonRow = () => (
  <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5 animate-pulse">
    <div className="w-14 h-14 rounded-2xl bg-white/10 shrink-0" />
    <div className="flex-1 flex flex-col gap-2">
      <div className="w-[40%] h-4 rounded-md bg-white/10" />
      <div className="w-[25%] h-3 rounded-md bg-white/5" />
    </div>
    <div className="w-12 h-6 rounded-full bg-white/5" />
  </div>
);

export const Models = () => {
  const t = useTranslations('Models');
  const [tab, setTab] = useState<string>('all');
  const router = useRouter();
  const haptic = useHaptic();
  const { data: models, isLoading, isError, refetch } = useAIModels();
  const { data: roles, isLoading: rolesLoading } = useRoles();

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
      <div className="flex items-center justify-center min-h-svh p-6 bg-black">
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
          (m: any) => m.categories?.includes(tab) || m.mainCategory === tab
        );

  const handleModelClick = (techName: string) => {
    haptic.light();
    router.push(`/generate?model=${techName}`);
  };

  const handleRoleClick = (id: number) => {
    haptic.light();
    router.push(`/chats?role=${id}`);
  };

  return (
    <div className="flex flex-col min-h-svh pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] bg-black">
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-5 bg-black/60 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-[26px] font-bold tracking-tight text-white">
            {t('title')}
          </h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[73px] z-30 bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div
          className="max-w-2xl mx-auto flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar"
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
                  'shrink-0 px-5 py-2 rounded-full text-[14px] font-semibold transition-all active:scale-95 whitespace-nowrap',
                  active
                    ? 'bg-[#007AFF] text-white shadow-[0_0_20px_rgba(0,122,255,0.4)]'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                )}
              >
                {tabItem.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4">
        {/* Assistants Section (only on 'all' tab or 'text') */}
        {(tab === 'all' || tab === 'text') && !rolesLoading && roles && roles.length > 0 && (
          <section className="py-6">
            <h2 className="text-[14px] font-bold uppercase tracking-widest text-white/30 mb-4 px-2">
              {t('aiAssistants') || 'AI Assistants'}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleClick(role.id)}
                  className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-white/20 transition-all group active:scale-95"
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-lg transition-transform group-hover:scale-105">
                     <Avatar className="size-full rounded-none">
                        <AvatarImage src={role.image || ''} />
                        <AvatarFallback className="text-xl bg-zinc-800">
                          {localize(role.label).slice(0, 1)}
                        </AvatarFallback>
                     </Avatar>
                  </div>
                  <div className="text-center">
                    <p className="text-[15px] font-bold text-white group-hover:text-[#007AFF] transition-colors">
                      {localize(role.label)}
                    </p>
                    <p className="text-[11px] text-white/40 line-clamp-1 mt-0.5">
                      {localize(role.description)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Models Section */}
        <section className="py-6">
          <h2 className="text-[14px] font-bold uppercase tracking-widest text-white/30 mb-4 px-2">
            {tab === 'all' ? t('catAll') || 'All Models' : CATEGORY_LABEL[tab]}
          </h2>
          <div className="flex flex-col gap-2">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <div className="py-12">
                <ModelsEmpty />
              </div>
            ) : (
              filtered.map((m: any) => {
                const defVersion = m.versions?.find((v: any) => v.default) || m.versions?.[0];
                const cost = defVersion?.cost ?? 1;
                const catKey = m.mainCategory || '';
                const catIcon = CAT_ICON[catKey] || '✦';
                const avatarUrl = m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=18181b&color=ffffff&size=128`;
                
                return (
                  <button
                    key={m.tech_name}
                    onClick={() => handleModelClick(m.tech_name)}
                    className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-white/15 transition-all group active:scale-[0.985]"
                  >
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                      <Avatar className="size-full">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="text-lg font-bold bg-zinc-800">
                          {m.model_name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 flex flex-col items-start min-w-0">
                      <p className="text-[17px] font-bold text-white group-hover:text-[#007AFF] transition-colors truncate">
                        {m.model_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[12px] text-white/40">
                        <span>{catIcon}</span>
                        <span>{CATEGORY_LABEL[catKey] || 'AI'}</span>
                        {m.versions && m.versions.length > 1 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] font-bold uppercase tracking-wider">
                            {t('versions', { count: m.versions.length })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[13px] font-bold text-white/60">
                         ◈ {cost}
                      </div>
                      <span className="text-white/20 group-hover:text-white transition-colors">›</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>
      <style>{`@keyframes pulse-opacity{0%,100%{opacity:1}50%{opacity:.35}}.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
};

export default Models;
