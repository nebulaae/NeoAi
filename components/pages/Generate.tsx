'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAIModels, useModelParams } from '@/hooks/useModels';
import { convertMediaToInputs, useGenerateAI } from '@/hooks/useGenerations';
import { useUpload } from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2,
  ChevronLeft,
  ImagePlus,
  X,
  CheckCircle,
  AlertCircle,
  Settings2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';

function useGenerationStatus(dialogueId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['gen-status', dialogueId],
    queryFn: async () => {
      const { data } = await api.get('/api/history', {
        params: { dialogue_id: dialogueId },
      });
      const msgs = data.messages || data || [];
      return Array.isArray(msgs) ? msgs[msgs.length - 1] : null;
    },
    enabled: !!dialogueId && enabled,
    refetchInterval: 2000,
  });
}

const g = {
  ultraThin:
    'bg-zinc-950/30 backdrop-blur-2xl border border-white/[.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  thin: 'bg-zinc-900/40 backdrop-blur-xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  regular:
    'bg-zinc-900/50 backdrop-blur-2xl border border-white/[.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_4px_20px_rgba(0,0,0,0.28)]',
  thick:
    'bg-zinc-900/60 backdrop-blur-3xl border border-white/[.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_32px_rgba(0,0,0,0.32)]',
};
const spring =
  'transition-all duration-[260ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold tracking-[0.7px] uppercase text-white/35 mb-2.5">
    {children}
  </p>
);

const PillBtn = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const haptic = useHaptic();
  return (
    <button
      onClick={() => {
        haptic.selection();
        onClick();
      }}
      className={cn(
        'px-3.5 py-1.5 rounded-full text-[12px] font-medium cursor-pointer flex-shrink-0',
        spring,
        'active:scale-[0.92]',
        active
          ? 'bg-white/[.14] border border-white/[.20] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
          : cn(g.thin, 'text-white/40')
      )}
    >
      {children}
    </button>
  );
};

const ModelRow = ({ m, onClick }: { m: any; onClick: () => void }) => {
  const haptic = useHaptic();
  const cost =
    m.versions?.find((v: any) => v.default)?.cost ?? m.versions?.[0]?.cost ?? 1;
  const avatarUrl =
    m.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=18181b&color=fff&size=128`;
  return (
    <button
      onClick={() => {
        haptic.light();
        onClick();
      }}
      className={cn(
        'flex items-center gap-3.5 px-5 py-3.5 w-full text-left bg-transparent border-none border-b border-white/[.05] cursor-pointer',
        spring,
        'hover:bg-white/[.03] active:bg-white/[.05] active:scale-[0.985]'
      )}
    >
      <div
        className={cn(
          'w-11 h-11 rounded-[13px] overflow-hidden flex-shrink-0',
          g.thin
        )}
      >
        <Avatar className="size-full">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-[11px] font-semibold bg-transparent text-white/50">
            {m.model_name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-white/85 truncate tracking-[-0.2px]">
          {m.model_name}
        </p>
        <p className="text-[11px] text-white/35 mt-0.5">
          {m.versions?.length > 1
            ? `${m.versions.length} версии`
            : m.versions?.[0]?.label || ''}
        </p>
      </div>
      <div
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[11px] font-medium text-white/35 flex-shrink-0',
          g.thin
        )}
      >
        ◈ {cost}
      </div>
    </button>
  );
};

export const Generate = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modelParam = searchParams.get('model');
  const haptic = useHaptic();
  const queryClient = useQueryClient();

  const [selectedTech, setSelectedTech] = useState<string | null>(modelParam);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [media, setMedia] = useState<
    { type: string; url: string; file?: File }[]
  >([]);
  const [extraParams, setExtraParams] = useState<Record<string, any>>({});
  const [showParams, setShowParams] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allModels, isLoading } = useAIModels();
  const generate = useGenerateAI();
  const upload = useUpload();
  const models = (allModels || []).filter(
    (m) => !m.categories?.includes('text')
  );
  const selected = models.find((m) => m.tech_name === selectedTech);
  const currentVersion =
    selectedVersion ||
    selected?.versions?.find((v) => v.default)?.label ||
    selected?.versions?.[0]?.label;
  const { data: params } = useModelParams(selectedTech, currentVersion);
  const { data: lastMessage } = useGenerationStatus(pendingId, isWaiting);

  useEffect(() => {
    if (modelParam) setSelectedTech(modelParam);
  }, [modelParam]);
  useEffect(() => {
    if (selected) {
      const def =
        selected.versions?.find((v) => v.default) || selected.versions?.[0];
      setSelectedVersion(def?.label || null);
    }
  }, [selected?.tech_name]);
  useEffect(() => {
    if (!params) return;
    const defaults: Record<string, any> = {};
    params.forEach((p: any) => {
      if (p.default !== undefined) defaults[p.name] = p.default;
    });
    setExtraParams(defaults);
  }, [params]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      const uploaded = await upload.mutateAsync(files[0]);
      setMedia((prev) => [
        ...prev,
        { type: uploaded.type, url: uploaded.url, file: files[0] },
      ]);
    } catch {
      toast.error('Ошибка загрузки файла');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = () => {
    if (!selected) return;
    if (!prompt.trim() && media.length === 0) {
      toast.error('Введите описание или прикрепите файл');
      return;
    }
    haptic.medium();
    const oldFormatMedia = media.map((m) => ({
      type: m.type,
      format: 'url',
      input: m.url,
    }));
    const inputs = convertMediaToInputs(prompt.trim() || ' ', oldFormatMedia);
    generate.mutate(
      {
        tech_name: selected.tech_name,
        version: currentVersion || undefined,
        inputs,
        params: Object.keys(extraParams).length > 0 ? extraParams : undefined,
      },
      {
        onSuccess: (data) => {
          const dialogueId = data.dialogue_id;
          if (dialogueId) {
            try {
              sessionStorage.setItem(
                `dialogue_model_${dialogueId}`,
                JSON.stringify({
                  model: selected.tech_name,
                  version: currentVersion || '',
                  role_id: null,
                })
              );
            } catch { }
          }
          if (data.status === 'processing') {
            toast('Генерация запущена…');
            setPendingId(dialogueId || null);
            setIsWaiting(!!dialogueId);
          } else if (dialogueId) {
            haptic.success();
            toast.success('Готово!');
            router.push(`/chats/${dialogueId}`);
          } else {
            toast.success('Генерация завершена');
          }
        },
      }
    );
  };

  useEffect(() => {
    if (!isWaiting || !lastMessage) return;
    if (lastMessage.status === 'completed') {
      haptic.success();
      setIsWaiting(false);
      toast.success('Готово!');
      if (pendingId) router.push(`/chats/${pendingId}`);
      setPendingId(null);
    } else if (lastMessage.status === 'error') {
      haptic.error();
      setIsWaiting(false);
      toast.error('Ошибка: ' + (lastMessage.error || 'Неизвестная ошибка'));
      setPendingId(null);
    }
  }, [lastMessage, isWaiting, pendingId]);

  /* Waiting screen */
  if (isWaiting && pendingId) {
    const status = lastMessage?.status;
    return (
      <div className="flex flex-col items-center justify-center min-h-[100svh] gap-6 px-5 text-center">
        <div
          className={cn(
            'w-18 h-18 rounded-[24px] flex items-center justify-center',
            g.thick
          )}
        >
          {status === 'completed' ? (
            <CheckCircle size={28} className="text-emerald-400/80" />
          ) : status === 'error' ? (
            <AlertCircle size={28} className="text-red-400/80" />
          ) : (
            <Loader2 size={28} className="animate-spin text-white/40" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[18px] font-bold tracking-[-0.3px] text-white/90">
            {status === 'completed'
              ? 'Готово!'
              : status === 'error'
                ? 'Ошибка'
                : 'Генерация…'}
          </p>
          <p className="text-[13px] text-white/40 max-w-[260px] leading-[1.5]">
            {status === 'completed'
              ? 'Переход к результату…'
              : status === 'error'
                ? lastMessage?.error || 'Произошла ошибка'
                : 'Нейросеть обрабатывает запрос. Это займёт несколько секунд.'}
          </p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 0.2}s` }}
              className="w-1.5 h-1.5 rounded-full bg-white/20 animate-[pulse-dot_1.4s_ease-in-out_infinite]"
            />
          ))}
        </div>
        <button
          onClick={() => {
            setIsWaiting(false);
            setPendingId(null);
            router.push(`/chats/${pendingId}`);
          }}
          className="text-[12px] text-white/30 bg-transparent border-none cursor-pointer"
        >
          Перейти в чат
        </button>
        <style>{`@keyframes pulse-dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:.8}}`}</style>
      </div>
    );
  }

  /* Detail view */
  if (selected) {
    const cost =
      selected.versions?.find((v) => v.label === currentVersion)?.cost ??
      selected.versions?.[0]?.cost ??
      1;
    const canAttach = selected.input?.some((t) =>
      ['image', 'video', 'audio'].includes(t)
    );
    const aspectParam = (params || []).find(
      (p: any) => p.name === 'aspect_ratio'
    );
    return (
      <div className="flex flex-col min-h-[100svh] pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] overflow-x-hidden">
        <header
          className={cn(
            'sticky top-0 z-40',
            g.ultraThin,
            'border-x-0 border-t-0 rounded-none'
          )}
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            <button
              onClick={() => {
                haptic.light();
                setSelectedTech(null);
                setPrompt('');
                setMedia([]);
                setExtraParams({});
                setShowParams(false);
              }}
              className={cn(
                'flex items-center gap-1 text-[14px] font-medium text-white/50 bg-transparent border-none cursor-pointer px-2 py-1 rounded-lg',
                spring,
                'active:scale-[0.92]'
              )}
            >
              <ChevronLeft size={16} /> Назад
            </button>
            <div className="flex items-center gap-2">
              <div className={cn('w-6 h-6 rounded-lg overflow-hidden', g.thin)}>
                <Avatar className="size-full">
                  <AvatarImage src={selected.avatar} />
                  <AvatarFallback className="text-[8px] bg-transparent">
                    {selected.model_name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[14px] font-semibold tracking-[-0.2px] text-white/85">
                {selected.model_name}
              </span>
            </div>
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-white/35',
                g.thin
              )}
            >
              ◈ {cost}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[700px] mx-auto flex flex-col gap-5 px-5 py-5">
            {selected.versions && selected.versions.length > 1 && (
              <div>
                <SectionLabel>Версия</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {selected.versions.map((v) => (
                    <PillBtn
                      key={v.label}
                      active={currentVersion === v.label}
                      onClick={() => setSelectedVersion(v.label)}
                    >
                      {v.label}{' '}
                      <span className="opacity-50 ml-1">· {v.cost}◈</span>
                    </PillBtn>
                  ))}
                </div>
              </div>
            )}

            <div>
              <SectionLabel>Описание</SectionLabel>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите, что хотите создать..."
                rows={4}
                className={cn(
                  'w-full resize-none outline-none px-4 py-[14px] rounded-2xl',
                  g.regular,
                  'text-[15px] leading-[1.55] text-white placeholder:text-white/30',
                  'box-border font-[var(--font-sf)]',
                  spring,
                  'focus:border-[rgba(0,122,255,0.40)] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_0_0_3px_rgba(0,122,255,0.12)]'
                )}
                style={{ fontSize: 16 }}  // ← фикс zoom на iOS
              />
            </div>

            {aspectParam && (
              <div>
                <SectionLabel>Соотношение сторон</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {aspectParam.values?.map((val: string) => (
                    <PillBtn
                      key={val}
                      active={
                        (extraParams.aspect_ratio ?? aspectParam.default) ===
                        val
                      }
                      onClick={() =>
                        setExtraParams((p) => ({ ...p, aspect_ratio: val }))
                      }
                    >
                      {val}
                    </PillBtn>
                  ))}
                </div>
              </div>
            )}

            {params &&
              params.filter((p: any) => p.name !== 'aspect_ratio').length >
              0 && (
                <div>
                  <button
                    onClick={() => {
                      haptic.selection();
                      setShowParams(!showParams);
                    }}
                    className="flex items-center gap-1.5 text-[12px] text-white/35 bg-transparent border-none cursor-pointer py-1.5"
                  >
                    <Settings2 size={13} /> Дополнительные параметры
                    <ChevronDown
                      size={13}
                      className={cn(
                        'transition-transform duration-[260ms]',
                        showParams && 'rotate-180'
                      )}
                    />
                  </button>
                  {showParams && (
                    <div className="mt-3.5 flex flex-col gap-3.5">
                      {params
                        .filter((p: any) => p.name !== 'aspect_ratio')
                        .map((p: any) => (
                          <div key={p.name}>
                            <label className="block text-[11px] text-white/35 mb-1.5">
                              {p.label || p.name}
                            </label>
                            {p.type === 'select' && p.values ? (
                              <div className="flex flex-wrap gap-1.5">
                                {p.values.map((val: string) => (
                                  <PillBtn
                                    key={val}
                                    active={
                                      (extraParams[p.name] ?? p.default) === val
                                    }
                                    onClick={() =>
                                      setExtraParams((prev) => ({
                                        ...prev,
                                        [p.name]: val,
                                      }))
                                    }
                                  >
                                    {val}
                                  </PillBtn>
                                ))}
                              </div>
                            ) : (
                              <input
                                type={p.type === 'number' ? 'number' : 'text'}
                                value={extraParams[p.name] ?? p.default ?? ''}
                                min={p.min}
                                max={p.max}
                                onChange={(e) =>
                                  setExtraParams((prev) => ({
                                    ...prev,
                                    [p.name]:
                                      p.type === 'number'
                                        ? Number(e.target.value)
                                        : e.target.value,
                                  }))
                                }
                                className={cn(
                                  'w-full box-border px-3.5 py-[10px] rounded-xl text-[13px] outline-none text-white/80',
                                  g.thin
                                )}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

            {canAttach && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <SectionLabel>Медиафайл</SectionLabel>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={upload.isPending}
                    className={cn(
                      'flex items-center gap-1.5 text-[12px] font-medium text-white/45 bg-transparent border-none cursor-pointer',
                      spring,
                      upload.isPending && 'opacity-50'
                    )}
                  >
                    {upload.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ImagePlus size={12} />
                    )}{' '}
                    Прикрепить
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.heic,video/*,audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {media.length > 0 && (
                  <div className="flex gap-2.5 flex-wrap">
                    {media.map((m, i) => (
                      <div
                        key={i}
                        className={cn(
                          'relative w-18 h-18 rounded-2xl overflow-hidden',
                          g.thin
                        )}
                      >
                        {m.type === 'image' ? (
                          <img
                            src={m.file ? URL.createObjectURL(m.file) : m.url}
                            className="w-full h-full object-cover"
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = m.url;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[24px] bg-white/[.05]">
                            {m.type === 'video' ? '▶' : '♫'}
                          </div>
                        )}
                        <button
                          onClick={() =>
                            setMedia((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          className="absolute top-1 right-1 w-5 h-5 bg-black/50 backdrop-blur-lg rounded-full flex items-center justify-center text-white border-none cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={
                (!prompt.trim() && media.length === 0) ||
                generate.isPending ||
                upload.isPending
              }
              className={cn(
                'w-full py-4 px-6 rounded-full text-[16px] font-semibold text-white/90',
                'flex items-center justify-center gap-2',
                'bg-white/[.10] border border-white/[.18] backdrop-blur-xl',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_6px_24px_rgba(0,0,0,0.25)]',
                spring,
                'active:scale-[0.97]',
                ((!prompt.trim() && media.length === 0) ||
                  generate.isPending ||
                  upload.isPending) &&
                'opacity-40'
              )}
            >
              {generate.isPending || upload.isPending ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  {upload.isPending ? 'Загрузка…' : 'Генерация…'}
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  Создать
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* Model picker */
  const catOrder = ['image', 'video', 'audio'] as const;
  const catLabel: Record<string, string> = {
    image: 'Изображения',
    video: 'Видео',
    audio: 'Аудио',
  };
  const catIcon: Record<string, string> = {
    image: '◈',
    video: '▶',
    audio: '♫',
  };

  return (
    <div className="flex flex-col min-h-[100svh] pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] overflow-x-hidden">
      <header
        className={cn(
          'sticky top-0 z-40 px-5 py-4',
          g.ultraThin,
          'border-x-0 border-t-0 rounded-none'
        )}
      >
        <div className="max-w-[700px] mx-auto">
          <p className="text-[20px] font-bold tracking-[-0.4px] text-white/90">
            Создать
          </p>
          <p className="text-[12px] text-white/35 mt-0.5">Выберите нейросеть</p>
        </div>
      </header>
      <div className="flex-1">
        <div className="max-w-[700px] mx-auto">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 px-5 py-3.5 border-b border-white/[.05]"
              >
                <div
                  className={cn(
                    'w-11 h-11 rounded-[13px] flex-shrink-0 animate-[pulse-opacity_1.6s_ease-in-out_infinite]',
                    g.thin
                  )}
                />
                <div className="flex-1">
                  <div
                    className={cn(
                      'w-[40%] h-3 rounded-md mb-1.5 animate-[pulse-opacity_1.6s_ease-in-out_0.1s_infinite]',
                      g.thin
                    )}
                  />
                  <div
                    className={cn(
                      'w-[22%] h-2.5 rounded-md animate-[pulse-opacity_1.6s_ease-in-out_0.2s_infinite]',
                      g.thin
                    )}
                  />
                </div>
              </div>
            ))
            : catOrder.map((cat) => {
              const catModels = models.filter(
                (m) => m.mainCategory === cat || m.categories?.includes(cat)
              );
              if (!catModels.length) return null;
              return (
                <div key={cat}>
                  <div
                    className={cn(
                      'px-5 py-2.5 border-b border-white/[.05]',
                      g.ultraThin,
                      'rounded-none border-x-0'
                    )}
                  >
                    <p className="text-[10px] font-semibold tracking-[0.7px] uppercase text-white/35 flex items-center gap-1.5">
                      <span>{catIcon[cat]}</span>
                      {catLabel[cat]}
                    </p>
                  </div>
                  {catModels.map((m) => (
                    <ModelRow
                      key={m.tech_name}
                      m={m}
                      onClick={() => setSelectedTech(m.tech_name)}
                    />
                  ))}
                </div>
              );
            })}
        </div>
      </div>
      <style>{`@keyframes pulse-opacity{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
};

export default Generate;
