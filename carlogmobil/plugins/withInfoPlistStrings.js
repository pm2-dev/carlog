const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * iOS için InfoPlist.strings dosyalarını oluşturan Expo Config Plugin
 * Bu plugin TR ve EN dillerinde izin mesajlarını yerelleştirir
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

      // EN yerelleştirme dosyası
      const enLocalizationPath = path.join(iosPath, 'en.lproj');
      if (!fs.existsSync(enLocalizationPath)) {
        fs.mkdirSync(enLocalizationPath, { recursive: true });
      }
      fs.writeFileSync(
        path.join(enLocalizationPath, 'InfoPlist.strings'),
        enInfoPlistStrings,
        'utf8'
      );

      // TR yerelleştirme dosyası
      const trLocalizationPath = path.join(iosPath, 'tr.lproj');
      if (!fs.existsSync(trLocalizationPath)) {
        fs.mkdirSync(trLocalizationPath, { recursive: true });
      }
      fs.writeFileSync(
        path.join(trLocalizationPath, 'InfoPlist.strings'),
        trInfoPlistStrings,
        'utf8'
      );

      console.log('✅ InfoPlist.strings dosyaları oluşturuldu (Base, EN & TR)');

      return config;
    },
  ]);
};

module.exports = withInfoPlistStrings;

