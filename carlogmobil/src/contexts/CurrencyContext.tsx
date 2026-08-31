import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '@/hooks/useTranslation';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

const STORAGE_KEY = 'user-currency';

interface CurrencyContextType {
  currencySymbol: string;
  currencyCode: string;
  changeCurrency: (code: string) => Promise<void>;
  availableCurrencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useTranslation();
  const [currencySymbol, setCurrencySymbol] = useState<string>('₺');
  const [currencyCode, setCurrencyCode] = useState<string>('TRY');

  const loadCurrency = useCallback(async () => {
    try {
      // Try to get user's saved preference
      const savedCurrency = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (savedCurrency) {
        const currency = CURRENCIES.find(c => c.code === savedCurrency);
        if (currency) {
          setCurrencySymbol(currency.symbol);
          setCurrencyCode(currency.code);
          return;
        }
      }

      // Use locale default
      const defaultSymbol = t('units.currency_symbol');
      const defaultCode = t('units.currency_code');
      setCurrencySymbol(defaultSymbol);
      setCurrencyCode(defaultCode);
    } catch (error) {
      console.error('Error loading currency:', error);
      // Fallback to Turkish Lira
      setCurrencySymbol('₺');
      setCurrencyCode('TRY');
    }
  }, [t]);

  useEffect(() => {
    loadCurrency();
  }, [locale, loadCurrency]);

  const changeCurrency = async (code: string) => {
    try {
      const currency = CURRENCIES.find(c => c.code === code);
      if (!currency) {
        console.error('Currency not found:', code);
        return;
      }

      // Save to storage first
      await AsyncStorage.setItem(STORAGE_KEY, code);
      
      // Then update state - this will trigger re-render in all components using this context
      setCurrencySymbol(currency.symbol);
      setCurrencyCode(currency.code);
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currencySymbol,
        currencyCode,
        changeCurrency,
        availableCurrencies: CURRENCIES,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

