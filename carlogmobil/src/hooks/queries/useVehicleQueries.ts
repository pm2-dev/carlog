import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vehicleService, CreateVehicleDto, UpdateVehicleDto } from '@/api/services/vehicles';
import { FUEL_KEYS } from './useFuelQueries';
import { REPORT_KEYS } from './useReportQueries';

export const VEHICLE_KEYS = {
  all: ['vehicles'] as const,
  detail: (id: string) => ['vehicles', id] as const,
};

export const useVehicles = () => {
  return useQuery({
    queryKey: VEHICLE_KEYS.all,
    queryFn: vehicleService.getAll,
  });
};

export const useVehicle = (id: string) => {
  return useQuery({
    queryKey: VEHICLE_KEYS.detail(id),
    queryFn: () => vehicleService.getById(id),
    enabled: !!id,
  });
};

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVehicleDto) => vehicleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLE_KEYS.all });
    },
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleDto }) =>
      vehicleService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: VEHICLE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: VEHICLE_KEYS.detail(data.id) });
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vehicleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FUEL_KEYS.all });
      queryClient.invalidateQueries({ queryKey: REPORT_KEYS.all });
    },
  });
};
