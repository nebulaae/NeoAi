'use client';

import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  getRolePoster,
  localizeRoleDescription,
  type Role,
} from '@/hooks/useRoles';
import { cn, localize } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { useHaptic } from '@/hooks/useHaptic';

interface RoleSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  currentRoleId?: number | null;
  onSelect: (roleId: number) => void;
}

/** Модалка выбора роли: список ролей. Клик по роли — выбирает и закрывает. */
export function RoleSelectDialog({
  open,
  onOpenChange,
  roles,
  currentRoleId,
  onSelect,
}: RoleSelectDialogProps) {
  const t = useTranslations('Models');
  const locale = useLocale();
  const haptic = useHaptic();

  const handlePick = (id: number) => {
    haptic.medium();
    onSelect(id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[80vh] w-[calc(100%-2rem)] max-w-md flex-col gap-0 overflow-hidden rounded-[32px] border border-white/10 bg-zinc-950 p-0 text-white"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <DialogTitle className="text-[22px] font-black tracking-tight">
            {t('selectRole')}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all active:scale-90"
          >
            <X size={18} />
          </button>
        </div>
        <DialogDescription className="sr-only">
          {t('aiAssistants')}
        </DialogDescription>

        <div className="no-scrollbar flex flex-col gap-2 overflow-y-auto px-4 pb-6">
          {roles.map((role) => {
            const active = currentRoleId === role.id;
            return (
              <button
                key={role.id}
                onClick={() => handlePick(role.id)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.98]',
                  active
                    ? 'bg-[#007AFF]/10 border-[#007AFF]/30'
                    : 'bg-zinc-900/40 border-white/5 hover:border-white/15'
                )}
              >
                <Avatar className="h-12 w-12 rounded-2xl">
                  <AvatarImage
                    src={getRolePoster(role) || role.image || ''}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-zinc-800 text-sm">
                    {localize(role.label, locale).slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-[15px] font-bold',
                      active ? 'text-[#007AFF]' : 'text-white'
                    )}
                  >
                    {localize(role.label, locale)}
                  </p>
                  <p className="line-clamp-1 text-[12px] text-white/40">
                    {localizeRoleDescription(role.description, locale)}
                  </p>
                </div>
                {active && (
                  <div className="h-2 w-2 rounded-full bg-[#007AFF] shadow-[0_0_8px_#007AFF]" />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RoleSelectDialog;
