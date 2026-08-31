# 🛒 Uygulama İçi Satın Alım (In-App Purchase) Kurulum Rehberi

## 📋 Genel Bakış

CarLog uygulamasında "Remove Ads" özelliği için non-consumable (tüketilemeyen) bir ürün tanımlanmıştır.

**Product ID**: `com.tolgaoztrk.carlog.removeads`

---

## ✅ App Store Connect Kurulum Adımları

### 1. **Agreements, Tax, and Banking Ayarları**

Bu adım **zorunludur**. Satın alım yapabilmek için:

1. [App Store Connect](https://appstoreconnect.apple.com) → **Agreements, Tax, and Banking** bölümüne gidin
2. **Paid Applications Agreement**'ı imzalayın
3. **Contact Information** ekleyin
4. **Bank Information** ekleyin (ödeme alacağınız banka hesabı)
5. **Tax Information** ekleyin

⚠️ **Önemli**: Bu bilgiler onaylanana kadar satın alım çalışmaz!

---

### 2. **In-App Purchase Ürün Oluşturma**

1. App Store Connect → **My Apps** → **CarLog** seçin
2. Sol menüden **In-App Purchases** seçin
3. **Create** butonuna tıklayın
4. **Non-Consumable** seçin (reklamları kalıcı olarak kaldırmak için)

#### Ürün Bilgileri:

| Alan | Değer |
|------|-------|
| **Reference Name** | Remove Ads |
| **Product ID** | `com.tolgaoztrk.carlog.removeads` |
| **Price** | İstediğiniz fiyat (örn: $2.99, ₺99.99) |

#### Localizations (Çeviriler):

**İngilizce (English - US)**:
- **Display Name**: Remove Ads
- **Description**: Remove all advertisements from the app permanently

**Türkçe (Turkish)**:
- **Display Name**: Reklamları Kaldır
- **Description**: Uygulamadaki tüm reklamları kalıcı olarak kaldırın

#### Review Information:
- **Screenshot**: Satın alma ekranının ekran görüntüsü
- **Review Notes**: "This removes all ads from the application permanently"

5. **Save** butonuna tıklayın
6. Durum **Ready to Submit** olmalı

---

### 3. **Sandbox Test Kullanıcısı Oluşturma**

Test için sandbox hesabı oluşturun:

1. App Store Connect → **Users and Access**
2. **Sandbox** sekmesine gidin
3. **Testers** altında **+** butonuna tıklayın
4. Test kullanıcısı bilgilerini girin:
   - **First Name**: Test
   - **Last Name**: User
   - **Email**: test@example.com (gerçek bir email olmalı)
   - **Password**: Güçlü bir şifre
   - **Country/Region**: Turkey
   - **App Store Territory**: Turkey

⚠️ **Önemli**: Bu email adresi hiçbir Apple ID'de kullanılmamalı!

---

## 📱 iOS Cihazda Test Etme

### Hazırlık:

1. **Gerçek iOS cihazınızdan** App Store'dan **çıkış yapın**:
   - Settings → [Your Name] → Media & Purchases → Sign Out

2. **TestFlight** veya **Development Build** ile uygulamayı yükleyin

### Test Adımları:

1. Uygulamayı açın
2. Settings → Remove Ads → Purchase Now
3. Apple'ın satın alma ekranı açılacak
4. **Sandbox hesabınızla** giriş yapın (ilk satın almada soracak)
5. Satın almayı onaylayın
6. **"[Sandbox]"** yazısını görmelisiniz (bu test ortamında olduğunuzu gösterir)

⚠️ **Önemli**: 
- Gerçek para çekilmez
- Sandbox hesabı ile giriş yapmalısınız
- Production hesabı ile test edemezsiniz

---

## 🔍 Sorun Giderme

### Problem 1: "Cannot connect to iTunes Store"

**Çözüm**:
- App Store'dan çıkış yaptığınızdan emin olun
- Sandbox hesabı kullanın
- İnternet bağlantınızı kontrol edin

### Problem 2: "Product not found"

**Çözüm**:
1. App Store Connect'te ürün durumu **Ready to Submit** olmalı
2. Product ID'nin kodla aynı olduğunu kontrol edin: `// This involves multiple chunks so I will use multi_replace instead if needed, but replace_file_content supports AllowMultiple=true for identical replacements?
// Wait, the tool definition says for replace_file_content: "Do NOT make multiple parallel calls... use multi_replace_file_content...".
// And for AllowMultiple: "If true, multiple occurrences of 'targetContent' will be replaced".
// So I can use replace_file_content with AllowMultiple=true if the target content is identical.
// The target content is `com.tolgaoztrk.carlog.removeads`.
// It appears on lines 7, 39, 118.
// I will attempt to replace all of them.`
3. Bundle Identifier'ın doğru olduğunu kontrol edin: `com.tolgaoztrk.carlog`
4. Agreements imzalanmış olmalı

### Problem 3: "This In-App Purchase has already been bought"

**Çözüm**:
- Settings → Restore Purchases butonunu kullanın
- Veya sandbox hesabını sıfırlayın (App Store Connect'te)

### Problem 4: Satın alma tamamlanıyor ama premium aktif olmuyor

**Çözüm**:
1. Console loglarını kontrol edin
2. `handlePurchaseUpdate` fonksiyonunun çağrıldığından emin olun
3. Receipt validation kontrolü yapın

---

## 📊 Debug Logları

Satın alma sürecini takip etmek için console'da şu logları göreceksiniz:

```
🔍 Checking available products...
📦 Products found: [...]
💰 Product details: { productId, price, title, description }
🛒 Starting purchase flow...
📥 Purchase updated: [...]
✅ Premium activated successfully
```

Hata durumunda:
```
❌ Failed to get products: [error]
❌ Purchase error: [error]
```

---

## 🚀 Production'a Alma

1. **App Review için hazırlık**:
   - In-App Purchase ekran görüntüsü ekleyin
   - Review notes ekleyin
   - Test hesabı bilgilerini Apple'a verin

2. **App submission**:
   - Uygulamanızı submit ederken
   - In-App Purchase'ı da submit edin
   - İkisi birlikte review'a gider

3. **Onay sonrası**:
   - Ürün **Approved** durumuna geçer
   - Production'da çalışmaya başlar
   - Gerçek kullanıcılar satın alabilir

---

## 📞 Destek

Sorun yaşarsanız:
1. Console loglarını kontrol edin
2. App Store Connect'te ürün durumunu kontrol edin
3. Sandbox test hesabını kontrol edin
4. Apple Developer Support ile iletişime geçin

---

## 🔗 Faydalı Linkler

- [App Store Connect](https://appstoreconnect.apple.com)
- [Apple IAP Documentation](https://developer.apple.com/in-app-purchase/)
- [react-native-iap Documentation](https://react-native-iap.dooboolab.com/)
- [Sandbox Testing Guide](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)
