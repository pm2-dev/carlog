import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reminderService, CreateReminderDto, UpdateReminderDto } from '@/api/services/reminders';

export const REMINDER_KEYS = {
  all: ['reminders'] as const,
  byVehicle: (vehicleId: string) => ['reminders', 'vehicle', vehicleId] as const,
  maintenanceHistory: (vehicleId?: string) => ['reminders', 'maintenance-history', vehicleId] as const,
};

export const useReminders = (vehicleId?: string, status?: string) => {
  const baseKey = vehicleId ? REMINDER_KEYS.byVehicle(vehicleId) : REMINDER_KEYS.all;

  return useQuery({
    queryKey: baseKey,
    queryFn: () => reminderService.getAll(vehicleId, status),
  });
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReminderDto) => reminderService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReminderDto }) =>
      reminderService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reminderService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
    },
  });
};

export const useMaintenanceHistory = (vehicleId?: string) => {
  return useQuery({
    queryKey: REMINDER_KEYS.maintenanceHistory(vehicleId),
    queryFn: () => reminderService.getMaintenanceHistory(vehicleId),
  });
};
