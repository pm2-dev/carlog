import { ChargingOperator, ChargingTariff } from '@/api/chargingPrices';

export interface ChargingPriceInfo {
  found: boolean;
  name?: string;
  tariffs?: ChargingTariff;
  website?: string;
}

/**
 * OSM'den gelen istasyon ismi ve operatör bilgisine göre
 * şarj istasyonu fiyatını bulan fonksiyon
 * @param pricesData - Güncel fiyat verisi (API'den çekilen)
 */
export function getChargingStationPrice(
  pricesData: ChargingOperator[],
  osmName?: string,
  osmOperator?: string,
  osmBrand?: string
): ChargingPriceInfo {
  // Gelen veriyi güvenli hale getir ve küçült
  const searchText = (
    (osmName || '') +
    ' ' +
    (osmOperator || '') +
    ' ' +
    (osmBrand || '')
  )
    .toLowerCase()
    .trim();

  if (!searchText) {
    return { found: false };
  }

  // Operatörleri gez
  const foundOperator = pricesData.find((operator) => {
    // Keywords dizisindeki herhangi bir kelime OSM verisinde geçiyor mu?
    return operator.keywords.some((keyword) => searchText.includes(keyword.toLowerCase()));
  });

  if (foundOperator) {
    return {
      name: foundOperator.name,
      tariffs: foundOperator.tariffs,
      website: foundOperator.website,
      found: true,
    };
  }

  // Eşleşme yoksa
  return { found: false };
}

/**
 * Şarj tarife bilgilerini okunabilir formatta döndürür
 */
export function formatChargingPrices(tariffs: ChargingTariff): string[] {
  const prices: string[] = [];

  if (tariffs.ac) {
    prices.push(`AC (Yavaş): ${tariffs.ac} ₺/kWh`);
  }

  if (tariffs.dc) {
    prices.push(`DC (Hızlı): ${tariffs.dc} ₺/kWh`);
  }

  if (tariffs.dc_low) {
    prices.push(`DC Düşük: ${tariffs.dc_low} ₺/kWh`);
  }

  if (tariffs.dc_high) {
    prices.push(`DC Yüksek: ${tariffs.dc_high} ₺/kWh`);
  }

  return prices;
}

