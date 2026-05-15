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
import {
  MessageSquarePlus,
  Loader2,
  ChevronRight,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { toast as chatsToast } from 'sonner';
import { useHaptic as useChatsHaptic } from '@/hooks/useHaptic';
import { useTranslations } from 'next-intl';

const ACCENT_BLUE = '#007AFF';

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
    if (!models || (roleParam && !roles)) return;
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
  }, [modelParam, roleParam, models, roles, router, t]);

  if (isError)
    return (
      <div className="flex items-center justify-center min-h-svh p-8 bg-black text-center">
        <div className="max-w-xs flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <MessageSquare size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">
              {t('error')}
            </h2>
            <p className="text-white/40 font-medium leading-relaxed">
              {t('errorLoadChats')}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all"
          >
            {t('retry') || 'Retry'}
          </button>
        </div>
      </div>
    );

  if ((modelParam || roleParam) && !startedRef.current && (models || roles))
    return (
      <div className="flex flex-col items-center justify-center min-h-svh gap-6 bg-black">
        <div className="w-16 h-16 rounded-[24px] bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl">
          <Loader2 className="size-8 animate-spin text-[#007AFF]" />
        </div>
        <p className="text-[15px] font-black text-white/30 tracking-tight">
          {t('openingChat')}
        </p>
      </div>
    );

  return (
    <div className="flex flex-col min-h-svh pb-32 w-full max-w-2xl mx-auto bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 px-8 py-8 bg-black/60 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between">
        <h1 className="text-[34px] font-black tracking-tighter leading-none text-[#007AFF]">
          {t('title')}
        </h1>
        <button
          onClick={() => {
            haptic.light();
            router.push('/models');
          }}
          className="w-12 h-12 rounded-[20px] bg-[#007AFF] text-white flex items-center justify-center shadow-[0_0_20px_rgba(0,122,255,0.4)] active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      </header>

      {/* List */}
      <div className="flex flex-col flex-1 px-4 py-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-[32px] bg-zinc-900/40 border border-white/5 animate-pulse mb-3"
            />
          ))
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center py-20 px-10">
            <div className="w-24 h-24 rounded-[40px] bg-zinc-900 border border-white/10 flex items-center justify-center text-4xl shadow-inner">
              💬
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-2">
                {t('noChatsTitle') || 'No Chats Yet'}
              </h3>
              <p className="text-white/30 font-medium leading-relaxed">
                {t('noChatsDesc') ||
                  'Start your first conversation with our AI assistants.'}
              </p>
            </div>
            <button
              onClick={() => router.push('/models')}
              className="px-8 py-3.5 rounded-full bg-[#007AFF] text-white font-black text-[15px] shadow-[0_0_20px_rgba(0,122,255,0.3)] active:scale-95 transition-all"
            >
              {t('newChat')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
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
                  className="flex items-center gap-4 p-5 rounded-[32px] bg-zinc-900/30 border border-white/5 hover:border-white/15 transition-all group active:scale-[0.985]"
                >
                  <ChatsAvatar className="size-14 rounded-[22px] border border-white/10 group-hover:border-[#007AFF]/30 transition-colors shadow-lg">
                    <ChatsImage
                      src={
                        (chat as any).avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=18181b&color=ffffff`
                      }
                    />
                    <ChatsFallback className="bg-zinc-800 text-[14px] font-black text-white/40">
                      {displayName.slice(0, 2).toUpperCase()}
                    </ChatsFallback>
                  </ChatsAvatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[17px] font-black text-white group-hover:text-[#007AFF] transition-colors truncate tracking-tight">
                      {chat.title || displayName}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[13px] text-white/20 font-bold truncate">
                        {(chat as any).title === null
                          ? displayName
                          : (chat as any).last_message || displayName}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[11px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg group-hover:bg-[#007AFF]/10 group-hover:text-[#007AFF] transition-all">
                      {timeAgo(chat.last_activity || chat.started_at)}
                    </span>
                    <ChevronRight
                      size={18}
                      className="text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </button>
              );
            })}

            {hasNextPage && (
              <button
                onClick={() => {
                  haptic.light();
                  fetchNextPage();
                }}
                disabled={isFetchingNextPage}
                className="w-full py-5 rounded-[28px] bg-white/5 border border-white/5 text-[14px] font-black text-white/30 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] mt-4"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="size-5 animate-spin mx-auto" />
                ) : (
                  t('loadMore')
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chats;
