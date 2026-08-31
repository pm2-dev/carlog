import { getDb, nowIso, wipeAllLocalData } from '@/db/database';
import { cancelAllNotifications } from '@/utils/notificationHelper';

export interface User {
  id: string;
  phone: string;
  fullName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  fullName?: string;
}

export interface RegisterDeviceDto {
  expoPushToken: string;
  deviceInfo?: {
    platform?: string;
    manufacturer?: string;
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };
}

export interface UserDevice {
  id: string;
  userId: string;
  expoPushToken: string;
  lastUsedAt: string;
  deviceInfo?: any;
}

const PROFILE_NAME_KEY = 'fullName';

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    key
  );
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    key,
    value
  );
}

export const usersService = {
  getProfile: async (): Promise<User> => {
    const fullName = (await getSetting(PROFILE_NAME_KEY)) ?? undefined;
    const createdAt = (await getSetting('createdAt')) ?? nowIso();
    return {
      id: 'local',
      phone: '',
      fullName,
      createdAt,
      updatedAt: nowIso(),
    };
  },

  updateProfile: async (data: UpdateUserDto): Promise<User> => {
    if (data.fullName !== undefined) {
      await setSetting(PROFILE_NAME_KEY, data.fullName);
    }
    return usersService.getProfile();
  },

  registerDevice: async (_data: RegisterDeviceDto): Promise<UserDevice> => {
    return {
      id: 'local-device',
      userId: 'local',
      expoPushToken: '',
      lastUsedAt: nowIso(),
    };
  },

  getUserDevices: async (): Promise<UserDevice[]> => [],

  removeDevice: async (_deviceId: string): Promise<UserDevice> => {
    return {
      id: _deviceId,
      userId: 'local',
      expoPushToken: '',
      lastUsedAt: nowIso(),
    };
  },

  deleteAccount: async () => {
    await wipeAllLocalData();
    await cancelAllNotifications();
    return { success: true, message: 'Yerel veriler silindi' };
  },
};
