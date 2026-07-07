'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  X,
  Banknote,
  Bitcoin,
  CreditCard,
  ChevronDown,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatBankRequisites } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { useUser } from '@/hooks/useUser';
import {
  useMinWithdrawAmount,
  useWithdrawals,
  useCreateWithdrawal,
  useCancelWithdrawal,
  type WithdrawalStatus,
  type WithdrawalType,
  type WithdrawalTypeOption,
} from '@/hooks/useWithdrawal';

/* Fallback-типы: показываем селект даже если /withdrawal/min-amount
   не вернул withdrawal_types (404 / старый бэкенд). Комиссию считает бэкенд. */
const DEFAULT_WITHDRAWAL_TYPES: WithdrawalTypeOption[] = [
  { type: 'rub', fee_percent: 0 },
  { type: 'crypto', fee_percent: 0 },
];

const glass =
  'bg-zinc-900/50 backdrop-blur-2xl border border-white/[.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_4px_20px_rgba(0,0,0,0.28)]';

/* ── Per-type field config: поля меняются в зависимости от типа вывода ── */
const TYPE_META: Record<
  WithdrawalType,
  {
    label: string;
    emoji: string;
    icon: typeof Banknote;
    reqLabel: string;
    reqPlaceholder: string;
    reqHint: string;
    numeric: boolean;
  }
> = {
  rub: {
    label: 'Рубли',
    emoji: '🏦',
    icon: Banknote,
    reqLabel: 'Номер карты',
    reqPlaceholder: '4444 5555 6666 7777',
    reqHint: 'Карта или счёт для вывода в рублях',
    numeric: true,
  },
  crypto: {
    label: 'Криптокошелёк',
    emoji: '₿',
    icon: Bitcoin,
    reqLabel: 'Адрес кошелька',
    reqPlaceholder: 'TXk… адрес USDT',
    reqHint: 'Сеть USDT TRC-20',
    numeric: false,
  },
};

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  pending: 'В обработке',
  completed: 'Выполнено',
  canceled: 'Отменён',
  declined: 'Отклонён',
};

const STATUS_COLOR: Record<WithdrawalStatus, string> = {
  pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  canceled: 'text-white/40 bg-white/5 border-white/10',
  declined: 'text-red-400 bg-red-400/10 border-red-400/20',
};

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-2 p-4 rounded-[20px]', glass)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
          {label}
        </span>
        <span className="text-white/25">{icon}</span>
      </div>
      <span className="text-[22px] font-black tracking-tight text-white">
        {value}
      </span>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="shrink-0 text-[12px] font-medium text-white/35">
        {label}
      </span>
      <span
        className={cn(
          'min-w-0 truncate text-right text-[13px] font-bold text-white/80',
          mono && 'font-mono tracking-tight'
        )}
      >
        {value}
      </span>
    </div>
  );
}

export const Withdrawal = () => {
  const router = useRouter();
  const haptic = useHaptic();

  const { data: userData } = useUser();
  const user = userData?.user;
  const balance = user?.balance ?? 0;

  const { data: minData } = useMinWithdrawAmount();
  const { data: items = [], isLoading } = useWithdrawals();
  const createWithdrawal = useCreateWithdrawal();
  const cancelWithdrawal = useCancelWithdrawal();

  const [amount, setAmount] = useState('');
  const [requisites, setRequisites] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedType, setSelectedType] = useState<WithdrawalType>('rub');

  const min = minData?.min_withdraw_amount ?? 0;
  const withdrawalTypes = minData?.withdrawal_types?.length
    ? minData.withdrawal_types
    : DEFAULT_WITHDRAWAL_TYPES;
  const numAmount = parseInt(amount, 10) || 0;

  const feePercent =
    withdrawalTypes.find((t) => t.type === selectedType)?.fee_percent ?? 0;
  const feeAmount = Math.round((numAmount * feePercent) / 100);
  const amountAfterFee = numAmount - feeAmount;

  const typeMeta = TYPE_META[selectedType];
  const TypeIcon = typeMeta.icon;

  // Кастомный дропдаун типа вывода.
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!typeOpen) return;
    const onDown = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
        setTypeOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [typeOpen]);

  const changeType = (type: WithdrawalType) => {
    setTypeOpen(false);
    if (type === selectedType) return;
    haptic.light();
    setSelectedType(type);
    // Реквизиты специфичны для типа вывода — очищаем при переключении.
    setRequisites('');
  };

  const error = useMemo(() => {
    if (!amount) return null;
    if (numAmount < min) return `Минимум для вывода — ${min}`;
    if (numAmount > balance) return 'Недостаточно средств';
    return null;
  }, [amount, numAmount, min, balance]);

  const canSubmit =
    numAmount > 0 && !error && !createWithdrawal.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    haptic.medium();
    createWithdrawal.mutate(
      {
        amount: numAmount,
        type: selectedType,
        requisites: requisites.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          haptic.success();
          toast.success('Запрос на вывод создан');
          setAmount('');
          setRequisites('');
          setNotes('');
        },
        onError: (e: any) => {
          haptic.error();
          toast.error(e?.apiError || e?.message || 'Не удалось создать вывод');
        },
      }
    );
  };

  const handleCancel = (id: number) => {
    haptic.warning();
    cancelWithdrawal.mutate(id, {
      onSuccess: () => {
        haptic.success();
        toast.success('Вывод отменён, средства возвращены');
      },
      onError: (e: any) => {
        toast.error(e?.apiError || e?.message || 'Не удалось отменить');
      },
    });
  };

  return (
    <div className="flex flex-col min-h-svh pb-28" style={{ background: 'var(--page-bg)' }}>
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-zinc-950/60 backdrop-blur-2xl border-b border-white/[.07]">
        <button
          onClick={() => {
            haptic.light();
            router.back();
          }}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 active:scale-90 transition-all"
        >
          <ChevronLeft size={18} className="text-white/60" />
        </button>
        <h1 className="text-[18px] font-black tracking-tight text-white">
          Вывод средств
        </h1>
      </header>

      <div className="flex flex-col gap-6 px-4 py-6">
        {/* Балансы */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Wallet size={14} />} label="Баланс" value={balance} />
          <StatCard
            icon={<TrendingUp size={14} />}
            label="Заработано"
            value={user?.total_rewards ?? 0}
          />
          <StatCard
            icon={<ArrowUpRight size={14} />}
            label="Выведено"
            value={user?.total_withdrawals ?? 0}
          />
        </div>

        {/* Форма */}
        <div className={cn('flex flex-col gap-4 p-5 rounded-[24px]', glass)}>
          {/* ── Кастомный дропдаун типа вывода: выбираешь тип → поля меняются ── */}
          {withdrawalTypes.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-widest text-white/40">
                Способ вывода
              </label>
              <div className="relative" ref={typeRef}>
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setTypeOpen((o) => !o);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 bg-black/30 border rounded-2xl px-3 py-3 transition-all',
                    typeOpen ? 'border-[#007AFF]/50' : 'border-white/10'
                  )}
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#007AFF]/12 text-[#4da3ff]">
                    <TypeIcon size={18} />
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block text-[15px] font-black text-white leading-tight">
                      {typeMeta.label}
                    </span>
                    <span className="text-[11px] font-medium text-white/35">
                      {feePercent > 0
                        ? `комиссия ${feePercent}%`
                        : 'нажмите, чтобы выбрать'}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      'text-white/40 transition-transform duration-200',
                      typeOpen && 'rotate-180'
                    )}
                  />
                </button>

                {typeOpen && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl bg-zinc-900/95 backdrop-blur-2xl border border-white/10 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                    {withdrawalTypes.map((opt) => {
                      const m = TYPE_META[opt.type];
                      const Icon = m.icon;
                      const active = opt.type === selectedType;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => changeType(opt.type)}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors',
                            active ? 'bg-[#007AFF]/12' : 'hover:bg-white/5'
                          )}
                        >
                          <span
                            className={cn(
                              'flex items-center justify-center w-9 h-9 rounded-lg',
                              active
                                ? 'bg-[#007AFF]/20 text-[#4da3ff]'
                                : 'bg-white/5 text-white/50'
                            )}
                          >
                            <Icon size={16} />
                          </span>
                          <span className="flex-1 text-left">
                            <span
                              className={cn(
                                'block text-[14px] font-black leading-tight',
                                active ? 'text-white' : 'text-white/70'
                              )}
                            >
                              {m.label}
                            </span>
                            {opt.fee_percent > 0 && (
                              <span className="text-[11px] font-medium text-white/35">
                                комиссия {opt.fee_percent}%
                              </span>
                            )}
                          </span>
                          {active && (
                            <Check size={16} className="text-[#4da3ff]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-widest text-white/40">
              Сумма {min > 0 && <span className="text-white/25">(мин. {min})</span>}
            </label>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
              className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3.5 text-[18px] font-black text-white placeholder:text-white/20 outline-none focus:border-[#007AFF]/40 transition-all"
            />
            {numAmount > 0 && feePercent > 0 && (
              <p className="text-[12px] font-medium text-white/40 px-1">
                Комиссия {feePercent}% (−{feeAmount.toLocaleString('ru-RU')} ₽) →
                получите{' '}
                <span className="text-white/70 font-bold">
                  {amountAfterFee.toLocaleString('ru-RU')} ₽
                </span>
              </p>
            )}
          </div>

          {/* Реквизиты — динамически меняются под тип вывода */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-widest text-white/40">
              {typeMeta.reqLabel}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                {selectedType === 'rub' ? (
                  <CreditCard size={16} />
                ) : (
                  <Wallet size={16} />
                )}
              </span>
              <input
                inputMode={typeMeta.numeric ? 'numeric' : 'text'}
                value={requisites}
                onChange={(e) =>
                  setRequisites(
                    typeMeta.numeric
                      ? formatBankRequisites(e.target.value)
                      : e.target.value
                  )
                }
                placeholder={typeMeta.reqPlaceholder}
                className="w-full bg-black/30 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-[15px] font-medium text-white placeholder:text-white/20 outline-none focus:border-[#007AFF]/40 transition-all"
              />
            </div>
            <p className="text-[11px] font-medium text-white/25 px-1">
              {typeMeta.reqHint}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-widest text-white/40">
              Комментарий
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="необязательно"
              className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-[15px] font-medium text-white placeholder:text-white/20 outline-none focus:border-[#007AFF]/40 transition-all"
            />
          </div>

          {error && (
            <p className="text-[13px] font-bold text-red-400 px-1">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-[16px] transition-all active:scale-[0.98]',
              canSubmit
                ? 'bg-[#007AFF] text-white shadow-[0_0_24px_rgba(0,122,255,0.4)]'
                : 'bg-white/5 text-white/25'
            )}
          >
            {createWithdrawal.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowUpRight size={18} />
            )}
            Вывести
          </button>
        </div>

        {/* История */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-2">
            История выводов
          </h2>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-[20px] bg-zinc-900/60 animate-pulse" />
            ))
          ) : items.length === 0 ? (
            <p className="text-[14px] text-white/30 px-2 py-6 text-center">
              Пока нет выводов
            </p>
          ) : (
            items.map((w) => {
              const m = w.type ? TYPE_META[w.type] : null;
              const RowIcon = m?.icon ?? Banknote;
              const gross = w.amount_without_fee ?? w.amount;
              const net = w.amount;
              const dateStr = new Date(w.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={w.id}
                  className={cn('flex flex-col gap-3 p-4 rounded-[20px]', glass)}
                >
                  {/* Шапка: тип + статус */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#007AFF]/12 text-[#4da3ff] shrink-0">
                        <RowIcon size={15} />
                      </span>
                      <span className="text-[13px] font-black text-white/70 truncate">
                        {m?.label ?? 'Вывод'}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border',
                        STATUS_COLOR[w.status]
                      )}
                    >
                      {STATUS_LABEL[w.status]}
                    </span>
                  </div>

                  {/* Сумма: к зачислению выделена, запрошенная зачёркнута */}
                  <div className="flex items-end gap-2 flex-wrap">
                    <span className="text-[26px] font-black text-white leading-none">
                      {Number(gross).toLocaleString('ru-RU')} ₽
                    </span>
                    {net != null && net !== gross && (
                      <span className="text-[14px] font-medium text-white/30 line-through leading-none mb-[3px]">
                        {Number(net).toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </div>

                  {/* Детали */}
                  <div className="flex flex-col divide-y divide-white/5 rounded-xl bg-black/20 border border-white/5 px-3">
                    {w.fee > 0 && (
                      <InfoRow
                        label="Комиссия"
                        value={`−${Number(w.fee).toLocaleString('ru-RU')} ₽`}
                      />
                    )}
                    {w.requisites && (
                      <InfoRow label="Реквизиты" value={w.requisites} mono />
                    )}
                    <InfoRow label="Дата" value={dateStr} />
                  </div>

                  {w.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(w.id)}
                      disabled={cancelWithdrawal.isPending}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[13px] font-bold text-white/60 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <X size={14} /> Отменить заявку
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Withdrawal;
