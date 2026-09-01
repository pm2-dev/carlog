import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text } from 'react-native';
import 'react-native-reanimated';
import { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { AppProviders } from '@/providers/AppProviders';
import { useAuthStore } from '@/store/authStore';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  import('react-native-google-mobile-ads')
    .then((mobileAds) => {
      mobileAds.default()
        .initialize()
        .then((adapterStatuses) => {
          console.log('AdMob SDK initialized:', adapterStatuses);
        })
        .catch((error) => {
          console.error('AdMob SDK initialization failed:', error);
        });
    })
    .catch((error) => {
      console.log('AdMob module not available (Expo Go):', error.message);
    });
}

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (error) {
  console.error('Error setting notification handler:', error);
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Bir Hata Oluştu</Text>
          <Text style={{ fontSize: 14, textAlign: 'center', color: '#666' }}>
            {this.state.error?.message || 'Bilinmeyen hata'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function RootNavigator() {
  const { navigationTheme, statusBarStyle, colors, isReady } = useAppTheme();
  const { t } = useTranslation();
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const { checkAuthStatus } = useAuthStore();

  useEffect(() => {
    if (!isReady || isBootstrapped) return;

    const bootstrap = async () => {
      try {
        await checkAuthStatus();
      } catch (error) {
        console.error('Bootstrap failed:', error);
      } finally {
        setIsBootstrapped(true);
      }
    };

    bootstrap();
  }, [isReady, isBootstrapped, checkAuthStatus]);

  if (!isReady || !isBootstrapped) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', headerShown: true, title: t('common.quick_action') }}
          />
        </Stack>
      </ThemeProvider>
      <StatusBar style={statusBarStyle} />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
    </ErrorBoundary>
  );
}
