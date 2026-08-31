# 🚨 iOS App Store Reddi - IAP Düzeltme Kontrol Listesi

## ❗ Apple Ret Nedeni: "Failed to Load Product" (Guideline 2.1)

Apple inceleyicisi iPad'de uygulamayı test ederken IAP ürünleri yüklenemedi ve satın alma ekranı açılmadı.

---

## ✅ ZORUNLU KONTROL LİSTESİ

### 1️⃣ **App Store Connect - Agreements, Tax, and Banking** (EN ÖNEMLİ!)

Bu adım **zorunludur** ve genellikle sorunun ana nedenidir!

**Kontrol Edilecekler:**

- [ ] [App Store Connect](https://appstoreconnect.apple.com) → **Agreements, Tax, and Banking** bölümüne gidin
- [ ] **Paid Applications Agreement** aktif ve imzalanmış olmalı
- [ ] **Contact Information** eklenmiş ve onaylanmış olmalı
- [ ] **Banking Information** eklenmiş ve Apple tarafından onaylanmış olmalı
- [ ] **Tax Information** eklenmiş ve onaylanmış olmalı

**❗ Önemli Notlar:**
- Eğer bu bilgiler eksikse veya "Pending" (Beklemede) durumundaysa, Apple sunucuları IAP ürünlerini döndürmez!
- Bank bilgileri onaylanması birkaç gün sürebilir.
- Tüm bilgiler "Active" (Aktif) durumunda olmalı.

**Durum Kontrolü:**
```
✅ Green Badge = Active (Aktif)
⚠️  Yellow/Orange Badge = Pending/Review (Beklemede/İncelemede) 
❌ Red Badge = Action Required (İşlem Gerekli)
```

---

### 2️⃣ **IAP Ürün Durumu Kontrolü**

**Kontrol Edilecekler:**

- [ ] App Store Connect → **My Apps** → **CarLog** → **In-App Purchases**
- [ ] Ürün ID: `com.tolgaoztrk.carlog.removeads` mevcut olmalı
- [ ] Ürün durumu **"Ready to Submit"** veya **"Approved"** olmalı
- [ ] Ürün **"Missing Metadata"** veya **"Developer Action Needed"** durumunda **OLMAMALI**

**Gerekli Ürün Bilgileri:**
- **Reference Name:** Remove Ads
- **Product ID:** `com.tolgaoztrk.carlog.removeads` (kodla birebir aynı olmalı!)
- **Type:** Non-Consumable
- **Price:** Belirlendi mi?
- **Localizations:** En az İngilizce ve Türkçe eklenmiş olmalı

⚠️ **ÖNEMLİ APPLE KURALI:** İlk In-App Purchase mutlaka bir app version ile birlikte submit edilmelidir!

**İlk IAP Submission:**
1. IAP ürününü oluşturduktan sonra **"Ready to Submit"** yapın
2. App Store Connect → My Apps → CarLog → iOS → Version 1.0.1
3. **"In-App Purchases and Subscriptions"** bölümüne gidin
4. **"Add an In-App Purchase"** butonuna tıklayın
5. **"Remove Ads"** ürününü seçin
6. App version ile birlikte submit edin

Kaynak: [Apple Developer Documentation](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review)

---

### 3️⃣ **Bundle Identifier Kontrolü**

**Kontrol Edilecekler:**

- [ ] App Store Connect'teki Bundle ID: `com.tolgaoztrk.carlog`
- [ ] `app.json` içindeki Bundle ID: `com.tolgaoztrk.carlog`
- [ ] İkisi de **TAM OLARAK** aynı olmalı (noktalama dahil!)

**Kod Kontrolü:**
```json
// carlogmobil/app.json - Satır 13
"bundleIdentifier": "com.tolgaoztrk.carlog"
```

---

### 4️⃣ **Product ID Eşleşmesi**

**Kontrol Edilecekler:**

- [ ] Kodda tanımlı Product ID: `com.tolgaoztrk.carlog.removeads`
- [ ] App Store Connect'teki Product ID: `com.tolgaoztrk.carlog.removeads`
- [ ] İkisi de **TAM OLARAK** aynı olmalı!

**Kod Kontrolü:**
```json
// carlogmobil/app.json - Satır 119
"removeAdsProductId": "com.tolgaoztrk.carlog.removeads"
```

---

### 5️⃣ **Sandbox Test (Kendiniz Test Edin)**

Apple inceleyicisi production ortamında test etmeden önce siz sandbox ile test etmelisiniz!

**Adımlar:**

1. **Sandbox Test Kullanıcısı Oluşturun:**
   - App Store Connect → **Users and Access** → **Sandbox** → **Testers**
   - Yeni bir test kullanıcısı ekleyin
   - Email adresi hiçbir Apple ID'de kullanılmamış olmalı!

2. **iOS Cihazda Test:**
   - Gerçek cihazınızdan App Store'dan çıkış yapın
   - TestFlight veya Development build'i yükleyin
   - Uygulamayı açın
   - Settings → Remove Ads → Purchase Now
   - Sandbox kullanıcı ile giriş yapın
   - Satın alma ekranının açıldığını doğrulayın
   - **"[Sandbox]"** yazısını görmelisiniz

3. **Ürün Listesini Kontrol Edin:**
   - Console loglarına bakın
   - `🔍 Checking available products...` mesajını görmelisiniz
   - `📦 Products found: [...]` ile ürün listesi görünmeli
   - Eğer `❌ Failed to get products` görüyorsanız, yukarıdaki adımlara geri dönün!

**Test Senaryosu:**
```
✅ Ürünler listelendi
✅ Satın alma ekranı açıldı
✅ Fiyat görüntülendi
✅ [Sandbox] etiketi göründü
✅ Satın alma tamamlandı
✅ Premium durumu aktif oldu
✅ Reklamlar kayboldu
```

---

### 6️⃣ **Kod Düzeyinde IAP Kontrolü**

**Kontrol Edilecek Dosyalar:**

**1. `src/services/iapService.ts`:**
```typescript
// Ürün ID'lerinin doğru tanımlandığından emin olun
const PRODUCT_IDS = {
  removeAds: 'com.tolgaoztrk.carlog.removeads',  // ✅ Doğru
};
```

**2. `src/contexts/PurchaseContext.tsx`:**
- [ ] `initConnection()` çağrısı yapılıyor mu?
- [ ] `getProducts()` doğru product ID ile çağrılıyor mu?
- [ ] Hata durumları yakalanıyor mu?
- [ ] Console logları aktif mi? (Debug için)

**3. Test için ekleyin (geçici):**
```typescript
useEffect(() => {
  console.log('🔍 IAP Config:', {
    bundleId: Constants.expoConfig?.ios?.bundleIdentifier,
    productId: PRODUCT_IDS.removeAds,
  });
}, []);
```

---

### 7️⃣ **Network ve Sunucu Kontrolü**

**Kontrol Edilecekler:**

- [ ] Cihazda internet bağlantısı var mı?
- [ ] Apple sunucularına erişim engellenmiyor mu?
- [ ] VPN aktif değilse (bazen sorun yaratabilir)
- [ ] iOS cihaz güncel mi? (iOS 13+ önerilir)
- [ ] App Store servislerinde kesinti var mı? → [Apple System Status](https://www.apple.com/support/systemstatus/)

---

### 8️⃣ **Build Ayarları**

**Kontrol Edilecekler:**

- [ ] `eas.json` dosyasında production profili doğru yapılandırılmış mı?
- [ ] Capabilities eklenmiş mi? (In-App Purchase capability)
- [ ] Provisioning profile güncel mi?
- [ ] Sertifikalar geçerli mi?
- [ ] **ÖNEMLİ:** IAP ürünü app version'a eklenmiş mi?

**EAS Build Komutu:**
```bash
cd carlogmobil
eas build --platform ios --profile production
```

**Build Tamamlandıktan Sonra:**

1. App Store Connect'e git
2. **My Apps** → **CarLog** → **iOS** → **1.0.1**
3. Build'i seç
4. **"In-App Purchases and Subscriptions"** bölümünü kontrol et
5. **"Remove Ads"** ürünü listelenmiş olmalı
6. Değilse: "Add an In-App Purchase" ile ekle
7. Review Notes'u doldur
8. **"Submit for Review"** tıkla

⚠️ **APPLE KURALI:** İlk IAP mutlaka app version ile birlikte submit edilmelidir!

Kaynak: [Apple Developer - Overview of submitting for review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review)

---

## 🔧 SORUN GİDERME

### Senaryo 1: "Kod her şey doğru ama yine de çalışmıyor"

**Muhtemel Neden:** Agreements imzalanmamış veya bank bilgileri onay bekliyor.

**Çözüm:**
1. App Store Connect → Agreements, Tax, and Banking
2. Tüm sözleşmeleri kontrol edin
3. Eksik varsa tamamlayın
4. Onay için bekleyin (1-3 gün sürebilir)
5. Onaylandıktan sonra tekrar test edin

---

### Senaryo 2: "Sandbox'ta çalışıyor ama Apple reddetti"

**Muhtemel Neden:** Apple inceleyicisi farklı bir hesap veya bölge kullanıyor.

**Çözüm:**
1. Ürün tüm bölgelerde (regions) mevcut olmalı
2. App Store Connect'te "Availability" ayarlarını kontrol edin
3. En az bir fiyat tier'ı tüm ülkeler için ayarlanmış olmalı
4. Review Notes'a sandbox test hesabı bilgilerini ekleyin

---

### Senaryo 3: "Product Not Found" hatası

**Muhtemel Neden:** Product ID eşleşmiyor veya ürün durumu yanlış.

**Çözüm:**
1. App Store Connect'te Product ID'yi kopyalayın
2. Kodla karşılaştırın (case-sensitive!)
3. Ürün durumu "Ready to Submit" olmalı
4. Ürün metadata'sı eksiksiz olmalı

---

### Senaryo 4: "Connection to iTunes Store failed"

**Muhtemel Neden:** Network sorunu veya Apple sunucu sorunu.

**Çözüm:**
1. İnternet bağlantısını kontrol edin
2. App Store uygulamasını açıp çalıştığını doğrulayın
3. Cihazı yeniden başlatın
4. VPN kapatın
5. Apple System Status'u kontrol edin

---

## 📝 APPLE'A GÖNDERİLECEK YANIT ÖRNEĞİ

Eğer düzeltmeleri yaptıysanız ve tekrar submit edecekseniz, "App Review Notes" bölümüne şunu yazın:

```
Dear Apple Review Team,

Thank you for your feedback. We have addressed the In-App Purchase issue:

1. ✅ Verified "Paid Applications Agreement" is active and signed
2. ✅ Confirmed banking and tax information is complete and approved
3. ✅ Tested IAP product successfully on multiple devices using Sandbox
4. ✅ Product "Remove Ads" (com.tolgaoztrk.carlog.removeads) is "Ready to Submit"
5. ✅ Localized all permission messages for Turkish and English

For testing:
- Sandbox Test Account: [test hesap email]
- Password: [test hesap şifre]
- Product ID: com.tolgaoztrk.carlog.removeads
- Expected Price: [fiyat]

The purchase flow now works correctly. Please let us know if you need any additional information.

Best regards,
[Your Name]
```

---

## 🎯 SON ADIMLAR

Build almadan önce:

1. [ ] `app.json` version'u güncel: `1.0.1` ✅
2. [ ] Tüm agreements aktif
3. [ ] IAP ürün "Ready to Submit"
4. [ ] Sandbox'ta test edildi ve çalışıyor
5. [ ] İzin mesajları TR/EN olarak güncellendi ✅
6. [ ] Console logları kontrol edildi
7. [ ] EAS Build ile yeni build alındı

**Build Komutu:**
```bash
cd carlogmobil
eas build --platform ios --profile production
```

**Sonra:**
```bash
eas submit --platform ios
```

---

## 📞 Acil Destek

Eğer tüm adımları yaptınız ama hala sorun varsa:

1. Console loglarını toplayın
2. App Store Connect screenshot'ları alın (Agreements, Products, vb.)
3. Apple Developer Support ile iletişime geçin: [Apple Developer Contact](https://developer.apple.com/contact/)

---

**Son Güncelleme:** 20 Aralık 2025
**Versiyon:** 1.0.1

