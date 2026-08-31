import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';

export type ThemeIdentifier = 'light' | 'dark';

export type ThemeStatusBarStyle = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
};

export type AppTheme = {
  id: ThemeIdentifier;
  colors: ThemeColors;
  navigation: NavigationTheme;
  statusBarStyle: ThemeStatusBarStyle;
};

const lightColors: ThemeColors = {
  background: '#F6F8FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F6',
  primary: '#1F7A8C',
  primarySoft: '#E1F2F6',
  accent: '#F59E0B',
  accentSoft: '#FFF3D6',
  textPrimary: '#152232',
  textSecondary: '#485568',
  textMuted: '#7A8797',
  border: '#E0E6F0',
  success: '#2CA58D',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const darkColors: ThemeColors = {
  background: '#101623',
  surface: '#1C2434',
  surfaceAlt: '#232D42',
  primary: '#37B6CE',
  primarySoft: '#204457',
  accent: '#FACC15',
  accentSoft: '#3B2F0A',
  textPrimary: '#F8FAFC',
  textSecondary: '#C6D0E0',
  textMuted: '#94A3B8',
  border: '#2F3B52',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
};

const createNavigationTheme = (base: NavigationTheme, colors: ThemeColors): NavigationTheme => ({
  ...base,
  colors: {
    ...base.colors,
    background: colors.background,
    border: colors.border,
    card: colors.surface,
    notification: colors.accent,
    primary: colors.primary,
    text: colors.textPrimary,
  },
});

export const lightTheme: AppTheme = {
  id: 'light',
  colors: lightColors,
  navigation: createNavigationTheme(NavigationDefaultTheme, lightColors),
  statusBarStyle: 'dark',
};

export const darkTheme: AppTheme = {
  id: 'dark',
  colors: darkColors,
  navigation: createNavigationTheme(NavigationDarkTheme, darkColors),
  statusBarStyle: 'light',
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};


