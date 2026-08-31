import { Platform } from 'react-native';

// Expo Go'da react-native-iap çalışmaz, try-catch ile yüklüyoruz
let RNIap: typeof import('react-native-iap') | null = null;

// v14 API fonksiyonları
let initConnection: typeof import('react-native-iap').initConnection | null = null;
let endConnection: typeof import('react-native-iap').endConnection | null = null;
let fetchProducts: typeof import('react-native-iap').fetchProducts | null = null;
let requestPurchase: typeof import('react-native-iap').requestPurchase | null = null;
let getAvailablePurchases: typeof import('react-native-iap').getAvailablePurchases | null = null;
let finishTransactionFunc: typeof import('react-native-iap').finishTransaction | null = null;
let acknowledgePurchaseAndroid: typeof import('react-native-iap').acknowledgePurchaseAndroid | null = null;

try {
  const iapModule = require('react-native-iap');
  RNIap = iapModule;
  initConnection = iapModule.initConnection;
  endConnection = iapModule.endConnection;
  fetchProducts = iapModule.fetchProducts;
  requestPurchase = iapModule.requestPurchase;
  getAvailablePurchases = iapModule.getAvailablePurchases;
  finishTransactionFunc = iapModule.finishTransaction;
  acknowledgePurchaseAndroid = iapModule.acknowledgePurchaseAndroid;
  console.log('✅ react-native-iap modülü yüklendi (v14)');
} catch (error) {
  console.warn('⚠️ react-native-iap Expo Go\'da kullanılamıyor.');
}

const PRODUCT_ID = 'com.tolgaoztrk.carlog.removeads';

export interface IAPError {
  code: string;
  message: string;
  originalError?: any;
}

// Type definitions for better IDE support
export type Purchase = any;
export type Product = any;
export type Subscription = any;

export const iapService = {
  isRequesting: false,

  /**
   * Initialize IAP connection
   * Must be called before any other IAP operations
   */
  initializeIAP: async (): Promise<void> => {
    if (!RNIap || !initConnection) {
      throw {
        code: 'IAP_NOT_AVAILABLE',
        message: 'IAP not available in Expo Go',
      } as IAPError;
    }

    try {
      console.log('🔄 Initializing IAP connection...');
      const result = await initConnection();
      console.log('🔄 IAP connection result:', result);
      console.log('✅ IAP connection initialized successfully');
    } catch (error) {
      console.error('❌ IAP initialization failed:', error);
      throw {
        code: 'IAP_INIT_ERROR',
        message: 'Failed to initialize in-app purchases',
        originalError: error
      } as IAPError;
    }
  },

  /**
   * Ensure connection is active
   */
  ensureConnection: async (): Promise<void> => {
    if (!RNIap || !initConnection) return;
    try {
      // initConnection is safe to call multiple times
      await initConnection();
    } catch (error) {
      console.error('❌ Failed to ensure connection:', error);
      throw error;
    }
  },

  /**
   * Restore previous purchases
   */
  restorePurchases: async (): Promise<Purchase[]> => {
    if (!RNIap || !getAvailablePurchases) {
      throw {
        code: 'IAP_NOT_AVAILABLE',
        message: 'IAP not available in Expo Go',
      } as IAPError;
    }

    try {
      console.log('♻️ Attempting to restore purchases...');
      await iapService.ensureConnection();
      const purchases = await getAvailablePurchases();
      console.log('✅ Available purchases:', purchases);
      return purchases;
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error);
      throw {
        code: 'IAP_RESTORE_ERROR',
        message: 'Failed to restore purchases',
        originalError: error
      } as IAPError;
    }
  },

  /**
   * Get non-consumable products (v14 API uses fetchProducts)
   */
  getProducts: async (): Promise<Product[]> => {
    if (!RNIap || !fetchProducts) {
      console.error('❌ IAP modülü yüklenmemiş:', { RNIap: !!RNIap, fetchProducts: !!fetchProducts });
      throw {
        code: 'IAP_NOT_AVAILABLE',
        message: 'IAP not available in Expo Go',
      } as IAPError;
    }

    try {
      const productIds = [PRODUCT_ID];

      console.log('🔍 Fetching products with IDs:', productIds);
      await iapService.ensureConnection();

      console.log('🔍 Calling fetchProducts (v14 API)...');
      // v14 API: fetchProducts with skus array and type
      const products = await fetchProducts({
        skus: productIds,
        type: 'in-app',
      });
      console.log('📦 Available products:', JSON.stringify(products, null, 2));

      if (!products || products.length === 0) {
        console.warn('⚠️ No products found. Check App Store Connect configuration.');
        console.warn('⚠️ Make sure the product ID matches:', PRODUCT_ID);
        console.warn('⚠️ Make sure the IAP product is in "Ready to Submit" or "Approved" status');
      }

      return products;
    } catch (error: any) {
      console.error('❌ Failed to get products:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw {
        code: 'IAP_GET_PRODUCTS_ERROR',
        message: `Failed to fetch products: ${error?.message || 'Unknown error'}`,
        originalError: error
      } as IAPError;
    }
  },

  /**
   * Purchase non-consumable product (Remove Ads)
   * v14 API: requestPurchase is event-based, listen for purchaseUpdatedListener
   */
  purchaseProduct: async (productId: string = PRODUCT_ID): Promise<Purchase> => {
    if (!RNIap || !requestPurchase) {
      throw {
        code: 'IAP_NOT_AVAILABLE',
        message: 'IAP not available in Expo Go',
      } as IAPError;
    }

    if (iapService.isRequesting) {
      throw {
        code: 'IAP_BUSY',
        message: 'Another purchase request is already in progress',
      } as IAPError;
    }

    try {
      iapService.isRequesting = true;
      console.log('🛒 Attempting to purchase product:', productId);
      await iapService.ensureConnection();

      console.log('🛒 Calling requestPurchase (v14 API)...');
      // v14: request.request must nest per platform — ios: { sku }, android: { skus } (see react-native-iap index.js validation)
      const result = await requestPurchase({
        type: 'in-app',
        request: {
          ios: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false,
          },
          android: {
            skus: [productId],
          },
        },
      });
      console.log('✅ Purchase request sent:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ Product purchase failed:', error);
      console.error('❌ Error code:', error?.code);
      console.error('❌ Error message:', error?.message);

      // Handle user cancellation
      if (error.code === 'E_USER_CANCELLED') {
        throw {
          code: 'IAP_USER_CANCELLED',
          message: 'Purchase cancelled by user',
          originalError: error
        } as IAPError;
      }

      throw {
        code: 'IAP_PURCHASE_ERROR',
        message: `Failed to purchase product: ${error?.message || 'Unknown error'}`,
        originalError: error
      } as IAPError;
    } finally {
      iapService.isRequesting = false;
    }
  },

  /**
   * Check if user has an active subscription
   */
  hasActiveSubscription: async (): Promise<boolean> => {
    if (!RNIap || !getAvailablePurchases) {
      console.warn('⚠️ IAP not available');
      return false;
    }

    try {
      await iapService.ensureConnection();
      const purchases = await getAvailablePurchases();
      const hasActive = purchases.some(
        (purchase: any) => purchase.productId === PRODUCT_ID
      );
      console.log('🔍 Has active subscription:', hasActive);
      return hasActive;
    } catch (error) {
      console.error('❌ Failed to check subscription status:', error);
      return false;
    }
  },

  /**
   * Check if user has purchased remove ads (non-consumable)
   */
  hasActivePurchase: async (): Promise<boolean> => {
    if (!RNIap || !getAvailablePurchases) {
      console.warn('⚠️ IAP not available');
      return false;
    }

    try {
      await iapService.ensureConnection();
      const purchases = await getAvailablePurchases();
      
      console.log('🔍 All available purchases:', purchases.map((p: any) => ({
        productId: p.productId,
        transactionId: p.transactionId,
        purchaseTime: p.transactionDate
      })));
      
      const hasPurchase = purchases.some(
        (purchase: any) => purchase.productId === PRODUCT_ID
      );
      
      console.log('🔍 Has active purchase for', PRODUCT_ID, ':', hasPurchase);
      return hasPurchase;
    } catch (error) {
      console.error('❌ Failed to check purchase status:', error);
      return false;
    }
  },

  /**
   * Finish a transaction (important for both iOS and Android)
   */
  finishTransaction: async (purchase: Purchase, isConsumable: boolean = false): Promise<void> => {
    if (!RNIap || !finishTransactionFunc) {
      console.warn('⚠️ IAP not available');
      return;
    }

    try {
      console.log('🔄 Finishing transaction for:', purchase.productId);
      
      if (Platform.OS === 'ios') {
        await finishTransactionFunc({ purchase, isConsumable });
      } else if (Platform.OS === 'android') {
        // For Android, acknowledge the purchase first
        if (purchase.purchaseStateAndroid === 1 && !purchase.isAcknowledgedAndroid && acknowledgePurchaseAndroid && purchase.purchaseToken) {
          // v14 API: acknowledgePurchaseAndroid takes a string (purchaseToken)
          await acknowledgePurchaseAndroid(purchase.purchaseToken);
        }
        // Also finish the transaction
        await finishTransactionFunc({ purchase, isConsumable });
      }
      console.log('✅ Transaction finished:', purchase.productId);
    } catch (error) {
      console.error('❌ Failed to finish transaction:', error);
      throw error;
    }
  },

  /**
   * End IAP connection
   * Should be called when the app is closing
   */
  endConnection: async (): Promise<void> => {
    if (!RNIap || !endConnection) {
      return;
    }

    try {
      await endConnection();
      console.log('✅ IAP connection closed');
    } catch (error) {
      console.error('❌ Failed to end IAP connection:', error);
    }
  },

  /**
   * Get the product ID
   */
  getProductId: () => PRODUCT_ID,
};
