import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import i18n from '@/i18n';

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: i18n.t('settings.notification_channel_default'),
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });

  await Notifications.setNotificationChannelAsync('reminders', {
    name: i18n.t('settings.notification_channel_reminders'),
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
  });
}

export async function ensureLocalNotificationPermissions(): Promise<boolean> {
  await ensureAndroidChannels();

  if (!Device.isDevice) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/**
 * Bildirim izinlerini kontrol eder ve ister.
 * iOS ve Android için uygun yapılandırmayı yapar.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  await ensureAndroidChannels();

  // Fiziksel cihaz kontrolü (simülatörde bildirimler çalışmaz)
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices.');
    return null;
  }

  try {
    // Mevcut izinleri kontrol et
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // İzin verilmemişse iste
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert(
        i18n.t('settings.notification_permission_required'), 
        i18n.t('settings.notification_permission_message'),
        [{ text: i18n.t('common.ok') }]
      );
      return null;
    }
    
    console.log('Notification permission granted.');
    
    const projectId =
      // EAS build için
      Constants?.expoConfig?.extra?.eas?.projectId ??
      // Expo Go / klasik yapı için geri dönüş
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('projectId bulunamadı; push token alınamadı.');
      return null;
    }

    // Production için FCM/APNs token alırken daha detaylı loglama
    if (Platform.OS === 'android') {
      console.log('🤖 Android FCM token requested');
    } else if (Platform.OS === 'ios') {
      console.log('🍎 iOS APNs token requested via Expo');
    }

    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log('✅ Push token başarıyla alındı:', pushToken.data);
    return pushToken.data;
  } catch (error) {
    console.error('Bildirim izni alınamadı:', error);
    return null;
  }
}

/**
 * Belirli bir tarihe ve öncesine (7g/3g/1g + gününde 09:00) yerel bildirim planlar.
 * Geçmişe düşen tetikleyiciler otomatik atlanır.
 * @param title Bildirim başlığı
 * @param body Bildirim içeriği
 * @param triggerDate Bildirimin tetikleneceği tarih (Date objesi) — saat 09:00 olarak ayarlanır
 * @param data Bildirime eklenecek ek veri (opsiyonel)
 */
export async function scheduleReminderNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data?: Record<string, any>,
  identifierPrefix?: string
) {
  await ensureLocalNotificationPermissions();
  const ids: string[] = [];
  const offsetsInDays = [7, 3, 1, 0]; // 7g/3g/1g önce ve gününde

  // Her tetikleme için 09:00'a sabitle
  for (const offset of offsetsInDays) {
    const date = new Date(triggerDate);
    date.setDate(date.getDate() - offset);
    date.setHours(9, 0, 0, 0);

    // Geçmiş tarihleri atla
    if (date.getTime() <= Date.now()) {
      continue;
    }

    try {
      const identifier = identifierPrefix ? `${identifierPrefix}-${offset}` : undefined;
      const id = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: title,
          body: body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: data || {},
          badge: 1,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: 'reminders', // Android için özel kanal
        },
      });
      ids.push(id);
    } catch (error) {
      console.error('Bildirim planlama hatası:', error);
    }
  }

  if (ids.length === 0) {
    console.log('Planlanacak gelecekte tarih bulunamadı.');
    return [];
  }

  console.log('Bildirimler planlandı:', ids);
  return ids;
}

/**
 * Tüm planlanmış bildirimleri iptal eder (Test/Temizlik için)
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Tüm bildirimler iptal edildi.');
  } catch (error) {
    console.error('Bildirim iptal hatası:', error);
  }
}

/**
 * Belirli bir bildirimi ID ile iptal eder
 * @param notificationId İptal edilecek bildirimin ID'si
 */
export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('Bildirim iptal edildi:', notificationId);
    return true;
  } catch (error) {
    console.error('Bildirim iptal hatası:', error);
    return false;
  }
}

/**
 * Tüm planlanmış bildirimleri listeler (Debug için)
 */
export async function getAllScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Planlanmış bildirimler:', notifications.length);
    return notifications;
  } catch (error) {
    console.error('Bildirim listesi alınamadı:', error);
    return [];
  }
}

export async function cancelNotificationsByPrefix(prefix: string) {
  const offsetsInDays = [7, 3, 1, 0];
  for (const offset of offsetsInDays) {
    try {
      await Notifications.cancelScheduledNotificationAsync(`${prefix}-${offset}`);
    } catch {
      // yoksa sessizce geç
    }
  }
}

export async function presentLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  await ensureLocalNotificationPermissions();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: data || {},
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Yerel bildirim gösterilemedi:', error);
  }
}

