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
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/layout/LocaleSwitcher';

type TabType = 'profile' | 'account' | 'partnership';

const ACCENT_BLUE = '#007AFF';

export const Profile = () => {
  const t = useTranslations('Profile');
  const tLegal = useTranslations('Legal');
  const router = useRouter();
  const haptic = useHaptic();
  const { user: tgUser, logout } = useAuth();
  const { bot } = useBot();
  const { data: userData } = useUser();
  const { data: refData } = useReferrals();
  const { data: apiTokens } = useApiTokens();
  const { data: recurrentData } = useRecurrentStatus();
  const cancelRecurrent = useCancelRecurrent();
  const generateToken = useGenerateApiToken();
  const { data: reqData, isLoading: reqLoading } = useRequests();
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const tokens = userData?.user?.tokens ?? 0;
  const isPremium = userData?.user?.premium ?? false;
  const premiumEnd = userData?.user?.premium_end;
  const requests = reqData?.pages.flatMap((p) => p) ?? [];
  const refStats = (refData as any)?.stats;

  const rawName = tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : t('user');
  const name = rawName;
  const username = tgUser?.username || '';
  const userId = tgUser?.id;
  const referralLink = bot?.bot_username && userId ? `https://t.me/${bot.bot_username}?start=${userId}` : null;

  const handleTopUp = () => {
    haptic.medium();
    const botId = bot?.bot_id || 'default';
    const PAYMENT_LINK_KEY = `payment_link_${botId}`;
    const saved = localStorage.getItem(PAYMENT_LINK_KEY);
    if (saved) { window.open(saved, '_blank'); return; }
    import('@/lib/api').then(({ default: api }) => {
      api.get('/api/payment-link', { params: { bot_id: botId } }).then(({ data }) => {
        if (data?.success && data?.url) {
          localStorage.setItem(PAYMENT_LINK_KEY, data.url);
          window.open(data.url, '_blank');
        } else {
          toast.error(t('paymentLinkUnavailable'));
        }
      });
    }).catch(() => toast.error(t('paymentLinkError')));
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
    <div className="pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] max-w-2xl mx-auto bg-black min-h-screen text-white font-sans overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-6 bg-black/60 backdrop-blur-3xl border-b border-white/5">
        <h1 className="text-[28px] font-black tracking-tight leading-none mb-6">{t('title')}</h1>
        <div className="flex p-1 bg-zinc-900/80 rounded-2xl border border-white/5 relative">
           {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => { haptic.light(); setActiveTab(tab.id); }}
               className={cn(
                 "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all relative z-10",
                 activeTab === tab.id ? "text-white" : "text-white/40 hover:text-white/60"
               )}
             >
                <tab.icon size={14} className={cn(activeTab === tab.id && "text-white")} />
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
                        <AvatarFallback className="text-2xl font-bold bg-zinc-800 text-white/40">{name[0]}</AvatarFallback>
                     </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-[24px] font-black tracking-tight truncate leading-tight">{name}</h2>
                        {isPremium && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-[10px] font-black text-amber-400 flex items-center gap-1 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                            <Star size={10} fill="currentColor" /> PREMIUM
                          </span>
                        )}
                     </div>
                     {username && <p className="text-[15px] text-white/40 font-bold">@{username}</p>}
                  </div>
               </div>
            </div>

            {/* Balance Card - FULL WIDTH FIX */}
            <button
              onClick={handleTopUp}
              className="group relative w-full p-8 rounded-[32px] bg-linear-to-br from-zinc-900 to-zinc-950 border border-white/10 overflow-hidden shadow-2xl active:scale-[0.98] transition-all text-left"
            >
               <div className="relative z-10 w-full">
                  <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">{t('tokens')}</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-[48px] font-black tracking-tighter leading-none">{tokens}</span>
                     <span className="text-[20px] font-bold text-[#007AFF]">◈</span>
                  </div>
                  {isPremium && premiumEnd && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20 w-fit">
                       <Star size={12} className="text-amber-400" fill="currentColor" />
                       <span className="text-[11px] font-black text-amber-400/80 uppercase tracking-widest">
                         {t('premiumActive', { date: new Date(premiumEnd * 1000).toLocaleDateString() })}
                       </span>
                    </div>
                  )}
                  <div className="mt-8 flex items-center justify-between w-full">
                     <div className="flex items-center gap-3 text-[14px] font-black text-[#007AFF]">
                        <span className="px-5 py-2.5 bg-[#007AFF]/10 rounded-full border border-[#007AFF]/20 group-hover:bg-[#007AFF] group-hover:text-white transition-all">{t('topUpBalance')}</span>
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                     </div>
                  </div>
               </div>
            </button>

            {/* History Section */}
            <div>
               <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-white/30 px-2 mb-6">{t('generationHistory')}</h3>
               <div className="flex flex-col gap-4">
                  {reqLoading ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-3xl bg-white/5 animate-pulse" />
                  )) : requests.length > 0 ? requests.map((req) => (
                    <div key={req.id} className="flex items-center gap-5 p-4 rounded-3xl bg-zinc-900/30 border border-white/5 hover:border-white/10 transition-all">
                       <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-xl">
                          {req.status === 'completed' ? <CheckCircle2 className="text-[#007AFF]" /> : req.status === 'error' ? <XCircle className="text-red-500" /> : <Clock className="text-amber-400 animate-pulse" />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-[16px] font-black truncate leading-tight">{req.version}</p>
                          <p className="text-[12px] text-white/30 font-bold mt-1 uppercase tracking-wider">
                             {timeAgo(req.created_at)} • {req.cost} ◈
                          </p>
                       </div>
                       <div className={cn(
                         "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm",
                         req.status === 'completed' ? "text-[#007AFF] bg-[#007AFF]/10 border border-[#007AFF]/20" : 
                         req.status === 'error' ? "text-red-400 bg-red-400/10 border border-red-400/20" : "text-amber-400 bg-amber-400/10 border border-amber-400/20"
                       )}>
                          {t(`status${req.status.charAt(0).toUpperCase() + req.status.slice(1)}` as any)}
                       </div>
                    </div>
                  )) : (
                    <div className="py-12 text-center opacity-20"><p className="text-[14px] font-bold">{t('noGenerations')}</p></div>
                  )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-6">
               {/* ── Recurrent Subscription ── */}
               {recurrentData?.recurrent && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 px-2 flex items-center gap-2"><CreditCard size={14}/> {t('subscription')}</h3>
                    <div className="p-6 rounded-[32px] bg-linear-to-br from-[#007AFF]/5 to-zinc-900/40 border border-[#007AFF]/20 shadow-2xl">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-[#007AFF]/20 flex items-center justify-center text-[#007AFF]"><CheckCircle2 size={20} /></div>
                             <div>
                                <p className="text-[16px] font-black text-white">{t('activeSubscription')}</p>
                                <p className="text-[12px] font-bold text-white/30 uppercase tracking-widest">{t('autoRenewalOn') || 'Auto-renewal on'}</p>
                             </div>
                          </div>
                          <button
                            onClick={handleCancelRecurrent}
                            disabled={cancelRecurrent.isPending}
                            className="px-5 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[13px] font-black active:scale-95 transition-all disabled:opacity-50"
                          >
                             {cancelRecurrent.isPending ? <Loader2 size={16} className="animate-spin" /> : t('cancelSubscription')}
                          </button>
                       </div>
                       <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[12px] text-white/40 font-medium leading-relaxed">{t('subscriptionInfo')}</p>
                       </div>
                    </div>
                  </div>
               )}

               <div className="flex flex-col gap-3">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 px-2 flex items-center gap-2"><Globe size={14}/> Locale</h3>
                  <div className="p-5 rounded-3xl bg-zinc-900/40 border border-white/5 flex items-center justify-between">
                     <span className="text-[15px] font-bold">Language</span>
                     <LanguageSwitcher />
                  </div>
               </div>
               <div className="flex flex-col gap-3">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 px-2 flex items-center gap-2"><ShieldCheck size={14}/> Security & API</h3>
                  <div className="flex flex-col gap-3">
                     {apiTokens?.map((tk: any) => (
                       <div key={tk.id} className="flex items-center gap-4 p-5 rounded-3xl bg-zinc-900/40 border border-white/5 group">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40"><Key size={20} /></div>
                          <div className="flex-1 min-w-0">
                             <code className="text-[14px] font-mono text-white/60 truncate block">{tk.token}</code>
                             <p className="text-[11px] font-black text-white/20 mt-1 uppercase tracking-widest">{tk.generations} REQUESTS</p>
                          </div>
                          <button onClick={() => handleCopyToken(tk.token)} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all border border-white/10">
                             {copiedToken === tk.token ? <Check size={18} className="text-[#007AFF]" /> : <Copy size={18} className="text-white/40" />}
                          </button>
                       </div>
                     ))}
                     <button onClick={() => generateToken.mutate()} disabled={generateToken.isPending} className="w-full py-5 rounded-3xl border-2 border-dashed border-white/10 text-white/30 text-[14px] font-black hover:border-[#007AFF]/30 hover:text-[#007AFF] transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                        {generateToken.isPending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                        {t('createToken')}
                     </button>
                  </div>
               </div>
               <div className="flex flex-col gap-3">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 px-2">Information</h3>
                  <div className="grid grid-cols-1 gap-3">
                     <button onClick={() => router.push('/legal/offer')} className="flex items-center justify-between p-5 rounded-3xl bg-zinc-900/40 border border-white/5 active:scale-[0.98] transition-all"><span className="text-[15px] font-bold">{tLegal('offer')}</span><ChevronRight size={18} className="text-white/20" /></button>
                     <button onClick={() => router.push('/legal/privacy')} className="flex items-center justify-between p-5 rounded-3xl bg-zinc-900/40 border border-white/5 active:scale-[0.98] transition-all"><span className="text-[15px] font-bold">{tLegal('privacy')}</span><ChevronRight size={18} className="text-white/20" /></button>
                  </div>
               </div>
               <button onClick={() => { haptic.heavy(); logout(); }} className="mt-4 flex items-center justify-center gap-3 py-5 rounded-[24px] bg-red-500/10 border border-red-500/20 text-red-500 font-black text-[15px] hover:bg-red-500/20 transition-all active:scale-[0.98]"><LogOut size={20} />{t('logout')}</button>
            </div>
          </div>
        )}

        {activeTab === 'partnership' && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="p-8 rounded-[40px] bg-linear-to-br from-[#007AFF] to-[#0051FF] border border-white/20 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-20 translate-x-4 translate-y-[-10px] group-hover:translate-x-2 transition-transform"><Users size={140} className="text-white" /></div>
                <div className="relative z-10">
                   <h2 className="text-[28px] font-black tracking-tight leading-tight mb-2">{t('partnershipTitle')}</h2>
                   <p className="text-white/70 text-[15px] font-medium max-w-[200px] leading-relaxed">{t('partnershipShare')}</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5">
                   <p className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-3">{t('partnershipInvited')}</p>
                   <p className="text-[32px] font-black">{refStats?.total ?? 0}</p>
                </div>
                <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5">
                   <p className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-3">{t('partnershipEarned')} ◈</p>
                   <p className="text-[32px] font-black text-[#007AFF]">{refStats?.earned ?? 0}</p>
                </div>
             </div>
             <div className="flex flex-col gap-4">
                <h3 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/30 px-2">{t('partnershipLink')}</h3>
                <div className="flex items-center gap-3 p-2 bg-zinc-900/40 border border-white/5 rounded-[24px]">
                   <div className="flex-1 px-4 py-3 bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
                      <p className="text-[14px] font-medium text-white/60 truncate">{referralLink || '...'}</p>
                   </div>
                   <button onClick={handleCopyRef} className="w-14 h-14 rounded-2xl bg-[#007AFF] text-white flex items-center justify-center shadow-[0_0_20px_rgba(0,122,255,0.4)] active:scale-90 transition-all">
                      {copiedRef ? <Check size={24} /> : <Copy size={24} />}
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
