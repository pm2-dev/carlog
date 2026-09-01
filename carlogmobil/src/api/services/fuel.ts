import { getDb, nowIso, toIso, parseJsonArray } from '@/db/database';
import { createId } from '@/db/uuid';
import type { FuelEntry, FuelType } from '@/types/domain';
import { vehicleService } from './vehicles';

export interface CreateFuelEntryDto {
  vehicleId: string;
  refuelDate: Date | string;
  previousOdometer: number;
  currentOdometer: number;
  liters?: number;
  lpgLiters?: number;
  kWh?: number;
  totalCost: number;
  note?: string;
  receiptUrl?: string;
}

export interface UpdateFuelEntryDto extends Partial<CreateFuelEntryDto> {}

type FuelEntryRow = {
  id: string;
  vehicleId: string;
  refuelDate: string;
  previousOdometer: number;
  currentOdometer: number;
  distanceKm: number;
  liters: number;
  lpgLiters: number;
  kWh: number;
  totalCost: number;
  note: string | null;
  receiptUrl: string | null;
  season: string | null;
  createdAt: string;
  updatedAt: string;
  plate?: string;
  brand?: string;
  model?: string;
  fuelTypes?: string;
};

function getSeason(date: Date): 'KIS' | 'ILKBAHAR' | 'YAZ' | 'SONBAHAR' {
  const month = date.getMonth();
  if (month === 11 || month === 0 || month === 1) return 'KIS';
  if (month >= 2 && month <= 4) return 'ILKBAHAR';
  if (month >= 5 && month <= 7) return 'YAZ';
  return 'SONBAHAR';
}

function mapEntry(row: FuelEntryRow): FuelEntry {
  const entry: FuelEntry = {
    id: row.id,
    vehicleId: row.vehicleId,
    refuelDate: row.refuelDate,
    previousOdometer: row.previousOdometer,
    currentOdometer: row.currentOdometer,
    distanceKm: row.distanceKm,
    liters: row.liters ?? 0,
    lpgLiters: row.lpgLiters ?? 0,
    kWh: row.kWh ?? 0,
    totalCost: row.totalCost,
    note: row.note ?? undefined,
    receiptUrl: row.receiptUrl ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (row.plate) {
    entry.vehicle = {
      id: row.vehicleId,
      plate: row.plate,
      brand: row.brand ?? '',
      model: row.model ?? '',
      category: 'OTOMOBIL',
      fuelTypes: parseJsonArray<FuelType>(row.fuelTypes),
      currentOdometer: row.currentOdometer,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return entry;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

async function recalculateTripDistances(vehicleId: string): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    currentOdometer: number;
    refuelDate: string;
  }>(
    `SELECT id, currentOdometer, refuelDate FROM fuel_entries
     WHERE vehicleId = ? AND deletedAt IS NULL
     ORDER BY currentOdometer ASC, refuelDate ASC, id ASC`,
    vehicleId
  );

  for (let i = 0; i < rows.length; i++) {
    const tripKm = i === 0 ? 0 : Math.max(0, rows[i].currentOdometer - rows[i - 1].currentOdometer);
    await db.runAsync(`UPDATE fuel_entries SET distanceKm = ? WHERE id = ?`, tripKm, rows[i].id);
  }
}

function validateFuelAmounts(
  fuelTypes: FuelType[],
  liters: number,
  lpgLiters: number,
  kWh: number
) {
  const hasElektrik = fuelTypes.includes('ELEKTRIK');
  const hasBenzin = fuelTypes.includes('BENZIN');
  const hasDizel = fuelTypes.includes('DIZEL');
  const hasLPG = fuelTypes.includes('LPG');
  const hasHibrit = fuelTypes.includes('HIBRIT');

  if (liters + lpgLiters + kWh <= 0) {
    throw new Error('En az bir yakıt türü için miktar girilmelidir.');
  }
  if (hasElektrik && !hasBenzin && !hasDizel && !hasLPG && !hasHibrit && kWh <= 0) {
    throw new Error('Elektrikli araçlar için kWh değeri girilmelidir.');
  }
  if ((hasBenzin || hasDizel || hasLPG) && !hasElektrik && liters <= 0 && lpgLiters <= 0) {
    throw new Error('Yakıt miktarı girilmelidir.');
  }
}

export const fuelService = {
  getAll: async (vehicleId?: string): Promise<FuelEntry[]> => {
    const db = await getDb();
    const sql = vehicleId
      ? `SELECT f.*, v.plate, v.brand, v.model, v.fuelTypes
         FROM fuel_entries f
         JOIN vehicles v ON v.id = f.vehicleId
         WHERE f.deletedAt IS NULL AND f.vehicleId = ?
         ORDER BY f.createdAt DESC`
      : `SELECT f.*, v.plate, v.brand, v.model, v.fuelTypes
         FROM fuel_entries f
         JOIN vehicles v ON v.id = f.vehicleId
         WHERE f.deletedAt IS NULL
         ORDER BY f.createdAt DESC`;
    const rows = vehicleId
      ? await db.getAllAsync<FuelEntryRow>(sql, vehicleId)
      : await db.getAllAsync<FuelEntryRow>(sql);
    return rows.map(mapEntry);
  },

  getById: async (id: string): Promise<FuelEntry> => {
    const db = await getDb();
    const row = await db.getFirstAsync<FuelEntryRow>(
      `SELECT f.*, v.plate, v.brand, v.model, v.fuelTypes
       FROM fuel_entries f
       JOIN vehicles v ON v.id = f.vehicleId
       WHERE f.id = ? AND f.deletedAt IS NULL`,
      id
    );
    if (!row) {
      throw new Error('Yakıt kaydı bulunamadı');
    }
    return mapEntry(row);
  },

  create: async (data: CreateFuelEntryDto): Promise<FuelEntry> => {
    const vehicle = await vehicleService.getById(data.vehicleId);

    if (data.currentOdometer <= data.previousOdometer) {
      throw new Error('Güncel kilometre, önceki kilometreden büyük olmalıdır.');
    }

    const liters = data.liters ?? 0;
    const lpgLiters = data.lpgLiters ?? 0;
    const kWh = data.kWh ?? 0;
    validateFuelAmounts(vehicle.fuelTypes, liters, lpgLiters, kWh);

    const refuelDate = toDate(data.refuelDate);
    const season = getSeason(refuelDate);
    const now = nowIso();
    const id = createId();
    const db = await getDb();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO fuel_entries
          (id, vehicleId, refuelDate, previousOdometer, currentOdometer, distanceKm,
           liters, lpgLiters, kWh, totalCost, note, receiptUrl, season, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        data.vehicleId,
        refuelDate.toISOString(),
        data.previousOdometer,
        data.currentOdometer,
        Math.max(0, data.currentOdometer - data.previousOdometer),
        liters,
        lpgLiters,
        kWh,
        data.totalCost,
        data.note ?? null,
        data.receiptUrl ?? null,
        season,
        now,
        now
      );

      await recalculateTripDistances(data.vehicleId);

      if (data.currentOdometer > vehicle.currentOdometer) {
        await db.runAsync(
          `UPDATE vehicles SET currentOdometer = ?, updatedAt = ? WHERE id = ?`,
          data.currentOdometer,
          now,
          data.vehicleId
        );
      }
    });

    const { reminderService } = await import('./reminders');
    reminderService.checkKmBasedReminders().catch(() => undefined);

    return fuelService.getById(id);
  },

  update: async (id: string, data: UpdateFuelEntryDto): Promise<FuelEntry> => {
    const entry = await fuelService.getById(id);
    const vehicle = await vehicleService.getById(entry.vehicleId);

    const newCurrent = data.currentOdometer ?? entry.currentOdometer;
    const newPrevious = data.previousOdometer ?? entry.previousOdometer;
    const newDate = data.refuelDate ? toDate(data.refuelDate) : new Date(entry.refuelDate);

    if (newCurrent <= newPrevious) {
      throw new Error('Güncel kilometre, önceki kilometreden büyük olmalıdır.');
    }

    const newLiters = data.liters !== undefined ? data.liters : entry.liters;
    const newLpgLiters = data.lpgLiters !== undefined ? data.lpgLiters : entry.lpgLiters;
    const newKWh = data.kWh !== undefined ? data.kWh : entry.kWh;
    validateFuelAmounts(vehicle.fuelTypes, newLiters, newLpgLiters, newKWh);

    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE fuel_entries SET
          vehicleId = ?, refuelDate = ?, previousOdometer = ?, currentOdometer = ?,
          distanceKm = ?, liters = ?, lpgLiters = ?, kWh = ?, totalCost = ?,
          note = ?, receiptUrl = ?, season = ?, updatedAt = ?
         WHERE id = ?`,
        data.vehicleId ?? entry.vehicleId,
        newDate.toISOString(),
        newPrevious,
        newCurrent,
        Math.max(0, newCurrent - newPrevious),
        newLiters,
        newLpgLiters,
        newKWh,
        data.totalCost ?? entry.totalCost,
        data.note ?? entry.note ?? null,
        data.receiptUrl ?? entry.receiptUrl ?? null,
        getSeason(newDate),
        nowIso(),
        id
      );
      await recalculateTripDistances(data.vehicleId ?? entry.vehicleId);
    });

    return fuelService.getById(id);
  },

  delete: async (id: string): Promise<void> => {
    const entry = await fuelService.getById(id);
    const db = await getDb();

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM fuel_entries WHERE id = ?`, id);
      const latest = await db.getFirstAsync<{ currentOdometer: number }>(
        `SELECT currentOdometer FROM fuel_entries WHERE vehicleId = ? ORDER BY currentOdometer DESC LIMIT 1`,
        entry.vehicleId
      );
      await db.runAsync(
        `UPDATE vehicles SET currentOdometer = ?, updatedAt = ? WHERE id = ?`,
        latest?.currentOdometer ?? 0,
        nowIso(),
        entry.vehicleId
      );
      await recalculateTripDistances(entry.vehicleId);
    });
  },

  upsertFromRemote: async (entry: any): Promise<void> => {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO fuel_entries
        (id, vehicleId, refuelDate, previousOdometer, currentOdometer, distanceKm,
         liters, lpgLiters, kWh, totalCost, note, receiptUrl, season, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         vehicleId = excluded.vehicleId,
         refuelDate = excluded.refuelDate,
         previousOdometer = excluded.previousOdometer,
         currentOdometer = excluded.currentOdometer,
         distanceKm = excluded.distanceKm,
         liters = excluded.liters,
         lpgLiters = excluded.lpgLiters,
         kWh = excluded.kWh,
         totalCost = excluded.totalCost,
         note = excluded.note,
         receiptUrl = excluded.receiptUrl,
         season = excluded.season,
         updatedAt = excluded.updatedAt,
         deletedAt = excluded.deletedAt`,
      entry.id,
      entry.vehicleId,
      toIso(entry.refuelDate) ?? nowIso(),
      entry.previousOdometer,
      entry.currentOdometer,
      entry.distanceKm ?? Math.max(0, (entry.currentOdometer ?? 0) - (entry.previousOdometer ?? 0)),
      entry.liters ?? 0,
      entry.lpgLiters ?? 0,
      entry.kWh ?? 0,
      entry.totalCost,
      entry.note ?? null,
      entry.receiptUrl ?? null,
      entry.season ?? null,
      toIso(entry.createdAt) ?? nowIso(),
      toIso(entry.updatedAt) ?? nowIso(),
      toIso(entry.deletedAt) ?? null
    );
  },
};
