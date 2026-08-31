import { getDb, nowIso, parseJsonArray, toIso } from '@/db/database';
import { createId } from '@/db/uuid';
import type { Vehicle, VehicleCategory, FuelType } from '@/types/domain';

export interface CreateVehicleDto {
  plate: string;
  brand: string;
  model: string;
  modelYear?: number;
  category: VehicleCategory;
  fuelTypes: FuelType[];
  currentOdometer?: number;
  photoUrl?: string;
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {}

type VehicleRow = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  modelYear: number | null;
  category: string;
  fuelTypes: string;
  currentOdometer: number;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    plate: row.plate,
    brand: row.brand,
    model: row.model,
    modelYear: row.modelYear ?? undefined,
    category: row.category as VehicleCategory,
    fuelTypes: parseJsonArray<FuelType>(row.fuelTypes),
    currentOdometer: row.currentOdometer,
    photoUrl: row.photoUrl ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const vehicleService = {
  getAll: async (): Promise<Vehicle[]> => {
    const db = await getDb();
    const rows = await db.getAllAsync<VehicleRow>(
      `SELECT * FROM vehicles WHERE deletedAt IS NULL ORDER BY createdAt DESC`
    );
    return rows.map(mapVehicle);
  },

  getById: async (id: string): Promise<Vehicle> => {
    const db = await getDb();
    const row = await db.getFirstAsync<VehicleRow>(
      `SELECT * FROM vehicles WHERE id = ? AND deletedAt IS NULL`,
      id
    );
    if (!row) {
      throw new Error('Araç bulunamadı');
    }
    return mapVehicle(row);
  },

  create: async (data: CreateVehicleDto): Promise<Vehicle> => {
    const db = await getDb();
    const now = nowIso();
    const id = createId();
    await db.runAsync(
      `INSERT INTO vehicles (id, plate, brand, model, modelYear, category, fuelTypes, currentOdometer, photoUrl, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.plate,
      data.brand,
      data.model,
      data.modelYear ?? null,
      data.category,
      JSON.stringify(data.fuelTypes ?? []),
      data.currentOdometer ?? 0,
      data.photoUrl ?? null,
      now,
      now
    );
    return vehicleService.getById(id);
  },

  update: async (id: string, data: UpdateVehicleDto): Promise<Vehicle> => {
    const existing = await vehicleService.getById(id);
    const db = await getDb();
    const now = nowIso();
    await db.runAsync(
      `UPDATE vehicles SET
        plate = ?, brand = ?, model = ?, modelYear = ?, category = ?,
        fuelTypes = ?, currentOdometer = ?, photoUrl = ?, updatedAt = ?
       WHERE id = ?`,
      data.plate ?? existing.plate,
      data.brand ?? existing.brand,
      data.model ?? existing.model,
      data.modelYear ?? existing.modelYear ?? null,
      data.category ?? existing.category,
      JSON.stringify(data.fuelTypes ?? existing.fuelTypes),
      data.currentOdometer ?? existing.currentOdometer,
      data.photoUrl ?? existing.photoUrl ?? null,
      now,
      id
    );
    return vehicleService.getById(id);
  },

  delete: async (id: string): Promise<void> => {
    await vehicleService.getById(id);
    const db = await getDb();
    await db.runAsync(`DELETE FROM vehicles WHERE id = ?`, id);
  },

  upsertFromRemote: async (vehicle: any): Promise<void> => {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO vehicles
        (id, plate, brand, model, modelYear, category, fuelTypes, currentOdometer, photoUrl, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         plate = excluded.plate,
         brand = excluded.brand,
         model = excluded.model,
         modelYear = excluded.modelYear,
         category = excluded.category,
         fuelTypes = excluded.fuelTypes,
         currentOdometer = excluded.currentOdometer,
         photoUrl = excluded.photoUrl,
         updatedAt = excluded.updatedAt,
         deletedAt = excluded.deletedAt`,
      vehicle.id,
      vehicle.plate,
      vehicle.brand,
      vehicle.model,
      vehicle.modelYear ?? null,
      vehicle.category,
      JSON.stringify(Array.isArray(vehicle.fuelTypes) ? vehicle.fuelTypes : vehicle.fuelTypes ? [vehicle.fuelTypes] : []),
      vehicle.currentOdometer ?? 0,
      vehicle.photoUrl ?? null,
      toIso(vehicle.createdAt) ?? nowIso(),
      toIso(vehicle.updatedAt) ?? nowIso(),
      toIso(vehicle.deletedAt) ?? null
    );
  },
};
