import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { mapSystemLocaleToAppLanguage, DEFAULT_LANGUAGE, FALLBACK_LANGUAGE } from './languages';

// Çeviri dosyalarını import et
import en_US from './translations/en_US.json';
import en_GB from './translations/en_GB.json';
import es from './translations/es.json';
import pt from './translations/pt.json';
import de from './translations/de.json';
import fr from './translations/fr.json';
import it from './translations/it.json';
import ro from './translations/ro.json';
import tr from './translations/tr.json';
import hi from './translations/hi.json';
import ru from './translations/ru.json';

const LANGUAGE_STORAGE_KEY = '@carlog:language';

// Tüm çevirileri kaydet
const resources = {
  en_US: { translation: en_US },
  en_GB: { translation: en_GB },
  es: { translation: es },
  pt: { translation: pt },
  de: { translation: de },
  fr: { translation: fr },
  it: { translation: it },
  ro: { translation: ro },
  tr: { translation: tr },
  hi: { translation: hi },
  ru: { translation: ru },
};

// Dil algılama ve yükleme
const getInitialLanguage = async (): Promise<string> => {
  try {
    // 1. Önce kullanıcı tercihini kontrol et
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
      return savedLanguage;
    }

    // 2. Sistem dilini kontrol et
    let systemLocale = 'tr';
    try {
      const systemLocales = Localization.getLocales();
      if (systemLocales && systemLocales.length > 0 && systemLocales[0]?.languageCode) {
        systemLocale = systemLocales[0].languageCode;
      }
    } catch (localeError) {
      console.warn('Could not get system locale:', localeError);
    }
    
    const mappedLanguage = mapSystemLocaleToAppLanguage(systemLocale);
    
    return mappedLanguage;
  } catch (error) {
    console.error('Error loading language:', error);
    return DEFAULT_LANGUAGE;
  }
};

// i18next başlatma
export const initI18n = async () => {
  try {
    const initialLanguage = await getInitialLanguage();

    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: initialLanguage || DEFAULT_LANGUAGE,
        fallbackLng: FALLBACK_LANGUAGE,
        compatibilityJSON: 'v3',
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });

    console.log('i18n initialized with language:', i18n.language);
    return i18n;
  } catch (error) {
    console.error('Error initializing i18n:', error);
    // Fallback olarak varsayılan dil ile başlat
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: DEFAULT_LANGUAGE,
        fallbackLng: FALLBACK_LANGUAGE,
        compatibilityJSON: 'v3',
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });
    return i18n;
  }
};

// Dil değiştirme ve kaydetme
export const changeLanguage = async (language: string) => {
  try {
    await i18n.changeLanguage(language);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Mevcut dili getir
export const getCurrentLanguage = () => i18n?.language ?? DEFAULT_LANGUAGE;

export default i18n;

