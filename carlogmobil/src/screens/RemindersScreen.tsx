import { useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrency } from '@/hooks/useCurrency';
import { useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder, useMaintenanceHistory } from '@/hooks/queries/useReminderQueries';
import { useVehicles } from '@/hooks/queries/useVehicleQueries';
import { ensureLocalNotificationPermissions } from '@/utils/notificationHelper';
import type { ReminderType, ReminderStatus } from '@/types/domain';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export default function RemindersScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { currencySymbol } = useCurrency();
  const [isModalVisible, setModalVisible] = useState(false);
  const [isCompleteModalVisible, setCompleteModalVisible] = useState(false);
  const [completingReminder, setCompletingReminder] = useState<any>(null);
  const { data: vehicles } = useVehicles();
  const { data: reminders, isLoading, refetch } = useReminders();
  const { data: maintenanceHistory, refetch: refetchHistory } = useMaintenanceHistory();

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchHistory()]);
  }, [refetch, refetchHistory]);
  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const updateMutation = useUpdateReminder();
  const deleteMutation = useDeleteReminder();

  const getTypeLabel = (typeKey: string) => {
    const typeMap: Record<string, string> = {
      'SIGORTA': t('reminders.type_insurance'),
      'KASKO': t('reminders.type_kasko'),
      'MUAYENE': t('reminders.type_inspection'),
      'BAKIM': t('reminders.type_maintenance'),
      'VERGI': t('reminders.type_tax'),
      'DIGER': t('reminders.type_other'),
    };
    return typeMap[typeKey] || typeKey;
  };

  const getTypeIcon = (typeKey: string): string => {
    const iconMap: Record<string, string> = {
      'SIGORTA': 'shield-checkmark-outline',
      'KASKO': 'car-outline',
      'MUAYENE': 'clipboard-outline',
      'BAKIM': 'build-outline',
      'VERGI': 'receipt-outline',
      'DIGER': 'ellipsis-horizontal-outline',
    };
    return iconMap[typeKey] || 'ellipse-outline';
  };

  const handleStartComplete = (reminder: any) => {
    setCompletingReminder(reminder);
    setCompleteModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('common.delete'), t('reminders.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(id) }
    ]);
  };

  const activeReminders = reminders?.filter(r => r.status !== 'COMPLETED') || [];
  const completedReminders = reminders?.filter(r => r.status === 'COMPLETED') || [];

  return (
    <Screen scrollable refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('reminders.title')}</Text>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {t('reminders.subtitle')}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => setModalVisible(true)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}>
          <Ionicons name="add-circle-outline" size={18} color="#FFF" />
          <Text style={styles.addButtonLabel}>{t('reminders.add_reminder')}</Text>
        </Pressable>
      </View>

      {/* Bakım Maliyet Özeti */}
      {maintenanceHistory && maintenanceHistory.summary.count > 0 && (
        <SectionCard>
          <SectionHeader subtitle={t('reminders.maintenance_cost_summary')}>{t('reminders.maintenance_costs')}</SectionHeader>
          <View style={styles.costSummaryRow}>
            <View style={[styles.costCard, { backgroundColor: colors.primary + '15' }]}>
              <View style={[styles.costIconBox, { backgroundColor: colors.primary }]}>
                <Ionicons name="wallet-outline" size={18} color="#FFF" />
              </View>
              <Text style={[styles.costLabel, { color: colors.textSecondary }]}>{t('reminders.total_maintenance_cost')}</Text>
              <Text style={[styles.costValue, { color: colors.textPrimary }]}>
                {currencySymbol}{maintenanceHistory.summary.totalCost.toLocaleString('tr-TR')}
              </Text>
            </View>
            <View style={[styles.costCard, { backgroundColor: '#F59E0B' + '15' }]}>
              <View style={[styles.costIconBox, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="analytics-outline" size={18} color="#FFF" />
              </View>
              <Text style={[styles.costLabel, { color: colors.textSecondary }]}>{t('reminders.avg_maintenance_cost')}</Text>
              <Text style={[styles.costValue, { color: colors.textPrimary }]}>
                {currencySymbol}{maintenanceHistory.summary.averageCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </SectionCard>
      )}

      {/* Aktif Hatırlatmalar */}
      <SectionCard>
        <SectionHeader subtitle={t('reminders.active_reminders')}>{t('reminders.active_reminders')}</SectionHeader>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : activeReminders.length > 0 ? (
          <View style={styles.listContainer}>
            {activeReminders.map((reminder) => {
              const isKm = reminder.isKmBased;
              const nextKm = isKm && reminder.lastTriggeredKm && reminder.kmInterval
                ? reminder.lastTriggeredKm + reminder.kmInterval
                : null;
              const currentKm = reminder.vehicle?.currentOdometer || 0;
              const kmRemaining = nextKm ? nextKm - currentKm : null;

              return (
                <View key={reminder.id} style={[styles.reminderCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <View style={styles.reminderHeader}>
                    <View style={[styles.typeIconBox, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name={getTypeIcon(reminder.type) as any} size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reminderType, { color: colors.textPrimary }]}>
                        {getTypeLabel(reminder.type)}
                      </Text>
                      <Text style={[styles.reminderMeta, { color: colors.textMuted }]}>
                        {reminder.vehicle?.plate}
                        {isKm
                          ? ` • ${t('reminders.every')} ${reminder.kmInterval?.toLocaleString('tr-TR')} km`
                          : reminder.dueDate
                            ? ` • ${new Date(reminder.dueDate).toLocaleDateString('tr-TR')}`
                            : ''}
                      </Text>
                      {isKm && kmRemaining !== null && (
                        <Text style={[styles.kmBadge, { color: kmRemaining <= 0 ? colors.danger : colors.primary }]}>
                          {kmRemaining <= 0
                            ? `${Math.abs(kmRemaining).toLocaleString('tr-TR')} km ${t('reminders.overdue_km')}`
                            : `${kmRemaining.toLocaleString('tr-TR')} km ${t('reminders.remaining')}`}
                        </Text>
                      )}
                      {reminder.serviceProvider && (
                        <Text style={[styles.reminderMeta, { color: colors.textMuted }]}>
                          {reminder.serviceProvider}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable onPress={() => handleStartComplete(reminder)} style={[styles.actionBtn, { backgroundColor: colors.success }]}>
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                      <Text style={{ color: '#fff', fontSize: 12 }}>{t('common.ok')}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(reminder.id)} style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, padding: 10 }}>{t('reminders.no_reminders')}</Text>
          </View>
        )}
      </SectionCard>

      {/* Tamamlanan Hatırlatmalar */}
      {completedReminders.length > 0 && (
        <SectionCard>
          <SectionHeader subtitle={t('reminders.completed_section')}>{t('settings.notifications_history')}</SectionHeader>
          <View style={styles.listContainer}>
            {completedReminders.slice(0, 10).map((reminder) => (
              <View key={reminder.id} style={[styles.completedRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.completedType, { color: colors.textSecondary }]}>
                    {getTypeLabel(reminder.type)}
                  </Text>
                  <Text style={[styles.reminderMeta, { color: colors.textMuted }]}>
                    {reminder.vehicle?.plate}
                    {reminder.completedAt && ` • ${new Date(reminder.completedAt).toLocaleDateString('tr-TR')}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {reminder.cost != null && reminder.cost > 0 && (
                    <Text style={[styles.costBadge, { color: colors.primary }]}>
                      {currencySymbol}{reminder.cost.toLocaleString('tr-TR')}
                    </Text>
                  )}
                  <Text style={{ color: colors.success, fontSize: 12 }}>{t('common.ok')}</Text>
                </View>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      <AddReminderModal visible={isModalVisible} onClose={() => setModalVisible(false)} vehicles={vehicles || []} />
      <CompleteReminderModal
        visible={isCompleteModalVisible}
        onClose={() => { setCompleteModalVisible(false); setCompletingReminder(null); }}
        reminder={completingReminder}
      />
    </Screen>
  );
}

function CompleteReminderModal({ visible, onClose, reminder }: { visible: boolean; onClose: () => void; reminder: any }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { currencySymbol } = useCurrency();
  const updateMutation = useUpdateReminder();

  const [cost, setCost] = useState('');
  const [odometerAtService, setOdometerAtService] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');

  const handleSubmit = () => {
    const updateData: any = { status: 'COMPLETED' };

    if (cost.trim()) updateData.cost = parseFloat(cost.replace(',', '.'));
    if (odometerAtService.trim()) updateData.odometerAtService = parseInt(odometerAtService, 10);
    if (serviceProvider.trim()) updateData.serviceProvider = serviceProvider.trim();

    if (reminder?.isKmBased && odometerAtService.trim()) {
      updateData.lastTriggeredKm = parseInt(odometerAtService, 10);
    }

    updateMutation.mutate({ id: reminder?.id, data: updateData }, {
      onSuccess: () => {
        Alert.alert(t('common.success'), t('reminders.completed_success'));
        onClose();
        setCost('');
        setOdometerAtService('');
        setServiceProvider('');
      },
      onError: (err: any) => Alert.alert(t('common.error'), err.message),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('reminders.complete_modal_title')}</Text>

        <ScrollView contentContainerStyle={{ gap: 16 }}>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            {t('reminders.complete_modal_desc')}
          </Text>

          <View>
            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('reminders.cost_label')} ({currencySymbol})</Text>
            <TextInput
              value={cost}
              onChangeText={setCost}
              placeholder={t('reminders.cost_placeholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            />
          </View>

          <View>
            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('reminders.odometer_at_service')}</Text>
            <TextInput
              value={odometerAtService}
              onChangeText={setOdometerAtService}
              placeholder={t('reminders.odometer_placeholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            />
          </View>

          <View>
            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('reminders.service_provider')}</Text>
            <TextInput
              value={serviceProvider}
              onChangeText={setServiceProvider}
              placeholder={t('reminders.service_provider_placeholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            />
          </View>

          <Pressable onPress={handleSubmit} style={{ backgroundColor: colors.success, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 }}>
            {updateMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('reminders.mark_completed')}</Text>}
          </Pressable>

          <Pressable onPress={onClose} style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>{t('reminders.cancel')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function AddReminderModal({ visible, onClose, vehicles }: { visible: boolean; onClose: () => void; vehicles: any[] }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const createMutation = useCreateReminder();

  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [type, setType] = useState<ReminderType>('SIGORTA');
  const [date, setDate] = useState('');
  const [isKmBased, setIsKmBased] = useState(false);
  const [kmInterval, setKmInterval] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');

  const getTypeLabel = (typeKey: string) => {
    const typeMap: Record<string, string> = {
      'SIGORTA': t('reminders.type_insurance'),
      'KASKO': t('reminders.type_kasko'),
      'MUAYENE': t('reminders.type_inspection'),
      'BAKIM': t('reminders.type_maintenance'),
      'VERGI': t('reminders.type_tax'),
    };
    return typeMap[typeKey] || typeKey;
  };

  const handleSubmit = async () => {
    if (!vehicleId) return Alert.alert(t('common.error'), t('reminders.error_select_vehicle'));

    await ensureLocalNotificationPermissions();

    const reminderData: any = {
      vehicleId,
      type,
      isKmBased,
    };

    if (serviceProvider.trim()) {
      reminderData.serviceProvider = serviceProvider.trim();
    }

    if (isKmBased) {
      if (!kmInterval.trim() || isNaN(Number(kmInterval))) {
        return Alert.alert(t('common.error'), t('reminders.error_km_interval'));
      }
      reminderData.kmInterval = parseInt(kmInterval, 10);
    } else {
      const dateParts = date.split('.');
      if (dateParts.length !== 3) {
        return Alert.alert(t('common.error'), t('reminders.error_invalid_date_format'));
      }

      const [d, m, y] = dateParts;
      if (d.length !== 2 || m.length !== 2 || y.length !== 4 || isNaN(Number(d)) || isNaN(Number(m)) || isNaN(Number(y))) {
        return Alert.alert(t('common.error'), t('reminders.error_invalid_date_format'));
      }

      const parsedDate = new Date(`${y}-${m}-${d}`);
      if (isNaN(parsedDate.getTime())) {
        return Alert.alert(t('common.error'), t('reminders.error_invalid_date'));
      }

      parsedDate.setHours(9, 0, 0, 0);
      reminderData.dueDate = parsedDate.toISOString();
    }

    createMutation.mutate(reminderData, {
      onSuccess: async () => {
        Alert.alert(t('common.success'), t('reminders.success_saved'));
        onClose();
        setDate('');
        setKmInterval('');
        setServiceProvider('');
        setIsKmBased(false);
      },
      onError: (err: any) => Alert.alert(t('common.error'), err.message),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('reminders.add_modal_title')}</Text>

        <ScrollView contentContainerStyle={{ gap: 16 }}>
          {/* Araç Seçimi */}
          <View>
            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('reminders.select_vehicle')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
              {vehicles.map(v => (
                <Pressable
                  key={v.id}
                  onPress={() => setVehicleId(v.id)}
                  style={{
                    padding: 10,
                    borderWidth: 1,
                    borderColor: vehicleId === v.id ? colors.primary : colors.border,
                    borderRadius: 8,
                    marginRight: 8,
                    backgroundColor: vehicleId === v.id ? colors.primarySoft : 'transparent'
                  }}>
                  <Text style={{ color: colors.textPrimary }}>{v.plate}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Tip Seçimi */}
          <View>
            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('reminders.select_type')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['SIGORTA', 'KASKO', 'MUAYENE', 'BAKIM', 'VERGI'].map((typeKey) => (
                <Pressable
                  key={typeKey}
                  onPress={() => setType(typeKey as any)}
                  style={{
                    padding: 10,
                    borderWidth: 1,
                    borderColor: type === typeKey ? colors.primary : colors.border,
                    borderRadius: 8,
                    marginRight: 8,
                    backgroundColor: type === typeKey ? colors.primarySoft : 'transparent'
                  }}>
                  <Text style={{ color: colors.textPrimary }}>{getTypeLabel(typeKey)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* KM Bazlı Toggle (sadece BAKIM tipinde göster) */}
          {type === 'BAKIM' && (
            <View style={[styles.toggleRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{t('reminders.km_based_reminder')}</Text>
                <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>{t('reminders.km_based_desc')}</Text>
              </View>
              <Switch
                value={isKmBased}
                onValueChange={setIsKmBased}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          )}

          {/* Tarih veya KM Aralığı */}
          {isKmBased && type === 'BAKIM' ? (
            <View>
              <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('reminders.km_interval_label')}</Text>
              <TextInput
                value={kmInterval}
                onChangeText={setKmInterval}
                placeholder={t('reminders.km_interval_placeholder')}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
              />
            </View>
          ) : (
            <View>
              <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('reminders.date_format')}</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder={t('reminders.date_placeholder')}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
              />
            </View>
          )}

          {/* Servis Sağlayıcı */}
          <View>
            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('reminders.service_provider')}</Text>
            <TextInput
              value={serviceProvider}
              onChangeText={setServiceProvider}
              placeholder={t('reminders.service_provider_placeholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            />
          </View>

          <Pressable onPress={handleSubmit} style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 }}>
            {createMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('reminders.save')}</Text>}
          </Pressable>

          <Pressable onPress={onClose} style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>{t('reminders.cancel')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  caption: { fontSize: 14, lineHeight: 20 },
  addButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonLabel: { color: '#FFF', fontWeight: '600' },
  listContainer: { gap: 12, marginTop: 12 },
  reminderCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  reminderHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderType: { fontWeight: '600', fontSize: 15 },
  reminderMeta: { fontSize: 12, marginTop: 2 },
  kmBadge: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  completedType: { fontWeight: '600', fontSize: 14, textDecorationLine: 'line-through' },
  costBadge: { fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  costSummaryRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  costCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  costIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  costLabel: { fontSize: 11, fontWeight: '600' },
  costValue: { fontSize: 17, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleLabel: { fontWeight: '600', fontSize: 14 },
  toggleDesc: { fontSize: 12, marginTop: 2 },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  modalContainer: { flex: 1, padding: 20, paddingTop: 60 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalSubtitle: { fontSize: 14, lineHeight: 20 },
});
