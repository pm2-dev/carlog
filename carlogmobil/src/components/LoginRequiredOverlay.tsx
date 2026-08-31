import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { Screen } from './Screen';

interface LoginRequiredOverlayProps {
  featureName?: string;
  showAsScreen?: boolean;
}

export function LoginRequiredOverlay({ featureName, showAsScreen = true }: LoginRequiredOverlayProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogin = async () => {
    // Guest mode'dan çıkış yap ve login sayfasına yönlendir
    await logout();
    router.replace('/sign-in');
  };

  const content = (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
      </View>
      
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('auth.login_required')}
      </Text>
      
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {t('auth.login_required_message')}
      </Text>
      
      <Pressable
        accessibilityRole="button"
        style={[styles.loginButton, { backgroundColor: colors.primary }]}
        onPress={handleLogin}>
        <Ionicons name="log-in-outline" size={20} color="#FFF" />
        <Text style={styles.loginButtonLabel}>{t('auth.login_now')}</Text>
      </Pressable>
    </View>
  );

  if (showAsScreen) {
    return <Screen>{content}</Screen>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    minWidth: 200,
  },
  loginButtonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
