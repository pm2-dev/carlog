import { getDb } from '@/db/database';
import type { Vehicle, FuelType, ReminderType } from '@/types/domain';
import { vehicleService } from './vehicles';
import { fuelService } from './fuel';
import { reminderService } from './reminders';

export interface DashboardSummary {
  summary: {
    totalVehicles: number;
    monthlyExpense: number;
    monthlyLiters: number;
    monthlyLpgLiters: number;
    monthlyKwh: number;
    totalExpense: number;
  };
  recentActivities: any[];
}

export interface VehicleStats {
  vehicle: Vehicle;
  stats: {
    totalDistance: number;
    currentOdometer: number;
    totalLiters: number;
    totalLpgLiters: number;
    totalKwh: number;
    totalCost: number;
    averageConsumption: number;
    costPerKm: number;
    unit: string;
  };
}

export interface MonthlyExpense {
  month: number;
  totalCost: number;
  totalLiters: number;
  totalLpgLiters: number;
  totalKwh: number;
}

export interface SeasonalStats {
  season: 'KIS' | 'ILKBAHAR' | 'YAZ' | 'SONBAHAR';
  totalCost: number;
  totalLiters: number;
  totalLpgLiters: number;
  totalKwh: number;
  totalDistance: number;
  count: number;
  averageConsumption: number;
  unit: string;
}

export interface ChartDataPoint {
  label: string;
  totalCost: number;
  totalLiters: number;
  totalLpgLiters: number;
  totalKwh: number;
  totalDistance: number;
  consumption: number;
  unit: string;
  date: string;
}

export type ChartPeriod = '1m' | '3m' | '6m' | '1y';

export interface DetailedAnalysis {
  consumption: {
    best: { value: number; date: string } | null;
    worst: { value: number; date: string } | null;
  };
  drivingHabits: {
    averageDailyKm: number;
    averageDaysBetweenRefuel: number;
    totalDaysAnalyzed: number;
  };
  fuelPrices: {
    averagePrice: number;
    lastPrice: number;
    unit: string;
  };
  projection: {
    predictedYearlyCost: number;
    predictedMonthlyCost: number;
  };
}

export interface MaintenanceCostReport {
  records: any[];
  byType: Record<string, { totalCost: number; count: number }>;
  summary: {
    totalCost: number;
    count: number;
    averageCost: number;
  };
}

export interface TotalCostOfOwnership {
  vehicle: {
    id: string;
    plate: string;
    brand: string;
    model: string;
  };
  breakdown: {
    fuel: number;
    maintenance: number;
    insurance: number;
    inspection: number;
    tax: number;
    other: number;
  };
  total: number;
  estimatedMonthlyCost: number;
  estimatedYearlyCost: number;
}

type EntryRow = {
  id: string;
  vehicleId: string;
  refuelDate: string;
  totalCost: number;
  liters: number;
  lpgLiters: number;
  kWh: number;
  distanceKm: number;
  previousOdometer: number;
  currentOdometer: number;
  season: string | null;
};

type TripEntry = EntryRow & { tripKm: number; isBaseline: boolean };

function toDate(value: string): Date {
  return new Date(value);
}

function liquidFuel(entry: Pick<EntryRow, 'liters' | 'lpgLiters'>): number {
  return (entry.liters || 0) + (entry.lpgLiters || 0);
}

function energyKwh(entry: Pick<EntryRow, 'kWh'>): number {
  return entry.kWh || 0;
}

function consumptionAmount(entry: Pick<EntryRow, 'liters' | 'lpgLiters' | 'kWh'>): { amount: number; electric: boolean } {
  const liquid = liquidFuel(entry);
  const kwh = energyKwh(entry);
  if (liquid > 0) return { amount: liquid, electric: false };
  if (kwh > 0) return { amount: kwh, electric: true };
  return { amount: 0, electric: false };
}

function sortEntries(entries: EntryRow[]): EntryRow[] {
  return [...entries].sort((a, b) => {
    const odo = (a.currentOdometer || 0) - (b.currentOdometer || 0);
    if (odo !== 0) return odo;
    const dateDiff = toDate(a.refuelDate).getTime() - toDate(b.refuelDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.id.localeCompare(b.id);
  });
}

function withTripDistances(entries: EntryRow[]): TripEntry[] {
  const sorted = sortEntries(entries);
  return sorted.map((entry, index) => {
    const prev = index > 0 ? sorted[index - 1] : null;
    const tripKm = prev
      ? Math.max(0, entry.currentOdometer - prev.currentOdometer)
      : 0;
    return { ...entry, tripKm, isBaseline: index === 0 };
  });
}

function trackedDistance(trips: TripEntry[]): number {
  return trips.reduce((sum, e) => sum + e.tripKm, 0);
}

function withTripDistancesByVehicle(entries: EntryRow[]): TripEntry[] {
  const grouped = new Map<string, EntryRow[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.vehicleId) ?? [];
    list.push(entry);
    grouped.set(entry.vehicleId, list);
  }
  return [...grouped.values()].flatMap((group) => withTripDistances(group));
}

function tripFills(trips: TripEntry[]): TripEntry[] {
  return trips.filter((e) => !e.isBaseline);
}

function defaultUnit(fuelTypes: FuelType[]): { electric: boolean; unit: string } {
  const hasLiquid = fuelTypes.some((t) => t === 'BENZIN' || t === 'DIZEL' || t === 'LPG' || t === 'HIBRIT');
  if (fuelTypes.includes('ELEKTRIK') && !hasLiquid) {
    return { electric: true, unit: 'kWh/100km' };
  }
  return { electric: false, unit: 'L/100km' };
}

function metricFromFills(fills: TripEntry[], fallback: FuelType[] = []): { amount: number; electric: boolean; unit: string } {
  const liquid = fills.reduce((sum, e) => sum + liquidFuel(e), 0);
  const kwh = fills.reduce((sum, e) => sum + energyKwh(e), 0);
  if (liquid > 0) return { amount: liquid, electric: false, unit: 'L/100km' };
  if (kwh > 0) return { amount: kwh, electric: true, unit: 'kWh/100km' };
  return { amount: 0, ...defaultUnit(fallback) };
}

function consumptionPer100km(amount: number, distanceKm: number): number {
  return distanceKm > 0 && amount > 0 ? (amount / distanceKm) * 100 : 0;
}

async function getEntries(vehicleId?: string, from?: Date, to?: Date): Promise<EntryRow[]> {
  const db = await getDb();
  const clauses = ['deletedAt IS NULL'];
  const params: (string | number)[] = [];
  if (vehicleId) {
    clauses.push('vehicleId = ?');
    params.push(vehicleId);
  }
  if (from) {
    clauses.push('refuelDate >= ?');
    params.push(from.toISOString());
  }
  if (to) {
    clauses.push('refuelDate < ?');
    params.push(to.toISOString());
  }
  return db.getAllAsync<EntryRow>(
    `SELECT id, vehicleId, refuelDate, totalCost, liters, lpgLiters, kWh, distanceKm,
            previousOdometer, currentOdometer, season
     FROM fuel_entries
     WHERE ${clauses.join(' AND ')}
     ORDER BY currentOdometer ASC, refuelDate ASC`,
    ...params
  );
}

async function getTrips(vehicleId?: string, from?: Date, to?: Date): Promise<TripEntry[]> {
  const all = await getEntries(vehicleId);
  const trips = withTripDistancesByVehicle(all);
  return trips.filter((entry) => {
    const date = toDate(entry.refuelDate);
    if (from && date < from) return false;
    if (to && date >= to) return false;
    return true;
  });
}

export const reportService = {
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const vehicles = await vehicleService.getAll();
    const entries = await fuelService.getAll();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const monthly = entries.filter((e) => e.refuelDate >= startOfMonth);
    const monthlyExpense = monthly.reduce((s, e) => s + e.totalCost, 0);
    const monthlyLiters = monthly.reduce((s, e) => s + (e.liters || 0), 0);
    const monthlyLpgLiters = monthly.reduce((s, e) => s + (e.lpgLiters || 0), 0);
    const monthlyKwh = monthly.reduce((s, e) => s + (e.kWh || 0), 0);
    const totalExpense = entries.reduce((s, e) => s + e.totalCost, 0);

    const recentActivities = [...entries]
      .sort((a, b) => new Date(b.refuelDate).getTime() - new Date(a.refuelDate).getTime())
      .slice(0, 5);

    return {
      summary: {
        totalVehicles: vehicles.length,
        monthlyExpense,
        monthlyLiters,
        monthlyLpgLiters,
        monthlyKwh,
        totalExpense,
      },
      recentActivities,
    };
  },

  getVehicleStats: async (vehicleId: string): Promise<VehicleStats> => {
    const vehicle = await vehicleService.getById(vehicleId);
    const fallback = defaultUnit(vehicle.fuelTypes);
    const trips = await getTrips(vehicleId);
    const fills = tripFills(trips);
    const distanceKm = trackedDistance(trips);
    const metric = metricFromFills(fills, vehicle.fuelTypes);
    const tripCost = fills.reduce((sum, e) => sum + e.totalCost, 0);
    const totalCost = trips.reduce((sum, e) => sum + e.totalCost, 0);
    const lastOdometer =
      trips.length > 0
        ? trips.reduce((max, e) => Math.max(max, e.currentOdometer || 0), 0)
        : vehicle.currentOdometer || 0;

    return {
      vehicle,
      stats: {
        totalDistance: distanceKm,
        currentOdometer: lastOdometer,
        totalLiters: fills.reduce((sum, e) => sum + (e.liters || 0), 0),
        totalLpgLiters: fills.reduce((sum, e) => sum + (e.lpgLiters || 0), 0),
        totalKwh: fills.reduce((sum, e) => sum + (e.kWh || 0), 0),
        totalCost,
        averageConsumption: consumptionPer100km(metric.amount, distanceKm),
        costPerKm: distanceKm > 0 ? tripCost / distanceKm : 0,
        unit: metric.amount > 0 ? metric.unit : fallback.unit,
      },
    };
  },

  getMonthlyExpenses: async (year?: number): Promise<MonthlyExpense[]> => {
    const targetYear = year ?? new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear + 1, 0, 1);
    const trips = await getTrips(undefined, startDate, endDate);

    const monthlyData: MonthlyExpense[] = Array(12)
      .fill(0)
      .map((_, index) => ({
        month: index + 1,
        totalCost: 0,
        totalLiters: 0,
        totalLpgLiters: 0,
        totalKwh: 0,
      }));

    trips.forEach((entry) => {
      const month = toDate(entry.refuelDate).getMonth();
      monthlyData[month].totalCost += entry.totalCost;
      if (entry.isBaseline) return;
      monthlyData[month].totalLiters += entry.liters || 0;
      monthlyData[month].totalLpgLiters += entry.lpgLiters || 0;
      monthlyData[month].totalKwh += entry.kWh || 0;
    });

    return monthlyData;
  },

  getSeasonalStats: async (vehicleId?: string, year?: number): Promise<SeasonalStats[]> => {
    const from = year ? new Date(year, 0, 1) : undefined;
    const to = year ? new Date(year + 1, 0, 1) : undefined;
    const trips = (await getTrips(vehicleId, from, to)).filter((e) => e.season);
    const seasons: SeasonalStats['season'][] = ['KIS', 'ILKBAHAR', 'YAZ', 'SONBAHAR'];
    const fallbackTypes = vehicleId ? (await vehicleService.getById(vehicleId)).fuelTypes : [];

    return seasons.map((season) => {
      const seasonAll = trips.filter((e) => e.season === season);
      const seasonFills = tripFills(seasonAll);
      const distanceKm = trackedDistance(seasonAll);
      const metric = metricFromFills(seasonFills, fallbackTypes);
      return {
        season,
        totalCost: seasonAll.reduce((sum, e) => sum + e.totalCost, 0),
        totalLiters: seasonFills.reduce((sum, e) => sum + (e.liters || 0), 0),
        totalLpgLiters: seasonFills.reduce((sum, e) => sum + (e.lpgLiters || 0), 0),
        totalKwh: seasonFills.reduce((sum, e) => sum + (e.kWh || 0), 0),
        totalDistance: distanceKm,
        count: seasonFills.length,
        averageConsumption: consumptionPer100km(metric.amount, distanceKm),
        unit: metric.unit,
      };
    });
  },

  getConsumptionChart: async (period: ChartPeriod, vehicleId?: string): Promise<ChartDataPoint[]> => {
    const now = new Date();
    let startDate = new Date();
    let groupBy: 'day' | 'month' = 'month';

    switch (period) {
      case '1m':
        startDate.setMonth(now.getMonth() - 1);
        groupBy = 'day';
        break;
      case '3m':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    let trips = await getTrips(vehicleId, startDate, now);
    if (trips.length === 0) {
      const all = await getTrips(vehicleId);
      if (all.length > 0) {
        trips = all;
        groupBy = 'month';
        startDate = toDate(all[0].refuelDate);
      }
    }

    const fallbackTypes = vehicleId ? (await vehicleService.getById(vehicleId)).fuelTypes : [];
    const dataMap = new Map<
      string,
      {
        totalCost: number;
        totalLiters: number;
        totalLpgLiters: number;
        totalKwh: number;
        totalDistance: number;
        date: Date;
        fills: TripEntry[];
      }
    >();

    const keyFor = (date: Date) =>
      groupBy === 'day'
        ? date.toISOString().split('T')[0]
        : `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

    trips.forEach((entry) => {
      const date = toDate(entry.refuelDate);
      const key = keyFor(date);
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          totalCost: 0,
          totalLiters: 0,
          totalLpgLiters: 0,
          totalKwh: 0,
          totalDistance: 0,
          date,
          fills: [],
        });
      }
      const current = dataMap.get(key)!;
      current.totalCost += entry.totalCost;
      current.totalDistance += entry.tripKm;
      if (!entry.isBaseline) {
        current.totalLiters += entry.liters || 0;
        current.totalLpgLiters += entry.lpgLiters || 0;
        current.totalKwh += entry.kWh || 0;
        current.fills.push(entry);
      }
    });

    return Array.from(dataMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => {
        const date = new Date(item.date);
        const label =
          groupBy === 'day'
            ? `${date.getDate()} ${date.toLocaleDateString('tr-TR', { month: 'short' })}`
            : date.toLocaleDateString('tr-TR', { month: 'long' });
        const metric = metricFromFills(item.fills, fallbackTypes);
        return {
          label,
          totalCost: item.totalCost,
          totalLiters: item.totalLiters,
          totalLpgLiters: item.totalLpgLiters,
          totalKwh: item.totalKwh,
          totalDistance: item.totalDistance,
          consumption: consumptionPer100km(metric.amount, item.totalDistance),
          unit: metric.unit,
          date: item.date.toISOString(),
        };
      });
  },

  getDetailedAnalysis: async (vehicleId: string): Promise<DetailedAnalysis | null> => {
    const trips = await getTrips(vehicleId);
    if (trips.length < 2) return null;

    const fills = tripFills(trips);
    const consumptions = fills
      .map((e) => {
        const metric = consumptionAmount(e);
        if (e.tripKm <= 0 || metric.amount <= 0) return null;
        return {
          consumption: consumptionPer100km(metric.amount, e.tripKm),
          date: e.refuelDate,
          electric: metric.electric,
        };
      })
      .filter((item): item is { consumption: number; date: string; electric: boolean } => item != null)
      .sort((a, b) => a.consumption - b.consumption);

    const best = consumptions[0] ?? null;
    const worst = consumptions.length > 0 ? consumptions[consumptions.length - 1] : null;

    const dates = trips.map((e) => toDate(e.refuelDate).getTime());
    const firstDate = new Date(Math.min(...dates));
    const lastDate = new Date(Math.max(...dates));
    const totalDays = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
    const distanceKm = trackedDistance(trips);

    const prices = fills
      .map((e) => {
        const metric = consumptionAmount(e);
        if (metric.amount <= 0) return null;
        return { price: e.totalCost / metric.amount, electric: metric.electric };
      })
      .filter((item): item is { price: number; electric: boolean } => item != null);

    const electricPrices = prices.filter((p) => p.electric);
    const liquidPrices = prices.filter((p) => !p.electric);
    const priceSet = liquidPrices.length > 0 ? liquidPrices : electricPrices;
    const averageUnitPrice = priceSet.length > 0 ? priceSet.reduce((s, p) => s + p.price, 0) / priceSet.length : 0;
    const totalCost = trips.reduce((sum, e) => sum + e.totalCost, 0);
    const predictedYearlyCost = (totalCost / totalDays) * 365;

    return {
      consumption: {
        best: best ? { value: Number(best.consumption.toFixed(2)), date: best.date } : null,
        worst: worst ? { value: Number(worst.consumption.toFixed(2)), date: worst.date } : null,
      },
      drivingHabits: {
        averageDailyKm: Math.round(distanceKm / totalDays),
        averageDaysBetweenRefuel: trips.length > 1 ? Math.round(totalDays / (trips.length - 1)) : 0,
        totalDaysAnalyzed: totalDays,
      },
      fuelPrices: {
        averagePrice: Number(averageUnitPrice.toFixed(2)),
        lastPrice: priceSet.length > 0 ? Number(priceSet[priceSet.length - 1].price.toFixed(2)) : 0,
        unit: liquidPrices.length > 0 ? '₺/L' : '₺/kWh',
      },
      projection: {
        predictedYearlyCost: Math.round(predictedYearlyCost),
        predictedMonthlyCost: Math.round(predictedYearlyCost / 12),
      },
    };
  },

  getMaintenanceCosts: async (vehicleId?: string): Promise<MaintenanceCostReport> => {
    const reminders = await reminderService.getAll(vehicleId);
    const completed = reminders.filter((r) => r.status === 'COMPLETED' && r.cost != null);
    const allTypes: ReminderType[] = ['BAKIM', 'SIGORTA', 'KASKO', 'MUAYENE', 'VERGI', 'DIGER'];
    const byType: Record<string, { totalCost: number; count: number }> = {};
    for (const t of allTypes) {
      byType[t] = { totalCost: 0, count: 0 };
    }
    for (const r of completed) {
      if (r.cost && byType[r.type]) {
        byType[r.type].totalCost += r.cost;
        byType[r.type].count += 1;
      }
    }
    const totalCost = completed.reduce((sum, r) => sum + (r.cost || 0), 0);
    return {
      records: completed,
      byType,
      summary: {
        totalCost,
        count: completed.length,
        averageCost: completed.length > 0 ? totalCost / completed.length : 0,
      },
    };
  },

  getTotalCostOfOwnership: async (vehicleId: string): Promise<TotalCostOfOwnership | null> => {
    const vehicle = await vehicleService.getById(vehicleId);
    const fuelEntries = await getEntries(vehicleId);
    const totalFuelCost = fuelEntries.reduce((sum, e) => sum + e.totalCost, 0);
    const completed = (await reminderService.getAll(vehicleId)).filter(
      (r) => r.status === 'COMPLETED' && r.cost != null
    );

    const sumType = (types: ReminderType[]) =>
      completed.filter((r) => types.includes(r.type)).reduce((sum, r) => sum + (r.cost || 0), 0);

    const maintenanceCost = sumType(['BAKIM']);
    const insuranceCost = sumType(['SIGORTA', 'KASKO']);
    const inspectionCost = sumType(['MUAYENE']);
    const taxCost = sumType(['VERGI']);
    const otherCost = sumType(['DIGER']);
    const totalCost = totalFuelCost + completed.reduce((sum, r) => sum + (r.cost || 0), 0);

    const allDates = [
      ...fuelEntries.map((e) => toDate(e.refuelDate)),
      ...completed.filter((r) => r.completedAt).map((r) => toDate(r.completedAt!)),
    ];

    let monthlyCost = 0;
    if (allDates.length >= 2) {
      const earliest = Math.min(...allDates.map((d) => d.getTime()));
      const latest = Math.max(...allDates.map((d) => d.getTime()));
      const totalMonths = Math.max(1, (latest - earliest) / (1000 * 60 * 60 * 24 * 30));
      monthlyCost = totalCost / totalMonths;
    }

    return {
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
      },
      breakdown: {
        fuel: totalFuelCost,
        maintenance: maintenanceCost,
        insurance: insuranceCost,
        inspection: inspectionCost,
        tax: taxCost,
        other: otherCost,
      },
      total: totalCost,
      estimatedMonthlyCost: Math.round(monthlyCost),
      estimatedYearlyCost: Math.round(monthlyCost * 12),
    };
  },
};
