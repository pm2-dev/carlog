export type VehicleCategory = 'OTOMOBIL' | 'MOTOSIKLET' | 'KAMYONET' | 'AGIR_VASITA' | 'DIGER';

export type FuelType = 'BENZIN' | 'DIZEL' | 'LPG' | 'HIBRIT' | 'ELEKTRIK';

export type ReminderType = 'SIGORTA' | 'KASKO' | 'MUAYENE' | 'VERGI' | 'BAKIM' | 'DIGER';

export type ReminderStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE';

export type NotificationType =
  | 'REMINDER_DUE'          // Yaklaşan hatırlatma (7,3,1,0 gün kala)
  | 'REMINDER_OVERDUE'      // Geçmiş hatırlatma
  | 'FUEL_PRICE_ALERT'      // Yakıt fiyat değişikliği
  | 'CHARGING_PRICE_UPDATE' // Şarj istasyonu fiyat güncellesi
  | 'SYSTEM';               // Sistem bildirimleri

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  modelYear?: number;
  category: VehicleCategory;
  fuelTypes: FuelType[];
  currentOdometer: number;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelEntry {
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
  note?: string;
  receiptUrl?: string;
  vehicle?: Vehicle; // Include ile gelirse
  createdAt?: string; // Kayıt oluşturulma zamanı
  updatedAt?: string; // Kayıt güncellenme zamanı
}

export interface Reminder {
  id: string;
  vehicleId: string;
  type: ReminderType;
  dueDate?: string;
  status: ReminderStatus;
  note?: string;
  cost?: number;
  odometerAtService?: number;
  serviceProvider?: string;
  isKmBased: boolean;
  kmInterval?: number;
  lastTriggeredKm?: number;
  completedAt?: string;
  vehicle?: Vehicle & { currentOdometer?: number };
}

export interface SeasonalConsumptionSummary {
  season: 'KIS' | 'ILKBAHAR' | 'YAZ' | 'SONBAHAR';
  ortalamaLt100Km: number;
  farkYuzde: number;
}

export interface NotificationLog {
  id: string;
  userId: string;
  type: NotificationType;
  payload: any;
  status: string;
  sentAt: string;
  error?: string;
  isRead: boolean;
  readAt: string | null;
}