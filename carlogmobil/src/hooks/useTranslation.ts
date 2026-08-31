import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { changeLanguage as i18nChangeLanguage } from '@/i18n';
import { DEFAULT_LANGUAGE } from '@/i18n/languages';

export function useTranslation() {
  const { t, i18n } = useI18nextTranslation();

  // i18n henüz başlatılmamışsa güvenli fallback değerler döndür
  const safeT = t ?? ((key: string) => key);
  const safeLocale = i18n?.language ?? DEFAULT_LANGUAGE;

  return {
    t: safeT,
    locale: safeLocale,
    changeLanguage: i18nChangeLanguage,
  };
}

