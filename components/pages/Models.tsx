'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIModels } from '@/hooks/useModels';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ModelsEmpty } from '@/components/states/Empty';
import { ModelsLoader } from '@/components/states/Loading';
import { ErrorComponent } from '@/components/states/Error';

const TABS = [
  { key: 'all', label: 'Все' },
  { key: 'text', label: 'Текст' },
  { key: 'image', label: 'Фото' },
  { key: 'video', label: 'Видео' },
  { key: 'audio', label: 'Аудио' },
];

const CATEGORY_LABEL: Record<string, string> = {
  text: 'Текст',
  image: 'Фото',
  video: 'Видео',
  audio: 'Аудио',
};

export const Models = () => {
  const [tab, setTab] = useState('all');
  const router = useRouter();
  const { data: models, isLoading, isError, refetch } = useAIModels();

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <ErrorComponent
          title="Ошибка загрузки"
          description="Не удалось получить список моделей."
          onRetry={refetch}
        />
      </div>
    );
  }

  const filtered =
    tab === 'all'
      ? models || []
      : (models || []).filter(
          (m) => m.categories?.includes(tab) || m.mainCategory === tab
        );

  const handleModelClick = (techName: string, mainCategory?: string) => {
    if (mainCategory === 'text') {
      router.push(`/chats?model=${techName}`);
    } else {
      router.push(`/generate?model=${techName}`);
    }
  };

  return (
    <div className="flex flex-col h-full pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl px-4 py-3 border-b border-border/50">
        <span className="text-xl font-bold tracking-tight">Модели</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar border-b border-border/30">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap active:scale-95 ${
              tab === t.key
                ? 'bg-foreground text-background'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ModelsLoader />
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <ModelsEmpty />
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((m) => {
              const defaultVersion =
                m.versions?.find((v) => v.default) || m.versions?.[0];
              const cost = defaultVersion?.cost ?? 1;
              const categoryLabel =
                CATEGORY_LABEL[m.mainCategory || ''] || 'AI';
              const avatarUrl =
                m.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=ffffff&size=128`;

              return (
                <button
                  key={m.tech_name}
                  onClick={() => handleModelClick(m.tech_name, m.mainCategory)}
                  className="flex items-center gap-3 px-4 py-3.5 w-full border-b border-border/40 hover:bg-secondary/40 active:bg-secondary/60 transition-colors text-left"
                >
                  <Avatar className="size-11 rounded-xl border border-border/50 shrink-0">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-secondary text-xs font-bold rounded-xl">
                      {m.model_name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {m.model_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span>{categoryLabel}</span>
                      {m.versions && m.versions.length > 1 && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground" />
                          <span>{m.versions.length} версии</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="secondary"
                      className="gap-1 px-2 h-6 text-xs"
                    >
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="opacity-60"
                      >
                        <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
                      </svg>
                      {cost}
                    </Badge>
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
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Models;
