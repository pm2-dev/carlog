import { useQuery } from '@tanstack/react-query';
import { reportService, ChartPeriod } from '@/api/services/reports';

export const REPORT_KEYS = {
  all: ['reports'] as const,
  dashboard: ['reports', 'dashboard'] as const,
  vehicleStats: (vehicleId: string) => ['reports', 'vehicle', vehicleId] as const,
  monthly: (year?: number) => ['reports', 'monthly', year] as const,
  seasonal: (vehicleId?: string, year?: number) => ['reports', 'seasonal', vehicleId, year] as const,
  chart: (period: ChartPeriod, vehicleId?: string) => ['reports', 'chart', period, vehicleId] as const,
  detailedAnalysis: (vehicleId: string) => ['reports', 'detailedAnalysis', vehicleId] as const,
  maintenanceCosts: (vehicleId?: string) => ['reports', 'maintenanceCosts', vehicleId] as const,
  tco: (vehicleId: string) => ['reports', 'tco', vehicleId] as const,
};

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: REPORT_KEYS.dashboard,
    queryFn: reportService.getDashboardSummary,
  });
};

export const useVehicleStats = (vehicleId: string) => {
  return useQuery({
    queryKey: REPORT_KEYS.vehicleStats(vehicleId),
    queryFn: () => reportService.getVehicleStats(vehicleId),
    enabled: !!vehicleId,
  });
};

export const useMonthlyExpenses = (year?: number) => {
  return useQuery({
    queryKey: REPORT_KEYS.monthly(year),
    queryFn: () => reportService.getMonthlyExpenses(year),
  });
};

export const useSeasonalStats = (vehicleId?: string, year?: number, queryOptions?: { enabled?: boolean }) => {
  const enabled = queryOptions?.enabled !== false;

  return useQuery({
    queryKey: REPORT_KEYS.seasonal(vehicleId, year),
    queryFn: () => reportService.getSeasonalStats(vehicleId, year),
    enabled,
  });
};

export const useConsumptionChart = (period: ChartPeriod, vehicleId?: string, queryOptions?: { enabled?: boolean }) => {
  const enabled = queryOptions?.enabled !== false;

  return useQuery({
    queryKey: REPORT_KEYS.chart(period, vehicleId),
    queryFn: () => reportService.getConsumptionChart(period, vehicleId),
    enabled,
  });
};

export const useDetailedAnalysis = (vehicleId: string) => {
  return useQuery({
    queryKey: REPORT_KEYS.detailedAnalysis(vehicleId),
    queryFn: () => reportService.getDetailedAnalysis(vehicleId),
    enabled: !!vehicleId,
  });
};

export const useMaintenanceCosts = (vehicleId?: string) => {
  return useQuery({
    queryKey: REPORT_KEYS.maintenanceCosts(vehicleId),
    queryFn: () => reportService.getMaintenanceCosts(vehicleId),
  });
};

export const useTotalCostOfOwnership = (vehicleId: string) => {
  return useQuery({
    queryKey: REPORT_KEYS.tco(vehicleId),
    queryFn: () => reportService.getTotalCostOfOwnership(vehicleId),
    enabled: !!vehicleId,
  });
};
