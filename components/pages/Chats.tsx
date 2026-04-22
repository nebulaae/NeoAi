'use client';

import { useEffect, useRef } from 'react';
import { useRouter as useChatsRouter, useSearchParams } from 'next/navigation';
import { useChats } from '@/hooks/useChats';
import { useAIModels as useChatsModels } from '@/hooks/useModels';
import { useRoles as useChatsRoles } from '@/hooks/useRoles';
import {
  Avatar as ChatsAvatar,
  AvatarFallback as ChatsFallback,
  AvatarImage as ChatsImage,
} from '@/components/ui/avatar';
import { ChatsLoader } from '@/components/states/Loading';
import { ChatsEmpty } from '@/components/states/Empty';
import { ErrorComponent as ChatsError } from '@/components/states/Error';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { toast as chatsToast } from 'sonner';
import { useHaptic as useChatsHaptic } from '@/hooks/useHaptic';
import { useTranslations } from 'next-intl';

const gc = {
  ultraThin:
    'bg-zinc-950/30 backdrop-blur-2xl border border-white/[.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  thin: 'bg-zinc-900/40 backdrop-blur-xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
};
const springC =
  'transition-all duration-[260ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

function cacheDialogueModel(
  dialogueId: string,
  model: string,
  version: string,
  roleId: number | null | undefined
) {
  try {
    sessionStorage.setItem(
      `dialogue_model_${dialogueId}`,
      JSON.stringify({ model, version, role_id: roleId ?? null })
    );
  } catch {}
}

export const Chats = () => {
  const t = useTranslations('Chats');
  const router = useChatsRouter();
  const searchParams = useSearchParams();
  const haptic = useChatsHaptic();
  const modelParam = searchParams.get('model');
  const roleParam = searchParams.get('role');
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useChats();
  const { data: models } = useChatsModels();
  const { data: roles } = useChatsRoles();
  const chats = data?.pages.flatMap((p) => p) ?? [];
  const startedRef = useRef(false);

  useEffect(() => {
    if (!modelParam && !roleParam) return;
    if (startedRef.current) return;
    const modelsReady = !!models;
    const rolesReady = roleParam ? !!roles : true;
    if (!modelsReady || !rolesReady) return;

    const role = roleParam
      ? roles?.find((r) => r.id === parseInt(roleParam))
      : null;
    if (roleParam && !role) {
      chatsToast.error(t('assistantNotFound'));
      router.replace('/chats');
      return;
    }

    let techName: string | null = null,
      version: string | undefined;
    if (modelParam) {
      const model = models?.find((m) => m.tech_name === modelParam);
      if (!model) {
        chatsToast.error(t('modelNotFound'));
        router.replace('/chats');
        return;
      }
      techName = model.tech_name;
      version = (model.versions?.find((v) => v.default) || model.versions?.[0])
        ?.label;
    } else if (roleParam && role) {
      const textModel = models?.find(
        (m) => m.categories?.includes('text') || m.mainCategory === 'text'
      );
      techName = textModel?.tech_name || null;
      version = (
        textModel?.versions?.find((v) => v.default) || textModel?.versions?.[0]
      )?.label;
    }
    if (!techName) {
      chatsToast.error(t('suitableModelNotFound'));
      router.replace('/chats');
      return;
    }

    startedRef.current = true;
    const params = new URLSearchParams({
      model: techName,
      ...(version ? { version } : {}),
      ...(role ? { role: String(role.id) } : {}),
    });
    router.replace(`/chats/new?${params.toString()}`);
  }, [modelParam, roleParam, models, roles]);

  if (isError)
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <ChatsError
          title={t('error')}
          description={t('errorLoadChats')}
          onRetry={refetch}
        />
      </div>
    );

  if ((modelParam || roleParam) && !startedRef.current && (models || roles))
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="size-6 animate-spin text-white/30" />
        <p className="text-[13px] text-white/40">{t('openingChat')}</p>
      </div>
    );

  return (
    <div className="flex flex-col h-full pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] w-full max-w-2xl mx-auto">
      {/* Header */}
      <div
        className={cn(
          'sticky top-0 z-40 flex items-center justify-between px-5 py-4',
          gc.ultraThin,
          'border-x-0 border-t-0 rounded-none'
        )}
      >
        <span className="text-[24px] font-bold tracking-[-0.4px] text-white/90">
          {t('title')}
        </span>
        <button
          onClick={() => {
            haptic.light();
            router.push('/models');
          }}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            gc.thin,
            springC,
            'active:scale-[0.88]'
          )}
          title={t('newChat')}
        >
          <MessageSquarePlus className="size-4 text-white/40" />
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {isLoading ? (
          <ChatsLoader />
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center flex-1 p-8">
            <ChatsEmpty />
          </div>
        ) : (
          <>
            {chats.map((chat) => {
              const displayName =
                chat.version || chat.title || chat.model || t('dialogue');
              return (
                <button
                  key={chat.dialogue_id}
                  onClick={() => {
                    haptic.light();
                    if (chat.model)
                      cacheDialogueModel(
                        chat.dialogue_id,
                        chat.model,
                        chat.version,
                        chat.role_id
                      );
                    router.push(`/chats/${chat.dialogue_id}`);
                  }}
                  className={cn(
                    'flex items-center gap-3 px-5 py-4 w-full text-left',
                    'border-b border-white/5',
                    'bg-transparent',
                    springC,
                    'hover:bg-white/3 active:bg-white/5'
                  )}
                >
                  <ChatsAvatar className="size-12 rounded-[13px] border border-white/10 shrink-0">
                    <ChatsImage
                      src={
                        chat.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=18181b&color=ffffff`
                      }
                    />
                    <ChatsFallback className="rounded-[13px] bg-white/7 text-[13px] font-bold text-white/50">
                      {displayName.slice(0, 2).toUpperCase()}
                    </ChatsFallback>
                  </ChatsAvatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-semibold text-white/85 truncate">
                      {chat.title || displayName}
                    </div>
                    <div className='flex items-center gap-1'>
                      <span className="text-[13px] text-white/35 mt-0.5 flex items-center gap-1.5">
                        <span>{chat.title === null ? null : displayName}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-white/30">
                      {timeAgo(chat.last_activity || chat.started_at)}
                    </span>
                    <span className="text-white/20 text-[13px]">›</span>
                  </div>
                </button>
              );
            })}
            {hasNextPage && (
              <div className="p-4">
                <button
                  onClick={() => {
                    haptic.light();
                    fetchNextPage();
                  }}
                  disabled={isFetchingNextPage}
                  className={cn(
                    'w-full py-3 rounded-2xl text-[13px] font-medium text-white/50',
                    gc.thin,
                    springC,
                    'active:scale-[0.97]'
                  )}
                >
                  {isFetchingNextPage ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" />{' '}
                      {t('loading')}
                    </span>
                  ) : (
                    t('loadMore')
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Chats;
