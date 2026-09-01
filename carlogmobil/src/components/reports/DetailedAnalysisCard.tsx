import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { DetailedAnalysis } from '@/api/services/reports';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrency } from '@/hooks/useCurrency';
import { Ionicons } from '@expo/vector-icons';

interface DetailedAnalysisCardProps {
  analysis: DetailedAnalysis | null;
  isLoading: boolean;
  averageConsumption?: number; // Gerçek ortalama tüketim (L/100km veya kWh/100km)
  isElectricOrHybrid?: boolean; // Elektrikli veya hibrit araç mı?
}

export const DetailedAnalysisCard = ({ analysis, isLoading, averageConsumption, isElectricOrHybrid = false }: DetailedAnalysisCardProps) => {
  const { colors } = useAppTheme();
  const { t, locale } = useTranslation();
  const { currencySymbol } = useCurrency();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Ionicons name="alert-circle-outline" size={24} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('reports.no_enough_data')}</Text>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    // BCP 47 format: convert en_US to en-US
    const normalizedLocale = locale.replace('_', '-');
    return new Date(dateString).toLocaleDateString(normalizedLocale, { month: 'short', year: 'numeric' });
  };

  // Gerçek ortalama tüketim - Backend'den gelen değeri kullan
  // Elektrikli: kWh/100km (varsayılan 15), Diğer: L/100km (varsayılan 8)
  const avgConsumption = averageConsumption || (isElectricOrHybrid ? 15 : 8);

  // 3 aylık tahminler
  const threeMonthKm = Math.round(analysis.drivingHabits.averageDailyKm * 90);
  const threeMonthFuel = Math.round((threeMonthKm / 100) * avgConsumption);
  const threeMonthCost = Math.round(analysis.projection.predictedMonthlyCost * 3);

  // 6 aylık tahminler
  const sixMonthKm = Math.round(analysis.drivingHabits.averageDailyKm * 180);
  const sixMonthFuel = Math.round((sixMonthKm / 100) * avgConsumption);
  const sixMonthCost = Math.round(analysis.projection.predictedMonthlyCost * 6);

  // Yıllık tahminler
  const yearlyKm = Math.round(analysis.drivingHabits.averageDailyKm * 365);
  const yearlyFuel = Math.round((yearlyKm / 100) * avgConsumption);

  return (
    <View style={styles.container}>
      {/* Tüketim Rekorları */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('reports.consumption_records')}</Text>
        <View style={styles.row}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.success }]}>
            <View style={styles.headerRow}>
              <Ionicons name="arrow-down-circle-outline" size={16} color={colors.success} />
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('reports.best')}</Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
              {analysis.consumption.best?.value} {isElectricOrHybrid ? 'kWh/100km' : 'L/100km'}
            </Text>
            <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>{formatDate(analysis.consumption.best?.date || '')}</Text>
          </View>
          
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
            <View style={styles.headerRow}>
              <Ionicons name="arrow-up-circle-outline" size={16} color={colors.danger} />
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('reports.worst')}</Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
              {analysis.consumption.worst?.value} {isElectricOrHybrid ? 'kWh/100km' : 'L/100km'}
            </Text>
            <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>{formatDate(analysis.consumption.worst?.date || '')}</Text>
          </View>
        </View>
      </View>

      {/* Sürüş Alışkanlıkları */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('reports.driving_habits')}</Text>
        <View style={styles.row}>
          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="pulse-outline" size={20} color={colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{analysis.drivingHabits.averageDailyKm} km</Text>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('reports.daily_average')}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.warning} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{analysis.drivingHabits.averageDaysBetweenRefuel} {t('reports.days')}</Text>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('reports.refuel_frequency')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Maliyet Tahminleri */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('reports.cost_estimates')}</Text>
        <View style={[styles.predictionCard, { backgroundColor: colors.primary }]}>
          <View style={styles.predictionHeader}>
            <Ionicons name="wallet-outline" size={20} color="#FFF" />
            <Text style={styles.predictionTitle}>{t('reports.estimated_yearly_cost')}</Text>
          </View>
          <Text style={styles.predictionValue}>
            {currencySymbol}{analysis.projection.predictedYearlyCost.toLocaleString('tr-TR')}
          </Text>
          <Text style={styles.predictionSubtext}>
            ({t('reports.monthly_avg')} {currencySymbol}{analysis.projection.predictedMonthlyCost.toLocaleString('tr-TR')})
          </Text>
        </View>
      </View>

      {/* Gelecek Tahminleri - Kompakt */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('reports.future_predictions')}</Text>
        
        {/* 3 Aylık */}
        <View style={[styles.compactEstimateRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={styles.compactPeriodLabel}>
            <Text style={[styles.periodText, { color: colors.primary }]}>{t('reports.three_months')}</Text>
          </View>
          <View style={styles.compactEstimateItem}>
            <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.compactValue, { color: colors.textPrimary }]}>{threeMonthKm.toLocaleString('tr-TR')} km</Text>
          </View>
          <View style={styles.compactEstimateItem}>
            <Ionicons name={isElectricOrHybrid ? "flash-outline" : "water-outline"} size={14} color={colors.textSecondary} />
            <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
              {threeMonthFuel.toLocaleString('tr-TR')} {isElectricOrHybrid ? 'kWh' : 'L'}
            </Text>
          </View>
          <View style={styles.compactEstimateItem}>
            <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.compactValue, { color: colors.success }]}>{currencySymbol}{threeMonthCost.toLocaleString('tr-TR')}</Text>
          </View>
        </View>

        {/* 6 Aylık */}
        <View style={[styles.compactEstimateRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={styles.compactPeriodLabel}>
            <Text style={[styles.periodText, { color: colors.warning }]}>{t('reports.six_months')}</Text>
          </View>
          <View style={styles.compactEstimateItem}>
            <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.compactValue, { color: colors.textPrimary }]}>{sixMonthKm.toLocaleString('tr-TR')} km</Text>
          </View>
          <View style={styles.compactEstimateItem}>
            <Ionicons name={isElectricOrHybrid ? "flash-outline" : "water-outline"} size={14} color={colors.textSecondary} />
            <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
              {sixMonthFuel.toLocaleString('tr-TR')} {isElectricOrHybrid ? 'kWh' : 'L'}
            </Text>
          </View>
          <View style={styles.compactEstimateItem}>
            <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.compactValue, { color: colors.danger }]}>{currencySymbol}{sixMonthCost.toLocaleString('tr-TR')}</Text>
          </View>
        </View>

        {/* Yıllık */}
        <View style={[styles.compactEstimateRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={styles.compactPeriodLabel}>
            <Text style={[styles.periodText, { color: colors.danger }]}>{t('reports.one_year')}</Text>
          </View>
          <View style={styles.compactEstimateItem}>
            <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.compactValue, { color: colors.textPrimary }]}>{yearlyKm.toLocaleString('tr-TR')} km</Text>
          </View>
          <View style={styles.compactEstimateItem}>
            <Ionicons name={isElectricOrHybrid ? "flash-outline" : "water-outline"} size={14} color={colors.textSecondary} />
            <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
              {yearlyFuel.toLocaleString('tr-TR')} {isElectricOrHybrid ? 'kWh' : 'L'}
            </Text>
          </View>
          <View style={styles.compactEstimateItem}>
            <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.compactValue, { color: colors.textPrimary }]}>{currencySymbol}{Math.round(analysis.projection.predictedYearlyCost).toLocaleString('tr-TR')}</Text>
          </View>
        </View>
      </View>

      {/* Yakıt/Elektrik Fiyatları */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {t('reports.average_fuel_price')}: {analysis.fuelPrices.averagePrice} {analysis.fuelPrices.unit || (isElectricOrHybrid ? `${currencySymbol}/kWh` : `${currencySymbol}/L`)} • {t('reports.last')}: {analysis.fuelPrices.lastPrice} {analysis.fuelPrices.unit || (isElectricOrHybrid ? `${currencySymbol}/kWh` : `${currencySymbol}/L`)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTextContainer: {
    gap: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoLabel: {
    fontSize: 12,
  },
  predictionCard: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  predictionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
  predictionValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  predictionSubtext: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 11,
  },
  compactEstimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  compactPeriodLabel: {
    width: 45,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
  },
  compactEstimateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactValue: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
