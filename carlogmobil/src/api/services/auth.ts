import apiClient from '../client';
import * as SecureStore from 'expo-secure-store';

export interface LoginResponse {
  status: string;
  message: string;
}

export interface VerifyResponse {
  user: {
    id: string;
    phone: string;
    fullName?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  sendOtp: async (phone: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', { phone });
    return response.data;
  },

  verifyOtp: async (phone: string, otp: string): Promise<VerifyResponse> => {
    const response = await apiClient.post('/auth/verify', { phone, otp });
    const { accessToken, refreshToken } = response.data;
    
    // Tokenları kaydet
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    
    return response.data;
  },

  refreshToken: async (): Promise<string | null> => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) {
      if (__DEV__) {
        console.info('[Auth Service] No refresh token available');
      }
      return null;
    }

    try {
      const response = await apiClient.post('/auth/refresh', { refreshToken });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      await SecureStore.setItemAsync('accessToken', newAccessToken);
      if (newRefreshToken) {
          await SecureStore.setItemAsync('refreshToken', newRefreshToken);
      }

      if (__DEV__) {
        console.log('[Auth Service] Token refreshed successfully');
      }
      return newAccessToken;
    } catch (error: any) {
      // Login olmamış kullanıcılar için bu normal bir durumdur
      if (__DEV__ && error?.response?.status !== 401) {
        console.warn('[Auth Service] Token refresh failed:', error?.response?.data || error?.message);
      }
      return null;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
      if (__DEV__) {
        console.log('[Auth Service] Logout successful');
      }
    } catch (error) {
      // Logout hatası kritik değil, token'lar zaten silinecek
      if (__DEV__) {
        console.info('[Auth Service] Logout request failed (tokens will be cleared locally)');
      }
    } finally {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    }
  },
};

