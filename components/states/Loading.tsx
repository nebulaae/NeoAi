import { Skeleton } from '@/components/ui/skeleton';

export const ModelsLoader = () => (
  <div className="flex flex-col w-full">
    {Array.from({ length: 7 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40"
      >
        <Skeleton className="size-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="w-2/5 h-3.5" />
          <Skeleton className="w-1/4 h-2.5" />
        </div>
        <Skeleton className="w-10 h-6 rounded-full" />
      </div>
    ))}
  </div>
);

export const ChatsLoader = () => (
  <div className="flex flex-col w-full">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40"
      >
        <Skeleton className="size-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="w-3/5 h-3.5" />
          <Skeleton className="w-2/5 h-2.5" />
        </div>
        <Skeleton className="w-8 h-2.5 shrink-0" />
      </div>
    ))}
  </div>
);
