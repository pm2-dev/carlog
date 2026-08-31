import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, EmitterSubscription } from 'react-native';
import { iapService, IAPError } from '@/services/iapService';
import { useTranslation } from '@/hooks/useTranslation';

// Expo Go'da react-native-iap çalışmaz, bu yüzden try-catch ile import ediyoruz
let RNIap: typeof import('react-native-iap') | null = null;
let purchaseUpdatedListener: typeof import('react-native-iap').purchaseUpdatedListener | null = null;
let purchaseErrorListener: typeof import('react-native-iap').purchaseErrorListener | null = null;

try {
  const iapModule = require('react-native-iap');
  RNIap = iapModule;
  purchaseUpdatedListener = iapModule.purchaseUpdatedListener;
  purchaseErrorListener = iapModule.purchaseErrorListener;
  console.log('✅ react-native-iap modülü PurchaseContext için yüklendi');
  console.log('📦 purchaseUpdatedListener:', typeof purchaseUpdatedListener);
  console.log('📦 purchaseErrorListener:', typeof purchaseErrorListener);
} catch (error) {
  console.warn('⚠️ react-native-iap Expo Go\'da kullanılamıyor. Gerçek cihazda build alın.');
}

type PurchaseContextType = {
  isPremium: boolean;
  isLoading: boolean;
  purchaseRemoveAds: () => Promise<void>;
  restorePurchases: () => Promise<void>;
};

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

const REMOVE_ADS_PRODUCT_ID = 'com.tolgaoztrk.carlog.removeads';
const STORAGE_KEY = '@carlog_premium_status';

export const PurchaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  // IAP başlatma ve premium durumunu yükleme
  useEffect(() => {
    initializeIAPAndLoadStatus();

    // IAP event listener'ları - sadece RNIap varsa
    let purchaseUpdateSubscription: EmitterSubscription | null = null;
    let purchaseErrorSubscription: EmitterSubscription | null = null;

    const setupListeners = () => {
      if (RNIap && purchaseUpdatedListener && purchaseErrorListener) {
        try {
          console.log('🔄 Setting up IAP listeners...');
          
          purchaseUpdateSubscription = purchaseUpdatedListener((purchase: any) => {
            console.log('📥 Purchase updated:', JSON.stringify(purchase, null, 2));
            handlePurchaseUpdate(purchase);
          });

          purchaseErrorSubscription = purchaseErrorListener((error: any) => {
            console.error('❌ Purchase error from listener:', error);
            console.error('❌ Error code:', error?.code);
            console.error('❌ Error message:', error?.message);
            if (error.code !== 'E_USER_CANCELLED') {
              Alert.alert(t('common.error'), t('settings.purchase_error'));
            }
          });
          
          console.log('✅ IAP listeners setup complete');
        } catch (error) {
          console.warn('⚠️ IAP listeners kurulamadı:', error);
        }
      } else {
        console.warn('⚠️ IAP listeners atlandı - modül yüklenmemiş:', {
          RNIap: !!RNIap,
          purchaseUpdatedListener: !!purchaseUpdatedListener,
          purchaseErrorListener: !!purchaseErrorListener
        });
      }
    };

    setupListeners();

    return () => {
      console.log('🔄 Cleaning up IAP listeners...');
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
      }
      iapService.endConnection().catch(() => { });
    };
  }, []);

  const initializeIAPAndLoadStatus = async () => {
    try {
      setIsLoading(true);

      // IAP ile kontrol
      if (RNIap) {
        try {
          await iapService.initializeIAP();
          await validatePremiumStatus();
        } catch (error) {
          console.warn('⚠️ IAP başlatılamadı, AsyncStorage kullanılıyor:', error);
          // IAP başarısız olursa sadece AsyncStorage'a bak
          const status = await AsyncStorage.getItem(STORAGE_KEY);
          setIsPremium(status === 'true');
        }
      } else {
        console.warn('⚠️ IAP modülü yok (Expo Go), AsyncStorage kullanılıyor');
        const status = await AsyncStorage.getItem(STORAGE_KEY);
        setIsPremium(status === 'true');
      }
    } catch (error) {
      console.error('Premium durumu yüklenemedi:', error);
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  };

  const validatePremiumStatus = async () => {
    try {
      // AsyncStorage'dan yerel durumu kontrol et
      const localStatus = await AsyncStorage.getItem(STORAGE_KEY);

      if (!RNIap) {
        // IAP yoksa sadece AsyncStorage'a güven
        setIsPremium(localStatus === 'true');
        return;
      }

      try {
        // IAP'den aktif purchase'ları kontrol et
        const hasActive = await iapService.hasActivePurchase();
        
        console.log('🔍 Premium validation:', { localStatus, hasActive });

        if (hasActive) {
          // IAP'de satın alma varsa, premium aktif
          // AsyncStorage'ı da güncelle (senkronizasyon)
          if (localStatus !== 'true') {
            await AsyncStorage.setItem(STORAGE_KEY, 'true');
            console.log('🔄 Premium status synced: activated from IAP');
          }
          setIsPremium(true);
        } else if (localStatus === 'true') {
          // IAP'de satın alma yok ama yerel cache'de var
          // Bu durumda yerel cache'i temizle (refund veya başka cihazda iptal olmuş olabilir)
          await AsyncStorage.setItem(STORAGE_KEY, 'false');
          setIsPremium(false);
          console.log('🔄 Premium status synced: cleared local cache (no active purchase in IAP)');
        } else {
          // Her ikisi de false
          setIsPremium(false);
        }
      } catch (error) {
        console.warn('⚠️ IAP kontrolü başarısız, AsyncStorage kullanılıyor:', error);
        // IAP kontrolü başarısız olursa yerel cache'e güven
        setIsPremium(localStatus === 'true');
      }
    } catch (error) {
      console.error('Premium status validation failed:', error);
      setIsPremium(false);
    }
  };

  const handlePurchaseUpdate = async (purchase: any) => {
    try {
      console.log('📥 Processing purchase:', {
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        hasReceipt: !!purchase.transactionReceipt
      });

      // Doğru ürün ID'si kontrolü
      if (purchase.productId !== REMOVE_ADS_PRODUCT_ID) {
        console.log('⚠️ Unknown product, skipping:', purchase.productId);
        return;
      }

      // StoreKit 2 / Nitro köprüsünde transactionReceipt gelmeyebilir; finish için purchase.id (iOS) yeterli
      if (RNIap) {
        try {
          await iapService.finishTransaction(purchase);
          console.log('✅ Transaction finished successfully');
        } catch (finishError) {
          console.error('⚠️ Failed to finish transaction:', finishError);
        }
      }

      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      setIsPremium(true);
      console.log('✅ Premium activated successfully - Ads will be hidden');

      Alert.alert(t('common.success'), t('settings.purchase_success'));
    } catch (error) {
      console.error('❌ Failed to handle purchase update:', error);
    }
  };

  const purchaseRemoveAds = async () => {
    try {
      setIsLoading(true);

      if (!RNIap) {
        Alert.alert(
          t('common.error'),
          t('settings.iap_expo_warning'),
          [{ text: t('common.ok') }]
        );
        setIsLoading(false);
        return;
      }

      // Önce ürünleri kontrol et
      console.log('🔍 Checking available products...');
      try {
        const products = await iapService.getProducts();
        console.log('📦 Products found:', products);

        if (!products || products.length === 0) {
          Alert.alert(
            t('common.error'),
            t('settings.iap_product_not_found'),
            [{ text: t('common.ok') }]
          );
          setIsLoading(false);
          return;
        }

        const product = products[0];
        console.log('💰 Product details:', {
          productId: product.productId,
          price: product.localizedPrice,
          title: product.title,
          description: product.description
        });
      } catch (error) {
        console.error('❌ Failed to fetch products:', error);
        const iapError = error as IAPError;
        const errorMessage = iapError?.originalError?.message || iapError?.message || 'Unknown error';
        console.error('❌ Product fetch error details:', {
          code: iapError?.code,
          message: iapError?.message,
          originalError: iapError?.originalError
        });
        Alert.alert(
          t('common.error'),
          t('settings.iap_load_error'),
          [{ text: t('common.ok') }]
        );
        setIsLoading(false);
        return;
      }

      // iOS için App Store purchase - önce bilgilendirme popup'ı göster
      if (Platform.OS === 'ios') {
        Alert.alert(
          t('settings.purchase_popup_title'),
          t('settings.purchase_popup_message'),
          [
            {
              text: t('settings.purchase_popup_cancel'),
              style: 'cancel',
              onPress: () => {
                setIsLoading(false);
              }
            },
            {
              text: t('settings.purchase_popup_continue'),
              onPress: async () => {
                try {
                  console.log('🛒 Starting purchase flow...');
                  await iapService.purchaseProduct();
                  // Başarılı mesaj purchaseUpdatedListener'da gösterilecek
                } catch (error) {
                  const iapError = error as IAPError;
                  console.error('❌ Purchase error:', iapError);
                  if (iapError.code !== 'IAP_USER_CANCELLED') {
                    throw error;
                  }
                } finally {
                  setIsLoading(false);
                }
              }
            }
          ]
        );
      } else if (Platform.OS === 'android') {
        // Android için direkt satın alma
        try {
          console.log('🛒 Starting purchase flow...');
          await iapService.purchaseProduct();
          // Başarılı mesaj purchaseUpdatedListener'da gösterilecek
        } catch (error) {
          const iapError = error as IAPError;
          console.error('❌ Purchase error:', iapError);
          if (iapError.code !== 'IAP_USER_CANCELLED') {
            throw error;
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Satın alma başarısız:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const restorePurchases = async () => {
    try {
      setIsLoading(true);

      if (!RNIap) {
        Alert.alert(
          t('common.error'),
          t('settings.iap_expo_warning'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      // IAP ile restore
      const purchases = await iapService.restorePurchases();
      
      console.log('🔄 Restore: Found purchases:', purchases.map((p: any) => ({
        productId: p.productId,
        transactionId: p.transactionId
      })));
      
      const matchingPurchase = purchases.find(
        (purchase: any) => purchase.productId === REMOVE_ADS_PRODUCT_ID
      );

      if (matchingPurchase) {
        // Transaction'ı bitir (önemli)
        try {
          await iapService.finishTransaction(matchingPurchase);
          console.log('✅ Restored transaction finished');
        } catch (finishError) {
          console.warn('⚠️ Could not finish restored transaction:', finishError);
        }
        
        // Premium'u aktif et
        await AsyncStorage.setItem(STORAGE_KEY, 'true');
        setIsPremium(true);
        console.log('✅ Purchases restored successfully - Ads will be hidden');
        Alert.alert(t('common.success'), t('settings.restore_success'));
      } else {
        console.log('ℹ️ No purchases to restore for product:', REMOVE_ADS_PRODUCT_ID);
        // Satın alım bulunamadı mesajı
        throw {
          code: 'NO_PURCHASES',
          message: t('settings.iap_no_purchases')
        } as IAPError;
      }
    } catch (error) {
      console.error('Satın alımlar geri yüklenemedi:', error);
      const iapError = error as IAPError;
      if (iapError.code === 'NO_PURCHASES') {
        Alert.alert(t('common.error'), t('settings.iap_no_purchases'));
      } else {
        Alert.alert(t('common.error'), t('settings.restore_error'));
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PurchaseContext.Provider
      value={{
        isPremium,
        isLoading,
        purchaseRemoveAds,
        restorePurchases,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchase = () => {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error('usePurchase must be used within a PurchaseProvider');
  }
  return context;
};
