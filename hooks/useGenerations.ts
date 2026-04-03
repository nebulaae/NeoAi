import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

// По документации inputs принимает массивы строк, а не объекты
export interface GenerateInputs {
  text?: string | null;
  image?: string[]; // массив URL или base64
  video?: string[];
  audio?: string[];
}

export interface GenerateAIParams {
  tech_name: string;
  version?: string;
  inputs: GenerateInputs;
  params?: Record<string, any>;
  dialogue_id?: string;
  role_id?: number | null;
  callback_webhook?: string;
}

// Нормализует медиа из ответа бэкенда в единый формат { url, type }
// Бэкенд может вернуть:
//   { type: "image", format: "url", input: "https://..." }   ← старый формат
//   { type: "image", url: "https://..." }                    ← новый формат
//   { type: "image", format: "url", input: "https://..." }   ← смешанный
export function normalizeResultMedia(
  media: any[]
): Array<{ url: string; type: string }> {
  if (!Array.isArray(media)) return [];
  return media
    .map((m) => ({
      // Поддерживаем оба формата: m.url и m.input
      url: m.url || m.input || '',
      type: m.type || 'image',
    }))
    .filter((m) => m.url);
}

export function convertMediaToInputs(
  text: string | null,
  media: { type: string; input: string }[]
) {
  const inputs: any = {};

  if (text) inputs.text = text;

  for (const m of media) {
    if (!inputs[m.type]) inputs[m.type] = [];
    inputs[m.type].push(m.input);
  }

  return inputs;
}

const generateContent = async (params: GenerateAIParams) => {
  const { data } = await api.post('/api/generate', params);
  if (!data.success) throw new Error(data.error);
  return data;
};

export const useGenerateAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateContent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      queryClient.invalidateQueries({ queryKey: queryKeys.user });

      if (data.dialogue_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.chatHistory(data.dialogue_id),
        });
      }
    },
    onError: (error: any) => {
      if (axios.isAxiosError(error)) {
        const errorMsg =
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Ошибка генерации';

        if (
          errorMsg.toLowerCase().includes('insufficient tokens') ||
          errorMsg.toLowerCase().includes('недостаточно токенов')
        ) {
          toast.error('Недостаточно токенов', {
            description: 'Пополните баланс для продолжения.',
          });
        } else if (errorMsg.toLowerCase().includes('expired')) {
          toast.error('Подписка истекла', {
            description: 'Продлите Premium для использования этой модели.',
          });
        } else {
          toast.error('Ошибка', { description: errorMsg });
        }
        return;
      }
      toast.error('Неизвестная ошибка', { description: error.message });
    },
  });
};
