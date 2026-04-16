'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useRequests } from '@/hooks/useRequests';
import { useAuth } from '@/hooks/useAuth';
import {
  useReferrals,
  useApiTokens,
  useGenerateApiToken,
} from '@/hooks/useApiExtras';
import { useBot } from '@/app/providers/BotProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LogOut,
  Users,
  Star,
  Loader2,
  ExternalLink,
  Key,
  Copy,
  Check,
  Link as LinkIcon,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';

const g = {
  ultraThin:
    'bg-zinc-950/30 backdrop-blur-2xl border border-white/[.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  thin: 'bg-zinc-900/40 backdrop-blur-xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  regular:
    'bg-zinc-900/50 backdrop-blur-2xl border border-white/[.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_4px_20px_rgba(0,0,0,0.28)]',
};
const spring =
  'transition-all duration-[260ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

const STATUS: Record<string, { icon: string; color: string; label: string }> = {
  completed: { icon: '✓', color: '#6ee7b7', label: 'Готово' },
  error: { icon: '✕', color: '#fca5a5', label: 'Ошибка' },
  processing: { icon: '⏳', color: '#fde68a', label: 'Обработка' },
};

const GlassCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn(g.regular, 'rounded-[18px]', className)}>{children}</div>
);

export const Profile = () => {
  const router = useRouter();
  const haptic = useHaptic();
  const { user: tgUser, logout } = useAuth();
  const { bot } = useBot();
  const { data: userData, isLoading: userLoading } = useUser();
  const { data: refData } = useReferrals();
  const { data: apiTokens } = useApiTokens();
  const generateToken = useGenerateApiToken();
  const {
    data: reqData,
    isLoading: reqLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRequests();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const tokens = userData?.user?.tokens ?? 0;
  const isPremium = userData?.user?.premium ?? false;
  const premiumEnd = userData?.user?.premium_end;
  const requests = reqData?.pages.flatMap((p) => p) ?? [];
  const refStats = (refData as any)?.stats;
  const name = tgUser
    ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim()
    : 'Пользователь';
  const username = tgUser?.username || '';
  const userId = tgUser?.id;
  const referralLink =
    bot?.bot_username && userId
      ? `https://t.me/${bot.bot_username}?start=${userId}`
      : null;

  const handleTopUp = () => {
    haptic.medium();
    if (!bot?.bot_id) {
      toast.error('Бот не определён');
      return;
    }
    import('@/lib/api').then(({ default: api }) => {
      api
        .get('/api/payment-link', { params: { bot_id: bot.bot_id } })
        .then(({ data }) => {
          if (data.success && data.url) window.open(data.url, '_blank');
          else toast.error('Ссылка недоступна');
        })
        .catch(() => toast.error('Ошибка получения ссылки'));
    });
  };

  const handleCopyToken = (token: string) => {
    haptic.success();
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      toast.success('Скопировано');
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const handleCopyRef = () => {
    if (!referralLink) return;
    haptic.success();
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopiedRef(true);
      toast.success('Ссылка скопирована');
      setTimeout(() => setCopiedRef(false), 2000);
    });
  };

  const handleGenerateToken = () => {
    haptic.light();
    generateToken.mutate(undefined, {
      onSuccess: (d) => {
        toast.success('Токен создан');
        handleCopyToken(d.token);
      },
      onError: () => {
        haptic.error();
        toast.error('Не удалось создать токен');
      },
    });
  };

  return (
    <div className="pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] max-w-2xl mx-auto">
      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-40 flex items-center justify-between px-5 py-4',
          g.ultraThin,
          'border-x-0 border-t-0 rounded-none'
        )}
      >
        <span className="text-[20px] font-bold tracking-[-0.4px] text-white/90">
          Профиль
        </span>
        <button
          onClick={() => {
            haptic.heavy();
            logout();
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
            'bg-red-500/10 border border-red-500/20',
            'text-red-400/80 text-[12px] font-medium',
            spring,
            'active:scale-[0.94]'
          )}
        >
          <LogOut size={12} /> Выйти
        </button>
      </header>

      {/* User Hero */}
      <div className="px-5 pt-5 pb-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border border-white/[.12] flex-shrink-0">
              <Avatar className="size-full">
                <AvatarImage src={tgUser?.photo_url} />
                <AvatarFallback className="text-[18px] font-bold bg-transparent">
                  {name[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[16px] font-bold tracking-[-0.3px] truncate text-white/90">
                  {name}
                </p>
                {isPremium && (
                  <div className="inline-flex items-center gap-[3px] px-2 py-[2px] rounded-full bg-amber-400/10 border border-amber-400/20 text-[10px] font-semibold text-amber-400/80 flex-shrink-0">
                    <Star size={8} fill="currentColor" /> Premium
                  </div>
                )}
              </div>
              {username && (
                <p className="text-[13px] text-white/35">@{username}</p>
              )}
              {isPremium && premiumEnd && (
                <p className="text-[11px] text-white/25 mt-0.5">
                  до {new Date(premiumEnd * 1000).toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-5 pb-4">
        <button
          onClick={handleTopUp}
          className={cn(
            'flex flex-col gap-2 p-4 rounded-[18px] text-left',
            g.regular,
            spring,
            'active:scale-[0.96]'
          )}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold tracking-[0.5px] uppercase text-white/35">
              Токены
            </span>
            <ExternalLink size={11} className="text-white/25" />
          </div>
          {userLoading ? (
            <div className={cn('w-14 h-7 rounded-lg', g.thin)} />
          ) : (
            <div className="flex items-end gap-1">
              <span className="text-[26px] font-bold tracking-[-0.6px] leading-none text-white/90">
                {tokens}
              </span>
              <span className="text-[12px] mb-0.5 text-white/50">◈</span>
            </div>
          )}
          <span className="text-[11px] font-medium text-white/40">
            Пополнить →
          </span>
        </button>

        <button
          onClick={() => {
            haptic.light();
            router.push('/profile/referral');
          }}
          className={cn(
            'flex flex-col gap-2 p-4 rounded-[18px] text-left',
            g.regular,
            spring,
            'active:scale-[0.95]'
          )}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold tracking-[0.5px] uppercase text-white/35">
              Рефералы
            </span>
            <Users size={11} className="text-white/25" />
          </div>
          {!refStats ? (
            <div className={cn('w-10 h-7 rounded-lg', g.thin)} />
          ) : (
            <span className="text-[26px] font-bold tracking-[-0.6px] leading-none text-white/90">
              {refStats?.total ?? refStats?.total_referrals ?? 0}
            </span>
          )}
          <span className="text-[11px] text-white/35">
            {refStats?.earned ?? refStats?.total_tokens ?? 0} ◈ заработано
          </span>
        </button>
      </div>

      {/* Referral Link */}
      {referralLink && (
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-semibold tracking-[0.6px] uppercase text-white/35">
              Реферальная ссылка
            </span>
            <LinkIcon size={11} className="text-white/25" />
          </div>
          <GlassCard className="flex items-center gap-2.5 px-4 py-3">
            <span className="flex-1 text-[11px] text-white/50 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
              {referralLink}
            </span>
            <button
              onClick={handleCopyRef}
              className={cn(
                'flex-shrink-0 p-1.5 rounded-lg',
                spring,
                'active:scale-[0.88]'
              )}
            >
              {copiedRef ? (
                <Check size={13} className="text-emerald-400/80" />
              ) : (
                <Copy size={13} className="text-white/35" />
              )}
            </button>
          </GlassCard>
          <p className="text-[10px] text-white/25 mt-2 px-1">
            Поделитесь ссылкой — получайте бонусы за каждого приглашённого
          </p>
        </div>
      )}

      <div className="h-px bg-white/[.06] mx-5 mb-4" />

      {/* API Tokens */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold tracking-[0.6px] uppercase text-white/35">
            API-токены
          </span>
          <button
            onClick={handleGenerateToken}
            disabled={generateToken.isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-[5px] rounded-full',
              'bg-white/[.06] border border-white/[.10]',
              'text-white/50 text-[11px] font-medium',
              spring,
              'active:scale-[0.94]',
              generateToken.isPending && 'opacity-50'
            )}
          >
            {generateToken.isPending ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Key size={10} />
            )}{' '}
            Создать
          </button>
        </div>
        {!apiTokens || apiTokens.length === 0 ? (
          <p className="text-[12px] text-white/30 px-1">
            Нет токенов. Создайте для доступа к API.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {apiTokens.map((t: any) => (
              <GlassCard
                key={t.id}
                className="flex items-center gap-2.5 px-4 py-3"
              >
                <code className="flex-1 text-[11px] text-white/40 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                  {t.token}
                </code>
                <span className="text-[10px] text-white/25 flex-shrink-0">
                  {t.generations} req
                </span>
                <button
                  onClick={() => handleCopyToken(t.token)}
                  className={cn(
                    'flex-shrink-0 p-1.5 rounded-lg',
                    spring,
                    'active:scale-[0.88]'
                  )}
                >
                  {copiedToken === t.token ? (
                    <Check size={13} className="text-emerald-400/80" />
                  ) : (
                    <Copy size={13} className="text-white/35" />
                  )}
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-white/[.06] mx-5 mb-4" />

      {/* History */}
      <div className="px-5">
        <span className="block text-[10px] font-semibold tracking-[0.6px] uppercase text-white/35 mb-3">
          История генераций
        </span>
        {reqLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={cn('w-9 h-9 rounded-2xl flex-shrink-0', g.thin)}
                />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className={cn('w-1/2 h-3 rounded', g.thin)} />
                  <div className={cn('w-1/3 h-2.5 rounded', g.thin)} />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-[13px] text-white/30 py-4">Нет генераций</p>
        ) : (
          <div className="flex flex-col">
            {requests.map((req) => {
              const st = STATUS[req.status] || {
                icon: '⏳',
                color: 'rgba(255,255,255,0.4)',
                label: req.status,
              };
              return (
                <div
                  key={req.id}
                  className="flex items-center gap-3 pb-4 mb-4 border-b border-white/[.05]"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-2xl flex-shrink-0 flex items-center justify-center text-[13px]',
                      g.thin
                    )}
                  >
                    {st.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate text-white/80">
                      {req.model}
                    </p>
                    <p className="text-[11px] text-white/30 mt-0.5">
                      {req.version} · {timeAgo(req.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-[3px] flex-shrink-0">
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: st.color }}
                    >
                      {st.label}
                    </span>
                    <span className="text-[10px] text-white/25">
                      {req.cost} ◈
                    </span>
                  </div>
                </div>
              );
            })}
            {hasNextPage && (
              <button
                onClick={() => {
                  haptic.light();
                  fetchNextPage();
                }}
                disabled={isFetchingNextPage}
                className={cn(
                  'w-full py-3 rounded-2xl text-[13px] font-medium text-white/40 mt-1',
                  g.thin,
                  spring,
                  'active:scale-[0.97]',
                  'flex items-center justify-center gap-2'
                )}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Загрузка…
                  </>
                ) : (
                  'Загрузить ещё'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
