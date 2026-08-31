import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { AppTheme, darkTheme, lightTheme } from '@/theme';
import { ThemePreference, useThemeStore } from '@/store/themeStore';

type AppThemeContextValue = {
  theme: AppTheme;
  preference: ThemePreference;
  resolvedScheme: 'light' | 'dark';
  isReady: boolean;
  setPreference: (preference: ThemePreference) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

type Props = {
  children: React.ReactNode;
};

export const AppThemeProvider = ({ children }: Props) => {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const isHydrated = useThemeStore((state) => state.hasHydrated);
  const setPreference = useThemeStore((state) => state.setPreference);

  const resolvedScheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme ?? 'light') : preference;

  const theme = resolvedScheme === 'dark' ? darkTheme : lightTheme;

  const value = useMemo<AppThemeContextValue>(
    () => ({
      theme,
      preference,
      resolvedScheme,
      isReady: isHydrated,
      setPreference,
    }),
    [theme, preference, resolvedScheme, isHydrated, setPreference]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export const useAppThemeContext = () => {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppThemeContext sadece AppThemeProvider içinde kullanılabilir.');
  }

  return context;
};


