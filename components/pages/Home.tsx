'use client';

import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { useUser } from '@/hooks/useUser';
import { useUI } from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ErrorComponent } from '@/components/states/Error';
import { usePaymentLink } from '@/hooks/useApiExtras';
import { localize } from '@/lib/utils';

export const Home = () => {
  const router = useRouter();
  const {
    data: models,
    isLoading: modelsLoading,
    isError: modelsError,
    refetch,
  } = useAIModels();
  const { data: trends, isLoading: trendsLoading } = useUI('trends');
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: userData } = useUser();
  const { data: paymentUrl } = usePaymentLink();

  const displayModels = models?.slice(0, 8) || [];
  const displayRoles = roles?.slice(0, 5) || [];
  const tokens = userData?.user?.tokens ?? 0;

  const handleModelClick = (techName: string, mainCategory?: string) => {
    if (mainCategory === 'text') {
      router.push(`/chats?model=${techName}`);
    } else {
      router.push(`/generate?model=${techName}`);
    }
  };

  const handleRoleClick = (roleId: number) => {
    router.push(`/chats?role=${roleId}`);
  };

  const handleTrendClick = (item: any) => {
    if (item.model) {
      router.push(`/generate?model=${item.model}`);
    } else if (item.role_id) {
      router.push(`/chats?role=${item.role_id}`);
    }
  };

  if (modelsError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <ErrorComponent
          title="Ошибка"
          description="Не удалось загрузить данные."
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <span className="text-xl font-bold tracking-tight">All AI</span>
        <button
          onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
          className="flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-secondary border border-border/50 text-sm font-medium transition-all hover:bg-secondary/80 active:scale-95"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-primary"
          >
            <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
          </svg>
          <span>{tokens}</span>
        </button>
      </div>

      {/* Models Grid */}
      <section className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Модели
          </p>
          <button
            onClick={() => router.push('/models')}
            className="text-xs text-primary font-medium"
          >
            Все
          </button>
        </div>
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {modelsLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="size-12 rounded-full" />
                  <Skeleton className="w-11 h-2.5 rounded" />
                </div>
              ))
            : displayModels.map((m) => (
                <button
                  key={m.tech_name}
                  onClick={() => handleModelClick(m.tech_name, m.mainCategory)}
                  className="flex flex-col items-center gap-1.5 focus:outline-none active:scale-90 transition-transform duration-100"
                >
                  <div className="size-12 rounded-full border border-border/60 overflow-hidden bg-secondary">
                    <Avatar className="size-12">
                      <AvatarImage
                        src={
                          m.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=ffffff`
                        }
                      />
                      <AvatarFallback className="text-[11px] bg-secondary font-bold">
                        {m.model_name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium text-center max-w-14 truncate leading-tight">
                    {m.model_name}
                  </span>
                </button>
              ))}
        </div>
      </section>

      <Separator className="mt-5" />

      {/* AI Assistants / Roles */}
      <section className="pt-5">
        <div className="flex items-center justify-between px-4 mb-3.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            AI Ассистенты
          </p>
          <button
            onClick={() => router.push('/chats')}
            className="text-xs text-primary font-medium"
          >
            Все
          </button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
          {rolesLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 shrink-0 w-18"
                >
                  <Skeleton className="size-14 rounded-xl" />
                  <Skeleton className="w-14 h-2.5 rounded" />
                </div>
              ))
            : displayRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleClick(role.id)}
                  className="shrink-0 flex flex-col items-center gap-2 w-18 active:scale-90 transition-transform duration-100"
                >
                  <Avatar className="size-14 border border-border/60 rounded-xl">
                    <AvatarImage src={role.image || ''} />
                    <AvatarFallback className="rounded-xl bg-secondary text-lg font-medium">
                      {localize(role.label).slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight w-full truncate">
                    {localize(role.label)}
                  </span>
                </button>
              ))}
        </div>
      </section>

      <Separator className="mt-5" />

      {/* Trending */}
      <section className="px-4 pt-5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">
          В тренде
        </p>
        <div className="flex flex-col gap-1">
          {trendsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-12 rounded-xl" />
              ))
            : (trends || []).length === 0
              ? // Fallback static trending items
                [
                  {
                    icon: '🎨',
                    title: 'Создай свой 2D-аватар',
                    href: '/generate',
                  },
                  {
                    icon: '🤖',
                    title: 'Открой возможности GPT',
                    href: '/chats',
                  },
                  {
                    icon: '📸',
                    title: 'Фотореалистичные изображения',
                    href: '/generate',
                  },
                  { icon: '🎵', title: 'Генерация музыки', href: '/generate' },
                ].map((item) => (
                  <button
                    key={item.title}
                    onClick={() => router.push(item.href)}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl w-full text-left hover:bg-secondary/60 transition-colors active:scale-[0.98]"
                  >
                    <span className="text-xl w-8 text-center shrink-0">
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium flex-1">
                      {item.title}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-muted-foreground"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))
              : (trends as any[]).map((item: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleTrendClick(item)}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl w-full text-left hover:bg-secondary/60 transition-colors active:scale-[0.98]"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="size-8 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <span className="text-xl w-8 text-center shrink-0">
                        ✨
                      </span>
                    )}
                    <span className="text-sm font-medium flex-1">
                      {localize(item.title)}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-muted-foreground"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
