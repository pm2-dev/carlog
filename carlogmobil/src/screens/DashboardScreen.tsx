import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View, Alert, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { SectionHeader } from '@/components/SectionHeader';
import { FuelRecordItem } from '@/components/FuelRecordItem';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
// import { useDashboardSummary } from '@/hooks/queries/useReportQueries'; // Artık gerekli değil
import { useDeleteFuelEntry, useFuelEntries } from '@/hooks/queries/useFuelQueries';
import { useVehicles, useDeleteVehicle } from '@/hooks/queries/useVehicleQueries';
import { FuelEntry, VehicleCategory } from '@/types/domain';
import { AddVehicleModal } from '@/components/AddVehicleModal';
import { ReceiptScanner, ScannedReceiptData } from '@/components/ReceiptScanner';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useCurrency } from '@/hooks/useCurrency';

// Türkçe tarih formatını (GG.AA.YYYY) Date objesine çevirir
function parseTurkishDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return null;

  return new Date(year, month - 1, day);
}

// Category labels will use translations via t() function

type PageMode = 'records' | 'add-vehicle';

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { currencySymbol } = useCurrency();
  const dateLocale = (locale ?? 'tr').replace('_', '-');

  // Tüm useState hook'ları en üstte olmalı - React Hook kuralları
  const [limit, setLimit] = useState(10);
  const [selectedPlate, setSelectedPlate] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showDateModal, setShowDateModal] = useState<'start' | 'end' | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [pageMode, setPageMode] = useState<PageMode>('records');
  const [isAddVehicleModalVisible, setAddVehicleModalVisible] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | undefined>(undefined);
  const [isReceiptScannerVisible, setReceiptScannerVisible] = useState(false);

  const getCategoryLabel = (category: string): string => {
    const categoryMap: Record<string, string> = {
      OTOMOBIL: t('dashboard.vehicle_category_automobile'),
      MOTOSIKLET: t('dashboard.vehicle_category_motorcycle'),
      KAMYONET: t('dashboard.vehicle_category_van'),
      AGIR_VASITA: t('dashboard.vehicle_category_heavy'),
      DIGER: t('dashboard.vehicle_category_other'),
    };
    return categoryMap[category] || category;
  };

  const { data: fuelEntriesData, isLoading: fuelEntriesLoading, error: fuelEntriesError, refetch: refetchFuelEntries } = useFuelEntries();
  const { data: vehiclesData, isLoading: vehiclesLoading, refetch: refetchVehicles } = useVehicles();
  const deleteMutation = useDeleteFuelEntry();
  const deleteVehicleMutation = useDeleteVehicle();

  const isLoading = fuelEntriesLoading || vehiclesLoading;
  const error = fuelEntriesError;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchFuelEntries(), refetchVehicles()]);
  }, [refetchFuelEntries, refetchVehicles]);
  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const groupedVehicles = useMemo(() => {
    if (!vehiclesData || !Array.isArray(vehiclesData)) return {};
    return vehiclesData.reduce<Record<string, number>>((acc, vehicle) => {
      if (vehicle?.category) {
        acc[vehicle.category] = (acc[vehicle.category] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [vehiclesData]);

  // Araç bazlı ortalama tüketim hesaplama (2. kayıttan itibaren)
  const vehicleAverageConsumption = useMemo(() => {
    const averages: Record<string, number> = {};

    if (!fuelEntriesData || !Array.isArray(fuelEntriesData) || fuelEntriesData.length === 0) return averages;

    const vehicleEntries: Record<string, any[]> = {};

    fuelEntriesData.forEach((entry: any) => {
      if (!entry?.vehicleId) return;

      if (!vehicleEntries[entry.vehicleId]) {
        vehicleEntries[entry.vehicleId] = [];
      }
      vehicleEntries[entry.vehicleId].push(entry);
    });

    Object.keys(vehicleEntries).forEach((vehicleId) => {
      const entries = vehicleEntries[vehicleId]
        .filter((e) => e?.refuelDate)
        .sort((a, b) => {
          const odo = (a.currentOdometer ?? 0) - (b.currentOdometer ?? 0);
          if (odo !== 0) return odo;
          const dateA = new Date(a.refuelDate).getTime();
          const dateB = new Date(b.refuelDate).getTime();
          if (isNaN(dateA) || isNaN(dateB)) return 0;
          return dateA - dateB;
        });

      if (entries.length < 2) return;

      let totalFuel = 0;
      let totalDistance = 0;

      for (let i = 1; i < entries.length; i++) {
        const entry = entries[i];
        const prev = entries[i - 1];
        const tripKm = Math.max(0, (entry.currentOdometer ?? 0) - (prev.currentOdometer ?? 0));
        if (tripKm <= 0) continue;

        const liquid = (entry.liters ?? 0) + (entry.lpgLiters ?? 0);
        const kwh = entry.kWh ?? 0;
        const amount = liquid > 0 ? liquid : kwh;
        if (amount <= 0) continue;

        totalFuel += amount;
        totalDistance += tripKm;
      }

      if (totalDistance > 0) {
        averages[vehicleId] = (totalFuel / totalDistance) * 100;
      }
    });

    return averages;
  }, [fuelEntriesData]);

  // Benzin/LPG/Elektrik tüketim birimi belirleme
  const getFuelUnit = (entry: FuelEntry): string => {
    if ((entry.kWh ?? 0) > 0) {
      return 'kWh/100km';
    }
    return 'L/100km';
  };

  // Plakaya ve tarihe göre filtrele
  const filteredEntries = useMemo(() => {
    if (!fuelEntriesData || !Array.isArray(fuelEntriesData)) return [];

    return fuelEntriesData.filter((entry: FuelEntry) => {
      if (!entry) return false;
      
      // Seçili plaka varsa ve araç bilgisi yoksa veya plaka eşleşmiyorsa filtrele
      if (selectedPlate && entry.vehicle?.plate !== selectedPlate) return false;

      if (startDate || endDate) {
        if (!entry.refuelDate) return false;
        const entryDate = new Date(entry.refuelDate);
        if (isNaN(entryDate.getTime())) return false;
        
        if (startDate && entryDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (entryDate > endOfDay) return false;
        }
      }

      return true;
    });
  }, [fuelEntriesData, selectedPlate, startDate, endDate]);

  // Sıralama ve limit uygula
  const displayedEntries = useMemo(() => {
    if (!filteredEntries || filteredEntries.length === 0) return [];
    
    const sorted = [...filteredEntries].sort((a: any, b: any) => {
      const dateA = a?.refuelDate ? new Date(a.refuelDate).getTime() : 0;
      const dateB = b?.refuelDate ? new Date(b.refuelDate).getTime() : 0;
      if (isNaN(dateA) || isNaN(dateB)) return 0;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return sorted.slice(0, limit);
  }, [filteredEntries, sortOrder, limit]);

  const monthStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEntries = (fuelEntriesData || []).filter((entry) => {
      if (!entry?.refuelDate) return false;
      const date = new Date(entry.refuelDate);
      return !isNaN(date.getTime()) && date >= monthStart;
    });
    return {
      monthCount: monthEntries.length,
      monthSpend: monthEntries.reduce((sum, entry) => sum + (entry.totalCost ?? 0), 0),
      totalCount: fuelEntriesData?.length ?? 0,
    };
  }, [fuelEntriesData]);

  const hasActiveFilters = Boolean(selectedPlate || startDate || endDate);

  // Her araç için toplam kayıt sayısı (recordIndex hesaplamak için)
  const vehicleRecordCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    if (!fuelEntriesData || !Array.isArray(fuelEntriesData)) return counts;

    fuelEntriesData.forEach((entry: any) => {
      if (!entry?.vehicleId) return;
      counts[entry.vehicleId] = (counts[entry.vehicleId] ?? 0) + 1;
    });

    return counts;
  }, [fuelEntriesData]);

  // Her araç için kayıtların tarihe göre sıralı indeksini hesapla
  const vehicleRecordIndices = useMemo(() => {
    const indices: Record<string, Record<string, number>> = {};

    if (!fuelEntriesData || !Array.isArray(fuelEntriesData) || fuelEntriesData.length === 0) return indices;

    // Her araç için kayıtları grupla ve tarihe göre sırala (en eskiden en yeniye)
    const vehicleEntries: Record<string, any[]> = {};

    fuelEntriesData.forEach((entry: any) => {
      if (!entry?.vehicleId || !entry?.id) return;

      if (!vehicleEntries[entry.vehicleId]) {
        vehicleEntries[entry.vehicleId] = [];
      }
      vehicleEntries[entry.vehicleId].push(entry);
    });

    // Her araç için tarihe göre sırala ve index ata
    Object.keys(vehicleEntries).forEach(vehicleId => {
      const sorted = vehicleEntries[vehicleId]
        .filter(e => e?.refuelDate && e?.id) // Geçerli kayıtları filtrele
        .sort((a, b) => {
          const dateA = new Date(a.refuelDate).getTime();
          const dateB = new Date(b.refuelDate).getTime();
          if (isNaN(dateA) || isNaN(dateB)) return 0;
          const dateDiff = dateA - dateB;
          if (dateDiff !== 0) return dateDiff;
          return (a.currentOdometer ?? 0) - (b.currentOdometer ?? 0);
        });

      indices[vehicleId] = {};
      sorted.forEach((entry, index) => {
        if (entry?.id) {
          // index 0 = en eski (ilk kayıt), index length-1 = en yeni
          // FuelRecordItem'da isFirstRecord = recordIndex === totalRecords - 1 kontrolü var
          // Bu yüzden ters index kullanıyoruz: en yeni = 0, en eski = length-1
          indices[vehicleId][entry.id] = sorted.length - 1 - index;
        }
      });
    });

    return indices;
  }, [fuelEntriesData]);

  const hasMore = filteredEntries.length > limit;

  const handleDelete = (id: string) => {
    Alert.alert(t('common.delete'), t('dashboard.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(id, {
            onSuccess: () => {
              // Dashboard summary query is invalidated in useDeleteFuelEntry
            },
            onError: (err: any) => {
              Alert.alert(t('common.error'), t('dashboard.delete_error'));
              console.error(err);
            }
          });
        }
      }
    ]);
  };

  const handleEdit = (item: FuelEntry) => {
    // Modal'a ID parametresi ile yönlendir
    router.push({
      pathname: '/modal',
      params: { editId: item.id }
    });
  };

  const handleReceiptScan = (data: ScannedReceiptData) => {
    // Taranan veriyi modal'a aktar
    router.push({
      pathname: '/modal',
      params: {
        scannedTotalCost: data.totalCost || '',
        scannedLiters: data.liters || '',
        scannedUnitPrice: data.unitPrice || '',
        scannedDate: data.date || '',
        scannedStationName: data.stationName || '',
      }
    });
  };

  const handleEditVehicle = (vehicleId: string) => {
    setEditingVehicleId(vehicleId);
    setAddVehicleModalVisible(true);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    // Silinecek aracın plakasını bul
    const vehicleToDelete = vehiclesData?.find(v => v.id === vehicleId);
    
    Alert.alert(t('common.delete'), t('vehicles.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteVehicleMutation.mutate(vehicleId, {
            onSuccess: () => {
              // Eğer silinen araç şu an filtrede seçiliyse, filtreyi temizle
              if (vehicleToDelete && selectedPlate === vehicleToDelete.plate) {
                setSelectedPlate('');
              }
            },
            onError: (err: any) => {
              Alert.alert(t('common.error'), t('vehicles.delete_error'));
              console.error(err);
            }
          });
        }
      }
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 }}>
        <Text style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: 20 }}>
          {t('common.error')}
        </Text>
        <Pressable onPress={onRefresh} style={{ padding: 10, backgroundColor: colors.primary, borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>{t('common.ok')}</Text>
        </Pressable>
      </View>
    );
  }

  const handleLoadMore = () => {
    setLimit(prev => prev + 10);
  };

  const handleClearFilters = () => {
    setSelectedPlate('');
    setStartDate(null);
    setEndDate(null);
    setSortOrder('newest');
    setLimit(10);
  };

  const showDatePicker = (type: 'start' | 'end') => {
    const currentDate = type === 'start' ? startDate : endDate;
    setTempDate(currentDate || new Date());
    setShowDateModal(type);
  };

  const handleDateSelect = () => {
    if (showDateModal === 'start') {
      setStartDate(tempDate);
    } else if (showDateModal === 'end') {
      setEndDate(tempDate);
    }
    setShowDateModal(null);
  };

  const changeTempDate = (days: number) => {
    const newDate = new Date(tempDate);
    newDate.setDate(newDate.getDate() + days);
    setTempDate(newDate);
  };

  const changeTempMonth = (months: number) => {
    const newDate = new Date(tempDate);
    newDate.setMonth(newDate.getMonth() + months);
    setTempDate(newDate);
  };

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.headerArea}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>{t('dashboard.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('dashboard.view_and_manage_records')}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>{t('dashboard.this_month_spend')}</Text>
          <Text style={[styles.statCardValue, { color: colors.primary }]} numberOfLines={1}>
            {currencySymbol}{monthStats.monthSpend.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>{t('dashboard.this_month_records')}</Text>
          <Text style={[styles.statCardValue, { color: colors.textPrimary }]}>{monthStats.monthCount}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>{t('dashboard.all_records_count')}</Text>
          <Text style={[styles.statCardValue, { color: colors.textPrimary }]}>{monthStats.totalCount}</Text>
        </View>
      </View>

      <View style={[styles.topButtonsContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPageMode('records')}
          style={[
            styles.topButton,
            { backgroundColor: pageMode === 'records' ? colors.primary : 'transparent' }
          ]}>
          <Ionicons
            name="list-outline"
            size={18}
            color={pageMode === 'records' ? '#FFF' : colors.textSecondary}
          />
          <Text style={[
            styles.topButtonLabel,
            { color: pageMode === 'records' ? '#FFF' : colors.textSecondary }
          ]}>
            {t('dashboard.records')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setPageMode('add-vehicle')}
          style={[
            styles.topButton,
            { backgroundColor: pageMode === 'add-vehicle' ? colors.primary : 'transparent' }
          ]}>
          <Ionicons
            name="car-outline"
            size={18}
            color={pageMode === 'add-vehicle' ? '#FFF' : colors.textSecondary}
          />
          <Text style={[
            styles.topButtonLabel,
            { color: pageMode === 'add-vehicle' ? '#FFF' : colors.textSecondary }
          ]}>
            {t('dashboard.my_vehicles')}
          </Text>
        </Pressable>
      </View>

      {/* Araç Ekleme Bölümü */}
      {pageMode === 'add-vehicle' && (
        <>
          <SectionCard>
            <SectionHeader subtitle={t('dashboard.add_new_vehicle')}>{t('dashboard.add_vehicle')}</SectionHeader>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAddVehicleModalVisible(true)}
              style={[styles.vehicleButton, { borderColor: colors.border }]}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.vehicleButtonLabel, { color: colors.primary }]}>{t('dashboard.add_new_vehicle')}</Text>
            </Pressable>
          </SectionCard>

          {/* Araçlarım Listesi */}
          {vehiclesData && vehiclesData.length > 0 && (
            <>
              <SectionCard>
                <SectionHeader subtitle={t('dashboard.category_distribution')}>{t('dashboard.vehicle_summary')}</SectionHeader>
                <View style={styles.chipRow}>
                  {Object.entries(groupedVehicles).map(([key, count]) => (
                    <View key={key} style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>
                        {getCategoryLabel(key)}
                      </Text>
                      <Text style={[styles.chipValue, { color: colors.textPrimary }]}>{count}</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>

              {vehiclesData.map((vehicle) => (
                <SectionCard key={vehicle.id}>
                  <View style={styles.vehicleCardHeader}>
                    <View style={{ flex: 1 }}>
                      <SectionHeader subtitle={`${vehicle.brand} ${vehicle.model} · ${vehicle.modelYear || '-'}`}>
                        {vehicle.plate}
                      </SectionHeader>
                    </View>
                    <View style={styles.vehicleActions}>
                      <Pressable
                        onPress={() => handleEditVehicle(vehicle.id)}
                        style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteVehicle(vehicle.id)}
                        style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.vehicleMeta}>
                    <VehicleInfo label={t('vehicles.category')} value={getCategoryLabel(vehicle.category)} colors={colors} />
                    <VehicleInfo label={t('vehicles.fuel_type')} value={(vehicle.fuelTypes || []).join(', ')} colors={colors} />
                    <VehicleInfo label={t('vehicles.current_odometer')} value={vehicle.currentOdometer.toLocaleString('tr-TR')} colors={colors} />
                  </View>
                </SectionCard>
              ))}
            </>
          )}
        </>
      )}

      {/* Kayıtlar Bölümü */}
      {pageMode === 'records' && (
        <>
          <View style={styles.addRecordButtonsContainer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/modal')}
              style={[styles.addRecordButton, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={18} color="#FFF" />
              <Text style={styles.addRecordButtonLabel}>{t('dashboard.add_new_record')}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setReceiptScannerVisible(true)}
              style={[styles.scanIconButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>

          {(vehiclesData?.length ?? 0) > 0 && (
            <View style={styles.vehicleTabsRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.vehicleTabsScroll}
                contentContainerStyle={styles.vehicleChips}>
                <Pressable
                  onPress={() => setSelectedPlate('')}
                  style={[
                    styles.vehicleChip,
                    {
                      backgroundColor: !selectedPlate ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}>
                  <Text style={[styles.vehicleChipText, { color: !selectedPlate ? '#FFF' : colors.textSecondary }]}>
                    {t('dashboard.all_vehicles')}
                  </Text>
                </Pressable>
                {vehiclesData?.map((vehicle) => {
                  const selected = selectedPlate === vehicle.plate;
                  return (
                    <Pressable
                      key={vehicle.id}
                      onPress={() => setSelectedPlate(selected ? '' : vehicle.plate)}
                      style={[
                        styles.vehicleChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.surface,
                          borderColor: colors.border,
                        },
                      ]}>
                      <Text style={[styles.vehicleChipText, { color: selected ? '#FFF' : colors.textSecondary }]}>
                        {vehicle.plate}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.filterContainer}>
            <View style={styles.sortRow}>
              <Pressable
                onPress={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Feather
                  name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'}
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.sortButtonText, { color: colors.textPrimary }]}>
                  {sortOrder === 'newest' ? t('dashboard.sort_newest') : t('dashboard.sort_oldest')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => showDatePicker('start')}
                style={[styles.dateChip, { backgroundColor: colors.surface, borderColor: startDate ? colors.primary : colors.border }]}
              >
                <Feather name="calendar" size={14} color={startDate ? colors.primary : colors.textMuted} />
                <Text style={{ color: startDate ? colors.textPrimary : colors.textMuted, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                  {startDate ? startDate.toLocaleDateString(dateLocale) : t('dashboard.start_date')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => showDatePicker('end')}
                style={[styles.dateChip, { backgroundColor: colors.surface, borderColor: endDate ? colors.primary : colors.border }]}
              >
                <Feather name="calendar" size={14} color={endDate ? colors.primary : colors.textMuted} />
                <Text style={{ color: endDate ? colors.textPrimary : colors.textMuted, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                  {endDate ? endDate.toLocaleDateString(dateLocale) : t('dashboard.end_date')}
                </Text>
              </Pressable>
            </View>

            {hasActiveFilters && (
              <Pressable onPress={handleClearFilters} style={[styles.clearFiltersButton, { borderColor: colors.border }]}>
                <Feather name="x" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{t('dashboard.clear_filters')}</Text>
              </Pressable>
            )}
          </View>

          {filteredEntries.length === 0 ? (
            <View style={[styles.emptyStateContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.emptyStateIconBox, { backgroundColor: colors.primarySoft }]}>
                <Ionicons
                  name={hasActiveFilters ? 'search-outline' : 'speedometer-outline'}
                  size={40}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                {hasActiveFilters ? t('dashboard.no_filtered_records') : t('dashboard.empty_title')}
              </Text>
              <Text style={[styles.emptyStateMessage, { color: colors.textSecondary }]}>
                {hasActiveFilters ? t('dashboard.clear_filters') : t('dashboard.empty_message')}
              </Text>
              {!hasActiveFilters && (
                <Pressable
                  onPress={() => router.push('/modal')}
                  style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                >
                  <Feather name="plus" size={16} color="#FFF" />
                  <Text style={styles.emptyStateButtonText}>{t('dashboard.add_new_record')}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {displayedEntries.map((item: any) => {
                const vehicleId = item.vehicleId;
                const recordIndex = vehicleRecordIndices[vehicleId]?.[item.id] ?? 0;
                const totalRecords = vehicleRecordCounts[vehicleId] ?? 0;

                return (
                  <FuelRecordItem
                    key={item.id}
                    item={item}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    averageConsumption={vehicleAverageConsumption[item.vehicleId]}
                    recordIndex={recordIndex}
                    totalRecords={totalRecords}
                  />
                );
              })}
              {hasMore && (
                <Pressable
                  onPress={handleLoadMore}
                  style={[styles.loadMoreButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('dashboard.load_more')}</Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}

      <AddVehicleModal
        visible={isAddVehicleModalVisible}
        vehicleId={editingVehicleId}
        onClose={() => {
          setAddVehicleModalVisible(false);
          setEditingVehicleId(undefined);
          setPageMode('add-vehicle');
        }}
      />

      {/* Fiş Tarama Modal */}
      <ReceiptScanner
        visible={isReceiptScannerVisible}
        onClose={() => setReceiptScannerVisible(false)}
        onScanComplete={handleReceiptScan}
      />

      {/* Tarih Seçici Modal */}
      <Modal
        visible={showDateModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {showDateModal === 'start' ? t('dashboard.start_date') : t('dashboard.end_date')}
            </Text>

            {/* Tarih Gösterimi */}
            <View style={styles.dateDisplay}>
              <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                {tempDate.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  weekday: 'long'
                })}
              </Text>
            </View>

            {/* Ay Değiştirme */}
            <View style={styles.monthControls}>
              <Pressable
                onPress={() => changeTempMonth(-1)}
                style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}
              >
                <Feather name="chevrons-left" size={20} color={colors.primary} />
                <Text style={[styles.controlText, { color: colors.textSecondary }]}>{t('dashboard.previous_month')}</Text>
              </Pressable>
              <Pressable
                onPress={() => changeTempMonth(1)}
                style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[styles.controlText, { color: colors.textSecondary }]}>{t('dashboard.next_month')}</Text>
                <Feather name="chevrons-right" size={20} color={colors.primary} />
              </Pressable>
            </View>

            {/* Gün Değiştirme */}
            <View style={styles.dayControls}>
              <Pressable
                onPress={() => changeTempDate(-1)}
                style={[styles.dayButton, { backgroundColor: colors.surfaceAlt }]}
              >
                <Feather name="chevron-left" size={24} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => setTempDate(new Date())}
                style={[styles.todayButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.todayText}>{t('dashboard.today')}</Text>
              </Pressable>
              <Pressable
                onPress={() => changeTempDate(1)}
                style={[styles.dayButton, { backgroundColor: colors.surfaceAlt }]}
              >
                <Feather name="chevron-right" size={24} color={colors.primary} />
              </Pressable>
            </View>

            {/* Hızlı Seçim */}
            <View style={styles.quickSelect}>
              <Text style={[styles.quickSelectLabel, { color: colors.textSecondary }]}>{t('dashboard.filter')}</Text>
              <View style={styles.quickSelectButtons}>
                <Pressable
                  onPress={() => {
                    const date = new Date();
                    date.setDate(date.getDate() - 7);
                    setTempDate(date);
                  }}
                  style={[styles.quickButton, { backgroundColor: colors.surfaceAlt }]}
                >
                  <Text style={[styles.quickButtonText, { color: colors.textPrimary }]}>{t('dashboard.last_7_days')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const date = new Date();
                    date.setDate(date.getDate() - 30);
                    setTempDate(date);
                  }}
                  style={[styles.quickButton, { backgroundColor: colors.surfaceAlt }]}
                >
                  <Text style={[styles.quickButtonText, { color: colors.textPrimary }]}>{t('dashboard.last_30_days')}</Text>
                </Pressable>
              </View>
            </View>

            {/* Butonlar */}
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowDateModal(null)}
                style={[styles.modalButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>İptal</Text>
              </Pressable>
              <Pressable
                onPress={handleDateSelect}
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Seç</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

type VehicleInfoProps = {
  label: string;
  value: string | number;
  colors: any;
};

const VehicleInfo = ({ label, value, colors }: VehicleInfoProps) => {
  return (
    <View style={styles.infoBlock}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerArea: {
    gap: 6,
    marginBottom: 4,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statCardValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  topButtonsContainer: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  topButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  vehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  vehicleButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
    gap: 4,
  },
  chipLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  chipValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  vehicleMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 20,
  },
  infoBlock: {
    minWidth: 120,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  addRecordButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  addRecordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addRecordButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  scanIconButton: {
    width: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTabsRow: {
    flexGrow: 0,
    flexShrink: 0,
  },
  vehicleTabsScroll: {
    flexGrow: 0,
  },
  vehicleChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  vehicleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  vehicleChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterContainer: {
    gap: 8,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyStateContainer: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  listContainer: {
    gap: 10,
    paddingBottom: 8,
  },
  loadMoreButton: {
    padding: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowCaption: {
    marginTop: 4,
    fontSize: 12,
  },
  rowValueGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  dateDisplay: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  monthControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  controlText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  quickSelect: {
    gap: 12,
  },
  quickSelectLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickSelectButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonPrimary: {
    borderWidth: 0,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
