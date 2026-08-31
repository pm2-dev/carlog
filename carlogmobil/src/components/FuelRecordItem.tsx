import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrency } from '@/hooks/useCurrency';
import { FuelEntry } from '@/types/domain';

interface FuelRecordItemProps {
  item: FuelEntry;
  onDelete: (id: string) => void;
  onEdit: (item: FuelEntry) => void;
  averageConsumption?: number; // Araç ortalama tüketimi (opsiyonel)
  recordIndex?: number; // Kaydın sırası (tarihe göre sıralı listede)
  totalRecords?: number; // Toplam kayıt sayısı
}

export const FuelRecordItem = ({ item, onDelete, onEdit, averageConsumption, recordIndex, totalRecords }: FuelRecordItemProps) => {
  const { colors } = useAppTheme();
  const { locale } = useTranslation();
  const { currencySymbol } = useCurrency();

  // Güvenli erişim için null kontrolü
  if (!item || !item.id) {
    return null;
  }

  // İlk kayıt mı kontrol et (en eski kayıt = ilk kayıt)
  // recordIndex son kayıttan başlar (0 = en yeni), totalRecords-1 = en eski (ilk kayıt)
  const safeRecordIndex = recordIndex ?? 0;
  const safeTotalRecords = totalRecords ?? 0;
  const isFirstRecord = safeTotalRecords > 0 && safeRecordIndex === safeTotalRecords - 1;
  
  // Debug log
  if (__DEV__) {
    console.log(`[FuelRecord] ${item.vehicle?.plate ?? 'N/A'} - Index: ${safeRecordIndex}, Total: ${safeTotalRecords}, First: ${isFirstRecord}`);
  }

  // Yakıt tipleri kontrolü
  const fuelTypes = item.vehicle?.fuelTypes ?? [];
  const hasElektrik = fuelTypes.includes('ELEKTRIK') || fuelTypes.includes('HIBRIT');
  const hasLiters = (item.liters ?? 0) > 0;
  const hasLpgLiters = (item.lpgLiters ?? 0) > 0;
  const hasKWh = (item.kWh ?? 0) > 0;
  
  // Eski uyumluluk için
  const isElectricOrHybrid = hasElektrik;
  
  // Kullanılan yakıt türleri
  const usedFuels = [];
  if (hasLiters) usedFuels.push('Benzin');
  if (hasLpgLiters) usedFuels.push('LPG');
  if (hasKWh) usedFuels.push('Elektrik');
  
  // Birden fazla yakıt türü kullanılmış mı?
  const isMixedHybrid = usedFuels.length > 1;
  
  // Yakıt miktarı ve birimi
  let fuelAmount = (item.liters ?? 0) + (item.lpgLiters ?? 0) + (item.kWh ?? 0);
  let fuelUnit = '';
  
  if (usedFuels.length > 1) {
    fuelUnit = 'karma';
  } else if (hasKWh) {
    fuelAmount = item.kWh ?? 0;
    fuelUnit = 'kWh';
  } else if (hasLpgLiters) {
    fuelAmount = item.lpgLiters ?? 0;
    fuelUnit = 'L (LPG)';
  } else {
    fuelAmount = item.liters ?? 0;
    fuelUnit = 'L';
  }
  
  // Tüketim seviyesi hesaplama (kWh veya L bazlı)
  // İlk kayıtta tüketim hesaplanmaz
  const distanceKm = item.distanceKm ?? 0;
  const currentConsumption = !isFirstRecord && distanceKm > 0 && fuelAmount > 0
    ? (fuelAmount / distanceKm) * 100 
    : 0;
  
  // Tüketim kategorisi belirleme
  const getConsumptionLevel = () => {
    // İlk kayıtta tüketim seviyesi gösterme
    if (isFirstRecord) {
      return null;
    }
    
    if (!averageConsumption || averageConsumption <= 0 || currentConsumption <= 0) {
      return null;
    }
    
    // %10'dan daha az = Ekonomik
    if (currentConsumption < averageConsumption * 0.90) {
      return 'economic';
    }
    // %10 altı ile %20 üstü arası = Ortalama
    else if (currentConsumption <= averageConsumption * 1.20) {
      return 'average';
    }
    // %20'den fazla = Yüksek
    else {
      return 'high';
    }
  };
  
  const consumptionLevel = getConsumptionLevel();

  const renderRightActions = (progress: any, dragX: any) => {
    return (
      <View style={styles.rightActionsContainer}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => onEdit(item)}>
          <Feather name="edit-2" size={20} color="#FFF" />
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.danger }]}
          onPress={() => {
            Alert.alert(
              'Kaydı Sil',
              'Bu yakıt kaydını silmek istediğinize emin misiniz?',
              [
                { text: 'Vazgeç', style: 'cancel' },
                { 
                  text: 'Sil', 
                  style: 'destructive', 
                  onPress: () => onDelete(item.id) 
                },
              ]
            );
          }}>
          <Feather name="trash-2" size={20} color="#FFF" />
        </Pressable>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipeContainer}>
      <View style={[styles.container, { backgroundColor: colors.surfaceAlt }]}>
        <View style={styles.leftContent}>
          <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
            <Feather name={isElectricOrHybrid ? "zap" : "droplet"} size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.plate, { color: colors.textPrimary }]}>
              {item.vehicle?.plate || 'Plaka Yok'}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {item.refuelDate ? new Date(item.refuelDate).toLocaleDateString((locale ?? 'tr').replace('_', '-'), {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : '-'}
              {item.createdAt && (
                <Text> • {new Date(item.createdAt).toLocaleTimeString((locale ?? 'tr').replace('_', '-'), {
                  hour: '2-digit',
                  minute: '2-digit'
                })}</Text>
              )}
            </Text>
            {item.note && item.note.trim() !== '' && (
              <View style={styles.noteContainer}>
                <Feather name="file-text" size={10} color={colors.textMuted} />
                <Text style={[styles.note, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.note}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rightContent}>
          <Text style={[styles.cost, { color: colors.textPrimary }]}>
            {currencySymbol}{(item.totalCost ?? 0).toLocaleString((locale ?? 'tr').replace('_', '-'), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          
          {/* Hibrit araçlarda her iki yakıt türü de varsa özel gösterim */}
          {isMixedHybrid ? (
            <View style={styles.details}>
              <View style={styles.hybridFuelContainer}>
                <View style={styles.hybridFuelItem}>
                  <Feather name="droplet" size={10} color={colors.textSecondary} />
                  <Text style={[styles.hybridFuelText, { color: colors.textSecondary }]}>
                    {(item.liters ?? 0).toFixed(1)} L
                  </Text>
                </View>
                <Text style={[styles.dot, { color: colors.textMuted }]}>+</Text>
                <View style={styles.hybridFuelItem}>
                  <Feather name="zap" size={10} color={colors.textSecondary} />
                  <Text style={[styles.hybridFuelText, { color: colors.textSecondary }]}>
                    {(item.kWh ?? 0).toFixed(1)} kWh
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.details}>
              <Text style={[styles.liters, { color: colors.textSecondary }]}>
                {fuelAmount > 0 
                  ? `${fuelAmount.toFixed(1)} ${fuelUnit}`
                  : (isElectricOrHybrid ? '0.0 kWh' : '0.0 L')
                }
              </Text>
              {/* İlk kayıt değilse ve mesafe/yakıt varsa tüketimi göster */}
              {!isFirstRecord && distanceKm > 0 && fuelAmount > 0 && (
                <>
                  <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
                  <Text style={[
                    styles.efficiency, 
                    { color: consumptionLevel === 'high' ? '#D32F2F' : 
                             consumptionLevel === 'economic' ? '#2E7D32' : 
                             colors.primary }
                  ]}>
                    {currentConsumption.toFixed(1)} {fuelUnit === 'kWh' ? 'kWh/100km' : 'L/100km'}
                  </Text>
                </>
              )}
            </View>
          )}
          
          {consumptionLevel && (
            <View style={[
              styles.consumptionBadge, 
              { backgroundColor: consumptionLevel === 'high' ? '#D32F2F' : 
                                 consumptionLevel === 'economic' ? '#2E7D32' : 
                                 '#FF9800' }
            ]}>
              <Feather 
                name={consumptionLevel === 'high' ? 'alert-circle' : 
                      consumptionLevel === 'economic' ? 'check-circle' : 
                      'minus-circle'} 
                size={10} 
                color="#FFF" 
              />
              <Text style={styles.badgeText}>
                {consumptionLevel === 'high' ? 'Yüksek Tüketim' : 
                 consumptionLevel === 'economic' ? 'Ekonomik' : 
                 'Ortalama'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plate: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  note: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
  },
  rightContent: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cost: {
    fontSize: 16,
    fontWeight: '700',
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hybridFuelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hybridFuelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  hybridFuelText: {
    fontSize: 11,
    fontWeight: '500',
  },
  consumptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  liters: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    fontSize: 12,
  },
  efficiency: {
    fontSize: 12,
    fontWeight: '600',
  },
  rightActionsContainer: {
    flexDirection: 'row',
    width: 120,
    height: '100%',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

