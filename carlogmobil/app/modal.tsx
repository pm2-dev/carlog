import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  KeyboardTypeOptions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '@/components/Screen';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import type { ThemeColors } from '@/theme';
import type { Vehicle, FuelEntry, FuelType } from '@/types/domain';
import { useVehicles } from '@/hooks/queries/useVehicleQueries';
import { useCreateFuelEntry, useUpdateFuelEntry, useFuelEntries } from '@/hooks/queries/useFuelQueries';
import { useVehicleStats } from '@/hooks/queries/useReportQueries';

const parseNumber = (value: string) => {
  if (!value) return 0;
  return Number(value.replace(/\s+/g, '').replace(',', '.'));
};

const getTodayString = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}.${month}.${year}`;
};

const parseDateToISO = (dateString: string) => {
  const [day, month, year] = dateString.split('.');
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  return date.toISOString();
};

const formatISOToTurkish = (isoString: string) => {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export default function ModalScreen() {
  const router = useRouter();
  const { colors, resolvedScheme } = useAppTheme();
  const isDark = resolvedScheme === 'dark';
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ 
    editId?: string;
    scannedTotalCost?: string;
    scannedLiters?: string;
    scannedUnitPrice?: string;
    scannedDate?: string;
    scannedStationName?: string;
  }>();
  
  const editId = params.editId;
  const isEditMode = Boolean(editId);
  
  const hasScannedData = Boolean(
    params.scannedTotalCost || 
    params.scannedLiters || 
    params.scannedUnitPrice || 
    params.scannedDate || 
    params.scannedStationName
  );
  
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  const { data: vehicles, isLoading: isLoadingVehicles } = useVehicles();
  const { data: fuelEntries } = useFuelEntries();
  const { data: vehicleFuelEntries } = useFuelEntries(selectedVehicleId || undefined);
  const createMutation = useCreateFuelEntry();
  const updateMutation = useUpdateFuelEntry();
  const { data: vehicleStats } = useVehicleStats(selectedVehicleId || '');
  
  const vehicleRecordCount = vehicleFuelEntries?.length || 0;

  const [date, setDate] = useState(getTodayString());
  const [previousOdometer, setPreviousOdometer] = useState('');
  const [currentOdometer, setCurrentOdometer] = useState('');
  const [liters, setLiters] = useState('');
  const [lpgLiters, setLpgLiters] = useState('');
  const [kWh, setKWh] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFuelInputs, setSelectedFuelInputs] = useState<FuelType[]>([]);

  const editingEntry = useMemo(() => {
    if (isEditMode && fuelEntries) {
      return fuelEntries.find((entry: FuelEntry) => entry.id === editId);
    }
    return null;
  }, [isEditMode, editId, fuelEntries]);

  const selectedVehicle = useMemo(
    () => vehicles?.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles]
  );

  const vehicleFuelTypes = selectedVehicle?.fuelTypes || [];

  const resetInputs = useCallback((vehicle: Vehicle | null) => {
    setDate(getTodayString());
    setPreviousOdometer(
      vehicle?.currentOdometer !== undefined && vehicle.currentOdometer !== null
        ? String(vehicle.currentOdometer)
        : ''
    );
    setCurrentOdometer('');
    setLiters('');
    setLpgLiters('');
    setKWh('');
    setTotalCost('');
    setUnitPrice('');
    setNotes('');
    
    const fuelTypes = vehicle?.fuelTypes || [];
    if (fuelTypes.length > 0) {
      setSelectedFuelInputs([fuelTypes[0]]);
    } else {
      setSelectedFuelInputs([]);
    }
  }, []);

  useEffect(() => {
    if (isEditMode && editingEntry) {
      setSelectedVehicleId(editingEntry.vehicleId);
      setDate(formatISOToTurkish(editingEntry.refuelDate));
      setPreviousOdometer(String(editingEntry.previousOdometer));
      setCurrentOdometer(String(editingEntry.currentOdometer));
      
      const usedFuels: FuelType[] = [];
      if (editingEntry.liters > 0) usedFuels.push('BENZIN');
      if (editingEntry.lpgLiters > 0) usedFuels.push('LPG');
      if (editingEntry.kWh > 0) usedFuels.push('ELEKTRIK');
      
      setSelectedFuelInputs(usedFuels);
      
      if (editingEntry.liters > 0) {
        setLiters(String(editingEntry.liters).replace('.', ','));
      }
      if (editingEntry.lpgLiters > 0) {
        setLpgLiters(String(editingEntry.lpgLiters).replace('.', ','));
      }
      if (editingEntry.kWh > 0) {
        setKWh(String(editingEntry.kWh).replace('.', ','));
      }
      
      setTotalCost(String(editingEntry.totalCost).replace('.', ','));
      setNotes(editingEntry.note || '');
      
      const totalFuel = editingEntry.liters + editingEntry.lpgLiters + editingEntry.kWh;
      if (totalFuel > 0) {
        const calculatedUnitPrice = editingEntry.totalCost / totalFuel;
        setUnitPrice(calculatedUnitPrice.toFixed(2).replace('.', ','));
      }
    }
  }, [isEditMode, editingEntry]);

  useEffect(() => {
    if (hasScannedData && !isEditMode) {
      if (params.scannedDate) setDate(params.scannedDate);
      if (params.scannedTotalCost) setTotalCost(params.scannedTotalCost.replace('.', ','));
      if (params.scannedLiters) setLiters(params.scannedLiters.replace('.', ','));
      if (params.scannedUnitPrice) setUnitPrice(params.scannedUnitPrice.replace('.', ','));
      if (params.scannedStationName) setNotes(params.scannedStationName);
    }
  }, [hasScannedData, isEditMode, params]);

  useEffect(() => {
    if (!isEditMode && vehicles && vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [isEditMode, vehicles, selectedVehicleId]);

  useEffect(() => {
    if (!isEditMode) {
      resetInputs(selectedVehicle);
    }
  }, [isEditMode, selectedVehicle, resetInputs]);

  const handleUnitPriceChange = (text: string) => {
    setUnitPrice(text);
    const price = parseNumber(text);
    const totalVolume = parseNumber(liters) + parseNumber(lpgLiters) + parseNumber(kWh);
    if (price > 0 && totalVolume > 0) {
      setTotalCost((price * totalVolume).toFixed(2).replace('.', ','));
    }
  };

  const handleLitersChange = (text: string) => {
    setLiters(text);
    const vol = parseNumber(text);
    const price = parseNumber(unitPrice);
    if (price > 0 && vol > 0) {
      const totalVolume = vol + parseNumber(lpgLiters) + parseNumber(kWh);
      setTotalCost((price * totalVolume).toFixed(2).replace('.', ','));
    }
  };

  const handleLpgLitersChange = (text: string) => {
    setLpgLiters(text);
    const vol = parseNumber(text);
    const price = parseNumber(unitPrice);
    if (price > 0 && vol > 0) {
      const totalVolume = parseNumber(liters) + vol + parseNumber(kWh);
      setTotalCost((price * totalVolume).toFixed(2).replace('.', ','));
    }
  };

  const handleKWhChange = (text: string) => {
    setKWh(text);
    const vol = parseNumber(text);
    const price = parseNumber(unitPrice);
    if (price > 0 && vol > 0) {
      const totalVolume = parseNumber(liters) + parseNumber(lpgLiters) + vol;
      setTotalCost((price * totalVolume).toFixed(2).replace('.', ','));
    }
  };

  const isFormEnabled = Boolean(selectedVehicle);

  const derived = useMemo(() => {
    const previousNumber = parseNumber(previousOdometer);
    const currentNumber = parseNumber(currentOdometer);
    const litersNumber = parseNumber(liters);
    const lpgLitersNumber = parseNumber(lpgLiters);
    const kWhNumber = parseNumber(kWh);
    const costNumber = parseNumber(totalCost);

    const isFirstRecord = !isEditMode && vehicleRecordCount === 0;
    const distanceNumber =
      isFormEnabled && currentNumber > previousNumber && !isFirstRecord
        ? currentNumber - previousNumber
        : 0;
    const liquidFuel = litersNumber + lpgLitersNumber;
    const consumptionFuel = liquidFuel > 0 ? liquidFuel : kWhNumber;
    const totalFuel = liquidFuel + kWhNumber;
    
    let consumption = 0;
    let fuelType = '';
    if (!isFirstRecord && distanceNumber > 0 && consumptionFuel > 0) {
      consumption = (consumptionFuel / distanceNumber) * 100;
      
      const usedFuels = [];
      if (litersNumber > 0) usedFuels.push('Benzin');
      if (lpgLitersNumber > 0) usedFuels.push('LPG');
      if (kWhNumber > 0) usedFuels.push('Elektrik');
      
      fuelType = usedFuels.length > 1 ? 'Karma' : (kWhNumber > 0 && liquidFuel <= 0 ? 'kWh/100km' : 'L/100km');
    }
    
    const costPerLiter = totalFuel > 0 && costNumber > 0 ? costNumber / totalFuel : 0;
    const costPerKm = distanceNumber > 0 && costNumber > 0 ? costNumber / distanceNumber : 0;

    const averageConsumption = vehicleStats?.stats?.averageConsumption || 0;
    const isHighConsumption = !isFirstRecord && averageConsumption > 0 && consumption > (averageConsumption * 1.2);

    return {
      distanceKm: distanceNumber,
      consumption,
      fuelType,
      costPerLiter,
      costPerKm,
      isHighConsumption,
      averageConsumption,
      litersNumber,
      lpgLitersNumber,
      kWhNumber,
      isFirstRecord
    };
  }, [isFormEnabled, previousOdometer, currentOdometer, liters, lpgLiters, kWh, totalCost, vehicleStats, isEditMode, vehicleRecordCount]);

  const clearForm = () => {
    resetInputs(selectedVehicle);
  };

  const handleSubmit = () => {
    if (!selectedVehicleId) {
      Alert.alert(t('common.error'), t('fuel_entry.select_vehicle'));
      return;
    }

    const previousNumber = parseNumber(previousOdometer);
    const currentNumber = parseNumber(currentOdometer);

    if (!date || !currentOdometer || !totalCost) {
      Alert.alert(t('common.error'), t('fuel_entry.fill_required_fields'));
      return;
    }

    const litersNum = parseNumber(liters);
    const lpgLitersNum = parseNumber(lpgLiters);
    const kWhNum = parseNumber(kWh);
    const totalFuel = litersNum + lpgLitersNum + kWhNum;
    
    if (totalFuel <= 0) {
      Alert.alert(t('common.error'), t('fuel_entry.fill_fuel_amount'));
      return;
    }

    if (currentNumber <= previousNumber) {
      Alert.alert(t('common.error'), t('fuel_entry.odometer_validation', { current: currentNumber, previous: previousNumber }));
      return;
    }

    const data: any = {
      vehicleId: selectedVehicleId,
      refuelDate: parseDateToISO(date),
      previousOdometer: previousNumber,
      currentOdometer: currentNumber,
      totalCost: parseNumber(totalCost),
      note: notes
    };
    
    if (litersNum > 0) data.liters = litersNum;
    if (lpgLitersNum > 0) data.lpgLiters = lpgLitersNum;
    if (kWhNum > 0) data.kWh = kWhNum;

    if (isEditMode && editId) {
      updateMutation.mutate({ id: editId, data }, {
        onSuccess: () => {
          Alert.alert(t('common.success'), t('fuel_entry.update_success'));
          router.back();
        },
        onError: (error: any) => {
          Alert.alert(t('common.error'), error.response?.data?.message || t('fuel_entry.update_error'));
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          Alert.alert(t('common.success'), t('fuel_entry.add_success'));
          clearForm();
          router.back();
        },
        onError: (error: any) => {
          Alert.alert(t('common.error'), error.response?.data?.message || t('fuel_entry.add_error'));
        }
      });
    }
  };

  // Gradient colors based on theme
  const gradientColors = isDark 
    ? ['#1a1a2e', '#16213e', '#0f3460'] as const
    : ['#667eea', '#764ba2', '#f093fb'] as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          
          {/* Hero Header */}
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroHeader}>
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <Ionicons name={isEditMode ? "create" : "add-circle"} size={32} color="#FFF" />
              </View>
              <Text style={styles.heroTitle}>
                {isEditMode ? t('fuel_entry.edit_record') : t('fuel_entry.fuel_information')}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isEditMode ? t('fuel_entry.record_for_vehicle') : t('fuel_entry.which_vehicle')}
              </Text>
            </View>
          </LinearGradient>

          {/* Vehicle Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car-sport" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('fuel_entry.vehicle_selection')}
              </Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.vehicleList}>
              {isLoadingVehicles ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                vehicles?.map((vehicle) => {
                  const isSelected = selectedVehicleId === vehicle.id;
                  return (
                    <Pressable
                      key={vehicle.id}
                      onPress={() => !isEditMode && setSelectedVehicleId(vehicle.id)}
                      disabled={isEditMode}
                      style={[
                        styles.vehicleCard,
                        { 
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                          opacity: isEditMode && !isSelected ? 0.4 : 1,
                          shadowColor: isSelected ? colors.primary : '#000',
                        }
                      ]}>
                      <View style={[
                        styles.vehicleIconBg,
                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.surfaceAlt }
                      ]}>
                        <Ionicons 
                          name="car-sport" 
                          size={24} 
                          color={isSelected ? '#FFF' : colors.primary} 
                        />
                      </View>
                      <Text style={[styles.vehiclePlate, { color: isSelected ? '#FFF' : colors.textPrimary }]}>
                        {vehicle.plate}
                      </Text>
                      <Text style={[styles.vehicleBrand, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
                        {vehicle.brand} {vehicle.model}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Scanned Data Info */}
          {hasScannedData && (
            <View style={[styles.infoCard, styles.successCard]}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoCardTitle}>{t('fuel_entry.scanned_data_loaded')}</Text>
                <Text style={styles.infoCardSubtitle}>{t('fuel_entry.scanned_data_hint')}</Text>
              </View>
            </View>
          )}

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
            {/* Date & Previous KM Row */}
            <View style={styles.formRow}>
              <FormField
                label={t('fuel_entry.date')}
                placeholder="GG.AA.YYYY"
                value={date}
                onChangeText={setDate}
                keyboardType="numbers-and-punctuation"
                colors={colors}
                icon="calendar"
                flex={1}
              />
              <FormField
                label={t('fuel_entry.previous_km')}
                value={previousOdometer}
                onChangeText={() => {}}
                colors={colors}
                editable={false}
                icon="speedometer-outline"
                suffix="km"
                flex={1}
              />
            </View>

            {/* Current Odometer - Highlighted */}
            <FormField
              label={t('fuel_entry.current_odometer')}
              placeholder={t('fuel_entry.example_km')}
              value={currentOdometer}
              onChangeText={setCurrentOdometer}
              keyboardType="numeric"
              colors={colors}
              icon="speedometer"
              suffix="km"
              highlight
            />

            {/* Fuel Type Selection */}
            {vehicleFuelTypes.length > 1 && (
              <View style={styles.fuelTypeSection}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  {t('fuel_entry.which_fuel_types')}
                </Text>
                <View style={styles.fuelTypeGrid}>
                  {vehicleFuelTypes.map((fuelType) => {
                    const isSelected = selectedFuelInputs.includes(fuelType);
                    const icons: Record<FuelType, any> = {
                      BENZIN: 'water',
                      DIZEL: 'water',
                      LPG: 'flame',
                      ELEKTRIK: 'flash',
                      HIBRIT: 'git-merge'
                    };
                    const labels: Record<FuelType, string> = {
                      BENZIN: t('fuel_entry.gasoline'),
                      DIZEL: t('fuel_entry.diesel'),
                      LPG: t('fuel_entry.lpg'),
                      ELEKTRIK: t('fuel_entry.electric'),
                      HIBRIT: t('fuel_entry.hybrid')
                    };
                    
                    return (
                      <Pressable
                        key={fuelType}
                        onPress={() => {
                          if (isSelected) {
                            if (selectedFuelInputs.length > 1) {
                              setSelectedFuelInputs(prev => prev.filter(f => f !== fuelType));
                            }
                          } else {
                            setSelectedFuelInputs(prev => [...prev, fuelType]);
                          }
                        }}
                        style={[
                          styles.fuelTypeChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}>
                        <Ionicons
                          name={icons[fuelType]}
                          size={18}
                          color={isSelected ? '#FFF' : colors.textSecondary}
                        />
                        <Text style={[
                          styles.fuelTypeLabel,
                          { color: isSelected ? '#FFF' : colors.textSecondary }
                        ]}>
                          {labels[fuelType]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Dynamic Fuel Amount Fields */}
            {(selectedFuelInputs.includes('BENZIN') || selectedFuelInputs.includes('DIZEL')) && (
              <FormField
                label={t('fuel_entry.gasoline_diesel_amount')}
                placeholder="0"
                value={liters}
                onChangeText={handleLitersChange}
                keyboardType="numeric"
                colors={colors}
                icon="water"
                suffix="L"
              />
            )}

            {selectedFuelInputs.includes('LPG') && (
              <FormField
                label={t('fuel_entry.lpg_amount')}
                placeholder="0"
                value={lpgLiters}
                onChangeText={handleLpgLitersChange}
                keyboardType="numeric"
                colors={colors}
                icon="flame"
                suffix="L"
              />
            )}

            {(selectedFuelInputs.includes('ELEKTRIK') || selectedFuelInputs.includes('HIBRIT')) && (
              <FormField
                label={t('fuel_entry.electric_amount')}
                placeholder="0"
                value={kWh}
                onChangeText={handleKWhChange}
                keyboardType="numeric"
                colors={colors}
                icon="flash"
                suffix="kWh"
              />
            )}

            {/* Price Section */}
            <View style={[styles.priceSection, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.priceSectionHeader}>
                <Ionicons name="wallet" size={18} color={colors.primary} />
                <Text style={[styles.priceSectionTitle, { color: colors.textPrimary }]}>
                  {t('fuel_entry.price_info') || 'Fiyat Bilgileri'}
                </Text>
              </View>
              
              <View style={styles.formRow}>
                <FormField
                  label={selectedFuelInputs.length > 1 ? t('fuel_entry.unit_price_average') : t('fuel_entry.unit_price')}
                  placeholder="0"
                  value={unitPrice}
                  onChangeText={handleUnitPriceChange}
                  keyboardType="numeric"
                  colors={colors}
                  icon="pricetag"
                  suffix="₺"
                  flex={1}
                />
                <FormField
                  label={t('fuel_entry.total_cost')}
                  placeholder="0"
                  value={totalCost}
                  onChangeText={setTotalCost}
                  keyboardType="numeric"
                  colors={colors}
                  icon="cash"
                  suffix="₺"
                  highlight
                  flex={1}
                />
              </View>
            </View>

            {/* Notes */}
            <FormField
              label={t('fuel_entry.notes_optional')}
              placeholder={t('fuel_entry.station_name_etc')}
              value={notes}
              onChangeText={setNotes}
              multiline
              colors={colors}
              icon="document-text"
            />
          </View>

          {/* Summary Card */}
          {((derived.isFirstRecord && parseNumber(currentOdometer) > 0) || derived.distanceKm > 0) && (
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <View style={styles.summaryHeader}>
                <Ionicons name="analytics" size={20} color={colors.primary} />
                <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                  {t('fuel_entry.summary') || 'Özet'}
                </Text>
              </View>

              {derived.isFirstRecord ? (
                <>
                  <View style={[styles.firstRecordBanner, { backgroundColor: isDark ? '#1E3A5F' : '#E3F2FD' }]}>
                    <Ionicons name="information-circle" size={22} color={isDark ? '#60A5FA' : '#1976D2'} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.firstRecordTitle, { color: isDark ? '#93C5FD' : '#0D47A1' }]}>
                        {t('fuel_entry.first_record_title')}
                      </Text>
                      <Text style={[styles.firstRecordText, { color: isDark ? '#BFDBFE' : '#1565C0' }]}>
                        {t('fuel_entry.first_record_message')}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.statsGrid}>
                    <StatItem
                      label={t('fuel_entry.distance')}
                      value={`${derived.distanceKm}`}
                      unit="km"
                      icon="resize"
                      colors={colors}
                    />
                    <StatItem
                      label={t('fuel_entry.fuel')}
                      value={
                        derived.kWhNumber > 0
                          ? `${derived.kWhNumber}`
                          : derived.lpgLitersNumber > 0
                          ? `${derived.lpgLitersNumber}`
                          : `${derived.litersNumber}`
                      }
                      unit={derived.kWhNumber > 0 ? 'kWh' : 'L'}
                      icon={derived.kWhNumber > 0 ? "flash" : "water"}
                      colors={colors}
                    />
                    <StatItem
                      label={t('fuel_entry.total_cost')}
                      value={`₺${parseNumber(totalCost).toFixed(0)}`}
                      icon="wallet"
                      colors={colors}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.statsGrid}>
                    <StatItem
                      label={t('fuel_entry.distance')}
                      value={`${derived.distanceKm}`}
                      unit="km"
                      icon="resize"
                      colors={colors}
                    />
                    <StatItem
                      label={t('fuel_entry.consumption')}
                      value={derived.consumption > 0 ? `${derived.consumption.toFixed(1)}` : '-'}
                      unit={derived.fuelType}
                      icon={derived.kWhNumber > 0 ? "flash" : "speedometer"}
                      colors={colors}
                      highlight={derived.isHighConsumption}
                    />
                    <StatItem
                      label={t('fuel_entry.cost_per_km')}
                      value={`₺${derived.costPerKm.toFixed(2)}`}
                      icon="trending-up"
                      colors={colors}
                    />
                  </View>
                  {derived.isHighConsumption && (
                    <View style={[styles.warningBanner, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="warning" size={18} color="#D97706" />
                      <Text style={styles.warningText}>
                        {t('fuel_entry.high_consumption_warning')}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => router.back()}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                {t('common.cancel')}
              </Text>
            </Pressable>
            
            <Pressable
              disabled={createMutation.isPending || updateMutation.isPending}
              style={[styles.submitButton, { opacity: (createMutation.isPending || updateMutation.isPending) ? 0.7 : 1 }]}
              onPress={handleSubmit}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}>
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name={isEditMode ? "checkmark-circle" : "add-circle"} size={20} color="#FFF" />
                    <Text style={styles.submitButtonText}>
                      {isEditMode ? t('common.update') : t('common.save')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Form Field Component
type FormFieldProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  colors: ThemeColors;
  editable?: boolean;
  icon?: any;
  suffix?: string;
  flex?: number;
  highlight?: boolean;
};

const FormField = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
  colors,
  editable = true,
  icon,
  suffix,
  flex,
  highlight
}: FormFieldProps) => (
  <View style={[styles.fieldContainer, flex ? { flex } : undefined]}>
    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
    <View style={[
      styles.inputContainer,
      { 
        backgroundColor: colors.surfaceAlt, 
        borderColor: highlight ? colors.primary : colors.border,
        borderWidth: highlight ? 2 : 1
      },
      !editable && styles.inputDisabled
    ]}>
      {icon && (
        <View style={[styles.inputIcon, { backgroundColor: highlight ? colors.primary + '15' : 'transparent' }]}>
          <Ionicons name={icon} size={18} color={highlight ? colors.primary : colors.textMuted} />
        </View>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        style={[
          styles.input,
          { color: colors.textPrimary, minHeight: multiline ? 80 : 48 }
        ]}
      />
      {suffix && (
        <View style={[styles.suffixContainer, { backgroundColor: colors.border + '30' }]}>
          <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text>
        </View>
      )}
    </View>
  </View>
);

// Stat Item Component
const StatItem = ({ label, value, unit, icon, colors, highlight }: any) => (
  <View style={[
    styles.statItem,
    { backgroundColor: highlight ? '#FEF3C7' : colors.surfaceAlt }
  ]}>
    <View style={[
      styles.statIcon,
      { backgroundColor: highlight ? '#FCD34D' : colors.primary + '20' }
    ]}>
      <Ionicons name={icon} size={18} color={highlight ? '#D97706' : colors.primary} />
    </View>
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    <View style={styles.statValueRow}>
      <Text style={[styles.statValue, { color: highlight ? '#D97706' : colors.textPrimary }]}>
        {value}
      </Text>
      {unit && (
        <Text style={[styles.statUnit, { color: highlight ? '#D97706' : colors.textMuted }]}>
          {unit}
        </Text>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroHeader: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  vehicleList: {
    gap: 12,
    paddingRight: 20,
  },
  vehicleCard: {
    width: 130,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  vehicleIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  vehiclePlate: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  vehicleBrand: {
    fontSize: 12,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successCard: {
    backgroundColor: '#D1FAE5',
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  infoCardSubtitle: {
    fontSize: 12,
    color: '#047857',
  },
  formCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    gap: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldContainer: {
    gap: 6,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 48,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputIcon: {
    width: 36,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 0,
  },
  suffixContainer: {
    paddingHorizontal: 8,
    height: 48,
    justifyContent: 'center',
    flexShrink: 0,
  },
  suffix: {
    fontSize: 13,
    fontWeight: '600',
  },
  fuelTypeSection: {
    gap: 10,
  },
  fuelTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fuelTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  fuelTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceSection: {
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  priceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  adContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  firstRecordBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  firstRecordTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  firstRecordText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statUnit: {
    fontSize: 11,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#D97706',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
