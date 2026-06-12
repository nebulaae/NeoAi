import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface RoleDescription {
  poster?: string | null;
  [lang: string]: string | null | undefined;
}

export interface Role {
  id: number;
  image?: string;
  label: Record<string, string> | string;
  description: RoleDescription | string;
}

/** Извлекает URL постера из описания роли (description.poster) */
export const getRolePoster = (role: Role): string | null => {
  if (role.description && typeof role.description === 'object') {
    return role.description.poster || null;
  }
  return null;
};

/** Локализует текст описания роли, игнорируя служебное поле poster */
export const localizeRoleDescription = (
  description: Role['description'],
  lang = 'ru'
): string => {
  if (!description) return '';
  if (typeof description === 'string') return description;
  const { poster: _poster, ...localized } = description;
  return (
    localized[lang] ||
    localized.en ||
    localized.ru ||
    Object.values(localized).find((v): v is string => typeof v === 'string') ||
    ''
  );
};

export const useRoles = () => {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: async (): Promise<Role[]> => {
      const { data } = await api.get('/api/roles');
      return data.roles;
    },
    staleTime: 5 * 60_000,
  });
};
