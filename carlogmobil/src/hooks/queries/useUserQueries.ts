import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService, UpdateUserDto, RegisterDeviceDto } from '@/api/services/users';

export const useUserProfile = () => {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: usersService.getProfile,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserDto) => usersService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
};

export const useRegisterDevice = () => {
  return useMutation({
    mutationFn: (data: RegisterDeviceDto) => usersService.registerDevice(data),
  });
};

export const useUserDevices = () => {
  return useQuery({
    queryKey: ['user-devices'],
    queryFn: usersService.getUserDevices,
  });
};

export const useRemoveDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId: string) => usersService.removeDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-devices'] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => usersService.deleteAccount(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
};
