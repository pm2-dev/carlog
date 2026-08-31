import axios, { AxiosError } from 'axios';
import { OverpassResponse, Station, OverpassElement } from '@/types/station';

// Birden fazla Overpass API endpoint'i (yedek sunucular)
const OVERPASS_API_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const REQUEST_TIMEOUT = 30000; // 30 saniye
const MAX_RETRIES = 2;

// İki nokta arası mesafe hesaplama (Haversine formülü)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Dünya yarıçapı metre cinsinden
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Metre cinsinden mesafe
}

// Overpass element'i Station'a dönüştürme
function convertToStation(
  element: OverpassElement,
  userLat: number,
  userLon: number
): Station {
  const distance = calculateDistance(userLat, userLon, element.lat, element.lon);

  const amenity = element.tags?.amenity || '';
  const type = amenity === 'charging_station' ? 'charging' : 'fuel';

  const name = element.tags?.name || element.tags?.brand || element.tags?.operator || 'İsimsiz İstasyon';

  let address = '';
  if (element.tags?.['addr:street'] && element.tags?.['addr:housenumber']) {
    address = `${element.tags['addr:street']} No:${element.tags['addr:housenumber']}`;
    if (element.tags?.['addr:city']) {
      address += `, ${element.tags['addr:city']}`;
    }
  }

  return {
    id: element.id,
    type,
    name,
    brand: element.tags?.brand,
    operator: element.tags?.operator,
    address: address || undefined,
    distance,
    lat: element.lat,
    lon: element.lon,
    amenity,
  };
}

// Tek bir API endpoint'ine istek gönder
async function fetchFromEndpoint(
  url: string,
  query: string
): Promise<OverpassResponse> {
  const response = await axios.post<OverpassResponse>(url, query, {
    headers: {
      'Content-Type': 'text/plain',
    },
    timeout: REQUEST_TIMEOUT,
  });
  return response.data;
}

// Retry mekanizması ile istasyon verilerini çek
async function fetchWithRetry(query: string): Promise<OverpassResponse> {
  let lastError: Error | null = null;

  // Her endpoint'i dene
  for (const apiUrl of OVERPASS_API_URLS) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`📍 Overpass API deneniyor: ${apiUrl} (deneme ${attempt + 1})`);
        const data = await fetchFromEndpoint(apiUrl, query);
        console.log(`✅ Overpass API başarılı: ${apiUrl}`);
        return data;
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        
        console.warn(`⚠️ Overpass API hatası (${apiUrl}): ${status || axiosError.message}`);
        lastError = error as Error;

        // 429 (rate limit) veya 5xx hatalarında bir sonraki endpoint'e geç
        if (status === 429 || (status && status >= 500)) {
          break; // Bu endpoint'i atla, sonrakine geç
        }
        
        // Diğer hatalarda retry yap
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        }
      }
    }
  }

  throw lastError || new Error('Tüm Overpass API endpoint\'leri başarısız oldu');
}

export async function fetchNearbyStations(
  latitude: number,
  longitude: number,
  radius: number = 10000 // 10km (global kullanım için artırıldı)
): Promise<Station[]> {
  // Overpass QL sorgusu - benzin istasyonları ve şarj istasyonları
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="fuel"](around:${radius},${latitude},${longitude});
      way["amenity"="fuel"](around:${radius},${latitude},${longitude});
      node["amenity"="charging_station"](around:${radius},${latitude},${longitude});
      way["amenity"="charging_station"](around:${radius},${latitude},${longitude});
    );
    out center;
  `;

  try {
    const data = await fetchWithRetry(query);

    const stations = data.elements
      .map((element) => {
        // Way tipindeki elementler için center koordinatlarını kullan
        if (element.type === 'way' && 'center' in element) {
          const elementWithCenter = element as typeof element & { center: { lat: number; lon: number } };
          return convertToStation(
            { ...element, lat: elementWithCenter.center.lat, lon: elementWithCenter.center.lon },
            latitude,
            longitude
          );
        }
        return convertToStation(element, latitude, longitude);
      })
      .filter((station) => station.name !== 'İsimsiz İstasyon') // İsimsiz istasyonları kaldır
      .sort((a, b) => a.distance - b.distance); // Mesafeye göre sırala

    return stations;
  } catch (error) {
    console.error('İstasyonlar getirilirken hata:', error);
    throw new Error('İstasyonlar yüklenemedi');
  }
}

