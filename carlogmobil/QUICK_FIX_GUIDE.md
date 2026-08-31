# ⚡ iOS Uygulama Reddi - Hızlı Çözüm Kılavuzu

## 🎯 ACİL YAPILACAKLAR LİSTESİ

### 1️⃣ ÖNCE BU ADIMI YAP! (EN ÖNEMLİ)

> **Apple'ın #1 ret sebebi: Agreements imzalanmamış!**

1. [App Store Connect](https://appstoreconnect.apple.com) → **Agreements, Tax, and Banking**
2. **Paid Applications Agreement** durumunu kontrol et:
   - ✅ Green badge = Aktif (Devam et)
   - ⚠️  Yellow/Orange = Beklemede (1-3 gün bekle)
   - ❌ Red = Hemen imzala!
3. Banking ve Tax bilgilerini kontrol et
4. Hepsi aktif değilse → IAP ÇALIŞMAZ!

---

### 2️⃣ IAP Ürün Kontrolü

[App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **CarLog** → **In-App Purchases**

- [ ] Product ID var mı: `com.tolgaoztrk.carlog.removeads`
- [ ] Durum: "Ready to Submit" veya "Approved"
- [ ] Localization (TR & EN) eklenmiş mi?
- [ ] Fiyat ayarlanmış mı?

**❌ Ürün yoksa:**
1. Create → Non-Consumable
2. Reference Name: Remove Ads
3. Product ID: `com.tolgaoztrk.carlog.removeads`
4. Fiyat belirle
5. TR ve EN localization ekle
6. Save → Submit

---

### 3️⃣ Sandbox Test (ZORUNLU!)

**Apple'a göndermeden MUTLAKA test et!**

1. **Sandbox kullanıcı oluştur:**
   - [App Store Connect](https://appstoreconnect.apple.com) → Users and Access → Sandbox → Testers
   - Yeni kullanıcı ekle (hiçbir Apple ID'de kullanılmamış email)

2. **iOS cihazda test:**
   - App Store'dan çıkış yap
   - TestFlight build yükle
   - Settings → Remove Ads → Purchase Now
   - Sandbox hesabıyla giriş yap
   - **[Sandbox]** etiketi göründü mü? ✅
   - Satın alma tamamlanıyor mu? ✅

**❌ Hata alıyorsan:**
- Adım 1'e dön (Agreements)
- Console loglarını kontrol et
- `IAP_CHECKLIST_TR.md` dosyasına bak

---

### 4️⃣ IAP'i App Version'a Ekle (ÇOK ÖNEMLİ!)

⚠️ **Apple Kuralı:** İlk In-App Purchase mutlaka bir app version ile birlikte submit edilmelidir!

1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **CarLog**
2. **iOS** → Version **1.0.1**'i seç (veya yeni version oluştur)
3. Sol menüden **"In-App Purchases and Subscriptions"** tıkla
4. **"Add an In-App Purchase"** butonuna tıkla
5. **"Remove Ads"** (`com.tolgaoztrk.carlog.removeads`) ürünü seç
6. **"Done"** tıkla

✅ IAP artık app version'a "attached" edildi!

Kaynak: [Apple Developer - Overview of submitting for review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review)

---

### 5️⃣ Build Al

```bash
cd carlogmobil
eas build --platform ios --profile production
```

**Build tamamlandıktan sonra:**

1. App Store Connect'e git
2. Build'i seçin
3. **"In-App Purchases and Subscriptions"** kısmında **"Remove Ads"** ürününün seçili olduğunu doğrulayın
4. Review Notes ekleyin (aşağıya bakın)
5. **"Submit for Review"** tıklayın

Veya komut satırından:

```bash
eas submit --platform ios
```

---

### 6️⃣ App Store Connect - Review Notes

**Review Notes bölümüne ekle:**

```
Dear Apple Review Team,

Thank you for your feedback. We have fixed both issues:

✅ Guideline 4.0: All permission messages now localized (TR & EN)
✅ Guideline 2.1: IAP tested successfully in Sandbox

Sandbox Test Account:
- Email: [sandbox_email@example.com]
- Password: [sandbox_password]
- Product ID: com.tolgaoztrk.carlog.removeads
- Price: ₺XX.XX

Best regards,
[Your Name]
```

---

## 🚨 Sık Yapılan Hatalar

### ❌ "Kod tamam ama IAP çalışmıyor"
**Sebep:** Agreements imzalanmamış  
**Çözüm:** Adım 1'e git

### ❌ "Sandbox'ta çalışıyor ama Apple reddetti"
**Sebep:** Ürün bazı bölgelerde mevcut değil  
**Çözüm:** App Store Connect → Pricing → Tüm bölgeleri aktif et

### ❌ "Product Not Found"
**Sebep:** Product ID eşleşmiyor  
**Çözüm:** App Store Connect'ten kopyala-yapıştır

### ❌ "Cannot connect to iTunes Store"
**Sebep:** Network veya Apple sunucu sorunu  
**Çözüm:** İnternet kontrol et, VPN kapat, cihazı yeniden başlat

---

## 📋 Kod Değişiklikleri Özeti

Bu düzeltmede aşağıdaki dosyalar oluşturuldu/değiştirildi:

✅ `carlogmobil/app.json` - Version 1.0.1  
✅ `carlogmobil/app.config.js` - İzin mesajları TR/EN  
✅ `carlogmobil/plugins/withInfoPlistStrings.js` - Custom plugin  
✅ `carlogmobil/IAP_CHECKLIST_TR.md` - Detaylı IAP rehberi  
✅ `carlogmobil/IOS_REJECTION_FIX_SUMMARY.md` - Tam özet  

Kod tarafında yapılacak başka bir şey yok! Sadece yukarıdaki 5 adımı takip et.

---

## ⏱️ Tahmin Edilen Süre

- App Store Connect kontrolleri: **10 dakika**
- Sandbox test: **15 dakika**
- Build alma: **15-30 dakika**
- Submission: **5 dakika**

**Toplam: ~45-60 dakika**

---

## 📞 Yardım Gerekirse

1. Detaylı IAP rehberi: `IAP_CHECKLIST_TR.md`
2. Tam özet: `IOS_REJECTION_FIX_SUMMARY.md`
3. Console loglarını topla
4. Apple Developer Support: [Contact Apple](https://developer.apple.com/contact/)

---

**Hazır mısın? Adım 1'den başla! 🚀**

