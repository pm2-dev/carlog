# Abonelik Sistemi Test ve Production Modları

Bu dokümantasyon, abonelik sisteminin test ve production modlarındaki davranışlarını açıklar.

## Test Modu (Development)

Test modu otomatik olarak `__DEV__` değişkenine göre aktif olur.

### Özellikler

- ✅ IAP servisi devre dışı bırakılır
- ✅ AsyncStorage kullanarak yerel premium durumu yönetimi
- ✅ Gerçek ödeme işlemi yapılmaz
- ✅ Popup'lar kullanıcının seçtiği dile göre gösterilir
- ✅ Console logları detaylıdır

### Test Senaryoları

#### 1. İlk Kurulum (Premium Değil)
```typescript
// AsyncStorage'da kayıt yok
isPremium: false
```

**Beklenen Davranış:**
- Kullanıcı ayarlar sayfasında "Remove Ads" kartını görür
- "Subscribe Now" butonuna basıldığında popup gösterilir
- Popup kullanıcının dilinde çevrilmiştir
- "Continue" seçeneğine basıldığında premium aktif olur

#### 2. Premium Satın Alma (Test)
```typescript
// Kullanıcı "Subscribe Now" butonuna bastığında:
1. Popup gösterilir (kullanıcının dilinde)
2. "Continue" seçeneği ile AsyncStorage'a kayıt yapılır
3. isPremium: true olur
4. UI güncellenir ve "Premium Active" kartı gösterilir
```

#### 3. Restore Purchases (Test)
```typescript
// Kullanıcı "Restore Purchases" butonuna bastığında:
1. AsyncStorage kontrol edilir
2. Eğer premium kaydı varsa isPremium: true olur
3. Yoksa değişiklik olmaz
```

## Production Modu

Production modu `__DEV__ === false` olduğunda otomatik aktif olur.

### Özellikler

- ✅ Gerçek IAP (In-App Purchase) entegrasyonu aktif
- ✅ Apple/Google Store ile senkronizasyon
- ✅ Receipt validation
- ✅ Purchase listener'lar aktif
- ✅ Güvenli ödeme işlemi

### Production Senaryoları

#### 1. İlk Kurulum (Premium Değil)
```typescript
// IAP initialize edilir
// Mevcut abonelikler kontrol edilir
isPremium: false (varsayılan)
```

**Beklenen Davranış:**
- IAP servisi başlatılır
- Mevcut satın alımlar kontrol edilir
- Eğer aktif abonelik yoksa isPremium: false kalır

#### 2. Premium Satın Alma (Gerçek)
```typescript
// Kullanıcı "Subscribe Now" butonuna bastığında:
1. IAP satın alma akışı başlatılır
2. Apple/Google ödeme ekranı gösterilir
3. Kullanıcı ödeme yapar
4. Receipt validation yapılır
5. Başarılı olursa:
   - AsyncStorage'a kayıt yapılır
   - isPremium: true olur
   - Transaction sonlandırılır
```

#### 3. Purchase Listener
```typescript
// Satın alma tamamlandığında otomatik çalışır
purchaseUpdatedListener(async (purchase) => {
  if (receipt) {
    await iapService.finishTransaction(purchase);
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setIsPremium(true);
  }
});
```

#### 4. Restore Purchases (Gerçek)
```typescript
// Kullanıcı "Restore Purchases" butonuna bastığında:
1. IAP'den mevcut satın alımlar alınır
2. Subscription product ID kontrol edilir
3. Eğer aktif abonelik varsa:
   - AsyncStorage'a kayıt yapılır
   - isPremium: true olur
4. Yoksa isPremium: false olur
```

#### 5. Premium Durumu Doğrulama
```typescript
// Uygulama her açıldığında:
1. AsyncStorage kontrol edilir
2. IAP'den aktif abonelikler kontrol edilir
3. Her ikisi de true ise premium aktif
4. Değilse premium iptal edilir
```

## Hata Senaryoları

### Test Modunda

#### 1. Kullanıcı İptal
```typescript
// Popup'ta "Cancel" seçeneğine basıldığında:
- İşlem iptal edilir
- isPremium değişmez
- Hata gösterilmez
```

### Production Modunda

#### 1. IAP Başlatma Hatası
```typescript
try {
  await iapService.initializeIAP();
} catch (error) {
  // Fallback: AsyncStorage'dan yerel durumu yükle
  await loadSubscriptionStatusFromStorage();
}
```

#### 2. Kullanıcı Satın Almayı İptal Etti
```typescript
if (error.code === 'IAP_USER_CANCELLED') {
  // Sessizce işlemi sonlandır
  // Hata mesajı gösterme
}
```

#### 3. Ağ Hatası / Store Bağlantı Hatası
```typescript
catch (error: IAPError) {
  // Kullanıcıya hata mesajı göster
  Alert.alert(t('common.error'), t('settings.subscription_error'));
}
```

#### 4. Receipt Validation Hatası
```typescript
// Purchase listener içinde:
if (!receipt) {
  console.error('No receipt received');
  // Transaction finish edilmez
}
```

## Çok Dilli Destek

Tüm popup ve mesajlar otomatik olarak kullanıcının seçtiği dile çevrilir:

### Desteklenen Diller
- 🇹🇷 Türkçe (tr)
- 🇺🇸 English (en_US)
- 🇬🇧 English UK (en_GB)
- 🇩🇪 Deutsch (de)
- 🇪🇸 Español (es)
- 🇫🇷 Français (fr)
- 🇮🇹 Italiano (it)
- 🇵🇹 Português (pt)
- 🇮🇳 हिंदी (hi)
- 🇷🇺 Русский (ru)
- 🇷🇴 Română (ro)

### Çeviri Anahtarları
```typescript
settings.subscription_popup_title
settings.subscription_popup_message
settings.subscription_popup_cancel
settings.subscription_popup_continue
settings.subscription_success
settings.subscription_error
settings.restore_success
settings.restore_error
```

## Güvenlik

### Production'da
1. ✅ Receipt validation yapılır
2. ✅ Transaction sonlandırma (finishTransaction)
3. ✅ Duplicate purchase kontrolü
4. ✅ Client-side ve server-side doğrulama

### Test'te
1. ⚠️ Sadece yerel doğrulama
2. ⚠️ Receipt validation yok
3. ⚠️ Gerçek ödeme işlemi yok

## Debugging

### Console Logları

Test ve Production modunda detaylı loglar:

```typescript
// IAP başlatma
'✅ IAP connection initialized successfully'
'❌ IAP initialization failed'

// Satın alma
'🛒 Attempting to purchase subscription'
'✅ Subscription purchased'
'❌ Subscription purchase failed'

// Restore
'♻️ Attempting to restore purchases'
'✅ Subscription restored from IAP'
'ℹ️ No active subscription found'

// Premium kontrol
'🔍 Has active subscription: true/false'
```

## Platform Gereksinimleri

### iOS
- ✅ App Store Connect'te subscription product tanımlı olmalı
- ✅ Product ID: `com.tolgaoztrk.carlog.removeads`
- ✅ Sandbox test hesabı gerekli

### Android
- ✅ Google Play Console'da subscription product tanımlı olmalı
- ✅ Product ID: `oluşturulmadı`
- ✅ Test lisansı gerekli

## Geliştirici Notları

1. **Test Modu Kullanımı:**
   - Development sırasında gerçek ödeme yapmadan test edebilirsiniz
   - AsyncStorage'ı temizleyerek premium durumunu sıfırlayabilirsiniz

2. **Production'a Geçiş:**
   - `__DEV__` otomatik olarak false olur
   - IAP servisi otomatik devreye girer
   - Gerçek store hesapları kullanılır

3. **Premium Durumu Sıfırlama (Test):**
   ```typescript
   await AsyncStorage.removeItem('@carlog_subscription_status');
   ```

4. **Manuel Test:**
   - iOS: Sandbox test hesabı ile App Store'da test
   - Android: Test lisansı ile Google Play'de test
