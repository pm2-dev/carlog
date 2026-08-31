import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeStore = {
  preference: ThemePreference;
  hasHydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      preference: 'light',
      hasHydrated: false,
      setPreference: (preference) => set({ preference }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'yakittuketimi/theme-preference',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Tema tercihleri yüklenirken hata oluştu:', error);
        }

        // State null olabilir, güvenli kontrol
        if (state) {
          state.setHasHydrated(true);
        }
      },
      // Hata durumunda uygulamanın çökmesini önle
      partialize: (state) => ({
        preference: state.preference,
      }),
    }
  )
);


