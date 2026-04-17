'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useChatHistory, useUpload } from '@/hooks/useApiExtras';
import {
  useGenerateAI,
  convertMediaToInputs,
  normalizeResultMedia,
} from '@/hooks/useGenerations';
import { useAIModels } from '@/hooks/useModels';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  ChevronLeft,
  Send,
  ImagePlus,
  Loader2,
  X,
  Download,
  Pause,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';

// ── Types ──
interface MediaItem {
  type?: string;
  url?: string;
  input?: string | { type: string; format: string; input: string };
  format?: string;
}
interface Message {
  id: number;
  model: string;
  version: string;
  role_id?: number | null;
  inputs?: {
    text?: string;
    image?: string[];
    video?: string[];
    audio?: string[];
    media?: MediaItem[];
  };
  result?: { text?: string; media?: MediaItem[] };
  status: 'completed' | 'processing' | 'error' | 'pending';
  error?: string | null;
  cost?: number;
  created_at?: string;
}

const STORAGE_KEY = (id: string) => `dialogue_model_${id}`;
function readStoredModel(id: string) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY(id));
    if (raw)
      return JSON.parse(raw) as {
        model: string;
        version: string;
        role_id: number | null;
      };
  } catch { }
  return null;
}

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;

    if (isPlaying) {
      a.pause();
    } else {
      a.play();
    }
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setProgress(a.currentTime);
  };

  const onLoaded = () => {
    const a = audioRef.current;
    if (!a) return;
    setDuration(a.duration);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const val = Number(e.target.value);
    a.currentTime = val;
    setProgress(val);
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const play = () => setIsPlaying(true);
    const pause = () => setIsPlaying(false);

    a.addEventListener('play', play);
    a.addEventListener('pause', pause);

    return () => {
      a.removeEventListener('play', play);
      a.removeEventListener('pause', pause);
    };
  }, []);

  const format = (t: number) => {
    if (!t) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoaded}
      />

      {/* Верх: кнопка + время */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-white/10 border border-white/20 backdrop-blur-xl',
            'active:scale-90 transition'
          )}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>

        <div className="text-xs text-white/60 min-w-[60px]">
          {format(progress)} / {format(duration)}
        </div>
      </div>

      {/* Прогресс */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={progress}
        onChange={onSeek}
        className="w-full accent-[#0A84FF]"
      />
    </div>
  );
}

function writeStoredModel(
  id: string,
  model: string,
  version: string,
  role_id: number | null
) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY(id),
      JSON.stringify({ model, version, role_id })
    );
  } catch { }
}
function getDialogueModel(dialogueId: string | null, messages: Message[]) {
  if (!dialogueId) return { model: null, version: null, roleId: null };
  let fromHistory = messages.find((m) => m.model);
  if (!fromHistory && messages.length > 0) fromHistory = messages[0];
  if (fromHistory && (fromHistory.model || fromHistory.version)) {
    const model = fromHistory.model || fromHistory.version || '';
    const version = fromHistory.version || '';
    const roleId = fromHistory.role_id ?? null;
    writeStoredModel(dialogueId, model, version, roleId);
    return { model: model || null, version: version || null, roleId };
  }
  const cached = readStoredModel(dialogueId);
  if (cached)
    return {
      model: cached.model,
      version: cached.version,
      roleId: cached.role_id,
    };
  return { model: null, version: null, roleId: null };
}
function extractDisplayMedia(
  inputs: Message['inputs']
): { url: string; type: string }[] {
  const r: { url: string; type: string }[] = [];
  if (!inputs) return r;
  (inputs.image || []).forEach((url) => r.push({ url, type: 'image' }));
  (inputs.video || []).forEach((url) => r.push({ url, type: 'video' }));
  (inputs.audio || []).forEach((url) => r.push({ url, type: 'audio' }));
  (inputs.media || []).forEach((m) => {
    let url = '',
      type = 'image';
    if (typeof m.input === 'object' && m.input !== null) {
      url = m.input.input || '';
      type = m.input.type || 'image';
    } else {
      url = m.url || m.input || '';
      type = m.type || 'image';
    }
    if (url) r.push({ url, type });
  });
  return r;
}
function extractResultMedia(result: Message['result']) {
  return result?.media ? normalizeResultMedia(result.media) : [];
}

// ── Design tokens ──
const g = {
  ultraThin:
    'bg-zinc-950/30 backdrop-blur-2xl border border-white/[.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  thin: 'bg-zinc-900/40 backdrop-blur-xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  regular:
    'bg-zinc-900/50 backdrop-blur-2xl border border-white/[.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_4px_20px_rgba(0,0,0,0.28)]',
};
const spring =
  'transition-all duration-[260ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

export default function ChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const dialogueId = params?.dialogueId as string | undefined;
  const haptic = useHaptic();
  const [text, setText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<
    { url: string; type: string; file: File }[]
  >([]);
  const [viewerSrc, setViewerSrc] = useState<{
    url: string;
    type: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!dialogueId) return [];

  const { data: messages = [], isLoading: isHistoryLoading } =
    useChatHistory(dialogueId);
  const { data: allModels } = useAIModels();
  const generate = useGenerateAI();
  const upload = useUpload();
  const msgs = (messages as Message[]) || [];

  const {
    model: activeModel,
    version: activeVersion,
    roleId: activeRoleId,
  } = getDialogueModel(dialogueId, msgs);
  const isProcessing = msgs.some(
    (m) => m.status === 'processing' || m.status === 'pending'
  );
  const currentModel = allModels?.find((m) => m.tech_name === activeModel);
  const currentVersion = currentModel?.versions?.find(
    (v) => v.label === activeVersion
  );
  const limitMedia = currentVersion?.limit_media ?? null;
  const canAttachMedia =
    currentModel?.input?.some((t) => ['image', 'video', 'audio'].includes(t)) ??
    true;

  const chatTitle = (() => {
    const modelName = currentModel?.model_name;
    if (modelName && activeVersion) return `${modelName} · ${activeVersion}`;
    if (modelName) return modelName;
    if (activeVersion) return activeVersion;
    if (msgs.length > 0) return msgs[0].version || msgs[0].model || 'Диалог';
    return 'Диалог';
  })();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const prevProcessingRef = useRef(false);
  useEffect(() => {
    if (prevProcessingRef.current && !isProcessing && msgs.length > 0)
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    prevProcessingRef.current = isProcessing;
  }, [isProcessing, queryClient]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    const fileType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'audio';
    if (limitMedia !== null) {
      const limit = limitMedia[fileType] ?? 0;
      const currentCount = uploadedFiles.filter(
        (f) => f.type === fileType
      ).length;
      if (limit === 0) {
        toast.error(`Модель не принимает ${fileType}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (currentCount >= limit) {
        toast.error(`Максимум ${limit} файл(ов) типа ${fileType}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }
    try {
      const res = await upload.mutateAsync(file);
      setUploadedFiles((prev) => [
        ...prev,
        { url: res.url, type: res.type, file },
      ]);
    } catch {
      toast.error('Ошибка загрузки файла');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (i: number) =>
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSend = () => {
    if (isHistoryLoading) return;
    if (isProcessing) {
      haptic.warning();
      toast('Дождитесь окончания генерации');
      return;
    }
    if (!text.trim() && uploadedFiles.length === 0) return;
    const {
      model: techName,
      version,
      roleId,
    } = getDialogueModel(dialogueId, msgs);
    if (!techName) {
      haptic.error();
      toast.error('Загрузка диалога… Попробуйте ещё раз');
      return;
    }
    haptic.light();
    const oldFormatMedia = uploadedFiles.map((f) => ({
      type: f.type,
      format: 'url',
      input: f.url,
    }));
    const safeText = text.trim() || 'Опиши изображение';
    const inputs = convertMediaToInputs(safeText, oldFormatMedia);
    const sentText = text;
    setText('');
    setUploadedFiles([]);
    generate.mutate(
      {
        tech_name: techName,
        version: version || undefined,
        dialogue_id: dialogueId,
        role_id: roleId,
        inputs,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.chatHistory(dialogueId),
            refetchType: 'all',
          });
        },
        onError: () => {
          setText(sentText);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const acceptTypes = (() => {
    if (!currentModel) return 'image/*,.heic,video/*,audio/*';
    const a: string[] = [];
    if (currentModel.input?.includes('image')) a.push('image/*,.heic');
    if (currentModel.input?.includes('video')) a.push('video/*');
    if (currentModel.input?.includes('audio')) a.push('audio/*');
    return a.join(',') || 'image/*,.heic,video/*,audio/*';
  })();

  const isSendDisabled =
    isHistoryLoading ||
    isProcessing ||
    generate.isPending ||
    (!text.trim() && uploadedFiles.length === 0);

  return (
    <div
      className="flex flex-col h-svh"
      style={{ background: 'var(--page-bg)' }}
    >
      {/* Header */}
      <header
        className={cn(
          'shrink-0 sticky top-0 z-10 flex items-center gap-3 px-4 py-3',
          g.ultraThin,
          'rounded-none border-x-0 border-t-0 border-b border-white/[.08]'
        )}
      >
        <button
          onClick={() => {
            haptic.light();
            router.back();
          }}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
            g.thin,
            spring,
            'active:scale-[0.88]'
          )}
        >
          <ChevronLeft size={16} className="text-white/50" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold tracking-[-0.2px] truncate text-white/85">
            {chatTitle}
          </p>
          {isHistoryLoading && (
            <span className="text-[10px] text-white/30">Загрузка…</span>
          )}
          {!isHistoryLoading && isProcessing && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 inline-block animate-[pulse-opacity_1s_infinite]" />
              <span className="text-[10px] text-amber-400/70 font-medium">
                Генерация…
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {isHistoryLoading ? (
          <div className="flex justify-center pt-8">
            <Loader2 size={22} className="animate-spin text-white/25" />
          </div>
        ) : msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-16">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center',
                g.regular
              )}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-[13px] text-white/35 max-w-52 leading-relaxed">
              Начните диалог — напишите что-нибудь
            </p>
          </div>
        ) : (
          msgs.map((msg, idx) => {
            const userMedia = extractDisplayMedia(msg.inputs);
            const resultMedia = extractResultMedia(msg.result);
            return (
              <div key={msg.id || idx} className="flex flex-col gap-2.5">
                {(msg.inputs?.text || userMedia.length > 0) && (
                  <div className="flex justify-end">
                    <div
                      className={cn(
                        'max-w-[78%] px-3.5 py-2.5',
                        'bg-white/[.10] border border-white/[.15] backdrop-blur-xl',
                        'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
                        'text-white/90 rounded-[18px_18px_4px_18px] text-[14px] leading-[1.45]'
                      )}
                    >
                      {msg.inputs?.text && (
                        <p className="whitespace-pre-wrap m-0">
                          {msg.inputs.text}
                        </p>
                      )}
                      {userMedia.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {userMedia.map((m, i) => (
                            <button
                              key={i}
                              onClick={() => setViewerSrc(m)}
                              className="bg-transparent border-none p-0 cursor-pointer"
                            >
                              {m.type === 'image' ? (
                                <img
                                  src={m.url}
                                  alt=""
                                  className="max-h-32 rounded-[9px] object-cover"
                                />
                              ) : m.type === 'video' ? (
                                <video
                                  src={m.url}
                                  className="max-h-32 rounded-[9px]"
                                />
                              ) : (
                                <div className="px-2.5 py-1.5 bg-white/10 rounded-lg text-xs">
                                  ♫ Аудио
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-start">
                  <div className="max-w-[82%]">
                    {msg.status === 'processing' || msg.status === 'pending' ? (
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3.5 py-2.5 rounded-[18px_18px_18px_4px]',
                          g.regular
                        )}
                      >
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            style={{ animationDelay: `${i * 0.15}s` }}
                            className="w-1.5 h-1.5 rounded-full bg-white/30 animate-[pulse-dot_1.2s_infinite_ease-in-out]"
                          />
                        ))}
                      </div>
                    ) : msg.status === 'error' ? (
                      <div
                        className={cn(
                          'px-3.5 py-2.5 rounded-[18px_18px_18px_4px]',
                          'bg-red-500/[.08] border border-red-500/[.15] backdrop-blur-xl text-red-400/80 text-[14px]'
                        )}
                      >
                        {msg.error || 'Ошибка генерации'}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {msg.result?.text && (
                          <div
                            className={cn(
                              'px-3.5 py-2.5 rounded-[18px_18px_18px_4px]',
                              g.regular,
                              'text-[14px] leading-normal whitespace-pre-wrap text-white/80'
                            )}
                          >
                            {msg.result.text}
                          </div>
                        )}
                        {resultMedia.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {resultMedia.map((m, i) => {
                              // ── НОВОЕ: отдельный стиль для аудио с всегда видимой кнопкой скачивания ──
                              if (m.type === 'audio') {
                                return (
                                  <div key={i} className="w-full max-w-[420px]">
                                    <div
                                      className={cn(
                                        'flex flex-col gap-3 p-4',
                                        g.regular,
                                        'rounded-3xl border border-white/20'
                                      )}
                                    >
                                      <AudioPlayer src={m.url} />

                                      <a
                                        href={m.url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                          'self-end w-9 h-9 flex items-center justify-center rounded-xl',
                                          'bg-black/40 border border-white/15',
                                          'active:scale-90 transition'
                                        )}
                                      >
                                        <Download size={18} />
                                      </a>
                                    </div>
                                  </div>
                                );
                              }

                              // Оригинальный рендер для изображений и видео
                              return (
                                <div key={i} className="relative group">
                                  {m.type === 'image' ? (
                                    <img
                                      src={m.url}
                                      alt="Generated"
                                      onClick={() => setViewerSrc(m)}
                                      className="max-w-65 max-h-65 rounded-2xl object-cover cursor-pointer border border-white/18 shadow-[0_4px_16px_rgba(0,0,0,0.22)]"
                                    />
                                  ) : (
                                    <video
                                      src={m.url}
                                      controls
                                      className="max-w-65 max-h-65 rounded-2xl"
                                    />
                                  )}
                                  <a
                                    href={m.url}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className={cn(
                                      'absolute top-2 right-2 p-1.5 rounded-full',
                                      'bg-black/45 backdrop-blur-xl border border-white/15',
                                      'text-white flex items-center justify-center',
                                      'opacity-0 group-hover:opacity-100 transition-opacity'
                                    )}
                                  >
                                    <Download size={14} />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {!msg.result?.text && resultMedia.length === 0 && (
                          <div
                            className={cn(
                              'px-3.5 py-2.5 rounded-[18px_18px_18px_4px]',
                              g.thin,
                              'text-[13px] text-white/30 italic'
                            )}
                          >
                            Ответ получен
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Media Viewer */}
      {viewerSrc && (
        <div
          onClick={() => setViewerSrc(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4"
        >
          {viewerSrc.type === 'image' ? (
            <img
              src={viewerSrc.url}
              alt=""
              className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl"
            />
          ) : viewerSrc.type === 'video' ? (
            <video
              src={viewerSrc.url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-3xl"
            />
          ) : null}
          <button
            onClick={() => setViewerSrc(null)}
            className={cn(
              'absolute top-5 right-5 p-2 rounded-full',
              'bg-white/10 backdrop-blur-xl border border-white/[.12] text-white flex'
            )}
          >
            <X size={16} />
          </button>
          <a
            href={viewerSrc.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'absolute bottom-7 right-5 p-2.5 rounded-full',
              'bg-white/10 backdrop-blur-xl border border-white/[.12] text-white flex'
            )}
          >
            <Download size={16} />
          </a>
        </div>
      )}

      {/* Input Bar */}
      <div
        className={cn(
          'shrink-0',
          g.ultraThin,
          'rounded-none border-x-0 border-b-0 border-t border-white/[.08]',
          'px-3.5 pt-2.5',
          'pb-[max(10px,env(safe-area-inset-bottom))]'
        )}
      >
        {uploadedFiles.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {uploadedFiles.map((f, i) => (
              <div
                key={i}
                className={cn(
                  'relative w-14 h-14 rounded-xl overflow-hidden',
                  g.thin
                )}
              >
                {f.type === 'image' ? (
                  <img
                    src={f.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : f.type === 'video' ? (
                  <video
                    src={f.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-full rounded-3xl"
                  />
                ) : f.type === 'audio' ? (
                  <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl">
                    <audio
                      src={f.url}
                      controls
                      autoPlay
                      className="w-full"
                    />
                  </div>
                ) : null}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 backdrop-blur-lg rounded-full flex items-center justify-center text-white border-none cursor-pointer"
                >
                  <X size={9} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          {canAttachMedia && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={upload.isPending}
                className={cn(
                  'shrink-0 w-9 h-9 flex items-center justify-center rounded-full',
                  g.regular,
                  spring,
                  'active:scale-[0.88]',
                  upload.isPending && 'opacity-40'
                )}
              >
                {upload.isPending ? (
                  <Loader2 size={15} className="animate-spin text-white/35" />
                ) : (
                  <ImagePlus size={15} className="text-white/40" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept={acceptTypes}
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isHistoryLoading ? 'Загрузка…' : 'Сообщение…'}
            rows={1}
            className={cn(
              'flex-1 resize-none outline-none px-3.5 py-2.5 rounded-2xl',
              g.thin,
              'text-[14px] leading-[1.45] text-white/85 max-h-28 overflow-y-auto',
              'placeholder:text-white/25',
              spring,
              'focus:border-white/[.18]'
            )}
          />
          <button
            onClick={handleSend}
            disabled={isSendDisabled}
            className={cn(
              'shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-white/80',
              'bg-white/[.10] border border-white/[.16] backdrop-blur-xl',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
              spring,
              'active:scale-[0.88]',
              isSendDisabled && 'opacity-30'
            )}
          >
            {generate.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:.8}}
        @keyframes pulse-opacity{0%,100%{opacity:1}50%{opacity:.35}}
      `}</style>
    </div>
  );
}
