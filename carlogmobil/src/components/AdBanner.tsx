import { View } from 'react-native';

type AdBannerProps = {
  adUnitId?: string;
  size?: 'banner' | 'largeBanner';
  isPremium?: boolean;
};

export const AdBanner = (_props: AdBannerProps) => {
  return <View />;
};
