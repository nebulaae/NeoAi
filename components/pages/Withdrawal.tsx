'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Wallet, TrendingUp, ArrowUpRight, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { useUser } from '@/hooks/useUser';
import {
  useMinWithdrawAmount,
  useWithdrawals,
  useCreateWithdrawal,
  useCancelWithdrawal,
  type WithdrawalStatus,
} from '@/hooks/useWithdrawal';

const glass =
  'bg-zinc-900/50 backdrop-blur-2xl border border-white/[.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_4px_20px_rgba(0,0,0,0.28)]';

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

export const Withdrawal = () => {
  const router = useRouter();
  const haptic = useHaptic();

  const { data: userData } = useUser();
  const user = userData?.user;
  const balance = user?.balance ?? 0;

  const { data: minAmount } = useMinWithdrawAmount();
  const { data: items = [], isLoading } = useWithdrawals();
  const createWithdrawal = useCreateWithdrawal();
  const cancelWithdrawal = useCancelWithdrawal();

  const [amount, setAmount] = useState('');
  const [requisites, setRequisites] = useState('');
  const [notes, setNotes] = useState('');

  const min = minAmount ?? 0;
  const numAmount = parseInt(amount, 10) || 0;

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
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-widest text-white/40">
              Реквизиты
            </label>
            <input
              value={requisites}
              onChange={(e) => setRequisites(e.target.value)}
              placeholder="на карту: 4444 5555 6666 7777"
              className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-[15px] font-medium text-white placeholder:text-white/20 outline-none focus:border-[#007AFF]/40 transition-all"
            />
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
            items.map((w) => (
              <div
                key={w.id}
                className={cn('flex items-center gap-3 p-4 rounded-[20px]', glass)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[18px] font-black text-white">
                      {w.amount}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border',
                        STATUS_COLOR[w.status]
                      )}
                    >
                      {STATUS_LABEL[w.status]}
                    </span>
                  </div>
                  {w.requisites && (
                    <p className="text-[12px] font-medium text-white/40 truncate mt-1">
                      {w.requisites}
                    </p>
                  )}
                  <p className="text-[11px] font-medium text-white/25 mt-0.5">
                    {new Date(w.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {w.status === 'pending' && (
                  <button
                    onClick={() => handleCancel(w.id)}
                    disabled={cancelWithdrawal.isPending}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[12px] font-bold text-white/60 hover:bg-red-500/20 hover:text-red-400 active:scale-90 transition-all disabled:opacity-50"
                  >
                    <X size={13} /> Отменить
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Withdrawal;
