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
}

export interface ChartDataPoint {
  label: string;
  totalCost: number;
  totalLiters: number;
  totalLpgLiters: number;
  totalKwh: number;
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
  currentOdometer: number;
  season: string | null;
};

function toDate(value: string): Date {
  return new Date(value);
}

function isElectricOrHybrid(fuelTypes: FuelType[]): boolean {
  return fuelTypes.includes('ELEKTRIK') || fuelTypes.includes('HIBRIT');
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
    `SELECT id, vehicleId, refuelDate, totalCost, liters, lpgLiters, kWh, distanceKm, currentOdometer, season
     FROM fuel_entries
     WHERE ${clauses.join(' AND ')}
     ORDER BY refuelDate ASC, currentOdometer ASC`,
    ...params
  );
}

async function firstEntryId(vehicleId: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM fuel_entries WHERE vehicleId = ? AND deletedAt IS NULL
     ORDER BY refuelDate ASC, currentOdometer ASC LIMIT 1`,
    vehicleId
  );
  return row?.id ?? null;
}

async function excludeFirstEntries(entries: EntryRow[]): Promise<EntryRow[]> {
  const vehicleIds = [...new Set(entries.map((e) => e.vehicleId))];
  const firstIds = new Set<string>();
  for (const id of vehicleIds) {
    const firstId = await firstEntryId(id);
    if (firstId) firstIds.add(firstId);
  }
  return entries.filter((e) => !firstIds.has(e.id));
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
    const electric = isElectricOrHybrid(vehicle.fuelTypes);
    const entries = await getEntries(vehicleId);

    const emptyStats = {
      vehicle,
      stats: {
        totalDistance: 0,
        totalLiters: 0,
        totalLpgLiters: 0,
        totalKwh: 0,
        totalCost: 0,
        averageConsumption: 0,
        costPerKm: 0,
        unit: electric ? 'kWh/100km' : 'L/100km',
      },
    };

    if (entries.length === 0) return emptyStats;

    const forCalc = entries.length > 1 ? entries.slice(1) : [];
    if (forCalc.length === 0) {
      const first = entries[0];
      return {
        vehicle,
        stats: {
          totalDistance: first.distanceKm,
          totalLiters: first.liters || 0,
          totalLpgLiters: first.lpgLiters || 0,
          totalKwh: first.kWh || 0,
          totalCost: first.totalCost,
          averageConsumption: 0,
          costPerKm: first.distanceKm > 0 ? first.totalCost / first.distanceKm : 0,
          unit: electric ? 'kWh/100km' : 'L/100km',
        },
      };
    }

    const aggregates = forCalc.reduce(
      (acc, curr) => ({
        distanceKm: acc.distanceKm + curr.distanceKm,
        liters: acc.liters + (curr.liters || 0),
        lpgLiters: acc.lpgLiters + (curr.lpgLiters || 0),
        kWh: acc.kWh + (curr.kWh || 0),
      }),
      { distanceKm: 0, liters: 0, lpgLiters: 0, kWh: 0 }
    );

    const totalCost = entries.reduce((sum, e) => sum + e.totalCost, 0);
    const totalLiquidFuel = aggregates.liters + aggregates.lpgLiters;
    const averageConsumption =
      aggregates.distanceKm > 0
        ? electric
          ? (aggregates.kWh / aggregates.distanceKm) * 100
          : (totalLiquidFuel / aggregates.distanceKm) * 100
        : 0;

    return {
      vehicle,
      stats: {
        totalDistance: aggregates.distanceKm,
        totalLiters: aggregates.liters,
        totalLpgLiters: aggregates.lpgLiters,
        totalKwh: aggregates.kWh,
        totalCost,
        averageConsumption,
        costPerKm: aggregates.distanceKm > 0 ? totalCost / aggregates.distanceKm : 0,
        unit: electric ? 'kWh/100km' : 'L/100km',
      },
    };
  },

  getMonthlyExpenses: async (year?: number): Promise<MonthlyExpense[]> => {
    const targetYear = year ?? new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear + 1, 0, 1);
    const entries = await getEntries(undefined, startDate, endDate);
    const entriesToInclude = await excludeFirstEntries(entries);

    const monthlyData: MonthlyExpense[] = Array(12)
      .fill(0)
      .map((_, index) => ({
        month: index + 1,
        totalCost: 0,
        totalLiters: 0,
        totalLpgLiters: 0,
        totalKwh: 0,
      }));

    entries.forEach((entry) => {
      monthlyData[toDate(entry.refuelDate).getMonth()].totalCost += entry.totalCost;
    });
    entriesToInclude.forEach((entry) => {
      const month = toDate(entry.refuelDate).getMonth();
      monthlyData[month].totalLiters += entry.liters || 0;
      monthlyData[month].totalLpgLiters += entry.lpgLiters || 0;
      monthlyData[month].totalKwh += entry.kWh || 0;
    });

    return monthlyData;
  },

  getSeasonalStats: async (vehicleId?: string, year?: number): Promise<SeasonalStats[]> => {
    const from = year ? new Date(year, 0, 1) : undefined;
    const to = year ? new Date(year + 1, 0, 1) : undefined;
    const allEntries = (await getEntries(vehicleId, from, to)).filter((e) => e.season);
    const entriesToAggregate = await excludeFirstEntries(allEntries);
    const seasons: SeasonalStats['season'][] = ['KIS', 'ILKBAHAR', 'YAZ', 'SONBAHAR'];

    return seasons.map((season) => {
      const seasonCalc = entriesToAggregate.filter((e) => e.season === season);
      const seasonAll = allEntries.filter((e) => e.season === season);
      return {
        season,
        totalCost: seasonAll.reduce((sum, e) => sum + e.totalCost, 0),
        totalLiters: seasonCalc.reduce((sum, e) => sum + (e.liters || 0), 0),
        totalLpgLiters: seasonCalc.reduce((sum, e) => sum + (e.lpgLiters || 0), 0),
        totalKwh: seasonCalc.reduce((sum, e) => sum + (e.kWh || 0), 0),
        totalDistance: seasonCalc.reduce((sum, e) => sum + e.distanceKm, 0),
        count: seasonCalc.length,
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

    let entries = await getEntries(vehicleId, startDate, now);
    if (entries.length === 0) {
      const all = await getEntries(vehicleId);
      if (all.length > 0) {
        entries = all;
        groupBy = 'month';
        startDate = toDate(all[0].refuelDate);
      }
    }

    const entriesToChart = await excludeFirstEntries(entries);
    const dataMap = new Map<
      string,
      { totalCost: number; totalLiters: number; totalLpgLiters: number; totalKwh: number; date: Date }
    >();

    const keyFor = (date: Date) =>
      groupBy === 'day'
        ? date.toISOString().split('T')[0]
        : `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

    entries.forEach((entry) => {
      const date = toDate(entry.refuelDate);
      const key = keyFor(date);
      if (!dataMap.has(key)) {
        dataMap.set(key, { totalCost: 0, totalLiters: 0, totalLpgLiters: 0, totalKwh: 0, date });
      }
      dataMap.get(key)!.totalCost += entry.totalCost;
    });

    entriesToChart.forEach((entry) => {
      const date = toDate(entry.refuelDate);
      const current = dataMap.get(keyFor(date));
      if (current) {
        current.totalLiters += entry.liters || 0;
        current.totalLpgLiters += entry.lpgLiters || 0;
        current.totalKwh += entry.kWh || 0;
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
        return {
          label,
          totalCost: item.totalCost,
          totalLiters: item.totalLiters,
          totalLpgLiters: item.totalLpgLiters,
          totalKwh: item.totalKwh,
          date: item.date.toISOString(),
        };
      });
  },

  getDetailedAnalysis: async (vehicleId: string): Promise<DetailedAnalysis | null> => {
    const vehicle = await vehicleService.getById(vehicleId);
    const electric = isElectricOrHybrid(vehicle.fuelTypes);
    const entries = await getEntries(vehicleId);
    if (entries.length < 2) return null;

    const entriesForCalculation = entries.slice(1);
    const consumptions = entriesForCalculation
      .filter((e) => {
        const liquid = (e.liters || 0) + (e.lpgLiters || 0);
        return e.distanceKm > 0 && (electric ? e.kWh > 0 : liquid > 0);
      })
      .map((e) => {
        const liquid = (e.liters || 0) + (e.lpgLiters || 0);
        return {
          consumption: electric ? (e.kWh / e.distanceKm) * 100 : (liquid / e.distanceKm) * 100,
          date: e.refuelDate,
        };
      })
      .sort((a, b) => a.consumption - b.consumption);

    const best = consumptions[0] ?? null;
    const worst = consumptions.length > 0 ? consumptions[consumptions.length - 1] : null;

    const firstDate = toDate(entries[1].refuelDate);
    const lastDate = toDate(entries[entries.length - 1].refuelDate);
    const totalDays = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalDistance = entriesForCalculation.reduce((sum, e) => sum + e.distanceKm, 0);

    const prices = entriesForCalculation
      .filter((e) => {
        const liquid = (e.liters || 0) + (e.lpgLiters || 0);
        return electric ? e.kWh > 0 : liquid > 0;
      })
      .map((e) => {
        const liquid = (e.liters || 0) + (e.lpgLiters || 0);
        return electric ? e.totalCost / e.kWh : e.totalCost / liquid;
      });

    const averageUnitPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;
    const totalCost = entries.reduce((sum, e) => sum + e.totalCost, 0);
    const predictedYearlyCost = (totalCost / totalDays) * 365;

    return {
      consumption: {
        best: best ? { value: Number(best.consumption.toFixed(2)), date: best.date } : null,
        worst: worst ? { value: Number(worst.consumption.toFixed(2)), date: worst.date } : null,
      },
      drivingHabits: {
        averageDailyKm: Math.round(totalDistance / totalDays),
        averageDaysBetweenRefuel:
          entriesForCalculation.length > 1
            ? Math.round(totalDays / (entriesForCalculation.length - 1))
            : 0,
        totalDaysAnalyzed: totalDays,
      },
      fuelPrices: {
        averagePrice: Number(averageUnitPrice.toFixed(2)),
        lastPrice: prices.length > 0 ? Number(prices[prices.length - 1].toFixed(2)) : 0,
        unit: electric ? '₺/kWh' : '₺/L',
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
