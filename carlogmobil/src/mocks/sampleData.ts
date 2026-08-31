import { ConsumptionTrendPoint, Reminder, SeasonalConsumptionSummary, Vehicle } from '@/types/domain';

export const sampleVehicles: Vehicle[] = [
  {
    id: 'arac-1',
    plaka: '34 ABC 123',
    marka: 'Toyota',
    model: 'Corolla',
    modelYili: 2021,
    kategori: 'otomobil',
    yakitTuru: 'benzin',
    toplamKm: 48250,
    ortalamaTuketimLt100Km: 6.2,
    sonBakimKm: 45000,
  },
  {
    id: 'arac-2',
    plaka: '06 XYZ 890',
    marka: 'Ford',
    model: 'Transit',
    modelYili: 2019,
    kategori: 'kamyonet',
    yakitTuru: 'dizel',
    toplamKm: 128400,
    ortalamaTuketimLt100Km: 9.8,
  },
  {
    id: 'arac-3',
    plaka: '35 MOTO 35',
    marka: 'Honda',
    model: 'CBR500R',
    modelYili: 2023,
    kategori: 'motor',
    yakitTuru: 'benzin',
    toplamKm: 8200,
    ortalamaTuketimLt100Km: 3.8,
  },
];

export const sampleSeasonalConsumption: SeasonalConsumptionSummary[] = [
  { season: 'kış', ortalamaLt100Km: 7.4, farkYuzde: 6 },
  { season: 'ilkbahar', ortalamaLt100Km: 6.7, farkYuzde: -2 },
  { season: 'yaz', ortalamaLt100Km: 6.1, farkYuzde: -8 },
  { season: 'sonbahar', ortalamaLt100Km: 6.5, farkYuzde: -4 },
];

export const sampleTrend: ConsumptionTrendPoint[] = [
  { tarih: '2025-05-01', lt100Km: 6.4 },
  { tarih: '2025-06-01', lt100Km: 6.2 },
  { tarih: '2025-07-01', lt100Km: 6.0 },
  { tarih: '2025-08-01', lt100Km: 6.5 },
];

export const sampleReminders: Reminder[] = [
  {
    id: 'rem-1',
    aracId: 'arac-1',
    tur: 'sigorta',
    tarih: '2026-01-15',
    tamamlandi: false,
    not: 'Yenileme için teklif alınacak',
  },
  {
    id: 'rem-2',
    aracId: 'arac-2',
    tur: 'muayene',
    tarih: '2025-12-02',
    tamamlandi: false,
  },
  {
    id: 'rem-3',
    aracId: 'arac-3',
    tur: 'kasko',
    tarih: '2026-03-20',
    tamamlandi: true,
  },
];


