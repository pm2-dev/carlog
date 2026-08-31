# AdMob ve Abonelik Sistemi Kurulumu

## Yapılan Değişiklikler

### 1. AdMob Reklamları
- **Dashboard (Kayıt Oluşturma) Sayfası**: Sayfa başlığının hemen altına AdMob banner reklamı eklendi
- **Reports (Raporlar) Sayfası**: Sayfa başlığının hemen altına AdMob banner reklamı eklendi
- Reklamlar sadece premium üye olmayan kullanıcılara gösteriliyor

### 2. Reklamsız Abonelik Sistemi (react-native-iap ile)
- **Product ID**: `com.tolgaoztrk.carlog.removeads`
- **IAP Service**: `src/services/iapService.ts` oluşturuldu (tam IAP entegrasyonu)
- **Subscription Context**: `src/contexts/SubscriptionContext.tsx` güncellendi
  - `isPremium`: Kullanıcının premium üye olup olmadığını kontrol eder (IAP + AsyncStorage)
  - `purchaseSubscription()`: Gerçek IAP ile abonelik satın alma
  - `restorePurchases()`: IAP'den satın alımları geri yükleme
  - Test modu ve production modu otomatik ayrımı (__DEV__)
  - Çok dilli popup desteği (11 dil)

### 3. Settings Sayfası Güncellemeleri
- Abonelik yönetimi bölümü eklendi
- Premium üye için yeşil onay kartı
- Üye olmayan kullanıcılar için abonelik satın alma kartı
- "Satın Alımları Geri Yükle" butonu

### 4. Production Ayarları
- `app.json` dosyasında AdMob production modu aktif edildi
- iOS için associatedDomains eklendi
- Abonelik ürün ID'si extra config'e eklendi

## Dosya Yapısı

```
src/
├── services/
│   └── iapService.ts                # YENİ - IAP servis katmanı
├── contexts/
│   └── SubscriptionContext.tsx      # GÜNCELLENDİ - IAP entegrasyonu + çok dil
├── components/
│   └── AdBanner.tsx                 # Güncellendi - Production modu
├── screens/
│   ├── DashboardScreen.tsx          # Güncellendi - Reklam eklendi
│   ├── ReportsScreen.tsx            # Güncellendi - Reklam eklendi
│   └── SettingsScreen.tsx           # GÜNCELLENDİ - Hardcoded metinler kaldırıldı
├── i18n/
│   └── translations/
│       ├── tr.json                  # GÜNCELLENDİ - Abonelik çevirileri
│       ├── en_US.json               # GÜNCELLENDİ - Abonelik çevirileri
│       ├── en_GB.json               # GÜNCELLENDİ - Abonelik çevirileri
│       ├── de.json                  # GÜNCELLENDİ - Abonelik çevirileri
│       ├── es.json                  # GÜNCELLENDİ - Abonelik çevirileri
│       ├── fr.json                  # GÜNCELLENDİ - Abonelik çevirileri
│       ├── it.json                  # GÜNCELLENDİ - Abonelik çevirileri
│       ├── pt.json                  # GÜNCELLENDİ - Abonelik çevirileri
│       ├── hi.json                  # GÜNCELLENDİ - Abonelik çevirileri
│       ├── ru.json                  # GÜNCELLENDİ - Abonelik çevirileri
│       └── ro.json                  # GÜNCELLENDİ - Abonelik çevirileri
└── providers/
    └── AppProviders.tsx             # Güncellendi - SubscriptionProvider eklendi
```

## Kullanım

### Premium Kontrolü
```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function MyComponent() {
  const { isPremium } = useSubscription();
  
  return (
    <>
      {!isPremium && <AdBanner />}
      {/* Diğer içerik */}
    </>
  );
}
```

### Abonelik Satın Alma
```typescript
const { purchaseSubscription, restorePurchases } = useSubscription();

// Satın al
await purchaseSubscription();

// Geri yükle
await restorePurchases();
```

## App Store Connect Yapılacaklar

### 1. In-App Purchase Oluşturma
1. App Store Connect'e giriş yapın
2. Uygulamanızı seçin
3. "In-App Purchases" bölümüne gidin
4. "+" butonuna tıklayın
5. "Auto-Renewable Subscription" seçin
6. Bilgileri doldurun:
   - **Product ID**: `com.tolgaoztrk.carlog.removeads`
   - **Reference Name**: Reklamsız Abonelik
   - **Subscription Duration**: Aylık veya Yıllık
   - **Price**: Fiyat belirleme

### 2. Abonelik Grubu
1. Subscription Group oluşturun
2. Lokalizasyon ekleyin:
   - **Türkçe**: "Reklamsız Premium"
   - **İngilizce**: "Ad-Free Premium"

### 3. Test Kullanıcıları
1. "Users and Access" bölümünden
2. "Sandbox Testers" oluşturun
3. Test cihazında bu hesapla giriş yapın

## Geliştirme Notları

### Test Modu
- Development ortamında AdMob test reklamları gösterilir
- Abonelik test edebilmek için Sandbox Test hesabı kullanın

### Production Modu
- `app.json` içinde `admob.isProduction: true` olarak ayarlandı
- Gerçek AdMob reklamları gösterilir
- Apple In-App Purchase production API kullanılır

## Çeviri Desteği (Çok Dilli)
Abonelik sistemi 11 dilde tam destek sunuyor:

### Desteklenen Diller:
- 🇹🇷 Türkçe (tr)
- 🇺🇸 English US (en_US)
- 🇬🇧 English UK (en_GB)
- 🇩🇪 Deutsch (de)
- 🇪🇸 Español (es)
- 🇫🇷 Français (fr)
- 🇮🇹 Italiano (it)
- 🇵🇹 Português (pt)
- 🇮🇳 हिंदी (hi)
- 🇷🇺 Русский (ru)
- 🇷🇴 Română (ro)

### Eklenen Çeviri Anahtarları:
- `settings.subscription_management` - Abonelik Yönetimi
- `settings.subscription` - Abonelik
- `settings.premium_active` - Premium Üyelik Aktif
- `settings.premium_desc` - Açıklama metni
- `settings.remove_ads` - Reklamları Kaldır
- `settings.remove_ads_desc` - Açıklama metni
- `settings.subscribe_now` - Şimdi Abone Ol
- `settings.restore_purchases` - Satın Alımları Geri Yükle
- `settings.subscription_success` - Başarı mesajı
- `settings.subscription_error` - Hata mesajı
- `settings.restore_success` - Geri yükleme başarı
- `settings.restore_error` - Geri yükleme hata
- `settings.subscription_popup_title` - Popup başlığı
- `settings.subscription_popup_message` - Popup mesajı
- `settings.subscription_popup_cancel` - İptal butonu
- `settings.subscription_popup_continue` - Devam butonu
- `settings.delete_notification_confirm` - Bildirim silme onayı
- `settings.delete_all_notifications_confirm` - Tümünü silme onayı

## Test ve Production Modları

### Test Modu (Development - __DEV__ = true)
- ✅ IAP servisi devre dışı
- ✅ AsyncStorage ile yerel test
- ✅ Gerçek ödeme yapılmaz
- ✅ Popup'lar çok dilli
- ✅ Console logları detaylı

### Production Modu (__DEV__ = false)
- ✅ Gerçek IAP entegrasyonu
- ✅ Apple/Google Store senkronizasyonu
- ✅ Receipt validation
- ✅ Purchase listener'lar aktif
- ✅ Güvenli ödeme işlemi

**Detaylı bilgi için:** `docs/SUBSCRIPTION_TESTING.md` dosyasına bakın.

## Önemli Hatırlatmalar

1. **Apple Review**: App Store'da reklamsız abonelik sunuyorsanız, uygulama açıklamasında bunu belirtin
2. **Privacy Policy**: Abonelik ve reklam politikalarını gizlilik sözleşmenize ekleyin
3. **AdMob Policy**: Google AdMob politikalarına uygun içerik yayınladığınızdan emin olun
4. **Test Yapın**: Production'a göndermeden önce sandbox ortamında test edin
5. **IAP Kurulum**: App Store Connect ve Google Play Console'da subscription ürünü oluşturun
6. **npm install**: Yeni bağımlılıklar için `npm install` çalıştırın (react-native-iap eklenmiştir)

## Build Komutu

```bash
# iOS Production Build
npm run build:ios

# Android Production Build (gerekirse)
npm run build:android
```

## Kurulum Adımları

### 1. Bağımlılıkları Yükleyin
```bash
npm install
# veya
yarn install
```

### 2. Native Modülleri Yeniden Oluşturun (iOS)
```bash
cd ios
pod install
cd ..
```

### 3. Test Edin
```bash
# Development modu (Test)
npm start

# Production build (Gerçek IAP)
npm run build:ios
npm run build:android
```

## Sorun Giderme

### Reklamlar Görünmüyor
1. AdMob hesabınızda app onaylandı mı?
2. `app.json` içinde doğru AdMob App ID var mı?
3. Internet bağlantısı var mı?

### Abonelik Çalışmıyor
1. App Store Connect'te In-App Purchase oluşturuldu mu?
2. Product ID eşleşiyor mu? (`com.tolgaoztrk.carlog.removeads`)
3. Sandbox test hesabı ile test ediliyor mu?
4. `react-native-iap` doğru yüklendi mi?
5. Test modunda mısınız? (Development'ta IAP devre dışı)

### TypeScript Hataları
```bash
# TypeScript cache temizle
npm run tsc --build --clean
```

### Console Loglarını Kontrol Edin
- ✅ Başarılı işlemler
- ❌ Hata durumları
- ℹ️ Bilgi mesajları
- 🔍 Debug logları

## Dokümantasyon
- **Test Senaryoları**: `docs/SUBSCRIPTION_TESTING.md`
- **API Referansı**: `src/services/iapService.ts` içindeki JSDoc yorumları

## İletişim
Sorularınız için: [tolga@oztrk.com]
