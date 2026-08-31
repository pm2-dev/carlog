import { getDb, nowIso, toIso } from '@/db/database';
import { createId } from '@/db/uuid';
import type { Reminder, ReminderStatus, ReminderType, Vehicle } from '@/types/domain';
import { vehicleService } from './vehicles';
import { notificationsApi } from './notifications';
import {
  scheduleReminderNotification,
  cancelNotificationsByPrefix,
  presentLocalNotification,
} from '@/utils/notificationHelper';
import i18n from '@/i18n';

export interface CreateReminderDto {
  vehicleId: string;
  type: string;
  dueDate?: Date | string;
  note?: string;
  cost?: number;
  odometerAtService?: number;
  serviceProvider?: string;
  isKmBased?: boolean;
  kmInterval?: number;
}

export interface UpdateReminderDto extends Partial<CreateReminderDto> {
  status?: ReminderStatus;
  lastTriggeredKm?: number;
}

export interface MaintenanceHistory {
  records: Reminder[];
  summary: {
    totalCost: number;
    count: number;
    averageCost: number;
  };
}

type ReminderRow = {
  id: string;
  vehicleId: string;
  type: string;
  dueDate: string | null;
  status: string;
  note: string | null;
  cost: number | null;
  odometerAtService: number | null;
  serviceProvider: string | null;
  isKmBased: number;
  kmInterval: number | null;
  lastTriggeredKm: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  plate?: string;
  brand?: string;
  model?: string;
  vehicleOdometer?: number;
};

function mapReminder(row: ReminderRow): Reminder {
  const reminder: Reminder = {
    id: row.id,
    vehicleId: row.vehicleId,
    type: row.type as ReminderType,
    dueDate: row.dueDate ?? undefined,
    status: row.status as ReminderStatus,
    note: row.note ?? undefined,
    cost: row.cost ?? undefined,
    odometerAtService: row.odometerAtService ?? undefined,
    serviceProvider: row.serviceProvider ?? undefined,
    isKmBased: Number(row.isKmBased) === 1,
    kmInterval: row.kmInterval ?? undefined,
    lastTriggeredKm: row.lastTriggeredKm ?? undefined,
    completedAt: row.completedAt ?? undefined,
  };

  if (row.plate) {
    reminder.vehicle = {
      id: row.vehicleId,
      plate: row.plate,
      brand: row.brand ?? '',
      model: row.model ?? '',
      category: 'OTOMOBIL',
      fuelTypes: [],
      currentOdometer: row.vehicleOdometer ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as Vehicle & { currentOdometer?: number };
  }

  return reminder;
}

function reminderTypeLabel(type: string): string {
  const map: Record<string, string> = {
    SIGORTA: i18n.t('reminders.type_insurance'),
    KASKO: i18n.t('reminders.type_kasko'),
    MUAYENE: i18n.t('reminders.type_inspection'),
    BAKIM: i18n.t('reminders.type_maintenance'),
    VERGI: i18n.t('reminders.type_tax'),
    DIGER: i18n.t('reminders.type_other'),
  };
  return map[type] || type;
}

async function scheduleDateReminder(reminder: Reminder, plate: string) {
  if (reminder.isKmBased || !reminder.dueDate) return;
  const typeLabel = reminderTypeLabel(reminder.type);
  await scheduleReminderNotification(
    i18n.t('reminders.notification_title', { type: typeLabel }),
    i18n.t('reminders.notification_body', { plate, type: typeLabel }),
    new Date(reminder.dueDate),
    { reminderId: reminder.id, type: 'REMINDER_DUE' },
    reminder.id
  );
}

export const reminderService = {
  getAll: async (vehicleId?: string, status?: string): Promise<Reminder[]> => {
    const db = await getDb();
    const clauses: string[] = [];
    const params: (string | number)[] = [];
    if (vehicleId) {
      clauses.push('r.vehicleId = ?');
      params.push(vehicleId);
    }
    if (status) {
      clauses.push('r.status = ?');
      params.push(status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await db.getAllAsync<ReminderRow>(
      `SELECT r.*, v.plate, v.brand, v.model, v.currentOdometer as vehicleOdometer
       FROM reminders r
       JOIN vehicles v ON v.id = r.vehicleId
       ${where}
       ORDER BY r.createdAt DESC`,
      ...params
    );
    return rows.map(mapReminder);
  },

  create: async (data: CreateReminderDto): Promise<Reminder> => {
    const vehicle = await vehicleService.getById(data.vehicleId);
    const db = await getDb();
    const now = nowIso();
    const id = createId();
    const isKmBased = data.isKmBased ? 1 : 0;
    const dueDate = data.dueDate
      ? data.dueDate instanceof Date
        ? data.dueDate.toISOString()
        : data.dueDate
      : null;

    await db.runAsync(
      `INSERT INTO reminders
        (id, vehicleId, type, dueDate, status, note, cost, odometerAtService,
         serviceProvider, isKmBased, kmInterval, lastTriggeredKm, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.vehicleId,
      data.type,
      isKmBased ? null : dueDate,
      data.note ?? null,
      data.cost ?? null,
      data.odometerAtService ?? null,
      data.serviceProvider ?? null,
      isKmBased,
      data.kmInterval ?? null,
      isKmBased ? vehicle.currentOdometer : null,
      now,
      now
    );

    const created = (await reminderService.getAll(data.vehicleId)).find((r) => r.id === id);
    if (!created) {
      throw new Error('Hatırlatma kaydedilemedi');
    }
    await scheduleDateReminder(created, vehicle.plate);
    return created;
  },

  update: async (id: string, data: UpdateReminderDto): Promise<Reminder> => {
    const existingList = await reminderService.getAll();
    const existing = existingList.find((r) => r.id === id);
    if (!existing) {
      throw new Error('Hatırlatma bulunamadı');
    }

    const db = await getDb();
    const now = nowIso();
    const status = data.status ?? existing.status;
    const completedAt = status === 'COMPLETED' ? now : existing.completedAt ?? null;
    const dueDate = data.dueDate
      ? data.dueDate instanceof Date
        ? data.dueDate.toISOString()
        : data.dueDate
      : existing.dueDate ?? null;

    await db.runAsync(
      `UPDATE reminders SET
        type = ?, dueDate = ?, status = ?, note = ?, cost = ?, odometerAtService = ?,
        serviceProvider = ?, isKmBased = ?, kmInterval = ?, lastTriggeredKm = ?,
        completedAt = ?, updatedAt = ?
       WHERE id = ?`,
      data.type ?? existing.type,
      dueDate,
      status,
      data.note ?? existing.note ?? null,
      data.cost ?? existing.cost ?? null,
      data.odometerAtService ?? existing.odometerAtService ?? null,
      data.serviceProvider ?? existing.serviceProvider ?? null,
      (data.isKmBased ?? existing.isKmBased) ? 1 : 0,
      data.kmInterval ?? existing.kmInterval ?? null,
      data.lastTriggeredKm ?? existing.lastTriggeredKm ?? null,
      completedAt,
      now,
      id
    );

    if (status === 'COMPLETED' || status === 'OVERDUE') {
      await cancelNotificationsByPrefix(id);
    }

    const updated = (await reminderService.getAll()).find((r) => r.id === id);
    if (!updated) {
      throw new Error('Hatırlatma güncellenemedi');
    }
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDb();
    await cancelNotificationsByPrefix(id);
    await db.runAsync(`DELETE FROM reminders WHERE id = ?`, id);
  },

  getMaintenanceHistory: async (vehicleId?: string): Promise<MaintenanceHistory> => {
    const all = await reminderService.getAll(vehicleId);
    const records = all.filter((r) => r.type === 'BAKIM' && r.status === 'COMPLETED');
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
    return {
      records,
      summary: {
        totalCost,
        count: records.length,
        averageCost: records.length > 0 ? totalCost / records.length : 0,
      },
    };
  },

  reschedulePending: async (): Promise<void> => {
    const pending = (await reminderService.getAll()).filter(
      (r) => r.status === 'PENDING' && !r.isKmBased && r.dueDate
    );
    for (const reminder of pending) {
      const plate = reminder.vehicle?.plate || '';
      await cancelNotificationsByPrefix(reminder.id);
      await scheduleDateReminder(reminder, plate);
    }
  },

  checkKmBasedReminders: async (): Promise<void> => {
    const pending = (await reminderService.getAll()).filter(
      (r) => r.status === 'PENDING' && r.isKmBased && r.kmInterval
    );

    for (const reminder of pending) {
      const currentKm = reminder.vehicle?.currentOdometer || 0;
      const lastTriggeredKm = reminder.lastTriggeredKm || 0;
      const kmInterval = reminder.kmInterval!;
      const nextTriggerKm = lastTriggeredKm + kmInterval;
      const kmRemaining = nextTriggerKm - currentKm;
      const warningThreshold = kmInterval * 0.1;
      if (kmRemaining > warningThreshold) continue;

      const recent = await notificationsApi.findRecentForReminder(reminder.id, 7);
      if (recent) continue;

      const isOverdue = kmRemaining <= 0;
      const typeLabel = reminderTypeLabel(reminder.type);
      const plate = reminder.vehicle?.plate || '';
      const title = isOverdue ? `${typeLabel} geçti` : `${typeLabel} yaklaşıyor`;
      const body = isOverdue
        ? `${plate} - ${Math.abs(kmRemaining)} km geçti. ${typeLabel} yapılmalı.`
        : `${plate} - ${kmRemaining} km kaldı. ${typeLabel} zamanı yaklaşıyor.`;

      await presentLocalNotification(title, body, { reminderId: reminder.id, kmRemaining });
      await notificationsApi.createLocal({
        type: isOverdue ? 'REMINDER_OVERDUE' : 'REMINDER_DUE',
        payload: { reminderId: reminder.id, title, body, kmRemaining, nextTriggerKm },
      });
    }
  },

  upsertFromRemote: async (reminder: any): Promise<void> => {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO reminders
        (id, vehicleId, type, dueDate, status, note, cost, odometerAtService,
         serviceProvider, isKmBased, kmInterval, lastTriggeredKm, completedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         vehicleId = excluded.vehicleId,
         type = excluded.type,
         dueDate = excluded.dueDate,
         status = excluded.status,
         note = excluded.note,
         cost = excluded.cost,
         odometerAtService = excluded.odometerAtService,
         serviceProvider = excluded.serviceProvider,
         isKmBased = excluded.isKmBased,
         kmInterval = excluded.kmInterval,
         lastTriggeredKm = excluded.lastTriggeredKm,
         completedAt = excluded.completedAt,
         updatedAt = excluded.updatedAt`,
      reminder.id,
      reminder.vehicleId,
      reminder.type,
      toIso(reminder.dueDate) ?? null,
      reminder.status ?? 'PENDING',
      reminder.note ?? null,
      reminder.cost ?? null,
      reminder.odometerAtService ?? null,
      reminder.serviceProvider ?? null,
      reminder.isKmBased ? 1 : 0,
      reminder.kmInterval ?? null,
      reminder.lastTriggeredKm ?? null,
      toIso(reminder.completedAt) ?? null,
      toIso(reminder.createdAt) ?? nowIso(),
      toIso(reminder.updatedAt) ?? nowIso()
    );
  },
};
