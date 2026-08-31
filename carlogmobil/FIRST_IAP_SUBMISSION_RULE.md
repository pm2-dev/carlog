# ⚠️ KRİTİK: İlk IAP Submission Kuralı

## 🚨 Apple'ın Resmi Kuralı

> **"Your first in-app purchase must be submitted with a new app version."**

Kaynak: [Apple Developer - Overview of submitting for review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review)

---

## 📋 Bu Ne Anlama Geliyor?

### ✅ DOĞRU:
İlk In-App Purchase → **App version ile birlikte** submit et

### ❌ YANLIŞ:
İlk In-App Purchase → Ayrı olarak submit et (bu sadece 2. IAP'den sonra mümkün)

---

## 🔄 Doğru Submission Süreci

### 1. IAP Ürününü Oluştur

App Store Connect → In-App Purchases → Create

- **Reference Name:** Remove Ads
- **Product ID:** `com.tolgaoztrk.carlog.removeads`
- **Type:** Non-Consumable
- **Price:** Belirle
- **Localizations:** TR & EN ekle
- **Status:** "Ready to Submit" yap

### 2. Build Al

```bash
cd carlogmobil
eas build --platform ios --profile production
```

### 3. App Version'a IAP'i Ekle (ÇOK ÖNEMLİ!)

Build tamamlandıktan sonra:

1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **CarLog**
2. **iOS** → **Version 1.0.1**
3. Build'i seç
4. Sol menüden **"In-App Purchases and Subscriptions"** bölümüne git
5. **"Add an In-App Purchase"** butonuna tıkla
6. **"Remove Ads"** ürünü seç
7. **"Done"** tıkla

✅ IAP artık app version'a "attached" edildi!

### 4. Review Notes Ekle

```
Dear Apple Review Team,

Thank you for your feedback. We have fixed both issues:

✅ Guideline 4.0: All permission messages now localized (TR & EN)
✅ Guideline 2.1: IAP tested successfully in Sandbox

This is our first In-App Purchase submission, included with app version 1.0.1 as required.

Sandbox Test Account:
- Email: [sandbox_email@example.com]
- Password: [sandbox_password]
- Product ID: com.tolgaoztrk.carlog.removeads
- Expected Price: ₺XX.XX

Best regards,
[Your Name]
```

### 5. Submit for Review

- Tüm bilgileri kontrol et
- **"In-App Purchases and Subscriptions"** kısmında "Remove Ads" görünüyor olmalı
- **"Submit for Review"** tıkla

---

## 🔍 Kontrol Listesi

Build almadan önce:

- [ ] IAP ürünü oluşturuldu
- [ ] IAP durumu: "Ready to Submit"
- [ ] Build alındı (version 1.0.1)
- [ ] Build App Store Connect'e yüklendi
- [ ] **IAP ürünü app version'a eklendi** (In-App Purchases and Subscriptions)
- [ ] Sandbox test başarılı
- [ ] Review notes hazır

---

## ❓ Sık Sorulan Sorular

### S: İkinci IAP'imi de app version ile mi submit etmeliyim?

**C:** Hayır. Sadece **ilk IAP** zorunlu olarak app version ile birlikte submit edilmelidir. Sonraki IAP'ler ayrı ayrı submit edilebilir.

### S: Eğer IAP'i app version'a eklemezsem ne olur?

**C:** Apple submission'ınızı reddedecek ve IAP'in app version ile birlikte submit edilmesi gerektiğini belirtecektir.

### S: IAP'i nasıl app version'a eklerim?

**C:** App Store Connect → iOS → Version 1.0.1 → "In-App Purchases and Subscriptions" → "Add an In-App Purchase" → "Remove Ads" seç → "Done"

### S: IAP ürün durumu ne olmalı?

**C:** "Ready to Submit" veya "Approved". "Missing Metadata" durumunda olmamalı.

---

## 📚 İlgili Dökümanlar

- `QUICK_FIX_GUIDE.md` - Hızlı başvuru rehberi (güncellenmiş)
- `IAP_CHECKLIST_TR.md` - Detaylı IAP kontrol listesi (güncellenmiş)
- `IOS_REJECTION_FIX_SUMMARY.md` - Tam özet (güncellenmiş)

---

## ✅ Özet

1. ✅ IAP ürünü oluştur
2. ✅ Build al (1.0.1)
3. ✅ **IAP'i app version'a ekle** ← EN ÖNEMLİ ADIM!
4. ✅ Review notes ekle
5. ✅ Submit for review

**Bu adım atlanırsa:** Apple submission'ı reddeder! 🚫

---

**Güncelleme Tarihi:** 20 Aralık 2025  
**Kaynak:** [Apple Developer Documentation](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review)

