import api from '@/lib/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface GenerationRequest {
  id: number;
  model: string;
  version: string;
  status: 'completed' | 'processing' | 'error';
  cost: number;
  created_at: string;
}

// GET /reqs — история генераций (без inputs/result, только базовая инфа)
const getRequests = async (limit: number, offset: number) => {
  const { data } = await api.get('/api/reqs', {
    params: { limit, offset },
  });
  return data.requests as GenerationRequest[];
};

export const useRequests = () => {
  return useInfiniteQuery({
    queryKey: queryKeys.requests,
    queryFn: ({ pageParam = 0 }) => getRequests(20, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flat().length;
      return lastPage.length >= 20 ? loaded : undefined;
    },
  });
};