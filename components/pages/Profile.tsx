'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useRequests } from '@/hooks/useRequests';
import { useAuth } from '@/hooks/useAuth';
import {
  useReferrals,
  useApiTokens,
  useGenerateApiToken,
  useRecurrentStatus,
  useCancelRecurrent,
  usePaymentLink,
  useTrackingStats,
  useTrackingReferrals,
  useTrackingPayments,
  useTrackingPaymentsStats,
} from '@/hooks/useApiExtras';
import { useBot } from '@/app/providers/BotProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LogOut,
  Users,
  Star,
  Loader2,
  ChevronRight,
  Zap,
  User,
  ShieldCheck,
  HeartHandshake,
  Globe,
  Settings,
  Key,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  AlertTriangle,
  BarChart2,
  Activity,
  Languages,
  Coins,
  Repeat,
  Sparkles,
  UserPlus,
  FileText,
  TrendingUp,
  ArrowUpRight,
  Bot,
  Calendar,
  Percent,
  ImageIcon,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn, normalise, timeAgo } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/layout/LocaleSwitcher';
import { PaymentDialog } from '@/components/dialogs/PaymentDialog';
import { AlbumsTab } from '../shared/profile/AlbumsTab';

type TabType = 'profile' | 'account' | 'partnership';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Shape coming from the backend /requests endpoint */
export interface GenerationRequest {
  id: number;
  /** dialogue_id may be missing in older records — handle gracefully */
  dialogue_id?: number;
  model?: string;
  version: string;
  cost: number;
  status: 'completed' | 'error' | 'pending' | string;
  inputs?: {
    text?: string | null;
    media?: unknown[] | null;
  } | null;
  result?: null | Record<string, unknown>;
  created_at: string;
}

/** Internal normalised shape used by this component */
export interface RequestItem {
  id: number;
  dialogue_id: number;
  model: string;
  version: string;
  cost: number;
  status: 'completed' | 'error' | 'pending' | string;
  text: string | null;
  hasMedia: boolean;
  previewUrl: string | null;
  created_at: string;
}

// ─── Single card ──────────────────────────────────────────────────────────────

interface RequestCardProps {
  req: RequestItem;
  onClick: () => void;
}

function RequestCard({ req, onClick }: RequestCardProps) {
  const t = useTranslations('Profile');
  const { previewUrl, hasMedia } = req;

  const statusConfig = {
    completed: {
      icon: <CheckCircle2 size={16} className="text-[#007AFF]" />,
      label: 'statusCompleted',
      pill: 'text-[#007AFF] bg-[#007AFF]/10 border-[#007AFF]/20',
    },
    error: {
      icon: <XCircle size={16} className="text-red-400" />,
      label: 'statusError',
      pill: 'text-red-400 bg-red-400/10 border-red-400/20',
    },
    pending: {
      icon: <Clock size={16} className="text-amber-400 animate-pulse" />,
      label: 'statusPending',
      pill: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    },
  };

  const cfg =
    statusConfig[req.status as keyof typeof statusConfig] ?? statusConfig.pending;

  return (
    <button
      onClick={onClick}
      className="w-full h-full text-left group rounded-3xl bg-zinc-900/40 border border-white/[0.06] hover:border-white/[0.12] hover:bg-zinc-900/60 active:scale-[0.99] transition-all duration-200 overflow-hidden"
    >
      {/* Media preview strip — only shown if result has a URL */}
      {previewUrl && (
        <div className="relative w-full h-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={req.version}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
          {/* Frosted bottom overlay */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950/80 to-transparent" />
          {/* Status badge on top of image */}
          <span
            className={cn(
              'absolute top-3 right-3 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border backdrop-blur-sm',
              cfg.pill
            )}
          >
            {t(cfg.label as any)}
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Top row: icon + name + status (when no preview) */}
        <div className="flex items-start gap-3">
          {/* Thumbnail placeholder — shown when no preview URL */}
          {!previewUrl && (
            <div
              className={cn(
                'w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0',
                req.status === 'completed'
                  ? 'bg-[#007AFF]/10 border-[#007AFF]/20'
                  : req.status === 'error'
                    ? 'bg-red-400/10 border-red-400/20'
                    : 'bg-amber-400/10 border-amber-400/20'
              )}
            >
              {hasMedia ? (
                <ImageIcon size={16} className="text-white/30" />
              ) : (
                cfg.icon
              )}
            </div>
          )}

          <div className="flex-1 flex-col min-w-0">
            <div className="flex flex-col justify-center items-start gap-1">
              <p className="text-[15px] font-black truncate leading-tight text-white">
                {req.version}
              </p>
              {req?.text && (
                <p className="text-[12px] break-all text-white/35 font-medium leading-snug">
                  {req.text.slice(0, 128) + '...'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Divider + View in chat link */}
        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
          <p className="text-[11px] text-white/25 font-bold mt-1.5 uppercase tracking-wider">
            {timeAgo(req.created_at)} · {req.cost} ◈
          </p>
          <span className="flex items-center gap-1 text-[12px] font-black text-[#007AFF]/70 group-hover:text-[#007AFF] transition-colors">
            {t('viewInChat')}
            <ArrowUpRight size={12} />
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function RequestCardSkeleton() {
  return (
    <div className="h-[88px] rounded-3xl bg-white/[0.04] animate-pulse" />
  );
}

// ─── History section ──────────────────────────────────────────────────────────

interface GenerationHistoryProps {
  requests: GenerationRequest[];
  reqLoading: boolean;
}

export const Profile = () => {
  const t = useTranslations('Profile');
  const tLegal = useTranslations('Legal');
  const router = useRouter();
  const haptic = useHaptic();
  const { user: tgUser, logout } = useAuth();
  const { bot } = useBot();
  const { data: userData } = useUser();
  const { data: refData } = useReferrals();

  const [partnershipPeriod, setPartnershipPeriod] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [partnershipTab, setPartnershipTab] = useState<'overview' | 'finance' | 'audience' | 'lists'>('overview');

  const { data: trackingStatsData, isLoading: trackingStatsLoading } = useTrackingStats(partnershipPeriod);
  const { data: trackingReferralsData } = useTrackingReferrals(50, 0);
  const { data: trackingPaymentsData } = useTrackingPayments(partnershipPeriod);
  const { data: trackingPaymentsStatsData } = useTrackingPaymentsStats(partnershipPeriod);
  const { data: apiTokens } = useApiTokens();
  const { data: recurrentData } = useRecurrentStatus();
  const cancelRecurrent = useCancelRecurrent();
  const generateToken = useGenerateApiToken();
  const { data: reqData, isLoading: reqLoading } = useRequests();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<'generations' | 'albums'>('generations');

  const { data: paymentUrlLink } = usePaymentLink();

  const tokens = userData?.user?.tokens ?? 0;
  const isPremium = userData?.user?.premium ?? false;
  const premiumEnd = userData?.user?.premium_end;
  const requests = reqData?.pages.flatMap((p) => p) ?? [];
  const refStats = (refData as any)?.stats;

  const stats = trackingStatsData || {};
  const usersStats = stats.users || {};
  const reqsStats = stats.reqs || {};
  const paysStats = stats.pays || {};
  const conversions = stats.conversionStats || {};

  const topModels = stats.topModels || [];
  const langStats = stats.langStats || [];
  const payLangs = stats.payLangs || [];
  const repeatPayments = stats.repeatPayments || {};
  const trialToPaid = stats.trialToPaid || {};
  const trendStats = stats.trendStats || {};

  const referralsList = trackingReferralsData?.rows || [];
  const paymentsList = trackingPaymentsData?.rows || [];
  const payStatsAgg = trackingPaymentsStatsData || {};

  const decodeCyrillic = (str: string | null | undefined): string => {
    if (!str) return '';
    try {
      return decodeURIComponent(escape(str));
    } catch {
      return str;
    }
  };

  const rawName = tgUser
    ? `${decodeCyrillic(tgUser.first_name)} ${decodeCyrillic(tgUser.last_name || '')}`.trim()
    : t('user');

  const name = rawName;
  const displayName = userData?.user?.name
    ? decodeCyrillic(userData.user.name)
    : name;
  const username = tgUser?.username || '';
  const userId = tgUser?.id;
  const referralLink =
    bot?.bot_username && userId
      ? `https://t.me/${bot.bot_username}?start=${userId}`
      : null;

  const handleTopUp = () => {
    haptic.medium();
    const botId = bot?.bot_id || 'default';
    const PAYMENT_LINK_KEY = `payment_link_${botId}`;
    const saved = localStorage.getItem(PAYMENT_LINK_KEY);
    if (saved) {
      setPaymentUrl(saved);
      setIsPaymentOpen(true);
      return;
    }
    import('@/lib/api')
      .then(({ default: api }) => {
        api
          .get('/api/payment-link', { params: { bot_id: botId } })
          .then(({ data }) => {
            if (data?.success && data?.url) {
              localStorage.setItem(PAYMENT_LINK_KEY, data.url);
              setPaymentUrl(data.url);
              setIsPaymentOpen(true);
            } else {
              toast.error(t('paymentLinkUnavailable'));
            }
          });
      })
      .catch(() => toast.error(t('paymentLinkError')));
  };

  const handleCancelRecurrent = () => {
    haptic.warning();
    if (window.confirm(t('confirmCancelSubscription'))) {
      cancelRecurrent.mutate(undefined, {
        onSuccess: () => {
          toast.success(t('subscriptionCanceled'));
        },
        onError: () => {
          toast.error(t('subscriptionCancelError'));
        },
      });
    }
  };

  const handleCopyToken = (token: string) => {
    haptic.success();
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      toast.success(t('tokenCopied'));
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const handleCopyRef = () => {
    if (!referralLink) return;
    haptic.success();
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopiedRef(true);
      toast.success(t('refLinkCopied'));
      setTimeout(() => setCopiedRef(false), 2000);
    });
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'profile', label: t('tabProfile'), icon: User },
    { id: 'account', label: t('tabAccount'), icon: Settings },
    { id: 'partnership', label: t('tabPartnership'), icon: HeartHandshake },
  ];

  return (
    <div className="min-h-screen text-white font-sans overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-6">
        <h1 className="text-[28px] font-black tracking-tight text-[#007AFF] leading-none mb-6">
          {t('title')}
        </h1>
        <div className="flex p-1 bg-zinc-900/80 rounded-2xl border border-white/5 relative">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                haptic.light();
                setActiveTab(tab.id);
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all relative z-10',
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              <tab.icon
                size={14}
                className={cn(activeTab === tab.id && 'text-white')}
              />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute inset-0 bg-[#007AFF] rounded-xl z-[-1] shadow-[0_0_20px_rgba(0,122,255,0.4)] animate-in fade-in zoom-in duration-300" />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 py-6 flex flex-col gap-8">
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* User Hero Card */}
            <div className="relative p-6 rounded-[32px] bg-zinc-900/40 border border-white/10 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-20 h-20 rounded-full border-2 border-[#007AFF]/30 p-1 shadow-[0_0_20px_rgba(0,122,255,0.15)]">
                  <Avatar className="size-full">
                    <AvatarImage src={tgUser?.photo_url} />
                    <AvatarFallback className="text-2xl font-bold bg-zinc-800 text-white/40">
                      {name[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[24px] font-black tracking-tight truncate leading-tight">
                      {name}
                    </h2>
                    {isPremium && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-[10px] font-black text-amber-400 flex items-center gap-1 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                        <Star size={10} fill="currentColor" /> PREMIUM
                      </span>
                    )}
                  </div>
                  {username && (
                    <p className="text-[15px] text-white/40 font-bold">
                      @{username}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Balance Card - FULL WIDTH FIX */}
            <button
              onClick={() => {
                haptic.medium();
                router.push('/pay');
              }}
              className="group relative w-full p-8 rounded-[32px] bg-linear-to-br from-zinc-900 to-zinc-950 border border-white/10 overflow-hidden shadow-2xl active:scale-[0.98] transition-all text-left"
            >
              <div className="relative z-10 w-full">
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">
                  {t('tokens')}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[48px] font-black tracking-tighter leading-none">
                    {tokens}
                  </span>
                  <span className="text-[20px] font-bold text-[#007AFF]">
                    ◈
                  </span>
                </div>
                {isPremium && premiumEnd && (
                  <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20 w-fit">
                    <Star
                      size={12}
                      className="text-amber-400"
                      fill="currentColor"
                    />
                    <span className="text-[11px] font-black text-amber-400/80 uppercase tracking-widest">
                      {t('premiumActive', {
                        date: new Date(premiumEnd * 1000).toLocaleDateString(),
                      })}
                    </span>
                  </div>
                )}
                <div className="mt-8 flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 text-[14px] font-black text-[#007AFF]">
                    <span className="px-5 py-2.5 bg-[#007AFF]/10 rounded-full border border-[#007AFF]/20 group-hover:bg-[#007AFF] group-hover:text-white transition-all">
                      {t('topUpBalance')}
                    </span>
                    <ChevronRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* History Section */}
            <div className="flex flex-col gap-5">
              {/* Sub-tab switcher: Generations / Albums */}
              <div className="flex p-1 bg-zinc-900/60 rounded-2xl border border-white/5">
                <button
                  onClick={() => { haptic.light(); setHistoryTab('generations'); }}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all relative z-10',
                    historyTab === 'generations' ? 'text-white' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {t('generationHistory')}
                  {historyTab === 'generations' && (
                    <div className="absolute inset-0 bg-[#007AFF] rounded-xl z-[-1] animate-in fade-in zoom-in duration-300" />
                  )}
                </button>
                <button
                  onClick={() => { haptic.light(); setHistoryTab('albums'); }}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all relative z-10',
                    historyTab === 'albums' ? 'text-white' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {t('albumsTabLabel')}
                  {historyTab === 'albums' && (
                    <div className="absolute inset-0 bg-[#007AFF] rounded-xl z-[-1] animate-in fade-in zoom-in duration-300" />
                  )}
                </button>
              </div>

              {/* Tab content */}
              {historyTab === 'generations' ? (
                <div className="flex flex-col gap-3">
                  {reqLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <RequestCardSkeleton key={i} />
                    ))
                  ) : requests.length > 0 ? (
                    requests.map(raw => {
                      const req = normalise(raw);
                      return (
                        <RequestCard
                          key={req.id}
                          req={req}
                          onClick={() => req.dialogue_id ? router.push(`/chats/${req.dialogue_id}`) : undefined}
                        />
                      );
                    })
                  ) : (
                    <div className="py-12 text-center opacity-20">
                      <p className="text-[14px] font-bold">{t('noGenerations')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <AlbumsTab />
              )}
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-6">
              {/* ── Recurrent Subscription ── */}
              {recurrentData?.recurrent && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 px-2 flex items-center gap-2">
                    <CreditCard size={14} /> {t('subscription')}
                  </h3>
                  <div className="p-6 rounded-[32px] bg-linear-to-br from-[#007AFF]/5 to-zinc-900/40 border border-[#007AFF]/20 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#007AFF]/20 flex items-center justify-center text-[#007AFF]">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <p className="text-[16px] font-black text-white">
                            {t('activeSubscription')}
                          </p>
                          <p className="text-[12px] font-bold text-white/30 uppercase tracking-widest">
                            {t('autoRenewalOn') || 'Auto-renewal on'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleCancelRecurrent}
                        disabled={cancelRecurrent.isPending}
                        className="px-5 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[13px] font-black active:scale-95 transition-all disabled:opacity-50"
                      >
                        {cancelRecurrent.isPending ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          t('cancelSubscription')
                        )}
                      </button>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <AlertTriangle
                        size={16}
                        className="text-amber-400 shrink-0 mt-0.5"
                      />
                      <p className="text-[12px] text-white/40 font-medium leading-relaxed">
                        {t('subscriptionInfo')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-[#007AFF] px-2 flex items-center gap-2">
                  <Globe size={14} /> {t('locale') || 'Locale'}
                </h3>
                <div className="p-5 rounded-3xl bg-zinc-900/40 border border-white/5 flex items-center justify-between">
                  <span className="text-[15px] font-bold">
                    {t('language') || 'Language'}
                  </span>
                  <LanguageSwitcher />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-[#007AFF] px-2 flex items-center gap-2">
                  <ShieldCheck size={14} />{' '}
                  {t('securityAndApi') || 'Security & API'}
                </h3>
                <div className="flex flex-col gap-3">
                  {apiTokens?.map((tk: any) => (
                    <div
                      key={tk.id}
                      className="flex items-center gap-4 p-5 rounded-3xl bg-zinc-900/40 border border-white/5 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40">
                        <Key size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <code className="text-[14px] font-mono text-white/60 truncate block">
                          {tk.token}
                        </code>
                        <p className="text-[11px] font-black text-white/20 mt-1 uppercase tracking-widest">
                          {tk.generations} REQUESTS
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyToken(tk.token)}
                        className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all border border-white/10"
                      >
                        {copiedToken === tk.token ? (
                          <Check size={18} className="text-[#007AFF]" />
                        ) : (
                          <Copy size={18} className="text-white/40" />
                        )}
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => generateToken.mutate()}
                    disabled={generateToken.isPending}
                    className="w-full py-5 rounded-3xl border-2 border-dashed border-white/10 text-white/30 text-[14px] font-black hover:border-[#007AFF]/30 hover:text-[#007AFF] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {generateToken.isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Zap size={18} />
                    )}
                    {t('createToken')}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-[#007AFF] px-2">
                  {t('information') || 'Information'}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => router.push('/legal/offer')}
                    className="flex items-center justify-between p-5 rounded-3xl bg-zinc-900/40 border border-white/5 active:scale-[0.98] transition-all"
                  >
                    <span className="text-[15px] font-bold">
                      {tLegal('offer')}
                    </span>
                    <ChevronRight size={18} className="text-white/20" />
                  </button>
                  <button
                    onClick={() => router.push('/legal/privacy')}
                    className="flex items-center justify-between p-5 rounded-3xl bg-zinc-900/40 border border-white/5 active:scale-[0.98] transition-all"
                  >
                    <span className="text-[15px] font-bold">
                      {tLegal('privacy')}
                    </span>
                    <ChevronRight size={18} className="text-white/20" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  haptic.heavy();
                  logout();
                }}
                className="mt-4 flex items-center justify-center gap-3 py-5 rounded-[24px] bg-red-500/10 border border-red-500/20 text-red-500 font-black text-[15px] hover:bg-red-500/20 transition-all active:scale-[0.98]"
              >
                <LogOut size={20} />
                {t('logout')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'partnership' && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="p-8 rounded-[40px] bg-linear-to-br from-[#007AFF] to-[#0051FF] border border-white/20 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-20 translate-x-4 translate-y-[-10px] group-hover:translate-x-2 transition-transform">
                <Users size={140} className="text-white" />
              </div>
              <div className="relative z-10">
                <h2 className="text-[28px] font-black tracking-tight leading-tight mb-2">
                  {t('partnershipTitle')}
                </h2>
                <p className="text-white/70 text-[15px] font-medium max-w-[200px] leading-relaxed mb-6">
                  {t('partnershipShare')}
                </p>
                <div className="flex items-center gap-3 p-2 bg-black/20 border border-white/10 rounded-[24px] backdrop-blur-md">
                  <div className="flex-1 px-4 py-3 overflow-hidden">
                    <p className="text-[14px] font-medium text-white/90 truncate">
                      {referralLink || '...'}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyRef}
                    className="w-12 h-12 rounded-2xl bg-white text-[#007AFF] flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-white/90"
                  >
                    {copiedRef ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-5 rounded-[28px] bg-zinc-900/40 border border-white/[0.06]">
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-white/30">
                  {t('partnerBalance')}
                </p>
                <div className="flex items-baseline mt-2">
                  <span className="text-[28px] font-black leading-none">
                    {userData?.user?.balance ?? 0} ₽
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center">
                <Coins size={22} className="text-[#007AFF]" />
              </div>
            </div>

            <button
              onClick={() => {
                haptic.medium();
                toast.info(t('withdrawComingSoon'));
              }}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-[28px] bg-linear-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[15px] hover:from-emerald-500/20 hover:to-teal-500/20 transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(52,211,153,0.05)]"
            >
              <Banknote size={20} />
              {t('withdrawFunds')}
            </button>

            {/* Control Strip */}
            <div className="flex flex-col gap-4">
              {/* Period Selector */}
              <div className="flex justify-between items-center bg-zinc-900/40 p-1.5 rounded-2xl border border-white/5 flex-wrap gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/30 px-3 py-1">
                  {t('locale') === 'Язык' ? 'Период:' : 'Period:'}
                </span>
                <div className="flex gap-1">
                  {(['day', 'week', 'month', 'all'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        haptic.light();
                        setPartnershipPeriod(p);
                      }}
                      className={cn(
                        'px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all',
                        partnershipPeriod === p
                          ? 'bg-zinc-800 text-white shadow-lg border border-white/10'
                          : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                      )}
                    >
                      {t(`period${p.charAt(0).toUpperCase() + p.slice(1)}` as any)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-tab Switcher */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none border-b border-white/5">
                {(['overview', 'finance', 'audience', 'lists'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      haptic.light();
                      setPartnershipTab(tab);
                    }}
                    className={cn(
                      'px-5 py-2.5 rounded-2xl text-[13px] font-bold transition-all shrink-0 border relative',
                      partnershipTab === tab
                        ? 'bg-[#007AFF] text-white border-transparent shadow-[0_0_15px_rgba(0,122,255,0.3)]'
                        : 'bg-zinc-900/30 border-white/5 text-white/40 hover:text-white/60 hover:bg-zinc-900/50'
                    )}
                  >
                    {t(`subTab${tab.charAt(0).toUpperCase() + tab.slice(1)}` as any)}
                  </button>
                ))}
              </div>
            </div>

            {trackingStatsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                <Loader2 size={32} className="animate-spin text-[#007AFF]" />
                <p className="text-[13px] font-bold text-white/40 uppercase tracking-widest">{t('loading')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                {/* ── Sub-tab: Overview ── */}
                {partnershipTab === 'overview' && (
                  <div className="flex flex-col gap-6">
                    {/* Primary KPI cards */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Users Card */}
                      <div className="p-6 rounded-[32px] bg-zinc-900/40 border border-white/5 flex flex-col justify-between hover:bg-zinc-800/40 transition-all group">
                        <div className="flex items-center justify-between text-white/30 mb-3">
                          <p className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Users size={12} /> {t('metricUsers')}
                          </p>
                          <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <p className="text-[32px] font-black leading-none tracking-tight">{usersStats.total ?? 0}</p>
                          <p className="text-[12px] text-green-400 font-bold mt-2 flex items-center gap-1">
                            {t('metricNewUsers', { count: usersStats.new ?? 0 })}
                          </p>
                        </div>
                      </div>

                      {/* Revenue Card */}
                      <div className="p-6 rounded-[32px] bg-linear-to-br from-zinc-900/40 to-zinc-950 border border-white/5 flex flex-col justify-between hover:border-[#007AFF]/30 transition-all group">
                        <div className="flex items-center justify-between text-white/30 mb-3">
                          <p className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Coins size={12} /> {t('metricRevenue')}
                          </p>
                          <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <p className="text-[32px] font-black text-[#007AFF] leading-none tracking-tight">
                            {paysStats.totalRevenue ?? 0} <span className="text-[18px] text-white/50">◈</span>
                          </p>
                          <p className="text-[12px] text-white/40 font-bold mt-2">
                            {t('metricSuccessfulPays', { count: paysStats.successCount ?? 0 })}
                          </p>
                        </div>
                      </div>

                      {/* Requests Card */}
                      <div className="p-6 rounded-[32px] bg-zinc-900/40 border border-white/5 flex flex-col justify-between hover:bg-zinc-800/40 transition-all group">
                        <div className="flex items-center justify-between text-white/30 mb-3">
                          <p className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <Zap size={12} /> {t('metricRequests')}
                          </p>
                          <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <p className="text-[32px] font-black leading-none tracking-tight">{reqsStats.total ?? 0}</p>
                          <p className="text-[12px] text-white/40 font-bold mt-2">
                            {t('metricActiveUsers', { count: reqsStats.uniqueUsers ?? 0 })}
                          </p>
                        </div>
                      </div>

                      {/* Conversion Card */}
                      <div className="p-6 rounded-[32px] bg-zinc-900/40 border border-white/5 flex flex-col justify-between hover:bg-zinc-800/40 transition-all group">
                        <div className="flex items-center justify-between text-white/30 mb-3">
                          <p className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <TrendingUp size={12} /> {t('metricConversion')}
                          </p>
                          <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <p className="text-[32px] font-black leading-none tracking-tight">{conversions.rate ?? 0}%</p>
                          <p className="text-[12px] text-white/40 font-bold mt-2">
                            {t('metricBuyers', { count: conversions.uniquePayers ?? 0 })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Metrics / Performance Meters */}
                    <div className="p-6 rounded-[32px] bg-zinc-900/20 border border-white/5 flex flex-col gap-5">
                      <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 mb-1">
                        {t('securityAndApi') === 'Security & API' ? 'Performance Funnels' : 'Воронки эффективности'}
                      </h3>

                      {/* Premium Users Ratio */}
                      <div>
                        <div className="flex justify-between items-center text-[12px] font-bold mb-2">
                          <span className="text-white/60 flex items-center gap-1.5">
                            <Star size={12} className="text-amber-400" fill="currentColor" />
                            {t('cardPremium')}
                          </span>
                          <span className="text-white/90">
                            {usersStats.premium ?? 0} / {usersStats.total ?? 0}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.3)] transition-all duration-500"
                            style={{ width: `${usersStats.total > 0 ? (usersStats.premium / usersStats.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* TG Traffic Ratio */}
                      <div>
                        <div className="flex justify-between items-center text-[12px] font-bold mb-2">
                          <span className="text-white/60 flex items-center gap-1.5">
                            <Globe size={12} className="text-sky-400" />
                            {t('cardTgTraffic')}
                          </span>
                          <span className="text-white/90">
                            {usersStats.tg ?? 0} / {usersStats.total ?? 0}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-400 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.3)] transition-all duration-500"
                            style={{ width: `${usersStats.total > 0 ? (usersStats.tg / usersStats.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Repeat Payments Meter */}
                      <div>
                        <div className="flex justify-between items-center text-[12px] font-bold mb-2">
                          <span className="text-white/60 flex items-center gap-1.5">
                            <Repeat size={12} className="text-emerald-400" />
                            {t('cardRepeatPayments')}
                          </span>
                          <span className="text-white/90">
                            {t('cardRepeatPayers', { count: repeatPayments.repeatPayersCount ?? 0 })} ({repeatPayments.totalRepeatPayments ?? 0} {t('paymentsCount', { count: repeatPayments.totalRepeatPayments ?? 0 }).split(' ')[1] || 'payments'})
                          </span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.3)] transition-all duration-500"
                            style={{ width: `${paysStats.successCount > 0 ? ((repeatPayments.repeatPayersCount || 0) / paysStats.successCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Trial to Paid Conversion */}
                      <div>
                        <div className="flex justify-between items-center text-[12px] font-bold mb-2">
                          <span className="text-white/60 flex items-center gap-1.5">
                            <Sparkles size={12} className="text-indigo-400" />
                            {t('cardTrialToPaid')}
                          </span>
                          <span className="text-white/90">
                            {trialToPaid.rate ?? 0}% ({trialToPaid.paidUsers ?? 0} / {trialToPaid.newUsers ?? 0})
                          </span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-400 rounded-full shadow-[0_0_10px_rgba(129,140,248,0.3)] transition-all duration-500"
                            style={{ width: `${trialToPaid.rate ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* USDT exchange rate spark card */}
                    {/* <div className="p-6 rounded-[32px] bg-linear-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Coins size={22} />
                        </div>
                        <div>
                          <p className="text-[11px] text-white/40 uppercase font-black tracking-widest">{t('chartUsdtRate')}</p>
                          <p className="text-[22px] font-black mt-0.5">{stats.usdtRate ?? 'N/A'} <span className="text-[12px] text-white/50">RUB / USDT</span></p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1 shadow-sm">
                          <Sparkles size={10} /> Active
                        </span>
                      </div>
                    </div> */}
                  </div>
                )}

                {/* ── Sub-tab: Finance ── */}
                {partnershipTab === 'finance' && (
                  <div className="flex flex-col gap-6">
                    {/* Revenue Daily Vertical Chart */}
                    <div className="h-56 bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-6 text-white/5 pointer-events-none">
                        <TrendingUp size={100} />
                      </div>
                      <div className="flex justify-between items-center z-10">
                        <h4 className="text-[12px] font-black uppercase tracking-wider text-white/30 flex items-center gap-1.5">
                          <Activity size={12} className="text-[#007AFF]" /> {t('financeRevenueTrend')}
                        </h4>
                        {paysStats.totalRevenue > 0 && (
                          <span className="text-[11px] font-bold text-white/50 bg-white/5 px-2.5 py-1 rounded-full">
                            {t('totalRevenue')}: {paysStats.totalRevenue} ◈
                          </span>
                        )}
                      </div>

                      {(() => {
                        const dailyPays = paysStats.daily || payStatsAgg.daily || [];
                        const maxRev = dailyPays.length > 0 ? Math.max(...dailyPays.map((d: any) => d.revenue || 0)) : 0;
                        return dailyPays.length > 0 ? (
                          <div className="flex items-end justify-between gap-1.5 h-32 mt-4">
                            {dailyPays.slice(-12).map((d: any, idx: number) => {
                              const percentage = maxRev > 0 ? ((d.revenue || 0) / maxRev) * 100 : 0;
                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group/bar relative">
                                  {/* Tooltip on hover */}
                                  <div className="absolute bottom-full mb-2.5 bg-zinc-950 border border-white/10 text-white text-[10px] font-mono p-2.5 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none whitespace-nowrap z-40 shadow-2xl flex flex-col gap-0.5 scale-95 group-hover/bar:scale-100 duration-200">
                                    <p className="font-black text-[11px] text-[#007AFF]">{d.date}</p>
                                    <p className="font-bold text-white/80">{t('totalRevenue')}: <span className="text-white font-black">{d.revenue} ◈</span></p>
                                    <p className="font-semibold text-white/50">{d.count} {t('metricSuccessfulPays', { count: d.count }).split(' ')[1] || 'pays'}</p>
                                  </div>
                                  <div
                                    style={{ height: `${Math.max(percentage, 6)}%` }}
                                    className="w-full rounded-t-lg bg-linear-to-t from-[#007AFF] to-[#00C7FF] shadow-[0_0_15px_rgba(0,122,255,0.15)] group-hover/bar:brightness-125 transition-all duration-300"
                                  />
                                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest truncate max-w-full">
                                    {d.date ? d.date.split('-').slice(2).join('/') : idx + 1}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-32 flex flex-col items-center justify-center text-white/20 gap-2">
                            <Activity size={24} className="opacity-50 animate-pulse" />
                            <p className="text-[12px] font-bold uppercase tracking-widest">{t('noData')}</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Payment Status Breakdown */}
                    {(() => {
                      const allStatuses = paysStats.allStatuses || payStatsAgg.allStatuses || [];
                      return (
                        <div className="p-6 rounded-[32px] bg-zinc-900/30 border border-white/5 flex flex-col gap-4">
                          <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 flex items-center gap-1.5 mb-1">
                            <CreditCard size={12} /> {t('financeStatusBreakdown')}
                          </h3>
                          {allStatuses.length > 0 ? (
                            <div className="flex flex-col gap-3">
                              {allStatuses.map((st: any, i: number) => {
                                const isSuccessful = st.status === 'successful' || st.status === 'success';
                                const maxRevenue = Math.max(...allStatuses.map((x: any) => x.revenue || 1));
                                const fillPercentage = maxRevenue > 0 ? ((st.revenue || 0) / maxRevenue) * 100 : 0;
                                return (
                                  <div key={i} className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl flex flex-col gap-2.5 relative overflow-hidden">
                                    <div className="flex items-center justify-between text-[13px] z-10 relative">
                                      <div className="flex items-center gap-2">
                                        <div className={cn("size-2.5 rounded-full shadow-sm",
                                          isSuccessful ? "bg-green-400" : st.status === 'refunded' ? "bg-amber-400" : "bg-red-400"
                                        )} />
                                        <span className="font-black capitalize">
                                          {t(`status${st.status.charAt(0).toUpperCase() + st.status.slice(1)}` as any)}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-black text-white">{st.revenue ?? 0} ◈</span>
                                        <span className="text-[11px] font-bold text-white/30 ml-2">({st.count} {t('paymentsCount', { count: st.count }).split(' ')[1] || 'pays'})</span>
                                      </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                                      <div
                                        className={cn("h-full rounded-full transition-all duration-500",
                                          isSuccessful ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.2)]" : st.status === 'refunded' ? "bg-amber-400" : "bg-red-400"
                                        )}
                                        style={{ width: `${Math.max(fillPercentage, 3)}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[12px] text-white/20 italic">{t('noData')}</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Pay currencies Breakdown */}
                    <div className="p-6 rounded-[32px] bg-zinc-900/30 border border-white/5 flex flex-col gap-4">
                      <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 flex items-center gap-1.5 mb-1">
                        <Globe size={12} /> {t('financeCurrencyBreakdown')}
                      </h3>
                      {payLangs.length > 0 ? (
                        <div className="flex flex-col gap-4">
                          {payLangs.map((pl: any, i: number) => {
                            const maxAmount = Math.max(...payLangs.map((x: any) => x.total_amount || 1));
                            const percentage = maxAmount > 0 ? ((pl.total_amount || 0) / maxAmount) * 100 : 0;
                            return (
                              <div key={i}>
                                <div className="flex justify-between items-center text-[12px] font-bold mb-2">
                                  <span className="text-white/80 uppercase font-black">{pl.currency || 'USD'}</span>
                                  <span className="text-white/40 font-mono">
                                    {pl.total_amount} {pl.currency} <span className="text-white/20">•</span> {pl.count} {t('paymentsCount', { count: pl.count }).split(' ')[1] || 'pays'}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[12px] text-white/20 italic">{t('noData')}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Sub-tab: Audience ── */}
                {partnershipTab === 'audience' && (
                  <div className="flex flex-col gap-6">
                    {/* User Activity Time-Series Graph */}
                    <div className="h-56 bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-6 text-white/5 pointer-events-none">
                        <Users size={100} />
                      </div>
                      <div className="flex justify-between items-center z-10">
                        <h4 className="text-[12px] font-black uppercase tracking-wider text-white/30 flex items-center gap-1.5">
                          <Activity size={12} className="text-amber-400" /> {t('audienceActivityTrend')}
                        </h4>
                        {usersStats.total > 0 && (
                          <span className="text-[11px] font-bold text-white/50 bg-white/5 px-2.5 py-1 rounded-full">
                            {usersStats.total} {t('metricUsers').toLowerCase()}
                          </span>
                        )}
                      </div>

                      {(() => {
                        const dailyAct = stats.activity || [];
                        const maxAct = dailyAct.length > 0 ? Math.max(...dailyAct.map((d: any) => d.unique_users || 0)) : 0;
                        return dailyAct.length > 0 ? (
                          <div className="flex items-end justify-between gap-1.5 h-32 mt-4">
                            {dailyAct.slice(-12).map((d: any, idx: number) => {
                              const percentage = maxAct > 0 ? ((d.unique_users || 0) / maxAct) * 100 : 0;
                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group/bar relative">
                                  <div className="absolute bottom-full mb-2.5 bg-zinc-950 border border-white/10 text-white text-[10px] font-mono p-2.5 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none whitespace-nowrap z-40 shadow-2xl flex flex-col gap-0.5 scale-95 group-hover/bar:scale-100 duration-200">
                                    <p className="font-black text-[11px] text-amber-400">{d.date}</p>
                                    <p className="font-bold text-white/80">{t('chartUnique')}: <span className="text-white font-black">{d.unique_users}</span></p>
                                    <p className="font-semibold text-white/50">{d.events} {t('requestsCount')}</p>
                                  </div>
                                  <div
                                    style={{ height: `${Math.max(percentage, 6)}%` }}
                                    className="w-full rounded-t-lg bg-linear-to-t from-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(251,191,36,0.15)] group-hover/bar:brightness-125 transition-all duration-300"
                                  />
                                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest truncate max-w-full">
                                    {d.date ? d.date.split('-').slice(2).join('/') : idx + 1}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-32 flex flex-col items-center justify-center text-white/20 gap-2">
                            <Activity size={24} className="opacity-50 animate-pulse" />
                            <p className="text-[12px] font-bold uppercase tracking-widest">{t('noData')}</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Bot Distribution list */}
                    {(() => {
                      const byBot = usersStats.byBot || [];
                      return (
                        <div className="p-6 rounded-[32px] bg-zinc-900/30 border border-white/5 flex flex-col gap-4">
                          <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 flex items-center gap-1.5 mb-1">
                            <Bot size={12} /> {t('audienceBotBreakdown')}
                          </h3>
                          {byBot.length > 0 ? (
                            <div className="flex flex-col gap-3">
                              {byBot.map((b: any, i: number) => {
                                const maxCount = Math.max(...byBot.map((x: any) => x.count || 1));
                                const percentage = maxCount > 0 ? ((b.count || 0) / maxCount) * 100 : 0;
                                return (
                                  <div key={i} className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
                                    <div className="flex items-center justify-between text-[13px] z-10 relative">
                                      <span className="font-black text-[#007AFF]">@{b.bot_username}</span>
                                      <span className="font-bold text-white/60">{b.count} {t('metricUsers').toLowerCase()}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-linear-to-r from-sky-400 to-[#007AFF] rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[12px] text-white/20 italic">{t('noData')}</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Top Models breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Top Models list chart */}
                      <div className="p-6 rounded-[32px] bg-zinc-900/30 border border-white/5 flex flex-col gap-4">
                        <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 flex items-center gap-2 mb-1">
                          <BarChart2 size={14} /> {t('audienceTopModels')}
                        </h3>
                        <div className="flex flex-col gap-3">
                          {topModels.length > 0 ? (
                            topModels.map((m: any, i: number) => {
                              const maxModelCount = Math.max(...topModels.map((x: any) => x.count || 1));
                              const percentage = maxModelCount > 0 ? ((m.count || 0) / maxModelCount) * 100 : 0;
                              return (
                                <div key={i} className="flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between text-[13px] font-bold">
                                    <span className="text-white/80">{m.model}</span>
                                    <span className="text-white/40">{m.count} {t('requestsCount')}</span>
                                  </div>
                                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-linear-to-r from-amber-400 to-[#007AFF] rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[12px] text-white/20">{t('noData')}</p>
                          )}
                        </div>
                      </div>

                      {/* Language Stats breakdown */}
                      <div className="p-6 rounded-[32px] bg-zinc-900/30 border border-white/5 flex flex-col gap-4">
                        <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 flex items-center gap-2 mb-1">
                          <Languages size={14} /> {t('audienceLanguages')}
                        </h3>
                        <div className="flex flex-col gap-3">
                          {langStats.length > 0 ? (
                            langStats.map((l: any, i: number) => {
                              const maxLangCount = Math.max(...langStats.map((x: any) => x.count || 1));
                              const percentage = maxLangCount > 0 ? ((l.count || 0) / maxLangCount) * 100 : 0;
                              return (
                                <div key={i} className="flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between text-[13px] font-bold">
                                    <span className="text-white/80 uppercase">{l.lang}</span>
                                    <span className="text-white/40">{l.count} {t('metricUsers').toLowerCase()}</span>
                                  </div>
                                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-linear-to-r from-purple-500 to-pink-500 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[12px] text-white/20">{t('noData')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Sub-tab: Lists ── */}
                {partnershipTab === 'lists' && (
                  <div className="flex flex-col gap-6">
                    {/* Referrals List Section */}
                    <div className="flex flex-col gap-4">
                      <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 px-2 flex items-center gap-2">
                        <UserPlus size={14} /> {t('listLastReferrals')}
                      </h3>
                      {referralsList.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {referralsList.map((ref: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 rounded-[24px] hover:bg-zinc-900/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 text-[16px] font-black shadow-inner">
                                  {ref.user?.first_name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex flex-col">
                                  <p className="text-[15px] font-black leading-tight text-white/90">
                                    {ref.user?.first_name || t('listNameUnknown')} {ref.user?.last_name || ''}
                                  </p>
                                  {ref.user?.username && (
                                    <p className="text-[12px] font-bold text-[#007AFF] mt-0.5">
                                      @{ref.user.username}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-[11px] font-bold text-white/20 uppercase tracking-wider">
                                {t('listUser')} #{ref.user_id}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 rounded-3xl bg-zinc-900/10 border border-dashed border-white/5 text-center text-white/20 text-[13px] font-bold italic">
                          {t('noData')}
                        </div>
                      )}
                    </div>

                    {/* Payments List Section */}
                    <div className="flex flex-col gap-4">
                      <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 px-2 flex items-center gap-2">
                        <Coins size={14} /> {t('listLastPayments')}
                      </h3>
                      {paymentsList.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {paymentsList.map((pay: any, i: number) => {
                            const isSuccessful = pay.status === 'successful' || pay.status === 'success';
                            return (
                              <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 rounded-[24px] hover:bg-zinc-900/50 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                                    isSuccessful
                                      ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                      : pay.status === 'refunded'
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                        : 'bg-white/5 text-white/40 border border-white/10'
                                  )}>
                                    {isSuccessful ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                  </div>
                                  <div className="flex flex-col">
                                    <p className="text-[15px] font-black text-white/90">
                                      {pay.amount} {pay.currency || '◈'}
                                    </p>
                                    <p className="text-[11px] font-bold text-white/45 mt-0.5 flex items-center gap-1.5">
                                      <span>{pay.user?.first_name || t('listUser')}</span>
                                      {pay.bot_username && <span className="text-[10px] text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.5 rounded">@{pay.bot_username}</span>}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[11px] font-black text-white/20 tracking-wider">
                                    {new Date(pay.created_at).toLocaleDateString()}
                                  </span>
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                    isSuccessful
                                      ? "bg-green-500/5 text-green-400 border-green-500/15"
                                      : pay.status === 'refunded'
                                        ? "bg-amber-500/5 text-amber-400 border-amber-500/15"
                                        : "bg-white/5 text-white/30 border-white/10"
                                  )}>
                                    {t(`status${pay.status.charAt(0).toUpperCase() + pay.status.slice(1)}` as any)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 rounded-3xl bg-zinc-900/10 border border-dashed border-white/5 text-center text-white/20 text-[13px] font-bold italic">
                          {t('noData')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
