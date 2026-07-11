import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/endpoints';

export function useDashboardSummary() {
  return useQuery({ queryKey: ['dashboard', 'summary'], queryFn: () => dashboardApi.summary().then((r) => r.data.data) });
}

export function useDashboardCharts() {
  return useQuery({ queryKey: ['dashboard', 'charts'], queryFn: () => dashboardApi.charts().then((r) => r.data.data) });
}
