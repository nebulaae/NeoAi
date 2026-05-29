'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useUser } from '@/hooks/useUser';
import { usePackages, useCreatePaymentSession } from '@/hooks/usePackages';
import type { Package, Plan } from '@/hooks/usePackages';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Star,
  CreditCard,
  Coins,
  Mail,
  Loader2,
  Info,
  X,
} from 'lucide-react';

type PayMethod = 'rub' | 'xtr' | 'usdt';

interface DetailsState {
  pkg: Package;
  plan: Plan;
  pkgIdx: number;
  planIdx: number;
}

export const Pay = () => {
  const t = useTranslations('Pay');
  const router = useRouter();
  const locale = useLocale();
  const haptic = useHaptic();

  const { data: userData } = useUser();
  const { data: packagesData, isLoading, error } = usePackages();
  const createPaymentSession = useCreatePaymentSession();

  const [selectedMethod, setSelectedMethod] = useState<PayMethod>('rub');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [details, setDetails] = useState<DetailsState | null>(null);
  const [payingKey, setPayingKey] = useState<string | null>(null);

  const tokens = userData?.user?.tokens ?? 0;

  // Collect available methods from all packages
  const availableMethods = useMemo<PayMethod[]>(() => {
    if (!packagesData?.packages) return [];
    const found = new Set<PayMethod>();
    packagesData.packages.forEach(pkg =>
      pkg.plans.forEach(plan => {
        if (plan.amount != null) found.add('rub');
        if (plan.amount_xtr != null) found.add('xtr');
        if (plan.amount_usdt != null) found.add('usdt');
      })
    );
    const order: PayMethod[] = ['rub', 'xtr', 'usdt'];
    return order.filter(m => found.has(m));
  }, [packagesData]);

  // Set default method once data loads
  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.includes(selectedMethod)) {
      setSelectedMethod(availableMethods[0]);
    }
  }, [availableMethods, selectedMethod]);

  const getPrice = (plan: Plan, method: PayMethod): string | null => {
    if (method === 'rub' && plan.amount != null) return `${plan.amount} ₽`;
    if (method === 'xtr' && plan.amount_xtr != null) return `${plan.amount_xtr} ⭐`;
    if (method === 'usdt' && plan.amount_usdt != null) return `$${plan.amount_usdt}`;
    return null;
  };

  const getBullets = (plan: Plan): string[] => {
    if (!plan.description) return [];
    const text =
      plan.description[locale as 'ru' | 'en'] ||
      plan.description.en ||
      plan.description.ru ||
      '';
    return text.split('\n').filter(l => l.trim().length > 0);
  };

  const formatDuration = (seconds: number): string => {
    const days = Math.round(seconds / 86400);
    if (days === 30) return t('duration30Days');
    return t('durationNdays', { days });
  };

  const handleSelect = (pkgIdx: number, planIdx: number) => {
    haptic.medium();
    const plan = packagesData?.packages?.[pkgIdx]?.plans?.[planIdx];
    if (!packagesData || !plan) return;

    if (packagesData.email_required) {
      if (!email.trim()) {
        setEmailError(t('emailRequiredError'));
        haptic.warning();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setEmailError(t('emailInvalidError'));
        haptic.warning();
        return;
      }
      setEmailError(null);
    }

    const key = `${pkgIdx}-${planIdx}`;
    setPayingKey(key);
    toast.loading(t('successRedirect'));

    createPaymentSession.mutate(
      {
        webhookUrl: packagesData.webhook_url,
        payload: {
          pay_id: packagesData.pay_id,
          method: selectedMethod,
          package_index: pkgIdx,
          plan_index: planIdx,
          lang: locale,
          email: packagesData.email_required ? email.trim() : null,
        },
      },
      {
        onSuccess: data => {
          toast.dismiss();
          haptic.success();
          setPayingKey(null);
          if (data?.link) window.location.href = data.link;
          else toast.error(t('paymentError'));
        },
        onError: () => {
          toast.dismiss();
          haptic.error();
          setPayingKey(null);
          toast.error(t('paymentError'));
        },
      }
    );
  };

  const METHOD_LABELS: Record<PayMethod, string> = {
    rub: t('methodRub'),
    xtr: t('methodXtr'),
    usdt: t('methodUsdt'),
  };

  const METHOD_ICONS: Record<PayMethod, React.ReactNode> = {
    rub: <CreditCard size={13} />,
    xtr: <Star size={13} fill="currentColor" className="text-amber-400" />,
    usdt: <Coins size={13} />,
  };

  return (
    <div className="min-h-screen text-white font-sans">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 pt-4 z-30">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => {
              haptic.light();
              router.back();
            }}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all active:scale-90"
          >
            <ChevronLeft size={20} className="text-[#007AFF]" />
          </button>

          <h1 className="flex-1 text-center text-[24px] font-black tracking-tight text-[#007AFF]">
            {t('title')}
          </h1>

          {/* Token balance */}
          <div
            className="flex items-center gap-1 px-4 py-2 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/30 text-[#007AFF] text-[13px] font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,122,255,0.3)]"
          >

            <span className="text-[16px]">
              ◈
            </span>

            <span>{Math.trunc(tokens)}</span>
          </div>
        </div>

        {/* ── Method tabs ── */}
        {!isLoading && availableMethods.length > 0 && (
          <div className="max-w-xl mx-auto px-4 pb-3 mt-4">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {availableMethods.map(m => (
                <button
                  key={m}
                  onClick={() => { haptic.light(); setSelectedMethod(m); }}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap shrink-0 transition-all duration-200',
                    selectedMethod === m
                      ? 'bg-[#007AFF] text-white shadow-[0_4px_16px_rgba(0,122,255,0.45)]'
                      : 'bg-white/6 text-white/50 border border-white/8 hover:text-white/70'
                  )}
                >
                  {METHOD_ICONS[m]}
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Content ── */}
      <div className="max-w-xl mx-auto px-4 pt-2 pb-28">

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-32 gap-3 text-white/30">
            <Loader2 size={24} className="animate-spin text-[#007AFF]" />
            <span className="text-[14px] font-bold">{t('loadingBtn')}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 p-6 rounded-[28px] bg-red-500/5 border border-red-500/15 text-center">
            <Info size={24} className="mx-auto mb-2 text-red-400" />
            <p className="text-[14px] font-bold text-red-400">{t('errorLoadPackages')}</p>
          </div>
        )}

        {/* Email field (if required) */}
        <AnimatePresence>
          {packagesData?.email_required && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
                  placeholder={t('emailPlaceholder')}
                  className={cn(
                    'w-full pl-10 pr-4 py-4 rounded-2xl bg-zinc-900/60 border text-[14px] font-semibold text-white/90 placeholder-white/20 outline-none transition-all',
                    emailError
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-white/[0.08] focus:border-[#007AFF]/50'
                  )}
                />
              </div>
              {emailError && (
                <p className="mt-1.5 ml-1 text-[12px] font-bold text-red-400">{emailError}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Plan Cards ── */}
        {packagesData?.packages && (
          <div className="flex flex-col gap-4">
            {packagesData.packages.map((pkg, pkgIdx) =>
              pkg.plans.map((plan, planIdx) => {
                const price = getPrice(plan, selectedMethod);
                const bullets = getBullets(plan);
                const cardKey = `${pkgIdx}-${planIdx}`;
                const isPaying = payingKey === cardKey;
                const isPopular = pkg.view === 'popular';
                const isProfitable = pkg.view === 'profitable';

                return (
                  <motion.div
                    key={cardKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pkgIdx * 0.06, duration: 0.35 }}
                    className={cn(
                      'relative rounded-[28px] overflow-hidden border shadow-2xl',
                      isPopular
                        ? 'bg-zinc-900/80 border-[#007AFF]/30 shadow-[0_0_30px_rgba(0,122,255,0.08)]'
                        : 'bg-zinc-900/50 border-white/8'
                    )}
                  >
                    {/* Badge(s) */}
                    {(isPopular || isProfitable) && (
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-10">
                        {isPopular && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-black text-emerald-400 leading-none">
                            {t('popular')}
                          </span>
                        )}
                        {isProfitable && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-black text-emerald-400 leading-none">
                            {t('profitable')}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-6">
                      {/* Package label */}
                      <div className="text-[14px] font-black uppercase tracking-widest text-white/70 mb-4">
                        {pkg.icon} {pkg.text}
                      </div>

                      {/* Name + Price */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <h2 className="text-[22px] font-black text-white leading-tight pr-16">
                          {plan.name}
                        </h2>
                        {price && (
                          <div className="text-right shrink-0">
                            <div className="text-[20px] font-black text-[#007AFF] leading-tight">{price}</div>
                            <div className="text-[11px] text-white/30 font-bold mt-0.5">
                              / {formatDuration(plan.duration)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Credits chip */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/4 border border-white/8 mb-4">
                        <span className="text-[15px]">💎</span>
                        <span className="text-[14px] font-black text-white">
                          {plan.requests.toLocaleString()}
                        </span>
                        <span className="text-[13px] font-bold text-white/35">
                          {t('credits')}
                        </span>
                      </div>

                      {/* Bullet list */}
                      {bullets.length > 0 && (
                        <ul className="flex flex-col gap-1 mb-5">
                          {bullets.map((b, i) => (
                            <li
                              key={i}
                              className="text-[14px] text-white/55 font-medium leading-snug"
                            >
                              + {b}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2.5">
                        {/* <button
                          onClick={() => {
                            haptic.light();
                            setDetails({ pkg, plan, pkgIdx, planIdx });
                          }}
                          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/4 border border-white/8 text-[13px] font-bold text-white/50 hover:text-white/70 hover:border-white/15 transition-all active:scale-95 shrink-0"
                        >
                          <Info size={14} />
                          {t('detailsBtn')}
                        </button> */}

                        <button
                          onClick={() => handleSelect(pkgIdx, planIdx)}
                          disabled={isPaying || !price}
                          className="flex-1 relative overflow-hidden group flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#007AFF] text-white font-black text-[14px] shadow-[0_6px_20px_rgba(0,122,255,0.4)] hover:bg-[#0066EE] transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                          {isPaying ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            t('selectBtn')
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Details bottom sheet ── */}
      <AnimatePresence>
        {details && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40"
              onClick={() => setDetails(null)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-xl mx-auto"
            >
              <div className="bg-zinc-950 border border-white/8 border-b-0 rounded-t-[32px] p-6 pb-10">
                {/* Handle */}
                <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-6" />

                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-white/25 mb-1">
                      {details.pkg.icon} {details.pkg.text}
                    </div>
                    <h3 className="text-[20px] font-black text-white leading-tight">
                      {details.plan.name}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-xl bg-white/4 border border-white/8">
                      <span className="text-[13px]">💎</span>
                      <span className="text-[13px] font-black text-white">
                        {details.plan.requests.toLocaleString()}
                      </span>
                      <span className="text-[12px] font-bold text-white/35">
                        {t('credits')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetails(null)}
                    className="w-9 h-9 rounded-full bg-white/6 border border-white/8 flex items-center justify-center active:scale-90 transition-transform shrink-0"
                  >
                    <X size={16} className="text-white/40" />
                  </button>
                </div>

                {/* Bullets */}
                <ul className="flex flex-col gap-2.5 mb-6">
                  {getBullets(details.plan).map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] text-white/65 font-medium leading-snug">
                      <span className="text-[#007AFF] font-black shrink-0 mt-0.5">+</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => {
                    setDetails(null);
                    handleSelect(details.pkgIdx, details.planIdx);
                  }}
                  className="w-full py-4 rounded-2xl bg-[#007AFF] text-white font-black text-[15px] shadow-[0_8px_24px_rgba(0,122,255,0.4)] hover:bg-[#0066EE] transition-all active:scale-[0.98]"
                >
                  {t('selectBtn')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
