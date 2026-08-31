# Yakıt Tüketimi & Araç Yönetimi Mobil Uygulaması – Teknik Tanım ve Özellik Dokümanı

## 1. Genel Tanım ve Amaç
Bu mobil uygulama, bireysel araç sahiplerinin araçlarına ait yakıt tüketimlerini, maliyetlerini ve periyodik bakım/yasal sorumluluklarını (sigorta, kasko, muayene vb.) takip etmelerini sağlayan kapsamlı bir araç asistanıdır.
**Temel Hedef:** Kullanıcının birden fazla aracı (otomobil, motosiklet, kamyonet vb.) tek bir yerden yönetmesini sağlamak, detaylı mevsimsel tüketim analizleri sunmak ve kritik tarihleri hatırlatmaktır.

## 2. Teknik Altyapı
- **Framework:** React Native (Expo SDK 52+)
- **Dil:** TypeScript
- **Navigation:** Expo Router (File-based routing)
- **State Management:** Zustand (Client State), React Query (Server State)
- **UI Kütüphanesi:** React Native yerel bileşenleri, `react-native-safe-area-context`
- **Yerel Depolama:** `AsyncStorage` (önbellek/tercihler), `expo-secure-store` (token saklama)
- **Bildirimler:** Expo Notifications
- **Reklam:** Google AdMob (`expo-ads-admob`)
- **Backend Entegrasyonu:** REST API (Node.js + PostgreSQL)

## 3. Temel Özellikler ve Fonksiyonlar

### 3.1. Kimlik Doğrulama (Auth)
- **Yöntem:** Telefon numarası ile giriş.
- **Akış:** Kullanıcı numarasını girer -> Twilio Verify üzerinden OTP SMS gelir -> Kod doğrulanır -> Oturum açılır.
- **Güvenlik:** Access/Refresh token yapısı kullanılır.

### 3.2. Araç Yönetimi
- **Çoklu Araç Desteği:** Kullanıcı birden fazla araç ekleyebilir.
- **Araç Tipleri:** Otomobil, Motosiklet, Kamyonet, Ağır Vasıta vb.
- **Veriler:** Plaka, Marka, Model, Yıl, Yakıt Tipi, Güncel Kilometre, Araç Fotoğrafı.
- **İşlev:** Yakıt ve hatırlatma kayıtları seçilen araca bağlanır.

### 3.3. Yakıt Takibi ve Hesaplama
- **Veri Girişi:** Tarih, Son Kilometre (Otomatik), Güncel Kilometre, Alınan Litre, Toplam Tutar, Notlar.
- **Otomatik Hesaplamalar:**
  - Gidilen Mesafe = Güncel Km - Son Km
  - Ortalama Tüketim (L/100km)
  - Litre Başı Maliyet (TL/L)
  - Kilometre Başı Maliyet (TL/Km)
- **Validasyon:** Kilometre tutarlılığı kontrol edilir.
- **Akıllı Form:** Araç seçimi ile son kilometre verisi otomatik doldurulur.

### 3.4. Raporlama ve Analiz
- **Mevsimsel Analiz:** Kış, İlkbahar, Yaz, Sonbahar dönemlerine göre tüketim farklılıkları.
- **Genel Özet:** Toplam harcama, toplam mesafe, ortalama tüketim grafikleri.
- **Karşılaştırma:** Farklı araçların performans karşılaştırması.

### 3.5. Hatırlatıcılar ve Bildirimler
- **Türler:** Trafik Sigortası, Kasko, Araç Muayenesi, MTV, Periyodik Bakım.
- **Bildirim:** Belirlenen tarihler yaklaşınca (7 gün önce, 1 gün önce vb.) Push Notification gönderimi.
- **Durum Takibi:** Bekliyor, Tamamlandı, Gecikmiş.

### 3.6. Ayarlar ve Kişiselleştirme
- **Tema:** Açık (Light), Koyu (Dark) ve Sistem Teması seçenekleri.
- **Profil:** Ad Soyad güncelleme, Çıkış yapma.

### 3.7. Monetizasyon (Reklam)
- **Alanlar:** Yakıt hesaplama sonuç ekranı ("Hesaplanan Değerler" altı).
- **Format:** Google AdMob Banner (Adaptive Banner).

## 4. Ekranlar ve Kullanıcı Akışı

### 4.1. Authentication (Giriş)
- **SignIn Screen:** Telefon numarası girişi ve OTP doğrulama alanı.

### 4.2. Dashboard (Ana Sayfa)
- Özet kartlar (Toplam Harcama, Son Tüketim).
- Hızlı işlem butonu ("Yakıt Kaydı Ekle").
- Son hareketler listesi.

### 4.3. Araçlar (Vehicles)
- Kayıtlı araçların listesi (Kart görünümü).
- Yeni araç ekleme butonu (+).
- Araç detay ve düzenleme ekranı.

### 4.4. Yakıt Ekleme (Modal)
- Üstte yatay kaydırılabilir araç seçimi.
- Dinamik form alanları (Seçilen araca göre aktifleşir).
- Anlık hesaplama sonuçları (Tüketim, Maliyet).
- Reklam alanı entegrasyonu.

### 4.5. Raporlar (Reports)
- Grafiksel tüketim analizleri.
- Filtreleme seçenekleri (Tarih aralığı, Araç).

### 4.6. Hatırlatıcılar (Reminders)
- Yaklaşan ödemeler ve muayeneler listesi.
- Durum renk kodları (Sarı: Yaklaşıyor, Kırmızı: Gecikmiş, Yeşil: Tamam).

### 4.7. Ayarlar (Settings)
- Tema seçimi.
- Uygulama hakkında.
- Çıkış.

## 5. Tasarım ve UI/UX Prensipleri
- **Tema:** Öncelikle **Açık Renk (Light Theme)** odaklı, temiz ve ferah görünüm. Kullanıcı tercihine göre Dark Mode desteği.
- **Boyutlandırma:** Kompakt (Compact) tasarım anlayışı; gereksiz boşluklardan kaçınan, bilgi yoğunluğu dengeli arayüzler.
- **Bileşenler:**
  - **SectionCard:** İçerikleri gruplamak için beyaz/koyu zeminli, gölgeli kartlar.
  - **SectionHeader:** Bölüm başlıkları.
  - **Inputs:** Net etiketli, validasyon durumunu gösteren giriş alanları.
- **Renk Paleti:**
  - **Primary:** Mavi/Lacivert tonları (Güven ve Kurumsallık).
  - **Success:** Yeşil (Verimlilik, Düşük Tüketim).
  - **Warning/Error:** Turuncu/Kırmızı (Yüksek Tüketim, Gecikmiş Ödeme).

## 6. Veri Akışı ve Entegrasyon Stratejisi
1. Uygulama açılışta `useAuth` hook'u ile token kontrolü yapar.
2. Geçerli token yoksa `(auth)` grubuna yönlendirir.
3. Veriler `React Query` ile backend API'den çekilir ve önbelleklenir (`staleTime` yönetimi).
4. Form gönderimleri `mutation` olarak işlenir, başarılı olursa ilgili listeler (`invalidateQueries`) güncellenir.
5. Offline durumlar için kritik veriler `AsyncStorage` üzerinde yedeklenebilir (Gelecek sürüm).

## 7. Yayın ve Dağıtım
- **Android:** Google Play Store (AAB formatı).
- **iOS:** Apple App Store.
- **CI/CD:** Expo EAS (Expo Application Services) Build & Submit.

