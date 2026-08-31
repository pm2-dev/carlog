import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';

import { Screen } from '@/components/Screen';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { fetchNearbyStations } from '@/api/stations';
import { Station } from '@/types/station';
import { getChargingStationPrice, formatChargingPrices } from '@/utils/chargingPriceMatcher';
import { getChargingPrices, ChargingOperator } from '@/api/chargingPrices';

export function StationsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'fuel' | 'charging'>('all');

  // Konum izni ve konum alma
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError(t('stations.location_permission_denied'));
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation);
      } catch (error) {
        console.error('Konum alınırken hata:', error);
        setLocationError(t('stations.location_error'));
      }
    })();
  }, [t]);

  // Şarj fiyatlarını React Query ile çek
  const { data: chargingPricesData = [], isLoading: isPricesLoading } = useQuery({
    queryKey: ['chargingPrices'],
    queryFn: async () => {
      const prices = await getChargingPrices();
      console.log('📊 Şarj fiyatları yüklendi:', prices?.length || 0, 'operatör');
      if (prices && prices.length > 0) {
        console.log('📊 İlk operatör:', prices[0]?.name, JSON.stringify(prices[0]?.tariffs));
      }
      return prices || [];
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 saat
  });

  const { data: stations, isLoading, error } = useQuery({
    queryKey: ['stations', location?.coords.latitude, location?.coords.longitude],
    queryFn: () => {
      if (!location) return Promise.resolve([]);
      return fetchNearbyStations(location.coords.latitude, location.coords.longitude);
    },
    enabled: !!location,
    staleTime: 5 * 60 * 1000, // 5 dakika
  });

  const filteredStations = stations?.filter((station) => {
    if (filter === 'all') return true;
    return station.type === filter;
  });

  const openInMaps = (station: Station) => {
    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });
    const url = Platform.select({
      ios: `${scheme}?q=${station.lat},${station.lon}`,
      android: `${scheme}${station.lat},${station.lon}?q=${station.lat},${station.lon}(${encodeURIComponent(station.name)})`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert(t('common.error'), t('stations.map_error'));
      });
    }
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    }
    return `${(distance / 1000).toFixed(1)} km`;
  };

  const getStationIcon = (type: Station['type']) => {
    return type === 'fuel' ? 'droplet' : 'battery-charging';
  };

  const renderStation = ({ item }: { item: Station }) => {
    // Türkiye sınırları kontrolü (Yaklaşık bounding box)
    const isInTurkey = (lat: number, lon: number) => {
      return lat >= 35.0 && lat <= 43.0 && lon >= 25.0 && lon <= 45.0;
    };

    // Şarj istasyonu ise ve Türkiye içindeyse fiyat bilgisini çek
    const showPrice = item.type === 'charging' && isInTurkey(item.lat, item.lon);

    const chargingPrice =
      showPrice
        ? getChargingStationPrice(chargingPricesData, item.name, item.operator, item.brand)
        : null;

    // Debug log - sadece şarj istasyonları için
    if (item.type === 'charging' && __DEV__) {
      console.log(`🔌 ${item.name}: showPrice=${showPrice}, found=${chargingPrice?.found}, pricesDataLen=${chargingPricesData.length}`);
    }

    return (
      <TouchableOpacity
        style={[styles.stationCard, { backgroundColor: colors.surface }]}
        onPress={() => openInMaps(item)}
        activeOpacity={0.7}>
        <View style={styles.stationHeader}>
          <View style={styles.stationInfo}>
            <View style={styles.iconContainer}>
              <Feather
                name={getStationIcon(item.type)}
                size={24}
                color={item.type === 'fuel' ? colors.primary : colors.success}
              />
            </View>
            <View style={styles.stationDetails}>
              <Text style={[styles.stationName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.brand && (
                <Text style={[styles.stationBrand, { color: colors.textMuted }]}>
                  {item.brand}
                </Text>
              )}
              {item.address && (
                <Text style={[styles.stationAddress, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.address}
                </Text>
              )}

              {/* Sadece Şarj İstasyonu Fiyat Bilgisi Göster */}
              {chargingPrice?.found && chargingPrice.tariffs && (
                <View style={styles.chargingPriceContainer}>
                  {formatChargingPrices(chargingPrice.tariffs).map((price, index) => (
                    <Text
                      key={index}
                      style={[styles.chargingPriceText, { color: colors.success }]}>
                      ⚡ {price}
                    </Text>
                  ))}
                  {chargingPrice.tariffs.note && (
                    <Text style={[styles.chargingPriceNote, { color: colors.textMuted }]}>
                      *{chargingPrice.tariffs.note}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
          <View style={styles.distanceContainer}>
            <Text style={[styles.distance, { color: colors.primary }]}>
              {formatDistance(item.distance)}
            </Text>
            <Feather name="navigation" size={16} color={colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!location || isLoading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          {locationError ? (
            <>
              <Feather name="map-pin" size={64} color={colors.warning} />
              <Text style={[styles.errorText, { color: colors.textPrimary }]}>{locationError}</Text>
              <Text style={[styles.errorSubtext, { color: colors.textMuted }]}>
                {t('stations.default_location_info')}
              </Text>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                {!location ? t('stations.getting_location') : t('stations.loading_stations')}
              </Text>
            </>
          )}
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={64} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>{t('common.error')}</Text>
          <Text style={[styles.errorSubtext, { color: colors.textMuted }]}>
            {t('stations.loading_error')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('stations.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('stations.stations_found', { count: filteredStations?.length || 0 })}
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.surface },
            filter === 'all' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setFilter('all')}>
          <Text
            style={[
              styles.filterText,
              { color: colors.textPrimary },
              filter === 'all' && { color: '#FFFFFF' },
            ]}>
            {t('stations.filter_all')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.surface },
            filter === 'fuel' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setFilter('fuel')}>
          <Feather
            name="droplet"
            size={16}
            color={filter === 'fuel' ? '#FFFFFF' : colors.textPrimary}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.filterText,
              { color: colors.textPrimary },
              filter === 'fuel' && { color: '#FFFFFF' },
            ]}>
            {t('stations.filter_fuel')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.surface },
            filter === 'charging' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setFilter('charging')}>
          <Feather
            name="battery-charging"
            size={16}
            color={filter === 'charging' ? '#FFFFFF' : colors.textPrimary}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.filterText,
              { color: colors.textPrimary },
              filter === 'charging' && { color: '#FFFFFF' },
            ]}>
            {t('stations.filter_charging')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredStations}
        renderItem={renderStation}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="map" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
              {t('stations.no_stations_found')}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              {t('stations.try_expanding_search')}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 120, // Tab bar için daha fazla boşluk (80 yerine 120)
  },
  stationCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stationInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    marginRight: 10,
    paddingTop: 2,
  },
  stationDetails: {
    flex: 1,
  },
  stationName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  stationBrand: {
    fontSize: 12,
    marginBottom: 3,
  },
  stationAddress: {
    fontSize: 11,
    lineHeight: 15,
  },
  chargingPriceContainer: {
    marginTop: 6,
    gap: 2,
  },
  chargingPriceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chargingPriceNote: {
    fontSize: 9,
    fontStyle: 'italic',
    marginTop: 2,
  },
  distanceContainer: {
    alignItems: 'flex-end',
  },
  distance: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  errorText: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 6,
  },
});

