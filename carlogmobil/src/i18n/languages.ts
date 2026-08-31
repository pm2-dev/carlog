export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en_US', name: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'en_GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
];

export const DEFAULT_LANGUAGE = 'tr';
export const FALLBACK_LANGUAGE = 'en_US';

// Sistem dilinden uygulama dil koduna dönüşüm
export const mapSystemLocaleToAppLanguage = (systemLocale: string): string => {
  // systemLocale formatı: "tr-TR", "en-US", "en-GB" vb.
  const normalizedLocale = systemLocale.replace('-', '_');
  
  // Tam eşleşme kontrol et
  const exactMatch = SUPPORTED_LANGUAGES.find(lang => lang.code === normalizedLocale);
  if (exactMatch) return exactMatch.code;
  
  // Sadece dil kodu ile eşleşme kontrol et (örn: "en" -> "en_US")
  const languageCode = systemLocale.split('-')[0];
  const partialMatch = SUPPORTED_LANGUAGES.find(lang => lang.code.startsWith(languageCode));
  if (partialMatch) return partialMatch.code;
  
  // Varsayılan dile dön
  return DEFAULT_LANGUAGE;
};

