import { Platform, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';

type AdBannerProps = {
  adUnitId?: string;
  size?: 'banner' | 'largeBanner';
  isPremium?: boolean;
};

// Üretim banner reklam birimi kimliği
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-6346259754086027/4345144506';

// Expo Go kontrolü
const isExpoGo = Constants.appOwnership === 'expo';

// Web platform kontrolü
const isWeb = Platform.OS === 'web';

// Production mod kontrolü - Development build'lerde her zaman production reklamları göster
// (Expo Go'da zaten placeholder gösteriliyor)
const isProduction = !isExpoGo;

// Debug log
console.log('🎯 AdMob Mod:', {
  isProduction,
  isExpoGo,
  appOwnership: Constants.appOwnership,
  platform: Platform.OS,
  adUnitId: isProduction ? PRODUCTION_AD_UNIT_ID : 'TEST_MODE'
});

export const AdBanner = ({ adUnitId, size = 'banner', isPremium = false }: AdBannerProps) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [AdComponent, setAdComponent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Web veya Expo Go ise AdMob yükleme
    if (isWeb || isExpoGo) {
      setIsLoading(false);
      return;
    }

    // Production/Development build'de AdMob'u yükle
    import('react-native-google-mobile-ads')
      .then((module) => {
        const { BannerAd, BannerAdSize, TestIds } = module;
        
        // Production modda gerçek reklam ID'si, development'ta test ID'si kullan
        const finalAdUnitId = adUnitId || (isProduction ? PRODUCTION_AD_UNIT_ID : TestIds.ADAPTIVE_BANNER);
        
        console.log('📱 AdMob Banner Yükleniyor:', {
          mode: isProduction ? 'PRODUCTION' : 'TEST',
          adUnitId: finalAdUnitId,
          size: size
        });
        
        // Banner boyutu
        // ANCHORED_ADAPTIVE_BANNER native katmanda ekranın altına yapışıp tab bar tıklamalarını yutabiliyor.
        const bannerSize = size === 'largeBanner' ? BannerAdSize.LARGE_BANNER : BannerAdSize.BANNER;

        // Banner komponenti oluştur
        const Banner = () => (
          <BannerAd
            unitId={finalAdUnitId}
            size={bannerSize}
            requestOptions={{
              requestNonPersonalizedAdsOnly: false,
            }}
            onAdLoaded={() => {
              console.log('✅ Banner reklam yüklendi:', isProduction ? 'PRODUCTION' : 'TEST');
            }}
            onAdFailedToLoad={(error: any) => {
              console.error('❌ Banner reklam yüklenemedi:', {
                mode: isProduction ? 'PRODUCTION' : 'TEST',
                error: error
              });
            }}
          />
        );

        setAdComponent(() => Banner);
        setIsLoading(false);
      })
      .catch((error) => {
        console.log('AdMob yüklenemedi:', error.message);
        setIsLoading(false);
      });
  }, [adUnitId, size]);

  // Premium kullanıcılara reklam gösterme
  if (isPremium) {
    return null;
  }
  
  // Web platformunda reklam gösterme (native-only module)
  if (isWeb) {
    return null;
  }
  
  // Expo Go'da placeholder göster
  if (isExpoGo) {
    return (
      <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('ads.sponsored_content')}</Text>
        <View style={styles.placeholder}>
          <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
            {t('ads.development_mode')}
          </Text>
        </View>
      </View>
    );
  }

  // AdMob yüklenmediyse placeholder göster
  if (!AdComponent) {
    return (
      <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('ads.sponsored_content')}</Text>
        <View style={styles.placeholder}>
          <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
            {isLoading ? t('ads.ad_loading') : t('ads.ad_failed')}
          </Text>
        </View>
      </View>
    );
  }

  // Production/Development build'de gerçek reklamı göster
  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{t('ads.sponsored_content')}</Text>
      <View style={styles.adSlot}>
        <AdComponent />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  placeholder: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adSlot: {
    height: 50,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 12,
  },
});
