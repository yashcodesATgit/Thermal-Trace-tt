import { useQuery } from '@tanstack/react-query';
import { fetchAlertsData, AlertsQueryResult } from '../alertService';
import { useMapStore } from '../../store/mapStore';

export function useAlertsQuery(date?: string) {
  const selectedDate = useMapStore((s) => s.selectedDate);
  const targetDate = date || selectedDate;

  return useQuery<AlertsQueryResult>({
    queryKey: ['alerts', targetDate],
    queryFn: () => fetchAlertsData(targetDate, 1, 20),
    refetchInterval: 10000,
    staleTime: 5000,
  });
}
