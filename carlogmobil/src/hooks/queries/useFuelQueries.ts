import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fuelService, CreateFuelEntryDto, UpdateFuelEntryDto } from '@/api/services/fuel';
import { VEHICLE_KEYS } from './useVehicleQueries';
import { REPORT_KEYS } from './useReportQueries';

export const FUEL_KEYS = {
  all: ['fuel-entries'] as const,
  byVehicle: (vehicleId: string) => ['fuel-entries', 'vehicle', vehicleId] as const,
  detail: (id: string) => ['fuel-entries', id] as const,
};

export const useFuelEntries = (vehicleId?: string, queryOptions?: { enabled?: boolean }) => {
  const baseKey = vehicleId ? FUEL_KEYS.byVehicle(vehicleId) : FUEL_KEYS.all;
  const enabled = queryOptions?.enabled !== false;

  return useQuery({
    queryKey: baseKey,
    queryFn: () => fuelService.getAll(vehicleId),
    enabled,
  });
};

export const useCreateFuelEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFuelEntryDto) => fuelService.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: FUEL_KEYS.all });
      queryClient.invalidateQueries({ queryKey: VEHICLE_KEYS.all });
      if (data.vehicleId) {
        queryClient.invalidateQueries({ queryKey: FUEL_KEYS.byVehicle(data.vehicleId) });
        queryClient.invalidateQueries({ queryKey: VEHICLE_KEYS.detail(data.vehicleId) });
        queryClient.invalidateQueries({ queryKey: REPORT_KEYS.all });
      }
    },
  });
};

export const useUpdateFuelEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFuelEntryDto }) =>
      fuelService.update(id, data),
    onSuccess: (updatedEntry) => {
      queryClient.setQueryData(FUEL_KEYS.all, (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((entry: any) =>
          entry.id === updatedEntry.id ? updatedEntry : entry
        );
      });

      queryClient.invalidateQueries({ queryKey: FUEL_KEYS.detail(updatedEntry.id) });
      if (updatedEntry.vehicleId) {
        queryClient.setQueryData(FUEL_KEYS.byVehicle(updatedEntry.vehicleId), (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((entry: any) =>
            entry.id === updatedEntry.id ? updatedEntry : entry
          );
        });
        queryClient.invalidateQueries({ queryKey: VEHICLE_KEYS.detail(updatedEntry.vehicleId) });
        queryClient.invalidateQueries({ queryKey: REPORT_KEYS.all });
      }
    },
  });
};

export const useDeleteFuelEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fuelService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FUEL_KEYS.all });
      queryClient.invalidateQueries({ queryKey: VEHICLE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: REPORT_KEYS.all });
    },
  });
};
