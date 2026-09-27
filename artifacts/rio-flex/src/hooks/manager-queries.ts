import { useQuery } from '@tanstack/react-query';
import { managerApi, qs } from '@/lib/manager-api';
import type { ForecastPoint, ManagerMeta, Notification } from '@/types/manager';

export const useManagerMeta = () =>
  useQuery({ queryKey: ['mgr-meta'], queryFn: () => managerApi.get<ManagerMeta>('/meta'), staleTime: 60 * 60_000 });

export const usePriceForecast = (region: string, hours = 24) =>
  useQuery({
    queryKey: ['mgr-price-forecast', region, hours],
    queryFn: () => managerApi.get<{ points: ForecastPoint[] }>(`/prices/${region}/forecast${qs({ hours })}`).then((r) => r.points),
    refetchInterval: 5 * 60_000,
  });

export const useManagerNotifications = () =>
  useQuery({
    queryKey: ['mgr-notifications'],
    queryFn: () => managerApi.get<{ unread: number; items: Notification[] }>('/notifications'),
    refetchInterval: 30_000,
  });
