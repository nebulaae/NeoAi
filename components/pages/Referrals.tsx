'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  Users,
  Gift,
  Zap,
  Copy,
  Check,
  Loader2,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { useReferrals } from '@/hooks/useApiExtras';
import { useHaptic } from '@/hooks/useHaptic';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { forwardTextToTelegram } from '@/lib/telegramShare';
import { cn } from '@/lib/utils';

/**
 * Партнёрская программа.
 *
 * Экран переведён на язык обновлённой главной: чёрный фон с синими орбами,
 * крупные заголовки, скруглённые карточки и один яркий CTA. Раньше страница
 * была из другой эпохи — мелкий серый текст и стеклянные плашки, — и после
 * баннера с главной пользователь попадал будто в другое приложение.
 */

const StatCard = ({
  icon,
  label,
  value,
  isLoading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isLoading?: boolean;
  accent?: boolean;
}) => (
  <div
    className={cn(
      'flex flex-col gap-3 p-4 rounded-3xl border transition-colors',
      accent
        ? 'bg-[#007AFF]/10 border-[#007AFF]/25'
        : 'bg-zinc-900/50 border-white/[.08]'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/35">
        {label}
      </span>
      <div className={accent ? 'text-[#007AFF]' : 'text-white/20'}>{icon}</div>
    </div>
    {isLoading ? (
      <div className="w-20 h-8 rounded-lg bg-white/5 animate-pulse" />
    ) : (
      <span className="text-[28px] font-black tracking-tighter leading-none tabular-nums text-white">
        {value}
      </span>
    )}
  </div>
);

export const Referrals = () => {
  const t = useTranslations('Referrals');
  const router = useRouter();
  const haptic = useHaptic();
  const { user: tgUser } = useAuth();
  const { bot } = useBot();
  const { data: refData, isLoading } = useReferrals();
  const [copied, setCopied] = useState(false);

  const stats = (refData as any)?.stats || {};
  const referrals = (refData as any)?.referrals || [];
  const userId = tgUser?.id;
  const referralLink =
    bot?.bot_username && userId
      ? `https://t.me/${bot.bot_username}?start=${userId}`
      : null;

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      haptic.success();
      setCopied(true);
      toast.success(t('linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (!referralLink) return;
    haptic.medium();
    forwardTextToTelegram(referralLink);
  };

  const totalTokens = useMemo(() => {
    const val = stats.total_tokens;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    return val || 0;
  }, [stats.total_tokens]);

  return (
    <div className="flex flex-col min-h-svh">
      {/* Фон — общий для всех экранов, живёт в app/(root)/layout.tsx */}

      <header className="sticky top-0 z-20 flex items-center gap-3 px-5 pb-4 pt-[calc(1rem+var(--sa-top))]">
        <button
          onClick={() => {
            haptic.light();
            router.back();
          }}
          className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0 bg-white/5 border border-white/10 text-white/70 transition-all active:scale-90"
          aria-label={t('title')}
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-[22px] font-black tracking-tight text-white truncate">
          {t('title')}
        </h1>
      </header>

      <div className="flex-1 px-5 pb-32 flex flex-col gap-6">
        {/* ── Оффер ───────────────────────────────────────────────────────
            Ставка вынесена в самый верх крупно: это единственная причина,
            по которой на экран вообще заходят. */}
        <div
          style={{
            borderColor: 'rgba(52,211,153,0.42)',
            boxShadow:
              'inset 0 0 60px -10px rgba(52,211,153,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
          className="relative overflow-hidden rounded-[28px] border bg-zinc-900/60 p-6"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 90% at 88% 0%, rgba(52,211,153,0.38), transparent 62%)',
            }}
          />
          <Gift
            size={140}
            className="pointer-events-none absolute -right-8 -top-8 text-white/[0.06]"
          />

          <div className="relative flex flex-col gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
              {t('rewardBadge')}
            </span>
            <h2 className="text-[26px] font-black tracking-tight leading-tight text-white">
              {t('rewardTitle')}
            </h2>
            <p className="text-[14px] font-medium leading-relaxed text-white/50 max-w-[420px]">
              {t('rewardDesc')}
            </p>
          </div>
        </div>

        {/* ── Ссылка ──────────────────────────────────────────────────────
            Главное действие экрана, поэтому идёт до статистики: у нового
            партнёра цифры всё равно нулевые, а ссылка нужна сразу. */}
        {referralLink && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-1">
              {t('yourLink')}
            </h3>

            <div className="rounded-3xl border border-white/[.08] bg-zinc-900/50 p-4 flex flex-col gap-3">
              <code className="block text-[12px] font-mono text-white/50 break-all leading-relaxed">
                {referralLink}
              </code>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 h-12 rounded-2xl bg-[#007AFF] text-white text-[15px] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-[0_0_24px_rgba(0,122,255,0.35)]"
                >
                  <Send size={16} />
                  {t('share')}
                </button>
                <button
                  onClick={handleCopy}
                  aria-label={t('copy')}
                  className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all active:scale-90"
                >
                  {copied ? (
                    <Check size={17} className="text-emerald-400" />
                  ) : (
                    <Copy size={17} className="text-white/50" />
                  )}
                </button>
              </div>

              <p className="text-[12px] font-medium text-white/30 leading-relaxed">
                {t('shareDescription')}
              </p>
            </div>
          </div>
        )}

        {/* ── Статистика ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Users size={14} />}
              label={t('totalReferrals')}
              value={stats.total_referrals || 0}
              isLoading={isLoading}
            />
            <StatCard
              icon={<Gift size={14} />}
              label={t('unique')}
              value={stats.unique_referrals || 0}
              isLoading={isLoading}
            />
          </div>
          <StatCard
            accent
            icon={<Zap size={14} />}
            label={t('tokensEarned')}
            value={isLoading ? '' : `${totalTokens} ◈`}
            isLoading={isLoading}
          />
        </div>

        {/* ── Приглашённые ───────────────────────────────────────────────── */}
        {referrals.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-1">
              {t('invitedUsers', { count: referrals.length })}
            </h3>
            <div className="flex flex-col gap-2">
              {referrals.map((ref: any, idx: number) => {
                const name =
                  ref.first_name ||
                  ref.username ||
                  t('user', { id: ref.user_id || idx });
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-3xl border border-white/[.08] bg-zinc-900/50 px-4 py-3"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-full bg-[#007AFF]/15 border border-[#007AFF]/25 flex items-center justify-center text-[13px] font-black text-[#007AFF] uppercase">
                      {String(name).trim().charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-black text-white truncate">
                        {name}
                      </p>
                      <p className="text-[12px] font-medium text-white/30">
                        {ref.created_at
                          ? new Date(ref.created_at).toLocaleDateString()
                          : t('recently')}
                      </p>
                    </div>
                    <span className="shrink-0 text-[14px] font-black text-emerald-400 tabular-nums">
                      {ref.tokens_earned || 0} ◈
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && referrals.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-14 px-6">
            <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-white/15 flex items-center justify-center">
              <Users size={24} className="text-white/25" />
            </div>
            <p className="text-[15px] font-black text-white/60">
              {t('noReferrals')}
            </p>
            <p className="text-[13px] font-medium text-white/30 max-w-[260px] leading-relaxed">
              {t('noReferralsHint')}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-14">
            <Loader2 size={24} className="animate-spin text-white/25" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Referrals;
