'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatHistory, useUpload } from '@/hooks/useApiExtras';
import { useGenerateAI } from '@/hooks/useGenerations';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  ChevronLeft,
  Send,
  ImagePlus,
  Loader2,
  X,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: number;
  model: string;
  version: string;
  role_id?: number | null;
  inputs?: {
    text?: string;
    media?: Array<{ type?: string; url?: string; input?: string }>;
  };
  result?: {
    text?: string;
    media?: Array<{ type?: string; url?: string; input?: string }>;
  };
  status: 'completed' | 'processing' | 'error';
  error?: string | null;
  cost?: number;
  created_at?: string;
}

export default function ChatPage({
  params,
}: {
  params: { dialogueId: string };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ url: string; type: string; file: File }>
  >([]);
  const [viewerSrc, setViewerSrc] = useState<{
    url: string;
    type: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages, isLoading } = useChatHistory(params.dialogueId);
  const generate = useGenerateAI();
  const upload = useUpload();

  const isProcessing = ((messages as Message[]) || []).some(
    (m) => m.status === 'processing'
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      const res = await upload.mutateAsync(files[0]);
      setUploadedFiles((prev) => [
        ...prev,
        { url: res.url, type: res.type, file: files[0] },
      ]);
    } catch {
      toast.error('Ошибка загрузки файла');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (i: number) =>
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSend = () => {
    if (isProcessing) {
      toast('Дождитесь окончания генерации');
      return;
    }
    if (!text.trim() && uploadedFiles.length === 0) return;

    const msgs = messages as Message[];
    const firstMsg = msgs?.[0];
    if (!firstMsg?.model) {
      toast.error('Не удалось определить модель диалога');
      return;
    }

    generate.mutate(
      {
        tech_name: firstMsg.model,
        version: firstMsg.version || undefined,
        dialogue_id: params.dialogueId,
        role_id: firstMsg.role_id ?? null,
        inputs: {
          text: text.trim() || null,
          media: uploadedFiles.map((f) => ({
            type: f.type,
            format: 'url',
            input: f.url,
          })),
        },
      },
      {
        onSuccess: () => {
          setText('');
          setUploadedFiles([]);
          queryClient.invalidateQueries({
            queryKey: queryKeys.chatHistory(params.dialogueId),
          });
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

  const getMediaUrl = (m: any): string => {
    if (typeof m === 'string') return m;
    return m?.url || m?.input || '';
  };

  const getMediaType = (m: any): string => {
    return m?.type || 'image';
  };

  // Get model/chat title from first message
  const firstMsg = ((messages as Message[]) || [])[0];
  const chatTitle = firstMsg?.version || firstMsg?.model || 'Диалог';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="shrink-0 sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center size-8 rounded-full hover:bg-secondary/60 transition-colors active:scale-90"
        >
          <ChevronLeft className="size-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{chatTitle}</p>
          {isProcessing && (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Генерация...
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">
        {isLoading ? (
          <div className="flex justify-center pt-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (messages as Message[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
            <div className="size-12 rounded-2xl bg-secondary flex items-center justify-center">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              Начните диалог — напишите что-нибудь
            </p>
          </div>
        ) : (
          (messages as Message[]).map((msg, idx) => (
            <div key={msg.id || idx} className="space-y-3">
              {/* User input */}
              {(msg.inputs?.text ||
                (msg.inputs?.media && msg.inputs.media.length > 0)) && (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-3.5 py-2.5 max-w-[78%] text-sm">
                    {msg.inputs?.text && (
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.inputs.text}
                      </p>
                    )}
                    {msg.inputs?.media && msg.inputs.media.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.inputs.media.map((m, i) => {
                          const url = getMediaUrl(m);
                          const type = getMediaType(m);
                          return url ? (
                            <button
                              key={i}
                              onClick={() => setViewerSrc({ url, type })}
                            >
                              {type === 'image' ? (
                                <img
                                  src={url}
                                  alt=""
                                  className="max-h-36 rounded-lg object-cover"
                                />
                              ) : type === 'video' ? (
                                <video
                                  src={url}
                                  className="max-h-36 rounded-lg"
                                />
                              ) : (
                                <div className="flex items-center gap-1 text-xs opacity-80">
                                  🎵 Аудио
                                </div>
                              )}
                            </button>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assistant response */}
              <div className="flex justify-start gap-2">
                <div className="bg-secondary/70 border border-border/40 text-foreground rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[82%] text-sm">
                  {msg.status === 'processing' ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-0.5">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs">Генерация...</span>
                    </div>
                  ) : msg.status === 'error' ? (
                    <p className="text-red-400 text-sm">
                      ❌ {msg.error || 'Ошибка генерации'}
                    </p>
                  ) : (
                    <>
                      {msg.result?.text && (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.result.text}
                        </p>
                      )}
                      {msg.result?.media && msg.result.media.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.result.media.map((m, i) => {
                            const url = getMediaUrl(m);
                            const type = getMediaType(m);
                            if (!url) return null;
                            return (
                              <div key={i} className="relative group">
                                {type === 'image' ? (
                                  <>
                                    <img
                                      src={url}
                                      alt=""
                                      className="rounded-xl max-w-full cursor-pointer hover:opacity-95 transition-opacity"
                                      onClick={() =>
                                        setViewerSrc({ url, type })
                                      }
                                    />
                                    <a
                                      href={url}
                                      download
                                      target="_blank"
                                      rel="noreferrer"
                                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg p-1.5 backdrop-blur-sm"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Download className="size-3.5 text-white" />
                                    </a>
                                  </>
                                ) : type === 'video' ? (
                                  <video
                                    src={url}
                                    controls
                                    className="rounded-xl max-w-full"
                                  />
                                ) : type === 'audio' ? (
                                  <audio
                                    src={url}
                                    controls
                                    className="w-full mt-1"
                                  />
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {msg.cost && (
                        <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-right">
                          {msg.cost} 💎
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border/50 bg-background/90 backdrop-blur-xl p-3">
        {/* Attached files preview */}
        {uploadedFiles.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {uploadedFiles.map((f, i) => (
              <div
                key={i}
                className="relative size-14 rounded-xl overflow-hidden border border-border/50"
              >
                {f.type === 'image' ? (
                  <img
                    src={URL.createObjectURL(f.file)}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-lg">
                    {f.type === 'video' ? '🎬' : '🎵'}
                  </div>
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                >
                  <X className="size-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-secondary/50 rounded-2xl border border-border/40 px-2 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={upload.isPending}
            className="size-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all shrink-0 active:scale-90"
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed py-1.5 min-h-9 max-h-30 placeholder:text-muted-foreground/60"
          />

          <button
            onClick={handleSend}
            disabled={
              (!text.trim() && uploadedFiles.length === 0) ||
              generate.isPending ||
              isProcessing
            }
            className="size-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0 transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90"
          >
            {generate.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* Media viewer overlay */}
      {viewerSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewerSrc(null)}
        >
          <button
            className="absolute top-4 right-4 size-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setViewerSrc(null)}
          >
            <X className="size-5" />
          </button>
          {viewerSrc.type === 'image' ? (
            <img
              src={viewerSrc.url}
              alt=""
              className="max-w-full max-h-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={viewerSrc.url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <a
            href={viewerSrc.url}
            download
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="size-4" /> Скачать
          </a>
        </div>
      )}
    </div>
  );
}
