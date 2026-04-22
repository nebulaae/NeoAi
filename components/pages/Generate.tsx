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
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { getParamLabel, getParamValueLabel } from '@/lib/paramHelpers';

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

function paramLabel(name: string, t: any): string {
  try {
    return t(`params.${name}`);
  } catch {
    return name;
  }
}
function paramValueLabel(paramName: string, val: string, t: any): string {
  try {
    return t(`paramValues.${paramName}.${val}`);
  } catch {
    return val;
  }
}

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
        'px-3.5 py-1.5 rounded-full text-[14px] font-semibold cursor-pointer flex-shrink-0',
        'transition-all duration-150 active:scale-[0.92]',
        active
          ? 'bg-white/[.14] border border-white/[.22] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
          : 'bg-white/[.04] border border-white/[.07] text-white/40 hover:text-white/55 hover:bg-white/[.07]'
      )}
    >
      {children}
    </button>
  );
};

const ModelCard = ({ m, onClick }: { m: any; onClick: () => void }) => {
  const haptic = useHaptic();
  const t = useTranslations('Generate');
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
      className="group flex items-center gap-3.5 px-4 py-3.5 w-full text-left rounded-2xl
        bg-white/[.03] border border-white/[.06]
        hover:bg-white/[.06] hover:border-white/[.10]
        active:scale-[0.985] transition-all duration-150"
    >
      <div className="w-12 h-12 rounded-[14px] overflow-hidden flex-shrink-0 border border-white/[.09] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <Avatar className="size-full">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-[12px] font-semibold bg-transparent text-white/50">
            {m.model_name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-semibold text-white/85 truncate tracking-[-0.2px]">
          {m.model_name}
        </p>
        <p className="text-[12px] text-white/35 mt-0.5">
          {m.versions?.length > 1
            ? t('versions', { count: m.versions.length })
            : m.versions?.[0]?.label || ''}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="px-2.5 py-[3px] rounded-full text-[11px] font-medium text-white/30 bg-white/[.04] border border-white/[.07]">
          ◈ {cost}
        </div>
        <ChevronRight className="size-4 text-white/20 group-hover:text-white/40 transition-colors" />
      </div>
    </button>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12px] font-semibold tracking-[0.5px] uppercase text-white/35 mb-2.5">
    {children}
  </p>
);

export const Generate = () => {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const modelParam = searchParams.get('model');
  const haptic = useHaptic();
  const t = useTranslations('Generate');

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
    (m) => !m.categories?.includes('text') && m.mainCategory !== 'text'
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
      toast.error(t('uploadError'));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = () => {
    if (!selected) return;
    if (!prompt.trim() && media.length === 0) {
      toast.error(t('enterDescription'));
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
            toast(t('generationStarted'));
            setPendingId(dialogueId || null);
            setIsWaiting(!!dialogueId);
          } else if (dialogueId) {
            haptic.success();
            toast.success(t('done'));
            router.push(`/chats/${dialogueId}`);
          } else {
            toast.success(t('generationComplete'));
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
      toast.success(t('done'));
      if (pendingId) router.push(`/chats/${pendingId}`);
      setPendingId(null);
    } else if (lastMessage.status === 'error') {
      haptic.error();
      setIsWaiting(false);
      toast.error(
        t('errorTitle') + ': ' + (lastMessage.error || t('unknownError'))
      );
      setPendingId(null);
    }
  }, [lastMessage, isWaiting, pendingId, t, router]);

  /* ── Waiting screen ── */
  if (isWaiting && pendingId) {
    const status = lastMessage?.status;
    return (
      <div className="flex flex-col items-center justify-center min-h-[100svh] gap-6 px-5 text-center">
        <div className="w-20 h-20 rounded-[26px] flex items-center justify-center bg-white/[.05] border border-white/[.10] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {status === 'completed' ? (
            <CheckCircle size={30} className="text-emerald-400/80" />
          ) : status === 'error' ? (
            <AlertCircle size={30} className="text-red-400/80" />
          ) : (
            <Loader2 size={30} className="animate-spin text-white/40" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[20px] font-bold tracking-[-0.4px] text-white/90">
            {status === 'completed'
              ? t('done')
              : status === 'error'
                ? t('errorTitle')
                : t('waitingTitle')}
          </p>
          <p className="text-[13px] text-white/40 max-w-[260px] leading-[1.5]">
            {status === 'completed'
              ? t('doneSubtitle')
              : status === 'error'
                ? lastMessage?.error || t('unknownError')
                : t('waitingSubtitle')}
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
          className="text-[12px] text-white/30 bg-transparent border-none cursor-pointer hover:text-white/50 transition-colors"
        >
          {t('goToChat')}
        </button>
        <style>{`@keyframes pulse-dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:.8}}`}</style>
      </div>
    );
  }

  /* ── Detail view ── */
  if (selected) {
    const cost =
      selected.versions?.find((v) => v.label === currentVersion)?.cost ??
      selected.versions?.[0]?.cost ??
      1;
    const canAttach = selected.input?.some((i) =>
      ['image', 'video', 'audio'].includes(i)
    );
    const aspectParam = (params || []).find(
      (p: any) => p.name === 'aspect_ratio'
    );

    return (
      <div className="flex flex-col min-h-[100svh] pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))]">
        <header className="sticky top-0 z-40 bg-gradient-to-b from-zinc-950/95 to-zinc-950/0 backdrop-blur-2xl border-b border-white/[.05]">
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
              className="flex items-center gap-1.5 text-[14px] font-medium text-white/50 bg-transparent border-none cursor-pointer px-2 py-1.5 rounded-xl hover:text-white/70 active:scale-[0.92] transition-all duration-150"
            >
              <ChevronLeft size={16} /> {t('back')}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[9px] overflow-hidden border border-white/[.10]">
                <Avatar className="size-full">
                  <AvatarImage src={selected.avatar} />
                  <AvatarFallback className="text-[10px] bg-transparent">
                    {selected.model_name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[14px] font-semibold tracking-[-0.2px] text-white/85">
                {selected.model_name}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-full text-[14px] font-medium text-white/35 bg-white/[.04] border border-white/[.07]">
              ◈ {cost}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[700px] mx-auto flex flex-col gap-5 px-4 py-5">
            {selected.versions && selected.versions.length > 1 && (
              <div>
                <SectionLabel>{t('version')}</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {selected.versions.map((v) => (
                    <PillBtn
                      key={v.label}
                      active={currentVersion === v.label}
                      onClick={() => setSelectedVersion(v.label)}
                    >
                      {v.label}{' '}
                      <span className="opacity-40 ml-1 text-sm">· {v.cost}◈</span>
                    </PillBtn>
                  ))}
                </div>
              </div>
            )}

            <div>
              <SectionLabel>{t('prompt')}</SectionLabel>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('placeholder')}
                rows={4}
                className="w-full resize-none outline-none px-4 py-[14px] rounded-2xl
                  bg-white/[.04] border border-white/[.08] text-base leading-[1.55] text-white/90
                  placeholder:text-white/25 box-border transition-all duration-200
                  focus:bg-white/[.06] focus:border-white/[.16] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]"
                style={{ fontSize: 16 }}
              />
            </div>

            {aspectParam && (
              <div>
                <SectionLabel>{t('aspectRatio')}</SectionLabel>
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
                    className="flex items-center gap-2 text-[12px] text-white/35 bg-transparent border-none cursor-pointer py-1.5 hover:text-white/50 transition-colors"
                  >
                    <Settings2 size={13} /> {t('advancedParams')}
                    <ChevronDown
                      size={13}
                      className={cn(
                        'transition-transform duration-200',
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
                              {getParamLabel(p.name, locale)}

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
                                    {getParamValueLabel(p.name, val, locale)}
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
                                className="w-full box-border px-3.5 py-[10px] rounded-xl text-[13px] outline-none text-white/80 bg-white/[.04] border border-white/[.08] focus:border-white/[.14] transition-colors"
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
                  <SectionLabel>{t('media')}</SectionLabel>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={upload.isPending}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-white/40 bg-transparent border-none cursor-pointer hover:text-white/60 transition-colors"
                  >
                    {upload.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ImagePlus size={12} />
                    )}{' '}
                    {t('attach')}
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
                        className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden border border-white/[.09] shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
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
                          <div className="w-full h-full flex items-center justify-center text-[22px] bg-white/[.05]">
                            {m.type === 'video' ? '▶' : '♫'}
                          </div>
                        )}
                        <button
                          onClick={() =>
                            setMedia((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 backdrop-blur-lg rounded-full flex items-center justify-center text-white border-none cursor-pointer"
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
                'w-full py-4 px-6 rounded-full text-[15px] font-semibold text-white/90',
                'flex items-center justify-center gap-2.5',
                'bg-white/[.09] border border-white/[.16]',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_20px_rgba(0,0,0,0.2)]',
                'transition-all duration-150 active:scale-[0.97]',
                ((!prompt.trim() && media.length === 0) ||
                  generate.isPending ||
                  upload.isPending) &&
                'opacity-40'
              )}
            >
              {generate.isPending || upload.isPending ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  {upload.isPending ? t('uploading') : t('generating')}
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  {t('generate')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Model picker ── */
  const catOrder = ['image', 'video', 'audio'] as const;
  const CAT_LABEL: Record<string, string> = {
    image: t('catImage'),
    video: t('catVideo'),
    audio: t('catAudio'),
  };
  const catIcon: Record<string, string> = {
    image: '◈',
    video: '▶',
    audio: '♫',
  };

  return (
    <div className="flex flex-col min-h-[100svh] pb-[calc(80px+max(16px,env(safe-area-inset-bottom)))]">
      <header className="sticky top-0 z-40 px-5 pt-5 pb-4 bg-gradient-to-b from-zinc-950/95 to-zinc-950/0 backdrop-blur-2xl border-b border-white/[.05]">
        <div className="max-w-[700px] mx-auto">
          <p className="text-[24px] font-bold tracking-[-0.5px] text-white/90">
            {t('title')}
          </p>
          <p className="text-[14px] text-white/35 mt-0.5 font-medium">
            {t('subtitle')}
          </p>
        </div>
      </header>

      <div className="flex-1 px-3 pt-3">
        <div className="max-w-[700px] mx-auto flex flex-col gap-1">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
                <div className="w-12 h-12 rounded-[14px] flex-shrink-0 bg-white/[.04] border border-white/[.06] animate-pulse" />
                <div className="flex-1">
                  <div className="w-[40%] h-3 rounded-md mb-1.5 bg-white/[.05] animate-pulse" />
                  <div className="w-[22%] h-2.5 rounded-md bg-white/[.04] animate-pulse" />
                </div>
              </div>
            ))
            : catOrder.map((cat) => {
              const catModels = models.filter(
                (m) => m.mainCategory === cat || m.categories?.includes(cat)
              );
              if (!catModels.length) return null;
              return (
                <div key={cat} className="mb-2">
                  <div className="flex items-center gap-2 px-4 py-2 mb-1">
                    <span className="text-[12px] text-white/30">
                      {catIcon[cat]}
                    </span>
                    <span className="text-[12px] font-semibold tracking-[0.6px] uppercase text-white/30">
                      {CAT_LABEL[cat]}
                    </span>
                  </div>
                  {catModels.map((m) => (
                    <ModelCard
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
    </div>
  );
};

export default Generate;
