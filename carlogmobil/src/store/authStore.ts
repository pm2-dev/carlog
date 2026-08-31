import { create } from 'zustand';
import { initDatabase } from '@/db/database';
import { migrateFromServerIfNeeded } from '@/db/migrateFromServer';
import { reminderService } from '@/api/services/reminders';
import { ensureLocalNotificationPermissions } from '@/utils/notificationHelper';
import { queryClient } from '@/queryClient';

export type AuthMode = 'authenticated' | 'guest' | 'loading' | 'unauthenticated';

interface AuthState {
  mode: AuthMode;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;

  setAuthenticated: () => void;
  setGuest: () => void;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  mode: 'loading',
  isAuthenticated: false,
  isGuest: false,
  isLoading: true,

  setAuthenticated: () => {
    set({
      mode: 'authenticated',
      isAuthenticated: true,
      isGuest: false,
      isLoading: false,
    });
  },

  setGuest: async () => {
    set({
      mode: 'authenticated',
      isAuthenticated: true,
      isGuest: false,
      isLoading: false,
    });
  },

  logout: async () => {
    set({
      mode: 'authenticated',
      isAuthenticated: true,
      isGuest: false,
      isLoading: false,
    });
  },

  checkAuthStatus: async () => {
    try {
      await initDatabase();
      set({
        mode: 'authenticated',
        isAuthenticated: true,
        isGuest: false,
        isLoading: false,
      });

      migrateFromServerIfNeeded()
        .then(async (didImport) => {
          if (didImport) {
            await queryClient.invalidateQueries();
          }
          const granted = await ensureLocalNotificationPermissions();
          if (!granted) return;
          await reminderService.reschedulePending();
          await reminderService.checkKmBasedReminders();
        })
        .catch((error) => {
          console.warn('Arka plan başlatma hatası:', error);
        });
    } catch (error) {
      console.error('Yerel veritabanı başlatılamadı:', error);
      set({
        mode: 'authenticated',
        isAuthenticated: true,
        isGuest: false,
        isLoading: false,
      });
    }
  },
}));
