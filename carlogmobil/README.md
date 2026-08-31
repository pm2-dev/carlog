# Yakıt Tüketimi Mobil Uygulaması

Expo Router + React Native altyapısı ile oluşturulmuş yakıt tüketimi ve filo yönetimi uygulamasının başlangıç iskeletidir. Proje; araç bazlı yakıt kayıtları, mevsimsel analizler, sigorta/kasko/muayene hatırlatmaları ve push bildirim senaryoları için hazırlanmıştır.

## Kurulum

   ```bash
   npm install
npx expo prebuild --clean # (isteğe bağlı: yerel projeleri sıfırlamak için)
   npx expo start
   ```

Geliştirme sırasında `npx expo start` komutu ile Android/iOS emülatörleri veya Expo Go üzerinden çalıştırabilirsiniz.

## Dizim Yapısı

- `app/` → Expo Router ekranları
  - `(tabs)/` → Auth sonrası sekmeli yapı (Genel Bakış, Araçlar, Raporlar, Hatırlatmalar, Ayarlar)
  - `modal.tsx` → Hızlı aksiyon modal örneği
- `src/`
  - `components/` → Tekrar kullanılabilir UI blokları (`Screen`, `SectionCard`, `SectionHeader`)
  - `hooks/` → Uygulama geneli hook’lar (`useAppTheme`)
  - `providers/` → Context & provider katmanı (`AppProviders`, `AppThemeProvider`)
  - `store/` → Zustand durum yönetimi (tema tercihi)
  - `theme/` → Açık/Koyu tema tanımları
  - `screens/` → Sekme ekranlarının gerçek içerikleri (Dashboard, Vehicles, Reports, Reminders, Settings)
  - `mocks/` → UI prototipi için örnek veri kümeleri
  - `types/` → Domain tipleri (araç, yakıt kaydı, hatırlatma vb.)

## Teknik Altyapı

- **Tema Yönetimi:** Açık/koyu tema + kullanıcı tercihi (`AsyncStorage + Zustand`).
- **State & Veri:** `@tanstack/react-query` ve `zustand` hazır kurulu.
- **Bildirim:** `expo-notifications` projeye eklendi, konfigürasyon dokümantasyonu backend planı ile birlikte sağlanacak.
- **Güvenli Depolama:** `expo-secure-store` oturum bilgileri için hazır.
- **Reklam Alanı:** Yakıt kaydı özetinde AdMob banner için `expo-ads-admob` entegrasyonu yapıldı; üretim ortamında gerçek reklam ID’leri tanımlanmalı.

## Sıradaki Adımlar

- OTP tabanlı kimlik doğrulama ekranlarını (Twilio) implement etmek.
- Yakıt kaydı formu, fotoğraf yükleme ve fiş detaylarını eklemek.
- Gerçek API entegrasyonları için servis katmanı (`src/services/`) hazırlamak.
- Push bildirim izin yönetimi ve planlama (sigorta, kasko, muayene hatırlatmaları).
- Node.js + PostgreSQL backend mimarisi için ayrıntılı dokümantasyon (mobil geliştirme tamamlandığında sunulacak).

## Faydalı Komutlar

- `npm run android` → Android emülatöründe başlatır
- `npm run ios` → iOS simülatöründe başlatır (macOS gerekir)
- `npm run web` → Web çalıştırma
- `npm run lint` → Lint kontrolü

## Notlar

- UI tercihleri ağırlıklı olarak açık (beyaz) tema üzerinden tasarlandı; kompakt bileşenlerde renk paleti `src/theme` altında tanımlıdır.
- Expo EAS yapılandırması (eas.json, proje bağlantısı) mobil geliştirme ilerledikçe eklenecek.
