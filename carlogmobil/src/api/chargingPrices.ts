import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import localPricesData from '../../assets/charging_prices.json';

const GITHUB_PRICES_URL =
  'https://raw.githubusercontent.com/pm2-dev/carlog/main/carlog-prices/charging_prices.json';
const CACHE_KEY = '@carlog_charging_prices';
const CACHE_EXPIRY_KEY = '@carlog_charging_prices_expiry';
const CACHE_DURATION = 6 * 60 * 60 * 1000;

export interface ChargingTariff {
  ac?: number;
  dc?: number;
  dc_low?: number;
  dc_high?: number;
  note?: string;
}

export interface ChargingOperator {
  id: string;
  name: string;
  keywords: string[];
  website: string;
  tariffs: ChargingTariff;
}

async function fetchRemotePrices(): Promise<ChargingOperator[] | null> {
  try {
    const response = await axios.get<ChargingOperator[]>(GITHUB_PRICES_URL, {
      timeout: 5000,
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(response.data));
      await AsyncStorage.setItem(CACHE_EXPIRY_KEY, Date.now().toString());
      return response.data;
    }
    return null;
  } catch {
    return null;
  }
}

async function getCachedPrices(): Promise<ChargingOperator[] | null> {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    const expiryTime = await AsyncStorage.getItem(CACHE_EXPIRY_KEY);
    if (!cachedData || !expiryTime) return null;

    if (Date.now() - parseInt(expiryTime, 10) > CACHE_DURATION) {
      return null;
    }
    return JSON.parse(cachedData);
  } catch {
    return null;
  }
}

function getLocalPrices(): ChargingOperator[] {
  try {
    return (localPricesData as ChargingOperator[]) || [];
  } catch {
    return [];
  }
}

export async function getChargingPrices(): Promise<ChargingOperator[]> {
  const remotePrices = await fetchRemotePrices();
  if (remotePrices && remotePrices.length > 0) return remotePrices;

  const cachedPrices = await getCachedPrices();
  if (cachedPrices && cachedPrices.length > 0) return cachedPrices;

  return getLocalPrices();
}

export async function clearChargingPricesCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
  await AsyncStorage.removeItem(CACHE_EXPIRY_KEY);
}
