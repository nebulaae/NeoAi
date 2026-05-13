'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useChatHistory, useUpload } from '@/hooks/useApiExtras';
import {
  useGenerateAI,
  convertMediaToInputs,
  normalizeResultMedia,
} from '@/hooks/useGenerations';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
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
  Share2,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { PublishDialog } from '@/components/dialogs/PublishDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useHaptic } from '@/hooks/useHaptic';
import { cn, localize } from '@/lib/utils';
import { useTranslations } from 'next-intl';

/* ── Types ── */
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
  post_id?: number | null;
  created_at?: string;
}

/* ── sessionStorage helpers ── */
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
  } catch {}
  return null;
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
  } catch {}
}

function getDialogueModel(
  dialogueId: string | null,
  messages: Message[],
  urlParams?: {
    model?: string | null;
    version?: string | null;
    role?: string | null;
  }
): { model: string | null; version: string | null; roleId: number | null } {
  if (!dialogueId) return { model: null, version: null, roleId: null };
  if (dialogueId === 'new') {
    if (urlParams?.model) {
      const roleId = urlParams.role ? parseInt(urlParams.role) : null;
      return {
        model: urlParams.model,
        version: urlParams.version ?? null,
        roleId: isNaN(roleId as number) ? null : roleId,
      };
    }
    return { model: null, version: null, roleId: null };
  }
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
  if (cached) return { model: cached.model, version: cached.version, roleId: cached.role_id };
  return { model: null, version: null, roleId: null };
}

function extractDisplayMedia(inputs: Message['inputs']): { url: string; type: string }[] {
  const r: { url: string; type: string }[] = [];
  if (!inputs) return r;
  (inputs.image || []).forEach((url) => r.push({ url, type: 'image' }));
  (inputs.video || []).forEach((url) => r.push({ url, type: 'video' }));
  (inputs.audio || []).forEach((url) => r.push({ url, type: 'audio' }));
  (inputs.media || []).forEach((m) => {
    let url = '';
    let type = 'image';
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

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.pause();
    else a.play();
  };

  const format = (t: number) => {
    if (!t) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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

  return (
    <div className="flex flex-col gap-3 w-full p-4 rounded-2xl bg-white/5 border border-white/10">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a) setProgress(a.currentTime);
        }}
        onLoadedMetadata={() => {
          const a = audioRef.current;
          if (a) setDuration(a.duration);
        }}
      />
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-[#AAFF00] flex items-center justify-center transition-all active:scale-90 shadow-[0_0_15px_rgba(170,255,0,0.3)]"
        >
          {isPlaying ? <Pause size={24} className="text-black" /> : <Play size={24} className="text-black ml-1" />}
        </button>
        <div className="flex-1">
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-[#AAFF00]" style={{ width: `${(progress / (duration || 1)) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest">
            <span>{format(progress)}</span>
            <span>{format(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const t = useTranslations('ChatPage');
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const searchParams = useSearchParams();
  const dialogueId = params?.dialogueId as string | undefined;
  const haptic = useHaptic();
  const [text, setText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; type: string; file: File }[]>([]);
  const [viewerSrc, setViewerSrc] = useState<{ url: string; type: string } | null>(null);
  const [publishingMessage, setPublishingMessage] = useState<Message | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const urlModel = searchParams.get('model');
  const urlVersion = searchParams.get('version');
  const urlRole = searchParams.get('role');

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(urlRole ? parseInt(urlRole) : null);
  const { data: messages = [], isLoading: isHistoryLoading } = useChatHistory(dialogueId === 'new' ? null : (dialogueId || null));
  const { data: allModels } = useAIModels();
  const { data: roles } = useRoles();
  const generate = useGenerateAI();
  const upload = useUpload();

  const msgsFromHistory = (messages as Message[]) || [];
  const { model: activeModel, version: activeVersion } = getDialogueModel(dialogueId!, msgsFromHistory, {
    model: urlModel,
    version: urlVersion,
    role: urlRole,
  });

  const msgs = msgsFromHistory;
  const isProcessing = msgs.some((m) => m.status === 'processing' || m.status === 'pending') || optimisticMessages.length > 0;
  const currentModel = allModels?.find((m) => m.tech_name === activeModel);
  const currentVersion = currentModel?.versions?.find((v) => v.label === activeVersion);
  const limitMedia = currentVersion?.limit_media ?? null;
  const canAttachMedia = currentModel?.input?.some((t) => ['image', 'video', 'audio'].includes(t)) ?? true;

  const chatTitle = (() => {
    const modelName = currentModel?.model_name;
    if (modelName && activeVersion) return `${modelName} · ${activeVersion}`;
    if (modelName) return modelName;
    return t('dialogue');
  })();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, optimisticMessages, scrollToBottom]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio';
    
    try {
      const res = await upload.mutateAsync(file);
      setUploadedFiles((prev) => [...prev, { url: res.url, type: res.type, file }]);
    } catch {
      toast.error(t('uploadError'));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (i: number) => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSend = () => {
    if (isHistoryLoading || isProcessing || (!text.trim() && uploadedFiles.length === 0)) return;
    const { model: techName, version } = getDialogueModel(dialogueId!, msgsFromHistory, {
      model: urlModel,
      version: urlVersion,
      role: urlRole,
    });
    if (!techName) {
      toast.error(t('modelNotFound'));
      return;
    }
    haptic.light();
    const sentText = text;
    const safeText = text.trim() || (uploadedFiles.length > 0 ? t('describeImage') : '');
    const oldFormatMedia = uploadedFiles.map((f) => ({ type: f.type, format: 'url', input: f.url }));
    const inputs = convertMediaToInputs(safeText, oldFormatMedia);

    const optimisticMsg: Message = {
      id: -Date.now(),
      model: techName,
      version: version || '',
      inputs: { text: sentText, media: uploadedFiles.map((f) => ({ type: f.type, url: f.url })) },
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setText('');
    setUploadedFiles([]);

    generate.mutate(
      { tech_name: techName, version: version || undefined, dialogue_id: dialogueId === 'new' ? undefined : dialogueId, role_id: selectedRoleId, inputs },
      {
        onSuccess: (data) => {
          setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
          if (dialogueId === 'new' && data.dialogue_id) {
            router.replace(`/chats/${data.dialogue_id}`);
          } else {
            queryClient.invalidateQueries({ queryKey: queryKeys.chatHistory((dialogueId as string)) });
          }
        },
        onError: () => {
          setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
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

  const handleDownload = (url: string) => {
    haptic.selection();
    if ((window as any).Telegram?.WebApp?.openLink) {
      (window as any).Telegram.WebApp.openLink(url);
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const acceptTypes = 'image/*,.heic,video/*,audio/*';
  const isSendDisabled = isHistoryLoading || isProcessing || generate.isPending || (!text.trim() && uploadedFiles.length === 0);
  const showRoles = msgsFromHistory.length === 0 && !isHistoryLoading && !!roles;

  return (
    <div className="flex flex-col h-svh max-w-2xl mx-auto w-full bg-black text-white overflow-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 px-6 py-4 bg-black/60 backdrop-blur-2xl border-b border-white/5 flex items-center gap-4">
        <button
          onClick={() => { haptic.light(); router.back(); }}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all active:scale-90"
        >
          <ChevronLeft size={20} className="text-[#AAFF00]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-bold tracking-tight truncate leading-tight">{chatTitle}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {isHistoryLoading ? (
              <span className="text-[11px] text-white/30">{t('loading')}</span>
            ) : isProcessing ? (
              <div className="flex items-center gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-[#AAFF00] shadow-[0_0_8px_#AAFF00]" />
                <span className="text-[11px] text-[#AAFF00] font-bold uppercase tracking-wider">{t('generating')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Online</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6 flex flex-col gap-6" style={{ scrollbarWidth: 'none' }}>
        {isHistoryLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
             <Loader2 size={32} className="animate-spin" />
             <p className="text-sm font-medium">{t('loadingPlaceholder')}</p>
          </div>
        ) : msgs.length === 0 && optimisticMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center px-10">
             <div className="w-20 h-20 rounded-[32px] bg-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl">
                <span className="text-3xl">💬</span>
             </div>
             <p className="text-[16px] font-medium text-white/40 leading-relaxed">{t('startDialogue')}</p>
             {showRoles && (
               <div className="w-full max-w-sm mt-4">
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-4">{t('chooseAssistant')}</h3>
                 <div className="grid grid-cols-1 gap-2">
                    {roles!.slice(0, 4).map((role) => (
                      <button
                        key={role.id}
                        onClick={() => { haptic.light(); setSelectedRoleId(role.id); }}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98]",
                          selectedRoleId === role.id ? "bg-[#AAFF00]/10 border-[#AAFF00]/30 shadow-[0_0_20px_rgba(170,255,0,0.1)]" : "bg-zinc-900/40 border-white/5 hover:border-white/10"
                        )}
                      >
                         <Avatar className="w-10 h-10 rounded-xl">
                            <AvatarImage src={role.image || ''} />
                            <AvatarFallback className="bg-zinc-800 text-sm">{localize(role.label)[0]}</AvatarFallback>
                         </Avatar>
                         <div className="flex-1 text-left">
                            <p className={cn("text-[14px] font-bold", selectedRoleId === role.id ? "text-[#AAFF00]" : "text-white")}>{localize(role.label)}</p>
                            <p className="text-[11px] text-white/30 line-clamp-1">{localize(role.description)}</p>
                         </div>
                         {selectedRoleId === role.id && <div className="w-2 h-2 rounded-full bg-[#AAFF00] shadow-[0_0_8px_#AAFF00]" />}
                      </button>
                    ))}
                 </div>
               </div>
             )}
          </div>
        ) : (
          [...msgs, ...optimisticMessages].map((msg, idx) => {
            const userMedia = extractDisplayMedia(msg.inputs);
            const resultMedia = extractResultMedia(msg.result);
            return (
              <div key={msg.id || idx} className="flex flex-col gap-3">
                {(msg.inputs?.text || userMedia.length > 0) && (
                  <div className="flex justify-end pl-12">
                    <div className="flex flex-col items-end gap-2">
                      <div className="px-5 py-3.5 rounded-[24px_24px_4px_24px] bg-zinc-900/60 border border-white/10 shadow-xl text-[15px] leading-relaxed">
                        {msg.inputs?.text && <p className="whitespace-pre-wrap">{msg.inputs.text}</p>}
                        {userMedia.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {userMedia.map((m, i) => (
                              <button key={i} onClick={() => setViewerSrc(m)} className="relative rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all">
                                {m.type === 'image' ? <img src={m.url} className="w-32 h-32 object-cover" /> : <div className="w-32 h-32 flex items-center justify-center bg-zinc-800 text-xl">🎬</div>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 px-2">
                         {msg.status === 'pending' ? <Clock size={10} className="text-white/20" /> : <CheckCheck size={12} className="text-[#AAFF00]" />}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-start pr-12">
                   <div className="flex flex-col items-start gap-2 w-full">
                      {msg.status === 'processing' || msg.status === 'pending' ? (
                        <div className="px-6 py-4 rounded-[24px_24px_24px_4px] bg-[#AAFF00]/5 border border-[#AAFF00]/10 flex gap-1.5">
                           {[0, 1, 2].map(i => (
                             <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#AAFF00] animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                           ))}
                        </div>
                      ) : msg.status === 'error' ? (
                        <div className="px-5 py-3.5 rounded-[24px_24px_24px_4px] bg-red-500/10 border border-red-500/20 text-red-400 text-[14px] font-medium">{msg.error || t('error')}</div>
                      ) : (
                        <div className="flex flex-col gap-3 w-full">
                           {msg.result?.text && (
                             <div className="px-5 py-3.5 rounded-[24px_24px_24px_4px] bg-white/5 border border-white/5 shadow-inner text-[15px] leading-relaxed">{msg.result.text}</div>
                           )}
                           {resultMedia.length > 0 && (
                             <div className="flex flex-wrap gap-3">
                                {resultMedia.map((m, i) => (
                                  <div key={i} className="relative group w-full max-w-[320px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900/50">
                                     {m.type === 'audio' ? (
                                       <div className="p-4 flex flex-col gap-4">
                                          <AudioPlayer src={m.url} />
                                          <button onClick={() => handleDownload(m.url)} className="self-end p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-90">
                                             <Download size={18} className="text-[#AAFF00]" />
                                          </button>
                                       </div>
                                     ) : (
                                       <div className="relative aspect-square sm:aspect-video cursor-pointer overflow-hidden" onClick={() => setViewerSrc(m)}>
                                          {m.type === 'image' ? <img src={m.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <video src={m.url} className="w-full h-full object-cover" controls={false} muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />}
                                          <div className="absolute top-3 right-3 flex gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                             {!msg.post_id && <button onClick={(e) => { e.stopPropagation(); setPublishingMessage(msg); }} className="p-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white hover:bg-[#AAFF00] hover:text-black transition-colors"><Share2 size={16} /></button>}
                                             <button onClick={(e) => { e.stopPropagation(); handleDownload(m.url); }} className="p-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white hover:bg-white hover:text-black transition-colors"><Download size={16} /></button>
                                          </div>
                                          {m.type === 'video' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity"><div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center"><Play size={24} fill="white" className="ml-1" /></div></div>}
                                       </div>
                                     )}
                                  </div>
                                ))}
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
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* ── Media Viewer ── */}
      {viewerSrc && (
        <div onClick={() => setViewerSrc(null)} className="fixed inset-0 z-100 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 transition-all animate-in fade-in zoom-in duration-300">
           <div className="relative w-full max-w-4xl h-full flex flex-col items-center justify-center">
              {viewerSrc.type === 'image' ? <img src={viewerSrc.url} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]" /> : <video src={viewerSrc.url} controls autoPlay className="max-w-full max-h-[80vh] rounded-2xl" />}
              <div className="flex gap-4 mt-8">
                 <button onClick={() => setViewerSrc(null)} className="px-8 py-3 rounded-full bg-white/10 border border-white/10 font-bold text-white transition-all active:scale-95">Close</button>
                 <button onClick={(e) => { e.stopPropagation(); handleDownload(viewerSrc.url); }} className="px-8 py-3 rounded-full bg-[#AAFF00] font-black text-black transition-all active:scale-95">Download</button>
              </div>
           </div>
        </div>
      )}

      {/* ── Input Bar ── */}
      <div className="px-4 pt-4 pb-[calc(16px+max(12px,env(safe-area-inset-bottom)))] bg-zinc-950/80 backdrop-blur-3xl border-t border-white/5">
         <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {uploadedFiles.length > 0 && (
              <div className="flex gap-2 flex-wrap px-2">
                 {uploadedFiles.map((f, i) => (
                   <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 group">
                      {f.type === 'image' ? <img src={f.url} className="size-full object-cover" /> : <div className="size-full flex items-center justify-center bg-zinc-800 text-xl">{f.type === 'video' ? '🎬' : '🎵'}</div>}
                      <button onClick={() => removeFile(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white border border-white/20"><X size={10} /></button>
                   </div>
                 ))}
              </div>
            )}
            <div className="flex items-end gap-3">
               {canAttachMedia && (
                 <button onClick={() => fileInputRef.current?.click()} disabled={upload.isPending} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center transition-all hover:bg-white/10 active:scale-90">
                    {upload.isPending ? <Loader2 size={20} className="animate-spin opacity-40" /> : <ImagePlus size={20} className="text-white/40" />}
                 </button>
               )}
               <input type="file" ref={fileInputRef} accept={acceptTypes} onChange={handleFileUpload} className="hidden" />
               <textarea
                 ref={textareaRef}
                 value={text}
                 onChange={(e) => setText(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder={isHistoryLoading ? t('loadingPlaceholder') : t('placeholder')}
                 className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-[16px] leading-tight focus:outline-none focus:border-[#AAFF00]/30 transition-all resize-none max-h-32 min-h-[48px] no-scrollbar"
                 rows={1}
               />
               <button onClick={handleSend} disabled={isSendDisabled} className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg", isSendDisabled ? "bg-white/5 opacity-40" : "bg-[#AAFF00] shadow-[0_0_20px_rgba(170,255,0,0.3)]")}>
                  {generate.isPending ? <Loader2 size={20} className="animate-spin text-black" /> : <Send size={20} className={cn(isSendDisabled ? "text-white/20" : "text-black")} />}
               </button>
            </div>
         </div>
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
      {publishingMessage && <PublishDialog isOpen={!!publishingMessage} onClose={() => setPublishingMessage(null)} message={publishingMessage} />}
    </div>
  );
}
