import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useCreateVehicle, useUpdateVehicle, useVehicle } from '@/hooks/queries/useVehicleQueries';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import type { VehicleCategory, FuelType, Vehicle } from '@/types/domain';
import { ActivityIndicator } from 'react-native';
import { useEffect } from 'react';

type Props = {
  visible: boolean;
  onClose: () => void;
  vehicleId?: string; // Düzenleme için araç ID'si
};

const CATEGORIES: { label: string; value: VehicleCategory }[] = [
  { label: 'Otomobil', value: 'OTOMOBIL' },
  { label: 'Motosiklet', value: 'MOTOSIKLET' },
  { label: 'Kamyonet', value: 'KAMYONET' },
  { label: 'Ağır Vasıta', value: 'AGIR_VASITA' },
  { label: 'Diğer', value: 'DIGER' },
];

const FUEL_TYPES: { label: string; value: FuelType }[] = [
  { label: 'Benzin', value: 'BENZIN' },
  { label: 'Dizel', value: 'DIZEL' },
  { label: 'LPG', value: 'LPG' },
  { label: 'Hibrit', value: 'HIBRIT' },
  { label: 'Elektrik', value: 'ELEKTRIK' },
];

export function AddVehicleModal({ visible, onClose, vehicleId }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(vehicleId || '');
  
  const isEditMode = !!vehicleId;

  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [category, setCategory] = useState<VehicleCategory>('OTOMOBIL');
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>(['BENZIN']);
  const [currentOdometer, setCurrentOdometer] = useState('');

  // Category key mapping for translation
  const getCategoryKey = (category: VehicleCategory) => {
    const categoryMap: Record<VehicleCategory, string> = {
      'OTOMOBIL': 'otomobil',
      'MOTOSIKLET': 'motosiklet',
      'KAMYONET': 'kamyonet',
      'AGIR_VASITA': 'agir_vasita',
      'DIGER': 'diger'
    };
    return categoryMap[category];
  };

  // Fuel type key mapping for translation
  const getFuelTypeKey = (fuelType: FuelType) => {
    const fuelMap: Record<FuelType, string> = {
      'BENZIN': 'benzin',
      'DIZEL': 'dizel',
      'LPG': 'lpg',
      'ELEKTRIK': 'elektrik',
      'HIBRIT': 'hibrit'
    };
    return fuelMap[fuelType];
  };

  const toggleFuelType = (fuel: FuelType) => {
    setFuelTypes(prev => {
      if (prev.includes(fuel)) {
        // En az bir yakıt tipi seçili kalmalı
        if (prev.length === 1) {
          Alert.alert(t('common.error'), t('vehicles.fuel_type_required'));
          return prev;
        }
        return prev.filter(f => f !== fuel);
      } else {
        return [...prev, fuel];
      }
    });
  };

  // Düzenleme modunda araç verilerini yükle
  useEffect(() => {
    if (vehicle && isEditMode) {
      setPlate(vehicle.plate || '');
      setBrand(vehicle.brand || '');
      setModel(vehicle.model || '');
      setModelYear(vehicle.modelYear ? vehicle.modelYear.toString() : '');
      setCategory(vehicle.category || 'OTOMOBIL');
      setFuelTypes(vehicle.fuelTypes || ['BENZIN']);
      setCurrentOdometer(vehicle.currentOdometer ? vehicle.currentOdometer.toString() : '');
    }
  }, [vehicle, isEditMode]);

  const handleSubmit = () => {
    if (!plate || !brand || !model) {
      Alert.alert(t('common.error'), t('vehicles.fill_required_fields'));
      return;
    }

    if (fuelTypes.length === 0) {
      Alert.alert(t('common.error'), t('vehicles.fuel_type_required'));
      return;
    }

    const vehicleData = {
      plate,
      brand,
      model,
      modelYear: modelYear ? parseInt(modelYear) : undefined,
      category,
      fuelTypes,
      currentOdometer: currentOdometer ? parseInt(currentOdometer) : 0,
    };

    if (isEditMode && vehicleId) {
      // Güncelleme
      updateMutation.mutate(
        { id: vehicleId, data: vehicleData },
        {
          onSuccess: () => {
            Alert.alert(t('common.success'), t('vehicles.vehicle_updated_success'));
            resetForm();
            onClose();
          },
          onError: (error: any) => {
            Alert.alert(t('common.error'), error.response?.data?.message || t('vehicles.vehicle_update_error'));
          },
        }
      );
    } else {
      // Ekleme
      createMutation.mutate(
        vehicleData,
        {
          onSuccess: () => {
            Alert.alert(t('common.success'), t('vehicles.vehicle_added_success'));
            resetForm();
            onClose();
          },
          onError: (error: any) => {
            Alert.alert(t('common.error'), error.response?.data?.message || t('vehicles.vehicle_add_error'));
          },
        }
      );
    }
  };

  const resetForm = () => {
    setPlate('');
    setBrand('');
    setModel('');
    setModelYear('');
    setCategory('OTOMOBIL');
    setFuelTypes(['BENZIN']);
    setCurrentOdometer('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isEditMode ? t('vehicles.edit_vehicle') : t('vehicles.add_vehicle')}
          </Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>{t('common.cancel')}</Text>
          </Pressable>
        </View>

        {vehicleLoading && isEditMode ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('vehicles.plate')}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
              placeholder="34 ABC 123"
              placeholderTextColor={colors.textMuted}
              value={plate}
              onChangeText={setPlate}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('vehicles.brand')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
                placeholder="Toyota"
                placeholderTextColor={colors.textMuted}
                value={brand}
                onChangeText={setBrand}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('vehicles.model')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
                placeholder="Corolla"
                placeholderTextColor={colors.textMuted}
                value={model}
                onChangeText={setModel}
              />
            </View>
          </View>

          <View style={styles.row}>
             <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('vehicles.year')}</Text>
                <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
                    placeholder="2023"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={modelYear}
                    onChangeText={setModelYear}
                />
             </View>
             <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('vehicles.current_odometer')}</Text>
                <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
                    placeholder="15000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={currentOdometer}
                    onChangeText={setCurrentOdometer}
                />
             </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('vehicles.category')}</Text>
            <View style={styles.optionsRow}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={[
                    styles.optionChip,
                    { 
                        backgroundColor: category === cat.value ? colors.primary : colors.surfaceAlt,
                        borderColor: category === cat.value ? colors.primary : colors.border 
                    },
                  ]}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: category === cat.value ? '#FFF' : colors.textSecondary },
                    ]}>
                    {t(`vehicles.category_${getCategoryKey(cat.value)}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('vehicles.fuel_types_multiple')}</Text>
            <View style={styles.optionsRow}>
              {FUEL_TYPES.map((fuel) => {
                const isSelected = fuelTypes.includes(fuel.value);
                return (
                  <Pressable
                    key={fuel.value}
                    onPress={() => toggleFuelType(fuel.value)}
                    style={[
                      styles.optionChip,
                      { 
                          backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                          borderColor: isSelected ? colors.primary : colors.border 
                      },
                    ]}>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? '#FFF' : colors.textSecondary },
                      ]}>
                      {t(`vehicles.fuel_type_${getFuelTypeKey(fuel.value)}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {fuelTypes.length > 1 && (
              <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 }}>
                {t('vehicles.selected')}: {fuelTypes.map(ft => t(`vehicles.fuel_type_${getFuelTypeKey(ft)}`)).join(', ')}
              </Text>
            )}
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            style={[styles.submitButton, { backgroundColor: colors.primary }]}>
            {(createMutation.isPending || updateMutation.isPending) ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <Text style={styles.submitButtonLabel}>
                  {isEditMode ? t('common.update') : t('vehicles.save_vehicle')}
                </Text>
            )}
          </Pressable>
        </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

