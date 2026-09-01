import { useMemo, useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrency } from '@/hooks/useCurrency';
import { useVehicles } from '@/hooks/queries/useVehicleQueries';
import { useFuelEntries } from '@/hooks/queries/useFuelQueries';
import { useMonthlyExpenses, useSeasonalStats, useVehicleStats, useConsumptionChart, useDetailedAnalysis, useTotalCostOfOwnership } from '@/hooks/queries/useReportQueries';
import { ChartPeriod } from '@/api/services/reports';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { DetailedAnalysisCard } from '@/components/reports/DetailedAnalysisCard';
import { useRouter } from 'expo-router';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export default function ReportsScreen() {
  const { colors, resolvedScheme } = useAppTheme();
  const isDark = resolvedScheme === 'dark';
  const { t } = useTranslation();
  const { currencySymbol } = useCurrency();
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const router = useRouter();
  
  const PERIODS: { label: string; value: ChartPeriod }[] = [
    { label: '1 ' + t('common.month'), value: '1m' },
    { label: '3 ' + t('common.months'), value: '3m' },
    { label: '6 ' + t('common.months'), value: '6m' },
    { label: '1 ' + t('common.year'), value: '1y' },
  ];
  
  // Araçları çek
  const { data: vehicles, isLoading: isLoadingVehicles } = useVehicles();
  
  // Varsayılan olarak ilk aracı seç
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>('6m');
  const [chartFallbackApplied, setChartFallbackApplied] = useState(false);

  // Araçlar yüklendiğinde ve seçim yoksa ilkini seç (yan etki → useEffect)
  useEffect(() => {
    if (vehicles && vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  useEffect(() => {
    setChartFallbackApplied(false);
  }, [selectedVehicleId]);

  const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);
  const currentYear = new Date().getFullYear();

  // Araç seçili değilken rapor API'lerini çağırma
  const hasVehicleSelected = !!selectedVehicleId;

  // Seçili araç için yakıt kayıtlarını çek
  const { data: fuelEntriesData, isLoading: isLoadingFuelEntries, refetch: refetchFuelEntries } = useFuelEntries(
    selectedVehicleId || '',
    { enabled: hasVehicleSelected }
  );
  
  // Kayıt sayısını hesapla
  const fuelEntryCount = useMemo(() => {
    if (!fuelEntriesData) return 0;
    return fuelEntriesData.length;
  }, [fuelEntriesData]);

  // İstatistikleri çek
  const { data: vehicleStatsData, isLoading: isLoadingStats, refetch: refetchStats } = useVehicleStats(selectedVehicleId || '');
  const { data: seasonalData, isLoading: isLoadingSeasonal, refetch: refetchSeasonal } = useSeasonalStats(
    selectedVehicleId || '',
    currentYear,
    { enabled: hasVehicleSelected }
  );
  const { data: chartData, isLoading: isLoadingChart, refetch: refetchChart } = useConsumptionChart(
    selectedPeriod,
    selectedVehicleId || undefined,
    { enabled: hasVehicleSelected }
  );
  const { data: detailedAnalysis, isLoading: isLoadingDetailed, refetch: refetchDetailed, error: detailedError } = useDetailedAnalysis(selectedVehicleId || '');
  const { data: tcoData, isLoading: isLoadingTco, refetch: refetchTco } = useTotalCostOfOwnership(selectedVehicleId || '');

  const consumptionUnit = vehicleStatsData?.stats.unit ?? (
    selectedVehicle?.fuelTypes?.includes('ELEKTRIK') &&
    !selectedVehicle?.fuelTypes?.some((t) => t === 'BENZIN' || t === 'DIZEL' || t === 'LPG' || t === 'HIBRIT')
      ? 'kWh/100km'
      : 'L/100km'
  );
  const usesElectricMetrics = consumptionUnit.startsWith('kWh');

  // Log status briefly
  useEffect(() => {
    if (detailedError) console.log('Detailed Analysis Error:', detailedError);
    if (detailedAnalysis) console.log('Detailed Analysis: Loaded successfully');
  }, [detailedAnalysis, detailedError]);

  const isLoading = isLoadingVehicles || (selectedVehicleId && isLoadingStats) || isLoadingSeasonal || isLoadingChart || isLoadingDetailed || isLoadingFuelEntries;

  // Grafik sorgusu boş dönerse otomatik 1 yıllık fallback dene (araç yokken çalıştırma → gereksiz döngü/istek)
  useEffect(() => {
    if (!selectedVehicleId) return;

    const hasData = (chartData?.length ?? 0) > 0;
    if (hasData && chartFallbackApplied) {
      setChartFallbackApplied(false);
      return;
    }

    if (!isLoadingChart && !hasData && selectedPeriod !== '1y' && !chartFallbackApplied) {
      setChartFallbackApplied(true);
      setSelectedPeriod('1y');
    }
  }, [chartData, isLoadingChart, selectedPeriod, chartFallbackApplied, selectedVehicleId]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchStats(),
      refetchSeasonal(),
      refetchChart(),
      refetchDetailed(),
      refetchFuelEntries(),
      refetchTco(),
    ]);
  }, [refetchStats, refetchSeasonal, refetchChart, refetchDetailed, refetchFuelEntries, refetchTco]);

  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  // Month name translation helper
  const translateMonth = (monthName: string): string => {
    const monthMap: Record<string, string> = {
      'Ocak': t('months.january'),
      'Şubat': t('months.february'),
      'Mart': t('months.march'),
      'Nisan': t('months.april'),
      'Mayıs': t('months.may'),
      'Haziran': t('months.june'),
      'Temmuz': t('months.july'),
      'Ağustos': t('months.august'),
      'Eylül': t('months.september'),
      'Ekim': t('months.october'),
      'Kasım': t('months.november'),
      'Aralık': t('months.december'),
    };
    return monthMap[monthName] || monthName;
  };

  const chartDataFormatted = useMemo(() => {
    if (!chartData) {
      console.log('❌ Chart Data Yok');
      return [];
    }
    console.log('✅ Chart Data:', chartData.length, 'items');
    return chartData.map(item => {
        const valueRaw = Number(item.consumption || 0);
        const value = Number.isFinite(valueRaw) ? valueRaw : 0;
        return {
            value,
            label: translateMonth(item.label),
            dataPointText: value > 0 ? value.toFixed(value >= 10 ? 0 : 1) : '0',
            totalCost: Number(item.totalCost || 0)
        };
    });
  }, [chartData, t]);
  
  const barDataFormatted = useMemo(() => {
      if (!chartData || chartData.length === 0) return [];
      const safeValues = chartData.map(d => Number(d.totalCost || 0));
      const maxValue = Math.max(...safeValues, 0);
      const divisor = maxValue > 0 ? maxValue : 1;

      return chartData.map((item) => {
          const safeCost = Number(item.totalCost || 0);
          const intensity = safeCost / divisor;
          const color = intensity > 0.7 ? '#EF4444' : intensity > 0.4 ? '#F59E0B' : colors.primary;
          return {
              value: safeCost,
              label: translateMonth(item.label),
              frontColor: color,
          };
      });
  }, [chartData, colors]);

  return (
    <Screen scrollable refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('reports.title')}</Text>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {t('reports.monthly_analysis')}
        </Text>
      </View>

      {/* AdMob Reklam Banner */}
      {/* <AdBanner isPremium={isPremium} /> */}

      {/* Araç Seçimi (Basit Tab) */}
      <View style={styles.vehicleTabsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.vehicleTabsScroll}
          contentContainerStyle={styles.tabContainer}>
          {vehicles?.map(vehicle => (
            <Pressable
              key={vehicle.id}
              onPress={() => setSelectedVehicleId(vehicle.id)}
              style={[
                styles.tabItem,
                {
                  backgroundColor: selectedVehicleId === vehicle.id ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              <Text
                style={[
                  styles.tabLabel,
                  { color: selectedVehicleId === vehicle.id ? '#FFF' : colors.textSecondary },
                ]}>
                {vehicle.plate}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {!selectedVehicleId ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted }}>{t('reports.no_data')}</Text>
        </View>
      ) : fuelEntryCount === 0 ? (
        // Hiç kayıt yokken gösterilecek empty state
        <View style={[styles.emptyStateContainer, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.emptyStateIconBox, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="document-text-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
            {t('reports.no_records_title')}
          </Text>
          <Text style={[styles.emptyStateMessage, { color: colors.textSecondary }]}>
            {t('reports.no_records_message')}
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)')}
            style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.emptyStateButtonText}>{t('reports.add_first_record')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
            {/* İlk Kayıt Bilgilendirme Mesajı - Sadece 1 kayıt varsa göster */}
            {fuelEntryCount === 1 && (
              <View style={[styles.warningCard, { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' }]}>
                <View style={styles.warningHeader}>
                  <View style={[styles.warningIconBox, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="information-circle" size={24} color="#FFF" />
                  </View>
                  <View style={styles.warningContent}>
                    <Text style={[styles.warningTitle, { color: '#1E40AF' }]}>
                      {t('reports.waiting_second_record_title')}
                    </Text>
                    <Text style={[styles.warningDescription, { color: '#1E3A8A' }]}>
                      {t('reports.waiting_second_record_message')}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Özet Kartlar */}
            <View style={styles.cardsRow}>
                <StatBox 
                    label={t('reports.avg_consumption')}
                    value={fuelEntryCount < 2 
                      ? t('dashboard.no_records')
                      : `${vehicleStatsData?.stats.averageConsumption.toFixed(1) ?? 0} ${vehicleStatsData?.stats.unit ?? consumptionUnit}`
                    } 
                    colors={colors}
                    icon="speedometer-outline"
                    isDisabled={fuelEntryCount < 2}
                />
                <StatBox 
                    label={t('reports.cost_per_km')}
                    value={fuelEntryCount < 2 
                      ? t('dashboard.no_records')
                      : `${currencySymbol}${vehicleStatsData?.stats.costPerKm.toFixed(2) ?? 0}`
                    } 
                    colors={colors}
                    icon="cash-outline"
                    isDisabled={fuelEntryCount < 2}
                />
            </View>
            <View style={styles.cardsRow}>
                <StatBox 
                    label={t('reports.total_spent')}
                    value={`${currencySymbol}${vehicleStatsData?.stats.totalCost.toLocaleString('tr-TR') ?? 0}`} 
                    colors={colors}
                    icon="wallet-outline"
                />
                <StatBox 
                    label={t('reports.tracked_distance')}
                    value={`${vehicleStatsData?.stats.totalDistance.toLocaleString('tr-TR') ?? 0} ${t('units.km')}`} 
                    colors={colors}
                    icon="navigate-outline"
                    caption={`${t('reports.current_km')}: ${(vehicleStatsData?.stats.currentOdometer ?? selectedVehicle?.currentOdometer ?? 0).toLocaleString('tr-TR')} ${t('units.km')}`}
                />
            </View>

            {/* Grafik Bölümü */}
            <SectionCard>
                <SectionHeader subtitle={t('reports.monthly_analysis')}>{t('reports.monthly_analysis')}</SectionHeader>
                <View style={{ marginTop: 16 }}>
                    <DetailedAnalysisCard 
                        analysis={detailedAnalysis ?? null} 
                        isLoading={isLoadingDetailed}
                        averageConsumption={vehicleStatsData?.stats.averageConsumption}
                        isElectricOrHybrid={usesElectricMetrics}
                    />
                </View>
            </SectionCard>

            <SectionCard>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <SectionHeader subtitle={t('reports.consumption_trend')}>{t('reports.consumption_trend')}</SectionHeader>
                </View>
                
                {/* Periyot Seçimi */}
                <View style={styles.periodSelector}>
                    {PERIODS.map((p) => (
                        <Pressable 
                            key={p.value} 
                            onPress={() => setSelectedPeriod(p.value)}
                            style={[
                                styles.periodButton,
                                { 
                                    borderColor: selectedPeriod === p.value ? colors.primary : colors.border, 
                                    backgroundColor: selectedPeriod === p.value ? colors.surfaceAlt : 'transparent' 
                                }
                            ]}
                        >
                            <Text style={[
                                styles.periodButtonText,
                                { color: selectedPeriod === p.value ? colors.primary : colors.textSecondary, fontWeight: selectedPeriod === p.value ? '700' : '400' }
                            ]}>{p.label}</Text>
                        </Pressable>
                    ))}
                </View>

                {chartFallbackApplied && selectedPeriod === '1y' && (chartData?.length ?? 0) > 0 && (
                  <View style={{ paddingVertical: 8 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {t('reports.no_data')}
                    </Text>
                  </View>
                )}

                {isLoadingChart ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                ) : chartDataFormatted.length === 0 ? (
                    <View style={[styles.emptyChartContainer, { backgroundColor: colors.background }]}>
                        <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} />
                        <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
                            {t('reports.no_data')}
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: 28 }}>
                         {/* 1. TÜKETİM GRAFİĞİ (LINE) */}
                        <View style={[styles.chartContainer, { backgroundColor: colors.surfaceAlt }]}>
                            <View style={styles.chartHeader}>
                                <View style={styles.chartTitleRow}>
                                    <View style={[styles.chartIcon, { backgroundColor: colors.primary + '20' }]}>
                                        <Ionicons name="water" size={18} color={colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{t('reports.consumption_trend')}</Text>
                                        <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
                                            {consumptionUnit}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.chartWrapper}>
                                <LineChart
                                    data={chartDataFormatted}
                                    color={colors.primary}
                                    thickness={3}
                                    dataPointsColor={colors.primary}
                                    dataPointsRadius={4}
                                    startFillColor={colors.primary}
                                    endFillColor={colors.primary}
                                    startOpacity={0.3}
                                    endOpacity={0.05}
                                    areaChart
                                    curved
                                    width={SCREEN_WIDTH - 130}
                                    height={180}
                                    spacing={Math.min(50, Math.max(30, (SCREEN_WIDTH - 160) / Math.max(chartDataFormatted.length, 1)))}
                                    initialSpacing={8}
                                    endSpacing={8}
                                    yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9, fontWeight: '500' }}
                                    xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9, fontWeight: '500' }}
                                    yAxisLabelWidth={35}
                                    formatYLabel={(val) => {
                                        const num = Number(val);
                                        if (num >= 100) return num.toFixed(0);
                                        return num.toFixed(1);
                                    }}
                                    yAxisColor={colors.border}
                                    xAxisColor={colors.border}
                                    rulesColor={colors.border}
                                    rulesType="solid"
                                    hideDataPoints={chartDataFormatted.length > 8}
                                    showVerticalLines={false}
                                    verticalLinesColor={colors.border}
                                    disableScroll
                                    pointerConfig={{
                                        pointerStripHeight: 160,
                                        pointerStripColor: colors.primary,
                                        pointerStripWidth: 2,
                                        pointerColor: colors.primary,
                                        radius: 5,
                                        pointerLabelWidth: 90,
                                        pointerLabelHeight: 80,
                                        activatePointersOnLongPress: false,
                                        autoAdjustPointerLabelPosition: true,
                                        pointerLabelComponent: (items: any) => {
                                            return (
                                                <View style={[styles.pointerLabel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                    <Text style={[styles.pointerValue, { color: colors.primary }]}>
                                                        {items[0].value.toFixed(1)} {consumptionUnit}
                                                    </Text>
                                                    <Text style={[styles.pointerDate, { color: colors.textSecondary }]}>
                                                        {items[0].label}
                                                    </Text>
                                                </View>
                                            );
                                        },
                                    }}
                                />
                            </View>
                        </View>

                        {/* 2. MALİYET GRAFİĞİ (BAR) */}
                        <View style={[styles.chartContainer, { backgroundColor: colors.surfaceAlt }]}>
                            <View style={styles.chartHeader}>
                                <View style={styles.chartTitleRow}>
                                    <View style={[styles.chartIcon, { backgroundColor: '#EF4444' + '20' }]}>
                                        <Ionicons name="wallet" size={18} color="#EF4444" />
                                    </View>
                                    <View>
                                        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{t('reports.total_spent')}</Text>
                                        <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>{t('reports.consumption_trend')}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.chartWrapper}>
                                <BarChart
                                    data={barDataFormatted}
                                    barWidth={Math.min(28, Math.max(16, (SCREEN_WIDTH - 160) / Math.max(barDataFormatted.length, 1) - 10))}
                                    spacing={Math.min(20, Math.max(8, (SCREEN_WIDTH - 160) / Math.max(barDataFormatted.length, 1) / 3))}
                                    roundedTop
                                    roundedBottom
                                    hideRules={false}
                                    rulesColor={colors.border}
                                    rulesType="solid"
                                    xAxisThickness={1}
                                    yAxisThickness={0}
                                    xAxisColor={colors.border}
                                    yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9, fontWeight: '500' }}
                                    xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9, fontWeight: '500' }}
                                    yAxisLabelWidth={40}
                                    formatYLabel={(val) => {
                                        const num = Number(val);
                                        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                                        return num.toFixed(0);
                                    }}
                                    width={SCREEN_WIDTH - 130}
                                    height={180}
                                    isAnimated
                                    animationDuration={800}
                                    noOfSections={4}
                                    disableScroll
                                    initialSpacing={8}
                                    endSpacing={8}
                                    maxValue={(() => {
                                      const maxVal = Math.max(...barDataFormatted.map(d => d.value), 0);
                                      return maxVal > 0 ? maxVal * 1.15 : 1;
                                    })()}
                                />
                            </View>
                        </View>
                    </View>
                )}
            </SectionCard>

            <SectionCard>
                <View style={styles.seasonalHeader}>
                    <View style={styles.chartTitleRow}>
                        <View style={[styles.chartIcon, { backgroundColor: '#10B981' + '20' }]}>
                            <Ionicons name="leaf" size={18} color="#10B981" />
                        </View>
                        <View>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('reports.monthly_analysis')}</Text>
                            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>{currentYear} {t('common.year')}</Text>
                        </View>
                    </View>
                </View>
                {isLoadingSeasonal ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                ) : (
                    <View style={{ marginTop: 20, gap: 14 }}>
                        {seasonalData?.map((season) => {
                             const seasonConfig = getSeasonConfig(season.season, t, isDark);
                             const totalCost = seasonalData.reduce((sum, item) => sum + item.totalCost, 0);
                             const percentage = totalCost > 0 ? (season.totalCost / totalCost) * 100 : 0;
                             const totalLiquidFuel = (season.totalLiters || 0) + (season.totalLpgLiters || 0);
                             const seasonElectric = (season.unit || '').startsWith('kWh');
                             const avgConsumption = season.averageConsumption || 0;

                             return (
                                <View key={season.season} style={[styles.seasonCard, { backgroundColor: seasonConfig.bg, borderColor: seasonConfig.color }]}>
                                    <View style={styles.seasonCardHeader}>
                                        <View style={styles.seasonLeft}>
                                            <View style={[styles.seasonIconBoxNew, { backgroundColor: seasonConfig.color }]}>
                                                <Ionicons name={seasonConfig.icon as any} size={20} color="#FFF" />
                                            </View>
                                            <View>
                                                <Text style={[styles.seasonNameNew, { color: seasonConfig.color }]}>{seasonConfig.label}</Text>
                                                <Text style={[styles.seasonPercentage, { color: colors.textSecondary }]}>
                                                    %{percentage.toFixed(0)}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.seasonCost}>
                                            <Text style={[styles.seasonCostValue, { color: seasonConfig.color }]}>
                                                {currencySymbol}{season.totalCost.toLocaleString('tr-TR')}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
                                        <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: seasonConfig.color }]} />
                                    </View>

                                    <View style={styles.seasonStats}>
                                        <View style={styles.seasonStat}>
                                            <Ionicons name={seasonElectric ? "flash-outline" : "water-outline"} size={14} color={colors.textSecondary} />
                                            <Text style={[styles.seasonStatText, { color: colors.textSecondary }]}>
                                                {seasonElectric 
                                                    ? `${season.totalKwh.toFixed(0)} kWh` 
                                                    : `${totalLiquidFuel.toFixed(0)} L (${t('reports.total')})`}
                                            </Text>
                                        </View>
                                        <View style={styles.seasonStat}>
                                            <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
                                            <Text style={[styles.seasonStatText, { color: colors.textSecondary }]}>
                                                {season.totalDistance.toLocaleString('tr-TR')} km
                                            </Text>
                                        </View>
                                        {avgConsumption > 0 && (
                                            <View style={styles.seasonStat}>
                                                <Ionicons name="analytics-outline" size={14} color={colors.textSecondary} />
                                                <Text style={[styles.seasonStatText, { color: colors.textSecondary }]}>
                                                    {avgConsumption.toFixed(1)} {season.unit || (seasonElectric ? 'kWh/100km' : 'L/100km')}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                             );
                        })}
                        {(!seasonalData || seasonalData.length === 0) && (
                             <View style={[styles.emptyChartContainer, { backgroundColor: colors.background }]}>
                                <Ionicons name="leaf-outline" size={48} color={colors.textMuted} />
                                <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
                                    Mevsimsel veri bulunamadı
                                </Text>
                             </View>
                        )}
                    </View>
                )}
            </SectionCard>
            {/* TCO - Toplam Sahiplik Maliyeti */}
            {tcoData && tcoData.total > 0 && (
              <SectionCard>
                <View style={styles.seasonalHeader}>
                  <View style={styles.chartTitleRow}>
                    <View style={[styles.chartIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                      <Ionicons name="calculator" size={18} color="#8B5CF6" />
                    </View>
                    <View>
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('reports.tco_title')}</Text>
                      <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>{t('reports.tco_subtitle')}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 16, gap: 10 }}>
                  <TcoBreakdownRow label={t('reports.tco_fuel')} value={tcoData.breakdown.fuel} total={tcoData.total} color="#3B82F6" colors={colors} currencySymbol={currencySymbol} />
                  <TcoBreakdownRow label={t('reports.tco_maintenance')} value={tcoData.breakdown.maintenance} total={tcoData.total} color="#F59E0B" colors={colors} currencySymbol={currencySymbol} />
                  <TcoBreakdownRow label={t('reports.tco_insurance')} value={tcoData.breakdown.insurance} total={tcoData.total} color="#10B981" colors={colors} currencySymbol={currencySymbol} />
                  <TcoBreakdownRow label={t('reports.tco_inspection')} value={tcoData.breakdown.inspection} total={tcoData.total} color="#6366F1" colors={colors} currencySymbol={currencySymbol} />
                  <TcoBreakdownRow label={t('reports.tco_tax')} value={tcoData.breakdown.tax} total={tcoData.total} color="#EF4444" colors={colors} currencySymbol={currencySymbol} />
                  {tcoData.breakdown.other > 0 && (
                    <TcoBreakdownRow label={t('reports.tco_other')} value={tcoData.breakdown.other} total={tcoData.total} color="#6B7280" colors={colors} currencySymbol={currencySymbol} />
                  )}

                  <View style={[styles.tcoTotalRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.tcoTotalLabel, { color: colors.textPrimary }]}>{t('reports.tco_total')}</Text>
                    <Text style={[styles.tcoTotalValue, { color: colors.primary }]}>
                      {currencySymbol}{tcoData.total.toLocaleString('tr-TR')}
                    </Text>
                  </View>

                  <View style={[styles.tcoEstimateRow, { backgroundColor: colors.surfaceAlt }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tcoEstLabel, { color: colors.textSecondary }]}>{t('reports.tco_monthly_est')}</Text>
                      <Text style={[styles.tcoEstValue, { color: colors.textPrimary }]}>
                        {currencySymbol}{tcoData.estimatedMonthlyCost.toLocaleString('tr-TR')}
                      </Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={[styles.tcoEstLabel, { color: colors.textSecondary }]}>{t('reports.tco_yearly_est')}</Text>
                      <Text style={[styles.tcoEstValue, { color: colors.textPrimary }]}>
                        {currencySymbol}{tcoData.estimatedYearlyCost.toLocaleString('tr-TR')}
                      </Text>
                    </View>
                  </View>
                </View>
              </SectionCard>
            )}
        </>
      )}
    </Screen>
  );
}

const TcoBreakdownRow = ({ label, value, total, color, colors, currencySymbol }: {
  label: string; value: number; total: number; color: string; colors: any; currencySymbol: string;
}) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  if (value === 0) return null;

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>{label}</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
          {currencySymbol}{value.toLocaleString('tr-TR')} ({percentage.toFixed(0)}%)
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
};

const StatBox = ({ label, value, colors, icon, isDisabled, caption }: { label: string, value: string, colors: any, icon?: string, isDisabled?: boolean, caption?: string }) => (
    <View style={[styles.statBox, { backgroundColor: colors.surfaceAlt, opacity: isDisabled ? 0.6 : 1 }]}>
        <View style={styles.statBoxHeader}>
            {icon && (
                <View style={[styles.statIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={icon as any} size={16} color={colors.primary} />
                </View>
            )}
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
        </View>
        <Text style={[styles.statValue, { color: isDisabled ? colors.textSecondary : colors.textPrimary, fontSize: isDisabled ? 14 : 18 }]}>{value}</Text>
        {caption ? (
            <Text style={[styles.statCaption, { color: colors.textSecondary }]}>{caption}</Text>
        ) : null}
    </View>
);

const getSeasonConfig = (season: string, t: any, isDark: boolean) => {
    switch (season) {
        case 'KIS': return { label: t('seasons.winter'), color: '#0EA5E9', bg: isDark ? '#0EA5E9' + '20' : '#E0F2FE', icon: 'snow' };
        case 'ILKBAHAR': return { label: t('seasons.spring'), color: '#10B981', bg: isDark ? '#10B981' + '20' : '#D1FAE5', icon: 'flower' };
        case 'YAZ': return { label: t('seasons.summer'), color: '#F59E0B', bg: isDark ? '#F59E0B' + '20' : '#FEF3C7', icon: 'sunny' };
        case 'SONBAHAR': return { label: t('seasons.autumn'), color: '#EF4444', bg: isDark ? '#EF4444' + '20' : '#FEE2E2', icon: 'leaf' };
        default: return { label: season, color: '#6B7280', bg: isDark ? '#6B7280' + '20' : '#F3F4F6', icon: 'ellipse' };
    }
};

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 20,
  },
  vehicleTabsRow: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  vehicleTabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 34,
  },
  statCaption: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 34,
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700' 
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'space-between'
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent'
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600'
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chartIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
    overflow: 'hidden',
  },
  pointerLabel: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pointerValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  pointerDate: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyChartContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 12,
  },
  emptyChartText: {
    fontSize: 14,
    textAlign: 'center',
  },
  seasonalHeader: {
    marginBottom: 4,
  },
  seasonCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  seasonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  seasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  seasonIconBoxNew: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonNameNew: {
    fontSize: 15,
    fontWeight: '700',
  },
  seasonPercentage: {
    fontSize: 11,
    marginTop: 2,
  },
  seasonCost: {
    alignItems: 'flex-end',
  },
  seasonCostValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  seasonStats: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  seasonStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seasonStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  warningCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContent: {
    flex: 1,
    gap: 6,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  warningDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyStateContainer: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    gap: 16,
  },
  emptyStateIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tcoTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  tcoTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  tcoTotalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  tcoEstimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  tcoEstLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tcoEstValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
});
