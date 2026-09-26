const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * iOS için InfoPlist.strings dosyalarını oluşturan Expo Config Plugin
 * Bu plugin desteklenen diller için InfoPlist.strings üretir.
 * Türkçe metinler yerelleştirilir; diğer diller İngilizce metni kullanır.
 * Apple App Store için varsayılan dil İngilizce olmalıdır
 */

const enInfoPlistStrings = `/* Location Permissions */
"NSLocationWhenInUseUsageDescription" = "Location permission is required to show nearby gas and charging stations.";
"NSLocationAlwaysAndWhenInUseUsageDescription" = "Location permission is required to show nearby gas and charging stations.";
"NSLocationAlwaysUsageDescription" = "Location permission is required to show nearby gas and charging stations.";

/* Camera Permission */
"NSCameraUsageDescription" = "Camera permission is required to take photos.";

/* Photo Library Permissions */
"NSPhotoLibraryUsageDescription" = "Photo library permission is required to select photos.";
"NSPhotoLibraryAddUsageDescription" = "Permission is required to save photos.";

/* Notification Permission */
"NSUserNotificationsUsageDescription" = "Notification permission is required for your reminders and important updates.";

/* Microphone Permission */
"NSMicrophoneUsageDescription" = "Microphone permission is required to record audio.";

/* Calendar Permission */
"NSCalendarsUsageDescription" = "Calendar permission is required to add reminders.";

/* Contacts Permission */
"NSContactsUsageDescription" = "Contact permission is required to access contact information.";

/* Face ID Permission */
"NSFaceIDUsageDescription" = "Face ID is used for secure authentication.";
`;

const trInfoPlistStrings = `/* Location Permissions */
"NSLocationWhenInUseUsageDescription" = "Yakınızdaki benzin ve şarj istasyonlarını görmek için konum izni gereklidir.";
"NSLocationAlwaysAndWhenInUseUsageDescription" = "Yakınızdaki benzin ve şarj istasyonlarını görmek için konum izni gereklidir.";
"NSLocationAlwaysUsageDescription" = "Yakınızdaki benzin ve şarj istasyonlarını görmek için konum izni gereklidir.";

/* Camera Permission */
"NSCameraUsageDescription" = "Fotoğraf çekmek için kamera izni gereklidir.";

/* Photo Library Permissions */
"NSPhotoLibraryUsageDescription" = "Fotoğraf seçmek için galeri izni gereklidir.";
"NSPhotoLibraryAddUsageDescription" = "Fotoğrafları kaydetmek için izin gereklidir.";

/* Notification Permission */
"NSUserNotificationsUsageDescription" = "Hatırlatmalarınız ve önemli güncellemeler için bildirim izni gereklidir.";

/* Microphone Permission */
"NSMicrophoneUsageDescription" = "Ses kaydetmek için mikrofon izni gereklidir.";

/* Calendar Permission */
"NSCalendarsUsageDescription" = "Hatırlatmaları takvime eklemek için izin gereklidir.";

/* Contacts Permission */
"NSContactsUsageDescription" = "Kişi bilgilerine erişmek için izin gereklidir.";

/* Face ID Permission */
"NSFaceIDUsageDescription" = "Güvenli giriş için Face ID kullanılmaktadır.";
`;

const withInfoPlistStrings = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const projectName = config.modRequest.projectName;
      const iosPath = path.join(projectRoot, 'ios', projectName);

      // iOS klasörü yoksa prebuild yapılmamış demektir
      if (!fs.existsSync(iosPath)) {
        console.log('⚠️  iOS klasörü bulunamadı. EAS Build otomatik oluşturacak.');
        return config;
      }

      // Base.lproj - varsayılan İngilizce (önemli!)
      const baseLocalizationPath = path.join(iosPath, 'Base.lproj');
      if (!fs.existsSync(baseLocalizationPath)) {
        fs.mkdirSync(baseLocalizationPath, { recursive: true });
      }
      fs.writeFileSync(
        path.join(baseLocalizationPath, 'InfoPlist.strings'),
        enInfoPlistStrings,
        'utf8'
      );

      const localizations = {
        en: enInfoPlistStrings,
        'en-GB': enInfoPlistStrings,
        es: enInfoPlistStrings,
        pt: enInfoPlistStrings,
        de: enInfoPlistStrings,
        fr: enInfoPlistStrings,
        it: enInfoPlistStrings,
        ro: enInfoPlistStrings,
        tr: trInfoPlistStrings,
        hi: enInfoPlistStrings,
        ru: enInfoPlistStrings,
      };

      for (const [locale, contents] of Object.entries(localizations)) {
        const localizationPath = path.join(iosPath, `${locale}.lproj`);
        if (!fs.existsSync(localizationPath)) {
          fs.mkdirSync(localizationPath, { recursive: true });
        }
        fs.writeFileSync(
          path.join(localizationPath, 'InfoPlist.strings'),
          contents,
          'utf8'
        );
      }

      console.log('✅ InfoPlist.strings dosyaları oluşturuldu:', Object.keys(localizations).join(', '));

      return config;
    },
  ]);
};

module.exports = withInfoPlistStrings;

