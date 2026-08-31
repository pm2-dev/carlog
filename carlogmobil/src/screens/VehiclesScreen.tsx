import { useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useVehicles } from '@/hooks/queries/useVehicleQueries';
import { AddVehicleModal } from '@/components/AddVehicleModal';
import type { VehicleCategory } from '@/types/domain';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const CATEGORY_LABELS: Record<string, string> = {
  OTOMOBIL: 'Otomobil',
  MOTOSIKLET: 'Motosiklet',
  KAMYONET: 'Kamyonet',
  AGIR_VASITA: 'Ağır Vasıta',
  DIGER: 'Diğer',
};

export default function VehiclesScreen() {
  const { colors } = useAppTheme();
  const [isModalVisible, setModalVisible] = useState(false);

  const { data: vehicles, isLoading, refetch } = useVehicles();

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);
  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const groupedVehicles = useMemo(() => {
    if (!vehicles) return {};
    return vehicles.reduce<Record<string, number>>((acc, vehicle) => {
      acc[vehicle.category] = (acc[vehicle.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [vehicles]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Screen scrollable refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Araçlar</Text>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          Tüm araçlarınızı yönetin.
        </Text>
      </View>

      <SectionCard>
        <SectionHeader subtitle="Kategori dağılımı">Araç Özeti</SectionHeader>
        {Object.keys(groupedVehicles).length > 0 ? (
            <View style={styles.chipRow}>
            {Object.entries(groupedVehicles).map(([key, count]) => (
                <View key={key} style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>
                    {CATEGORY_LABELS[key] || key}
                </Text>
                <Text style={[styles.chipValue, { color: colors.textPrimary }]}>{count}</Text>
                </View>
            ))}
            </View>
        ) : (
            <Text style={{ color: colors.textMuted, marginBottom: 16 }}>Henüz araç eklenmemiş.</Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => setModalVisible(true)}
          style={[styles.button, { borderColor: colors.border }]}>
          <Text style={[styles.buttonLabel, { color: colors.primary }]}>Araç Ekle</Text>
        </Pressable>
      </SectionCard>

      {vehicles?.map((vehicle) => (
        <SectionCard key={vehicle.id}>
          <SectionHeader subtitle={`${vehicle.brand} ${vehicle.model} · ${vehicle.modelYear || '-'}`}>
            {vehicle.plate}
          </SectionHeader>
          <View style={styles.vehicleMeta}>
            <VehicleInfo label="Kategori" value={CATEGORY_LABELS[vehicle.category] || vehicle.category} />
            <VehicleInfo label="Yakıt" value={(vehicle.fuelTypes || []).join(', ')} />
            <VehicleInfo label="Güncel KM" value={vehicle.currentOdometer.toLocaleString('tr-TR')} />
          </View>
        </SectionCard>
      ))}

      <AddVehicleModal visible={isModalVisible} onClose={() => setModalVisible(false)} />
    </Screen>
  );
}

type VehicleInfoProps = {
  label: string;
  value: string | number;
};

const VehicleInfo = ({ label, value }: VehicleInfoProps) => {
  const { colors } = useAppTheme();
  return (
    <View style={styles.infoBlock}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
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
  button: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 14,
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
});
