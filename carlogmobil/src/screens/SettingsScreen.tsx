import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemePreference } from '@/store/themeStore';
import { useUserProfile, useUpdateProfile, useDeleteAccount } from '@/hooks/queries/useUserQueries';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useShouldShowTutorial } from '@/components/AppTutorial';
import { ensureLocalNotificationPermissions, presentLocalNotification } from '@/utils/notificationHelper';
import { useNotifications, useUnreadCount, useMarkAllAsRead, useDeleteNotification, useDeleteAllNotifications } from '@/hooks/queries/useNotificationQueries';
import { NotificationLog } from '@/types/domain';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrency } from '@/hooks/useCurrency';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { usePurchase } from '@/contexts/PurchaseContext';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useAppTheme();
  const { t, locale, changeLanguage } = useTranslation();
  const { currencySymbol, currencyCode, changeCurrency, availableCurrencies } = useCurrency();
  const { isPremium, isLoading: isPurchasing, purchaseRemoveAds, restorePurchases } = usePurchase();
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isNotificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [isLanguageExpanded, setLanguageExpanded] = useState(false);
  const [isCurrencyExpanded, setCurrencyExpanded] = useState(false);

  const { data: user, isLoading: isUserLoading } = useUserProfile();
  const deleteAccountMutation = useDeleteAccount();
  const { resetTutorial } = useShouldShowTutorial();
  
  const { data: unreadCountData } = useUnreadCount();
  const unreadCount = unreadCountData?.unreadCount ?? 0;

  // Kritik hook'lar yüklenene kadar loading state göster
  if (!colors || !t) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const handleDeleteAccount = () => {
    // İlk onay
    Alert.alert(
      t('settings.delete_account'),
      t('settings.delete_account_warning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.delete_account'),
          style: 'destructive',
          onPress: () => {
            // İkinci onay - kritik işlem için çift onay
            Alert.alert(
              t('settings.delete_account_confirm_title'),
              t('settings.delete_account_confirm_message'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.delete_account_final'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccountMutation.mutateAsync();
                      await AsyncStorage.clear();
                      Alert.alert(t('common.success'), t('settings.delete_account_success'));
                    } catch (error) {
                      console.error('Hesap silme hatası:', error);
                      Alert.alert(t('common.error'), t('settings.delete_account_error'));
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleResetTutorial = () => {
    Alert.alert(
      t('settings.tutorial_reset'),
      t('settings.tutorial_reset_confirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          onPress: async () => {
            await resetTutorial();
            Alert.alert(t('common.success'), t('settings.tutorial_reset_success'));
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      const granted = await ensureLocalNotificationPermissions();
      if (!granted) {
        Alert.alert(t('common.error'), t('settings.test_notification_error'));
        return;
      }

      await presentLocalNotification(
        t('settings.test_notification'),
        t('settings.test_notification_sent'),
        { type: 'test' }
      );

      Alert.alert(t('common.success'), t('settings.test_notification_sent'));
    } catch (error) {
      console.error('Test bildirimi gönderilemedi:', error);
      Alert.alert(t('common.error'), t('settings.test_notification_error'));
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode);
  };

  const handlePurchaseRemoveAds = async () => {
    try {
      await purchaseRemoveAds();
      // Başarılı mesajı purchaseUpdatedListener içinde gösterilecek
      // Sadece hata durumunda burada mesaj göster
    } catch (error) {
      // Kullanıcı iptal etmediyse hata mesajı göster
      const iapError = error as any;
      if (iapError?.code !== 'IAP_USER_CANCELLED') {
        Alert.alert(t('common.error'), t('settings.purchase_error'));
      }
    }
  };

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
      Alert.alert(t('common.success'), t('settings.restore_success'));
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.restore_error'));
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('settings.title')}</Text>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>{t('settings.subtitle')}</Text>
        </View>
        <Pressable 
            onPress={() => setNotificationsModalVisible(true)}
            style={[styles.notificationIconButton, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: '#FF3B30' }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
      </View>

      <SectionCard>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                  <SectionHeader subtitle={t('settings.user_profile')}>{t('settings.user_profile')}</SectionHeader>
              </View>
              <Pressable onPress={() => setEditModalVisible(true)} style={{ padding: 8 }}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('common.edit')}</Text>
              </Pressable>
          </View>
          
          {isUserLoading ? (
              <ActivityIndicator color={colors.primary} />
          ) : (
              <View style={[styles.rowBlock, { borderBottomColor: colors.border }]}> 
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('settings.full_name')}</Text>
                <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                  {user?.fullName || t('settings.not_defined')}
                </Text>
              </View>
          )}
        </SectionCard>

      <SectionCard>
        <SectionHeader subtitle={t('settings.theme_preference')}>{t('settings.theme_preference')}</SectionHeader>
        <View style={styles.optionList}>
          {THEME_OPTIONS.map((option) => {
            const isActive = option === preference;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                onPress={() => setPreference(option)}
                style={[styles.optionItem, { borderColor: isActive ? colors.primary : colors.border }]}> 
                <View style={styles.optionMeta}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{t(`settings.theme_${option}`)}</Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                    {t(`settings.theme_${option}_desc`)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: isActive ? colors.primary : 'transparent',
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      {/* Dil ve Para Birimi - Kompakt Tasarım */}
      <View style={styles.compactRow}>
        {/* Dil Seçimi */}
        <View style={[styles.compactCard, { backgroundColor: colors.surfaceAlt, flex: 1 }]}>
          <Pressable 
            onPress={() => setLanguageExpanded(!isLanguageExpanded)}
            style={styles.compactHeader}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.compactLabel, { color: colors.textMuted }]}>
                {t('settings.language_preference')}
              </Text>
              <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
                {SUPPORTED_LANGUAGES.find(l => l.code === locale)?.flag ?? '🌐'} {SUPPORTED_LANGUAGES.find(l => l.code === locale)?.nativeName?.split(' ')?.[0] ?? 'Language'}
              </Text>
            </View>
            <Ionicons 
              name={isLanguageExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.textSecondary} 
            />
          </Pressable>

          {isLanguageExpanded && (
            <View style={styles.compactList}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {SUPPORTED_LANGUAGES.map((language) => {
                  const isActive = language.code === locale;
                  return (
                    <Pressable
                      key={language.code}
                      onPress={() => {
                        handleLanguageChange(language.code);
                        setLanguageExpanded(false);
                      }}
                      style={[styles.compactListItem, { backgroundColor: isActive ? colors.primary + '15' : 'transparent' }]}
                    >
                      <Text style={[styles.compactListText, { color: isActive ? colors.primary : colors.textPrimary }]}>
                        {language.flag} {language.nativeName}
                      </Text>
                      {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Para Birimi Seçimi */}
        <View style={[styles.compactCard, { backgroundColor: colors.surfaceAlt, flex: 1 }]}>
          <Pressable 
            onPress={() => setCurrencyExpanded(!isCurrencyExpanded)}
            style={styles.compactHeader}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.compactLabel, { color: colors.textMuted }]}>
                {t('units.currency')}
              </Text>
              <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
                {currencySymbol} {currencyCode}
              </Text>
            </View>
            <Ionicons 
              name={isCurrencyExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.textSecondary} 
            />
          </Pressable>

          {isCurrencyExpanded && (
            <View style={styles.compactList}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {availableCurrencies.map((currency) => {
                  const isActive = currency.code === currencyCode;
                  return (
                    <Pressable
                      key={currency.code}
                      onPress={() => {
                        changeCurrency(currency.code);
                        setCurrencyExpanded(false);
                      }}
                      style={[styles.compactListItem, { backgroundColor: isActive ? colors.primary + '15' : 'transparent' }]}
                    >
                      <Text style={[styles.compactListText, { color: isActive ? colors.primary : colors.textPrimary }]}>
                        {currency.symbol} {currency.code}
                      </Text>
                      {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Reklam Kaldırma - Apple Guidelines: Guest kullanıcılar da satın alabilmeli */}
      <SectionCard>
        <SectionHeader subtitle={t('settings.remove_ads_management')}>
          {t('settings.remove_ads')}
        </SectionHeader>
        
        {isPremium ? (
          <View style={[styles.premiumCard, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
            <View style={styles.premiumHeader}>
              <View style={[styles.premiumIconBox, { backgroundColor: '#10B981' }]}>
                <Ionicons name="checkmark-circle" size={28} color="#FFF" />
              </View>
              <View style={styles.premiumContent}>
                <Text style={[styles.premiumTitle, { color: '#065F46' }]}>
                  {t('settings.premium_active')}
                </Text>
                <Text style={[styles.premiumDescription, { color: '#047857' }]}>
                  {t('settings.premium_desc')}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View>
            <View style={[styles.subscriptionCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <View style={styles.subscriptionHeader}>
                <View style={[styles.subscriptionIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="sparkles" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subscriptionTitle, { color: colors.textPrimary }]}>
                    {t('settings.remove_ads')}
                  </Text>
                  <Text style={[styles.subscriptionDescription, { color: colors.textSecondary }]}>
                    {t('settings.remove_ads_desc')}
                  </Text>
                </View>
              </View>
              
              <Pressable
                onPress={handlePurchaseRemoveAds}
                disabled={isPurchasing}
                style={[styles.subscriptionButton, { backgroundColor: colors.primary }]}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="cart-outline" size={18} color="#FFF" />
                    <Text style={styles.subscriptionButtonText}>
                      {t('settings.purchase_now')}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <Pressable
              onPress={handleRestorePurchases}
              disabled={isPurchasing}
              style={[styles.restoreButton, { marginTop: 12 }]}
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                {t('settings.restore_purchases')}
              </Text>
            </Pressable>
          </View>
        )}
      </SectionCard>

      {/* Uygulama Ayarları */}
      <SectionCard>
        <SectionHeader subtitle={t('settings.tutorial')}>{t('settings.tutorial')}</SectionHeader>
        
        {/* Tutorial Reset */}
        <Pressable 
            onPress={handleResetTutorial}
            style={[styles.tutorialButton, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('settings.tutorial_reset')}</Text>
        </Pressable>

        {/* Test Notification */}
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.rowTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
            {t('settings.test_notification')}
          </Text>
          <Pressable
            onPress={handleTestNotification}
            style={[styles.testButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{t('settings.test_notification')}</Text>
            <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13 }}>
              {t('settings.test_notification_desc')}
            </Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard>
          <SectionHeader subtitle={t('settings.account')}>{t('settings.account')}</SectionHeader>
          <Pressable
              onPress={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
              style={[styles.deleteAccountButton, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
              {deleteAccountMutation.isPending ? (
                <ActivityIndicator color="#DC2626" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  <Text style={{ color: '#DC2626', fontWeight: '600', marginLeft: 8 }}>
                    {t('settings.delete_account')}
                  </Text>
                </>
              )}
          </Pressable>
          <Text style={[styles.deleteAccountWarning, { color: colors.textMuted }]}>
            {t('settings.delete_account_info')}
          </Text>
        </SectionCard>

      {isEditModalVisible && (
        <EditProfileModal 
          visible={isEditModalVisible} 
          onClose={() => setEditModalVisible(false)} 
          user={user ?? null} 
        />
      )}
      
      <NotificationsModal 
        visible={isNotificationsModalVisible} 
        onClose={() => setNotificationsModalVisible(false)} 
      />
    </Screen>
  );
}

function EditProfileModal({ visible, onClose, user }: { visible: boolean; onClose: () => void; user: any }) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const updateMutation = useUpdateProfile();

    // user değiştiğinde state'i güncelle - null/undefined durumunu güvenli şekilde ele al
    const [fullName, setFullName] = useState('');
    
    useEffect(() => {
        if (visible) {
            setFullName(user?.fullName ?? '');
        }
    }, [visible, user?.fullName]);
    
    const handleSubmit = () => {
        updateMutation.mutate({
            fullName
        }, {
            onSuccess: () => {
                onClose();
                Alert.alert(t('common.success'), t('settings.profile_updated'));
            },
            onError: () => Alert.alert(t('common.error'), t('settings.update_error'))
        });
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
             <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 0 }]}>{t('settings.edit_profile')}</Text>
                    <Pressable onPress={onClose}>
                        <Text style={{ color: colors.primary, fontSize: 16 }}>{t('common.close')}</Text>
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ gap: 16 }}>
                    <View>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{t('settings.full_name')}</Text>
                        <TextInput 
                            value={fullName} 
                            onChangeText={setFullName}
                            placeholder={t('settings.full_name')}
                            placeholderTextColor={colors.textMuted}
                            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]} 
                        />
                    </View>

                    <Pressable onPress={handleSubmit} style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 }}>
                        {updateMutation.isPending ? <ActivityIndicator color="#fff"/> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('common.save')}</Text>}
                    </Pressable>
                </ScrollView>
             </View>
        </Modal>
    );
}

function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { colors } = useAppTheme();
    const { t, locale } = useTranslation();
    const { data: notifications, isLoading, error } = useNotifications();
    const markAllAsReadMutation = useMarkAllAsRead();
    const deleteNotificationMutation = useDeleteNotification();
    const deleteAllMutation = useDeleteAllNotifications();

    // Debug log
    useEffect(() => {
        if (visible) {
            console.log('📱 [NotificationsModal] Modal açıldı');
            console.log('📊 [NotificationsModal] Loading:', isLoading);
            console.log('📊 [NotificationsModal] Error:', error);
            console.log('📊 [NotificationsModal] Notifications:', notifications);
            console.log('📊 [NotificationsModal] Notification count:', notifications?.length || 0);
        }
    }, [visible, isLoading, notifications, error]);

    useEffect(() => {
        if (visible) {
            markAllAsReadMutation.mutate(undefined, {
                onSuccess: () => {
                    console.log('Tüm bildirimler okundu olarak işaretlendi');
                },
            });
        }
    }, [visible]);

    const handleDeleteNotification = (notificationId: string) => {
        Alert.alert(
            t('common.confirm'),
            t('settings.delete_notification_confirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => {
                        deleteNotificationMutation.mutate(notificationId, {
                            onSuccess: () => {
                                console.log('✅ Bildirim silindi');
                            },
                        });
                    },
                },
            ]
        );
    };

    const handleDeleteAll = () => {
        if (!notifications || notifications.length === 0) return;

        Alert.alert(
            t('common.confirm'),
            t('settings.delete_all_notifications_confirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => {
                        deleteAllMutation.mutate(undefined, {
                            onSuccess: () => {
                                console.log('✅ Tüm bildirimler silindi');
                                onClose();
                            },
                        });
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        try {
            if (!dateString) return '';
            
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) {
                return t('common.just_now') ?? 'Just now';
            } else if (diffMins < 60) {
                return `${diffMins} ${t('common.minutes_ago') ?? 'min ago'}`;
            } else if (diffHours < 24) {
                return `${diffHours} ${t('common.hours_ago') ?? 'hours ago'}`;
            } else if (diffDays < 7) {
                return `${diffDays} ${t('common.days_ago') ?? 'days ago'}`;
            } else {
                // Locale'e göre tarih formatı (en_US -> en-US formatına çevir)
                const formattedLocale = (locale ?? 'en-US').replace('_', '-');
                return date.toLocaleDateString(formattedLocale, { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                });
            }
        } catch (error) {
            console.error('Date formatting error:', error);
            return dateString ?? '';
        }
    };

    const getNotificationMessage = (notification: NotificationLog | null | undefined) => {
        if (!notification) return t('settings.no_notifications') ?? 'No notifications';
        
        if (notification.payload && typeof notification.payload === 'object') {
            // Önce 'body' alanını kontrol et (yeni format)
            if ('body' in notification.payload && notification.payload.body) {
                return String(notification.payload.body);
            }
            // Sonra 'message' alanını kontrol et (eski format)
            if ('message' in notification.payload && notification.payload.message) {
                return String(notification.payload.message);
            }
        }
        return t('settings.no_notifications') ?? 'No notifications';
    };

    const getNotificationTitle = (notification: NotificationLog | null | undefined) => {
        if (!notification) return t('settings.notification_type_default') ?? 'Notification';
        
        if (notification.payload && typeof notification.payload === 'object' && 'title' in notification.payload && notification.payload.title) {
            return String(notification.payload.title);
        }
        
        // Tip'e göre varsayılan başlık ve emoji
        switch (notification.type) {
            case 'REMINDER_DUE':
                return t('settings.notification_type_reminder_due') ?? '⏰ Reminder';
            case 'REMINDER_OVERDUE':
                return t('settings.notification_type_reminder_overdue') ?? '⚠️ Overdue';
            case 'FUEL_PRICE_ALERT':
                return t('settings.notification_type_fuel_price_alert') ?? '⛽ Fuel Price';
            case 'CHARGING_PRICE_UPDATE':
                return t('settings.notification_type_charging_price_update') ?? '🔋 Charging';
            case 'SYSTEM':
                return t('settings.notification_type_system') ?? '📢 System';
            default:
                return t('settings.notification_type_default') ?? 'Notification';
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 0 }]}>{t('settings.notifications')}</Text>
                    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                        {notifications && notifications.length > 0 && (
                            <Pressable onPress={handleDeleteAll}>
                                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                            </Pressable>
                        )}
                        <Pressable onPress={onClose}>
                            <Text style={{ color: colors.primary, fontSize: 16 }}>{t('common.close')}</Text>
                        </Pressable>
                    </View>
                </View>

                {isLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('common.loading')}</Text>
                    </View>
                ) : error ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
                        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('common.error')}</Text>
                        <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                            {error?.message ?? t('settings.notifications_load_error') ?? 'Could not load notifications'}
                        </Text>
                    </View>
                ) : !notifications || notifications.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔔</Text>
                        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('settings.no_notifications')}</Text>
                        <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                            {t('settings.notifications_desc')}
                        </Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ gap: 12 }}>
                        {notifications.map((notification) => (
                            <View
                                key={notification.id}
                                style={[
                                    styles.notificationItem,
                                    {
                                        backgroundColor: notification.isRead ? colors.surface : colors.surfaceAlt,
                                        borderColor: notification.isRead ? colors.border : colors.primary,
                                        borderLeftWidth: notification.isRead ? StyleSheet.hairlineWidth : 3,
                                    },
                                ]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <Text style={[styles.notificationType, { color: colors.primary, flex: 1 }]}>
                                                {getNotificationTitle(notification)}
                                            </Text>
                                            <Text style={[styles.notificationDate, { color: colors.textMuted, marginLeft: 8 }]}>
                                                {formatDate(notification.sentAt)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.notificationMessage, { color: colors.textPrimary }]}>
                                            {getNotificationMessage(notification)}
                                        </Text>
                                    </View>
                                    <Pressable 
                                        onPress={() => handleDeleteNotification(notification.id)}
                                        style={{ marginLeft: 12, padding: 4 }}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
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
  notificationIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  compactCard: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  compactList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  compactListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  compactListText: {
    fontSize: 14,
    fontWeight: '500',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  accordionSubtitle: {
    fontSize: 14,
  },
  rowBlock: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowValue: {
    marginTop: 4,
    fontSize: 13,
  },
  optionList: {
    marginTop: 16,
    gap: 12,
  },
  optionItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  optionMeta: {
    flex: 1,
    gap: 6,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
  },
  tutorialButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  testButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 16,
  },
  deleteAccountWarning: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  modalContainer: {
      flex: 1,
      padding: 20,
      paddingTop: 60
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20
  },
  input: {
      borderWidth: 1, 
      padding: 12, 
      borderRadius: 8, 
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  notificationItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
  },
  notificationType: {
    fontSize: 13,
    fontWeight: '600',
  },
  notificationDate: {
    fontSize: 12,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  premiumCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginTop: 8,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  premiumIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumContent: {
    flex: 1,
    gap: 6,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  premiumDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  subscriptionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 16,
    marginTop: 8,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  subscriptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subscriptionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  subscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  subscriptionButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  guestCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  guestIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestContent: {
    flex: 1,
    gap: 4,
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  guestDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});