import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ensureLocalNotificationPermissions } from '@/utils/notificationHelper';
import { useAuthStore } from '@/store/authStore';

export const useLogin = () => {
  return useMutation({
    mutationFn: async (_phone: string) => ({ status: 'ok', message: 'Yerel mod' }),
  });
};

export const useVerifyOtp = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: async (_data: { phone: string; otp: string }) => ({ ok: true }),
    onSuccess: async () => {
      setAuthenticated();
      queryClient.clear();
      await ensureLocalNotificationPermissions();
      router.replace('/(tabs)');
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout: authStoreLogout } = useAuthStore();

  return useMutation({
    mutationFn: async () => undefined,
    onSuccess: async () => {
      await authStoreLogout();
      queryClient.clear();
    },
  });
};
