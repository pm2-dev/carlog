const appConfig = require('./app.json');
const withInfoPlistStrings = require('./plugins/withInfoPlistStrings');

module.exports = () => {
  const config = {
    ...appConfig,
    expo: {
      ...appConfig.expo,
        ios: {
        ...appConfig.expo.ios,
        infoPlist: {
          ...appConfig.expo.ios.infoPlist,
          // Varsayılan dil ve desteklenen diller
          CFBundleDevelopmentRegion: "en",
          CFBundleLocalizations: ["en", "tr"],
          
          // Konum izinleri - Varsayılan İngilizce (Türkçe InfoPlist.strings ile)
          NSLocationWhenInUseUsageDescription: "Location permission is required to show nearby gas and charging stations.",
          NSLocationAlwaysAndWhenInUseUsageDescription: "Location permission is required to show nearby gas and charging stations.",
          NSLocationAlwaysUsageDescription: "Location permission is required to show nearby gas and charging stations.",
          
          // Kamera izni - Detaylı açıklama (Apple Guidelines 5.1.1)
          NSCameraUsageDescription: "Camera access is required to scan your fuel receipts and automatically record your fuel consumption data. This helps you track your vehicle expenses more easily.",
          
          // Galeri izni
          NSPhotoLibraryUsageDescription: "Photo library permission is required to select photos.",
          NSPhotoLibraryAddUsageDescription: "Permission is required to save photos.",
          
          // Bildirim izni
          NSUserNotificationsUsageDescription: "Notification permission is required for your reminders and important updates.",
          
          // Mikrofon
          NSMicrophoneUsageDescription: "Microphone permission is required to record audio.",
          
          // Takvim
          NSCalendarsUsageDescription: "Calendar permission is required to add reminders.",
          
          // Kontak/Kişiler
          NSContactsUsageDescription: "Contact permission is required to access contact information.",
          
          // Face ID / Touch ID
          NSFaceIDUsageDescription: "Face ID is used for secure authentication.",
        },
      },
      // Plugin'lerdeki izin mesajlarını da güncelle
      plugins: [
        "expo-router",
        [
          "expo-splash-screen",
          appConfig.expo.plugins.find(p => Array.isArray(p) && p[0] === "expo-splash-screen")?.[1]
        ],
        "expo-secure-store",
        "expo-sqlite",
        [
          "expo-notifications",
          appConfig.expo.plugins.find(p => Array.isArray(p) && p[0] === "expo-notifications")?.[1]
        ],
        [
          "expo-location",
          {
            locationAlwaysAndWhenInUsePermission: "Location permission is required to show nearby gas and charging stations.",
            locationWhenInUsePermission: "Location permission is required to show nearby gas and charging stations.",
            locationAlwaysPermission: "Location permission is required to show nearby gas and charging stations."
          }
        ],
        [
          "react-native-google-mobile-ads",
          appConfig.expo.plugins.find(p => Array.isArray(p) && p[0] === "react-native-google-mobile-ads")?.[1]
        ],
        "expo-web-browser",
        [
          "expo-build-properties",
          appConfig.expo.plugins.find(p => Array.isArray(p) && p[0] === "expo-build-properties")?.[1]
        ],
        // Custom plugin for InfoPlist.strings
        withInfoPlistStrings
      ],
    },
  };
  
  return config;
};

