import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vehicleService } from '@/api/services/vehicles';
import { fuelService } from '@/api/services/fuel';
import { reminderService } from '@/api/services/reminders';
import { notificationsApi } from '@/api/services/notifications';
import { usersService } from '@/api/services/users';

const MIGRATION_KEY = '@carlog_local_migration_done';
const LIVE_API_URL = 'http://138.197.177.185:3000';

async function clearAuthTokens() {
  await SecureStore.deleteItemAsync('accessToken').catch(() => undefined);
  await SecureStore.deleteItemAsync('refreshToken').catch(() => undefined);
  await SecureStore.deleteItemAsync('authMode').catch(() => undefined);
}

async function markDone() {
  await AsyncStorage.setItem(MIGRATION_KEY, '1');
  await clearAuthTokens();
}

function isUnauthorized(result: PromiseSettledResult<unknown>): boolean {
  if (result.status !== 'rejected') return false;
  const status = (result.reason as any)?.response?.status;
  return status === 401 || status === 403;
}

export async function migrateFromServerIfNeeded(): Promise<boolean> {
  const alreadyDone = await AsyncStorage.getItem(MIGRATION_KEY);
  if (alreadyDone === '1') return false;

  const token = await SecureStore.getItemAsync('accessToken');
  if (!token) {
    await AsyncStorage.setItem(MIGRATION_KEY, '1');
    return false;
  }

  try {
    const client = axios.create({
      baseURL: LIVE_API_URL,
      timeout: 8000,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const [vehiclesRes, fuelRes, remindersRes, notificationsRes, profileRes] = await Promise.allSettled([
      client.get('/vehicles'),
      client.get('/fuel-entries'),
      client.get('/reminders'),
      client.get('/notifications'),
      client.get('/users/profile'),
    ]);

    if ([vehiclesRes, fuelRes, remindersRes, profileRes].some(isUnauthorized)) {
      await markDone();
      return false;
    }

    let imported = 0;

    if (vehiclesRes.status === 'fulfilled' && Array.isArray(vehiclesRes.value.data)) {
      for (const vehicle of vehiclesRes.value.data) {
        try {
          await vehicleService.upsertFromRemote(vehicle);
          imported += 1;
        } catch (error) {
          console.warn('Araç aktarılamadı:', vehicle?.id, error);
        }
      }
    }

    if (fuelRes.status === 'fulfilled' && Array.isArray(fuelRes.value.data)) {
      for (const entry of fuelRes.value.data) {
        try {
          await fuelService.upsertFromRemote(entry);
          imported += 1;
        } catch (error) {
          console.warn('Yakıt kaydı aktarılamadı:', entry?.id, error);
        }
      }
    }

    if (remindersRes.status === 'fulfilled' && Array.isArray(remindersRes.value.data)) {
      for (const reminder of remindersRes.value.data) {
        try {
          await reminderService.upsertFromRemote(reminder);
          imported += 1;
        } catch (error) {
          console.warn('Hatırlatma aktarılamadı:', reminder?.id, error);
        }
      }
    }

    if (notificationsRes.status === 'fulfilled' && Array.isArray(notificationsRes.value.data)) {
      for (const log of notificationsRes.value.data) {
        try {
          await notificationsApi.upsertFromRemote(log);
        } catch (error) {
          console.warn('Bildirim aktarılamadı:', log?.id, error);
        }
      }
    }

    if (profileRes.status === 'fulfilled' && profileRes.value.data?.fullName) {
      await usersService.updateProfile({ fullName: profileRes.value.data.fullName });
    }

    const vehiclesOk = vehiclesRes.status === 'fulfilled';
    if (vehiclesOk) {
      await markDone();
      console.log('✅ Sunucu verisi telefona aktarıldı', imported);
      return imported > 0;
    }

    console.warn('⚠️ Sunucudan veri alınamadı, bir sonraki açılışta tekrar denenecek');
    return false;
  } catch (error) {
    console.warn('⚠️ Sunucu göçü başarısız, uygulama yerel olarak açılacak:', error);
    return false;
  }
}
