import { QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { AppThemeProvider } from '@/providers/AppThemeProvider';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { PurchaseProvider } from '@/contexts/PurchaseContext';
import i18n, { initI18n } from '@/i18n';
import { queryClient } from '@/queryClient';

type Props = {
  children: React.ReactNode;
};

export const AppProviders = ({ children }: Props) => {
  const [i18nInitialized, setI18nInitialized] = useState(false);

  useEffect(() => {
    initI18n().then(() => {
      setI18nInitialized(true);
    });
  }, []);

  if (!i18nInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <PurchaseProvider>
          <CurrencyProvider>
            <AppThemeProvider>{children}</AppThemeProvider>
          </CurrencyProvider>
        </PurchaseProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
};


