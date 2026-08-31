import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { emitUnauthorized } from './authEvents';

// Guest mode kontrolü için yardımcı fonksiyon
const isGuestMode = async (): Promise<boolean> => {
  try {
    const authMode = await SecureStore.getItemAsync('authMode');
    return authMode === 'guest';
  } catch {
    return false;
  }
};

const getBaseUrl = () => {
  // Canlı sunucu IP'si (Backend port 3000)
  const LIVE_API_URL = 'http://138.197.177.185:3000';

  try {
    // Eğer app.json içinde tanımlıysa oradan al, yoksa yukarıdaki sabiti kullan
    // Not: Canlıya geçtiğimiz için artık localhost kontrolünü atlıyoruz.
    const expoConfig = Constants.expoConfig || Constants.manifest;
    return expoConfig?.extra?.apiUrl || LIVE_API_URL;

    /* 
    // ESKİ LOCALHOST MANTIĞI (Devre dışı bırakıldı - Canlı sunucu aktif)
    const isDevelopment = __DEV__ || false;
    
    if (isDevelopment) {
      // Development modunda host IP'sini dinamik al
      const hostUri = expoConfig?.hostUri;
      
      if (hostUri) {
        const ip = hostUri.split(':')[0];
        return `http://${ip}:3000`;
      }
      
      // Fallback: Android Emulator veya iOS Simulator
      return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
    }
    */
    
  } catch (error) {
    console.error('Error getting base URL:', error);
    // Hata durumunda production URL kullan
    return LIVE_API_URL;
  }
};

export const API_URL = getBaseUrl();

if (__DEV__) {
  console.log('[API] Client configured with URL:', API_URL);
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 saniye (sunucu bağlantısı için daha uzun timeout)
});

// Request Interceptor: Token ekle
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      if (__DEV__) {
        console.warn('[API] Error adding auth token to request:', error);
      }
      return config; // Hata olsa bile isteği devam ettir
    }
  },
  (error) => {
    if (__DEV__) {
      console.warn('[API] Request interceptor error:', error);
    }
    return Promise.reject(error);
  }
);

// Refresh token logic variables
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: 401 kontrolü
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 hatası ve daha önce denenmemişse
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Guest modda 401 hatalarını sessizce geç - login'e yönlendirme
      const guestMode = await isGuestMode();
      if (guestMode) {
        if (__DEV__) {
          console.info('[Auth] 401 in guest mode - ignoring, no redirect');
        }
        return Promise.reject(error);
      }

      if (__DEV__) {
        console.log('[Auth] 401 Unauthorized - attempting token refresh');
      }
      
      // Eğer refresh token endpoint'ine istek atarken 401 aldıysak,
      // kullanıcıyı direkt logout yapmalıyız.
      if (originalRequest.url?.includes('/auth/refresh')) {
        if (__DEV__) {
          console.info('[Auth] Refresh token expired or invalid - user needs to login');
        }
        emitUnauthorized();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (!refreshToken) {
          if (__DEV__) {
            console.info('[Auth] No refresh token found - user not logged in');
          }
          // Guest modda değilsek ve refresh token yoksa, sessizce hata döndür
          isRefreshing = false;
          return Promise.reject(error);
        }

        if (__DEV__) {
          console.log('[Auth] Attempting to refresh access token...');
        }
        
        // Doğrudan axios kullanarak refresh isteği yapıyoruz (interceptor döngüsüne girmemesi için)
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        await SecureStore.setItemAsync('accessToken', accessToken);
        if (newRefreshToken) {
            await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        }
        
        // Default header'ı güncelle
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        // Kuyruktaki bekleyen istekleri işle
        processQueue(null, accessToken);
        
        // Orijinal isteği tekrar dene
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return apiClient(originalRequest);

      } catch (refreshError: any) {
        // Login olmamış kullanıcılar için normal durum - error değil info
        const isUserNotFound = refreshError.response?.data?.message?.includes('bulunamadı') || 
                               refreshError.response?.data?.message?.includes('not found');
        
        if (isUserNotFound && __DEV__) {
          console.info('[Auth] User session expired or not logged in');
        } else if (__DEV__) {
          console.warn('[Auth] Token refresh failed:', refreshError.response?.data || refreshError.message);
        }
        
        processQueue(refreshError, null);
        emitUnauthorized();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
