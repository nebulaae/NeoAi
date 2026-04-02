'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatHistory, useUpload } from '@/hooks/useApiExtras';
import {
  useGenerateAI,
  convertMediaToInputs,
  normalizeResultMedia,
} from '@/hooks/useGenerations';
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

interface MediaItem {
  type?: string;
  url?: string;
  input?: string;
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
    // Старый формат совместимости
    media?: MediaItem[];
  };
  result?: { text?: string; media?: MediaItem[] };
  status: 'completed' | 'processing' | 'error';
  error?: string | null;
  cost?: number;
  created_at?: string;
}

// Извлекаем медиа из inputs в единый формат { url, type }
function extractDisplayMedia(
  inputs: Message['inputs']
): Array<{ url: string; type: string }> {
  const result: Array<{ url: string; type: string }> = [];
  if (!inputs) return result;

  // Новый формат по доке (массивы строк)
  (inputs.image || []).forEach((url) => result.push({ url, type: 'image' }));
  (inputs.video || []).forEach((url) => result.push({ url, type: 'video' }));
  (inputs.audio || []).forEach((url) => result.push({ url, type: 'audio' }));

  // Старый формат (совместимость с историей)
  (inputs.media || []).forEach((m) => {
    // ФИКС: m.input или m.url — оба являются строкой URL, не File/Blob
    const url = m.url || m.input || '';
    if (url) result.push({ url, type: m.type || 'image' });
  });

  return result;
}

// Извлекаем медиа из result
// Бэкенд может вернуть { url, type } или { input, type, format }
function extractResultMedia(
  result: Message['result']
): Array<{ url: string; type: string }> {
  if (!result?.media) return [];
  // используем normalizeResultMedia из useGenerations для единообразия
  return normalizeResultMedia(result.media);
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
    { url: string; type: string; file: File }[]
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

  const msgs = (messages as Message[]) || [];
  const isProcessing = msgs.some((m) => m.status === 'processing');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const prevProcessingRef = useRef(false);
  useEffect(() => {
    if (prevProcessingRef.current && !isProcessing && msgs.length > 0) {
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    }
    prevProcessingRef.current = isProcessing;
  }, [isProcessing, msgs.length, queryClient]);

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

    const firstMsg = msgs?.[0];
    if (!firstMsg?.model) {
      toast.error('Не удалось определить модель диалога');
      return;
    }

    const oldFormatMedia = uploadedFiles.map((f) => ({
      type: f.type,
      format: 'url',
      input: f.url,
    }));
    const inputs = convertMediaToInputs(text.trim() || null, oldFormatMedia);

    generate.mutate(
      {
        tech_name: firstMsg.model,
        version: firstMsg.version || undefined,
        dialogue_id: params.dialogueId,
        role_id: firstMsg.role_id ?? null,
        inputs,
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

  const firstMsg = msgs[0];
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
        ) : msgs.length === 0 ? (
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
          msgs.map((msg, idx) => {
            const userMedia = extractDisplayMedia(msg.inputs);
            const resultMedia = extractResultMedia(msg.result);

            return (
              <div key={msg.id || idx} className="space-y-3">
                {/* User input */}
                {(msg.inputs?.text || userMedia.length > 0) && (
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-3.5 py-2.5 max-w-[78%] text-sm">
                      {msg.inputs?.text && (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.inputs.text}
                        </p>
                      )}
                      {userMedia.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {userMedia.map((m, i) => (
                            <button key={i} onClick={() => setViewerSrc(m)}>
                              {m.type === 'image' ? (
                                // ФИКС: m.url — это строка URL с сервера, не File/Blob
                                // Никогда не передаём в createObjectURL
                                <img
                                  src={m.url}
                                  alt=""
                                  className="max-h-36 rounded-lg object-cover"
                                />
                              ) : m.type === 'video' ? (
                                <video
                                  src={m.url}
                                  className="max-h-36 rounded-lg"
                                  controls={false}
                                />
                              ) : (
                                <div className="px-3 py-2 bg-primary-foreground/10 rounded-lg text-xs flex items-center gap-1.5">
                                  🎵 Аудио
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI result */}
                <div className="flex justify-start">
                  <div className="max-w-[82%]">
                    {msg.status === 'processing' ? (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-secondary rounded-2xl rounded-tl-md">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Генерация...
                        </span>
                      </div>
                    ) : msg.status === 'error' ? (
                      <div className="px-3.5 py-2.5 bg-destructive/10 border border-destructive/20 rounded-2xl rounded-tl-md text-sm text-destructive">
                        {msg.error || 'Ошибка генерации'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {msg.result?.text && (
                          <div className="px-3.5 py-2.5 bg-secondary rounded-2xl rounded-tl-md text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.result.text}
                          </div>
                        )}
                        {resultMedia.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {resultMedia.map((m, i) => (
                              <div key={i} className="relative group">
                                {m.type === 'image' ? (
                                  // ФИКС: m.url — строка URL, просто ставим в src
                                  <img
                                    src={m.url}
                                    alt="Generated"
                                    className="max-w-[260px] max-h-[260px] rounded-2xl object-cover cursor-pointer"
                                    onClick={() => setViewerSrc(m)}
                                  />
                                ) : m.type === 'video' ? (
                                  <video
                                    src={m.url}
                                    className="max-w-[260px] max-h-[260px] rounded-2xl"
                                    controls
                                  />
                                ) : (
                                  <audio
                                    src={m.url}
                                    controls
                                    className="rounded-lg"
                                  />
                                )}
                                <a
                                  href={m.url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Download className="size-3.5" />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                        {!msg.result?.text && resultMedia.length === 0 && (
                          <div className="px-3.5 py-2.5 bg-secondary rounded-2xl rounded-tl-md text-sm text-muted-foreground italic">
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

      {/* Media viewer */}
      {viewerSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewerSrc(null)}
        >
          {viewerSrc.type === 'image' ? (
            <img
              src={viewerSrc.url}
              alt=""
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          ) : viewerSrc.type === 'video' ? (
            <video
              src={viewerSrc.url}
              className="max-w-full max-h-full rounded-xl"
              controls
              autoPlay
            />
          ) : null}
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full"
            onClick={() => setViewerSrc(null)}
          >
            <X className="size-5 text-white" />
          </button>
          <a
            href={viewerSrc.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-6 right-6 p-3 bg-white/10 rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="size-5 text-white" />
          </a>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border/50 bg-background/90 backdrop-blur-xl px-4 py-3 pb-safe">
        {/* Uploaded previews */}
        {uploadedFiles.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {uploadedFiles.map((f, i) => (
              <div
                key={i}
                className="relative size-16 rounded-xl overflow-hidden border border-border/50"
              >
                {f.type === 'image' ? (
                  // ФИКС: используем f.url (серверный URL) вместо createObjectURL
                  // createObjectURL(file) кидает ошибку если file undefined/неверный тип
                  <img
                    src={f.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-xl">
                    {f.type === 'video' ? '🎬' : '🎵'}
                  </div>
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                >
                  <X className="size-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={upload.isPending}
            className="shrink-0 size-9 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/70 transition-colors disabled:opacity-50"
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="size-4 text-muted-foreground" />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.heic,video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            rows={1}
            className="flex-1 resize-none bg-secondary rounded-2xl px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground max-h-[120px] overflow-y-auto"
          />

          <button
            onClick={handleSend}
            disabled={
              isProcessing ||
              generate.isPending ||
              (!text.trim() && uploadedFiles.length === 0)
            }
            className="shrink-0 size-9 flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {generate.isPending ? (
              <Loader2 className="size-4 animate-spin text-primary-foreground" />
            ) : (
              <Send className="size-4 text-primary-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
