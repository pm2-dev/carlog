import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'carlog.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY NOT NULL,
  plate TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  modelYear INTEGER,
  category TEXT NOT NULL,
  fuelTypes TEXT NOT NULL,
  currentOdometer INTEGER NOT NULL DEFAULT 0,
  photoUrl TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT
);

CREATE TABLE IF NOT EXISTS fuel_entries (
  id TEXT PRIMARY KEY NOT NULL,
  vehicleId TEXT NOT NULL,
  refuelDate TEXT NOT NULL,
  previousOdometer INTEGER NOT NULL,
  currentOdometer INTEGER NOT NULL,
  distanceKm INTEGER NOT NULL,
  liters REAL NOT NULL DEFAULT 0,
  lpgLiters REAL NOT NULL DEFAULT 0,
  kWh REAL NOT NULL DEFAULT 0,
  totalCost REAL NOT NULL,
  note TEXT,
  receiptUrl TEXT,
  season TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,
  FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL,
  vehicleId TEXT NOT NULL,
  type TEXT NOT NULL,
  dueDate TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  note TEXT,
  cost REAL,
  odometerAtService INTEGER,
  serviceProvider TEXT,
  isKmBased INTEGER NOT NULL DEFAULT 0,
  kmInterval INTEGER,
  lastTriggeredKm INTEGER,
  completedAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  payload TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  sentAt TEXT NOT NULL,
  error TEXT,
  isRead INTEGER NOT NULL DEFAULT 0,
  readAt TEXT
);

CREATE INDEX IF NOT EXISTS idx_fuel_entries_vehicle ON fuel_entries(vehicleId);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_date ON fuel_entries(refuelDate);
CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON reminders(vehicleId);
CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(sentAt);
`;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync(SCHEMA_SQL);
  await normalizeFuelTripDistances(db);
  return db;
}

async function normalizeFuelTripDistances(db: SQLite.SQLiteDatabase): Promise<void> {
  const vehicles = await db.getAllAsync<{ vehicleId: string }>(
    `SELECT DISTINCT vehicleId FROM fuel_entries WHERE deletedAt IS NULL`
  );
  for (const { vehicleId } of vehicles) {
    const rows = await db.getAllAsync<{ id: string; currentOdometer: number }>(
      `SELECT id, currentOdometer FROM fuel_entries
       WHERE vehicleId = ? AND deletedAt IS NULL
       ORDER BY currentOdometer ASC, refuelDate ASC, id ASC`,
      vehicleId
    );
    for (let i = 0; i < rows.length; i++) {
      const tripKm = i === 0 ? 0 : Math.max(0, rows[i].currentOdometer - rows[i - 1].currentOdometer);
      await db.runAsync(`UPDATE fuel_entries SET distanceKm = ? WHERE id = ?`, tripKm, rows[i].id);
    }
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  await getDb();
}

export async function wipeAllLocalData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM fuel_entries;
    DELETE FROM reminders;
    DELETE FROM notifications;
    DELETE FROM vehicles;
    DELETE FROM settings;
  `);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseJsonArray<T>(value: string | null | undefined, fallback: T[] = []): T[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function toIso(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}
