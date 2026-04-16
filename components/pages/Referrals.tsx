'use client';

import { useRouter as useRefRouter } from 'next/navigation';
import { useReferrals as useRefData } from '@/hooks/useApiExtras';
import { useHaptic as useRefHaptic } from '@/hooks/useHaptic';
import { useAuth as useRefAuth } from '@/hooks/useAuth';
import { useBot as useRefBot } from '@/app/providers/BotProvider';
import {
  ChevronLeft,
  Users,
  Gift,
  Zap,
  Copy as CopyRef,
  Check as CheckRef,
  Loader2 as RefLoader,
} from 'lucide-react';
import { toast as refToast } from 'sonner';
import { useState as useRefState, useMemo } from 'react';
import { cn } from '@/lib/utils';

const gr = {
  ultraThin:
    'bg-zinc-950/30 backdrop-blur-2xl border border-white/[.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  thin: 'bg-zinc-900/40 backdrop-blur-xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  regular:
    'bg-zinc-900/50 backdrop-blur-2xl border border-white/[.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_4px_20px_rgba(0,0,0,0.28)]',
};
const springR =
  'transition-all duration-[260ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

const StatCard = ({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isLoading?: boolean;
}) => (
  <div className={cn('flex flex-col gap-2 p-4 rounded-[16px]', gr.regular)}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold tracking-[0.5px] uppercase text-white/35">
        {label}
      </span>
      <div className="text-white/25">{icon}</div>
    </div>
    {isLoading ? (
      <div className={cn('w-20 h-7 rounded-lg', gr.thin)} />
    ) : (
      <span className="text-[24px] font-bold tracking-[-0.5px] leading-none text-white/90">
        {value}
      </span>
    )}
  </div>
);

export const Referrals = () => {
  const router = useRefRouter();
  const haptic = useRefHaptic();
  const { user: tgUser } = useRefAuth();
  const { bot } = useRefBot();
  const { data: refData, isLoading } = useRefData();
  const [copiedRef, setCopiedRef] = useRefState(false);

  const stats = (refData as any)?.stats || {};
  const referrals = (refData as any)?.referrals || [];
  const levelStats = (refData as any)?.levelStats || [];
  const userId = tgUser?.id;
  const referralLink =
    bot?.bot_username && userId
      ? `https://t.me/${bot.bot_username}?start=${userId}`
      : null;

  const handleCopyRef = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      haptic.success();
      setCopiedRef(true);
      refToast.success('Ссылка скопирована');
      setTimeout(() => setCopiedRef(false), 2000);
    });
  };

  const totalTokens = useMemo(() => {
    const val = stats.total_tokens;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    return val || 0;
  }, [stats.total_tokens]);

  return (
    <div
      className="flex flex-col h-svh"
      style={{ background: 'var(--page-bg)' }}
    >
      {/* Header */}
      <header
        className={cn(
          'shrink-0 sticky top-0 z-10 flex items-center gap-3 px-4 py-3',
          gr.ultraThin,
          'rounded-none border-x-0 border-t-0 border-b border-white/[.07]'
        )}
      >
        <button
          onClick={() => {
            haptic.light();
            router.back();
          }}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
            gr.thin,
            springR,
            'active:scale-[0.88]'
          )}
        >
          <ChevronLeft size={16} className="text-white/50" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.2px] text-white/85">
            Рефералы
          </p>
          <span className="text-[11px] text-white/30">
            Реферальная программа
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Users size={13} />}
            label="Всего"
            value={stats.total_referrals || 0}
            isLoading={isLoading}
          />
          <StatCard
            icon={<Gift size={13} />}
            label="Уникальные"
            value={stats.unique_referrals || 0}
            isLoading={isLoading}
          />
        </div>
        <StatCard
          icon={<Zap size={13} />}
          label="Заработано токенов"
          value={isLoading ? '' : `${totalTokens} ◈`}
          isLoading={isLoading}
        />

        {referralLink && (
          <div>
            <p className="text-[10px] font-semibold tracking-[0.6px] uppercase text-white/35 mb-2.5 px-1">
              Ваша ссылка
            </p>
            <div className={cn(gr.regular, 'rounded-[16px] p-4')}>
              <div className="flex items-center gap-2.5">
                <code className="flex-1 text-[11px] text-white/50 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                  {referralLink}
                </code>
                <button
                  onClick={handleCopyRef}
                  className={cn(
                    'flex-shrink-0 p-2 rounded-lg',
                    gr.thin,
                    springR,
                    'active:scale-[0.88]'
                  )}
                >
                  {copiedRef ? (
                    <CheckRef size={13} className="text-emerald-400/80" />
                  ) : (
                    <CopyRef size={13} className="text-white/35" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-white/30 mt-3 leading-relaxed">
                Поделитесь ссылкой. Когда друзья присоединятся, вы оба получите
                бонусы.
              </p>
            </div>
          </div>
        )}

        {levelStats && levelStats.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold tracking-[0.6px] uppercase text-white/35 mb-2.5 px-1">
              По уровням
            </p>
            <div className="flex flex-col gap-2">
              {levelStats.map((level: any, idx: number) => (
                <div
                  key={idx}
                  className={cn(
                    gr.regular,
                    'rounded-[14px] px-4 py-3 flex items-center justify-between'
                  )}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-white/80">
                      Уровень {level.level || idx + 1}
                    </p>
                    <p className="text-[11px] text-white/35 mt-0.5">
                      {level.count || 0} рефералов
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold text-white/50">
                    {level.tokens || 0} ◈
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {referrals && referrals.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold tracking-[0.6px] uppercase text-white/35 mb-2.5 px-1">
              Приглашённые ({referrals.length})
            </p>
            <div className="flex flex-col gap-2">
              {referrals.map((ref: any, idx: number) => (
                <div
                  key={idx}
                  className={cn(gr.regular, 'rounded-[14px] px-4 py-3')}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[13px] font-semibold text-white/80 truncate">
                      {ref.first_name ||
                        ref.username ||
                        `Пользователь #${ref.user_id || idx}`}
                    </p>
                    <span className="text-[11px] text-white/35 flex-shrink-0">
                      {ref.tokens_earned || 0} ◈
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/30">
                      {ref.created_at
                        ? new Date(ref.created_at).toLocaleDateString('ru-RU')
                        : 'Недавно'}
                    </span>
                    {ref.level && (
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full',
                          gr.thin,
                          'text-white/40'
                        )}
                      >
                        Ур. {ref.level}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && referrals.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-16">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center',
                gr.regular
              )}
            >
              <Users size={20} className="text-white/25" />
            </div>
            <p className="text-[13px] text-white/40 max-w-56 leading-relaxed">
              Нет приглашённых пользователей
            </p>
            <p className="text-[12px] text-white/25 max-w-56">
              Поделитесь ссылкой, чтобы начать зарабатывать
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <RefLoader size={22} className="animate-spin text-white/25" />
          </div>
        )}
      </div>
    </div>
  );
};
