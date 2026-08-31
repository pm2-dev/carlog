import { useAppThemeContext } from '@/providers/AppThemeProvider';

export const useAppTheme = () => {
  const context = useAppThemeContext();

  return {
    ...context,
    colors: context.theme.colors,
    navigationTheme: context.theme.navigation,
    statusBarStyle: context.theme.statusBarStyle,
  };
};



