import { getDb, nowIso, toIso } from '@/db/database';
import { createId } from '@/db/uuid';
import { NotificationLog, NotificationType } from '@/types/domain';

type NotificationRow = {
  id: string;
  type: string;
  payload: string | null;
  status: string;
  sentAt: string;
  error: string | null;
  isRead: number;
  readAt: string | null;
};

function mapNotification(row: NotificationRow): NotificationLog {
  let payload: any = null;
  if (row.payload) {
    try {
      payload = JSON.parse(row.payload);
    } catch {
      payload = row.payload;
    }
  }
  return {
    id: row.id,
    userId: 'local',
    type: row.type as NotificationType,
    payload,
    status: row.status,
    sentAt: row.sentAt,
    error: row.error ?? undefined,
    isRead: row.isRead === 1,
    readAt: row.readAt,
  };
}

export const notificationsApi = {
  getNotifications: async (onlyUnread?: boolean): Promise<NotificationLog[]> => {
    const db = await getDb();
    const rows = onlyUnread
      ? await db.getAllAsync<NotificationRow>(
          `SELECT * FROM notifications WHERE isRead = 0 ORDER BY sentAt DESC LIMIT 50`
        )
      : await db.getAllAsync<NotificationRow>(
          `SELECT * FROM notifications ORDER BY sentAt DESC LIMIT 50`
        );
    return rows.map(mapNotification);
  },

  markAllAsRead: async (): Promise<{ success: boolean; updatedCount: number }> => {
    const db = await getDb();
    const result = await db.runAsync(
      `UPDATE notifications SET isRead = 1, readAt = ? WHERE isRead = 0`,
      nowIso()
    );
    return { success: true, updatedCount: result.changes };
  },

  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications WHERE isRead = 0`
    );
    return { unreadCount: row?.count ?? 0 };
  },

  deleteNotification: async (notificationId: string): Promise<{ success: boolean; message: string }> => {
    const db = await getDb();
    await db.runAsync(`DELETE FROM notifications WHERE id = ?`, notificationId);
    return { success: true, message: 'Bildirim silindi' };
  },

  deleteAllNotifications: async (): Promise<{ success: boolean; deletedCount: number; message: string }> => {
    const db = await getDb();
    const result = await db.runAsync(`DELETE FROM notifications`);
    return { success: true, deletedCount: result.changes, message: 'Tüm bildirimler silindi' };
  },

  createLocal: async (data: {
    type: NotificationType | string;
    payload?: any;
    status?: string;
  }): Promise<NotificationLog> => {
    const db = await getDb();
    const id = createId();
    const sentAt = nowIso();
    await db.runAsync(
      `INSERT INTO notifications (id, type, payload, status, sentAt, isRead)
       VALUES (?, ?, ?, ?, ?, 0)`,
      id,
      data.type,
      data.payload ? JSON.stringify(data.payload) : null,
      data.status ?? 'SUCCESS',
      sentAt
    );
    return {
      id,
      userId: 'local',
      type: data.type as NotificationType,
      payload: data.payload ?? null,
      status: data.status ?? 'SUCCESS',
      sentAt,
      isRead: false,
      readAt: null,
    };
  },

  findRecentForReminder: async (reminderId: string, days: number): Promise<NotificationLog | null> => {
    const db = await getDb();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const rows = await db.getAllAsync<NotificationRow>(
      `SELECT * FROM notifications WHERE sentAt >= ? ORDER BY sentAt DESC`,
      since
    );
    const match = rows.find((row) => {
      try {
        const payload = row.payload ? JSON.parse(row.payload) : null;
        return payload?.reminderId === reminderId;
      } catch {
        return false;
      }
    });
    return match ? mapNotification(match) : null;
  },

  upsertFromRemote: async (log: any): Promise<void> => {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO notifications
        (id, type, payload, status, sentAt, error, isRead, readAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      log.id,
      log.type,
      log.payload ? JSON.stringify(log.payload) : null,
      log.status ?? 'SUCCESS',
      toIso(log.sentAt) ?? nowIso(),
      log.error ?? null,
      log.isRead ? 1 : 0,
      toIso(log.readAt) ?? null
    );
  },
};
