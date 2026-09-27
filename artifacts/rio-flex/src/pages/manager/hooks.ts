import { useQuery } from '@tanstack/react-query';
import { managerApi, qs } from '@/lib/manager-api';
import type { GridPoint, KnowledgeEntry, ManagerOverview, SignalDto, WeatherPoint } from '@/types/manager';

export const useOverview = () =>
  useQuery({ queryKey: ['mgr-overview'], queryFn: () => managerApi.get<ManagerOverview>('/manager/overview'), refetchInterval: 60_000 });

export const useGrid = (region: string, hours = 24) =>
  useQuery({
    queryKey: ['mgr-grid', region, hours],
    queryFn: () =>
      managerApi.get<{ grid: GridPoint[]; weather: WeatherPoint[]; evLoad: { mw: number; busyConnectors: number; totalConnectors: number } }>(
        `/manager/grid/${region}${qs({ hours })}`,
      ),
    refetchInterval: 5 * 60_000,
  });

export const useSignals = (past = false) =>
  useQuery({ queryKey: ['mgr-signals', past], queryFn: () => managerApi.get<SignalDto[]>(`/manager/signals${qs({ past: past || undefined })}`) });

export const useKnowledge = (q: string) =>
  useQuery({ queryKey: ['mgr-knowledge', q], queryFn: () => managerApi.get<KnowledgeEntry[]>(`/manager/knowledge${qs({ q: q || undefined })}`) });
