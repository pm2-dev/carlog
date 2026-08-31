# Yakıt Tüketimi Uygulaması – Backend Dokümantasyonu

## 1. Genel Mimari
- **Dil & Çalışma Ortamı:** Node.js (TypeScript önerilir)
- **Framework:** Express.js veya NestJS (module + DI ihtiyaçları için NestJS tavsiye edilir)
- **Veritabanı:** PostgreSQL 14+
- **ORM / Query Layer:** Prisma veya TypeORM
- **Cache / Queue (opsiyonel):** Redis (cache), BullMQ/Agenda (planlı işler)
- **Dosya Depolama (opsiyonel):** S3 uyumlu servis (DO Spaces, AWS S3)
- **SMS/OTP:** Twilio Verify
- **Push Bildirim:** Expo Notifications (HTTP API)
- **Dağıtım:** DigitalOcean App Platform/Droplet (kalıcı süreçler). Vercel yalnızca serverless fonksiyonlar için uygundur; cron/background işleri için DO önerilir.
- **Versiyonlama:** REST endpoints `/api/v1/**`. OpenAPI 3.0 şeması generate edilerek paylaşılmalı.
- **Yetkilendirme:** JWT Access Token + Refresh Token (whitelist DB/Redis). Tüm istekler HTTPS üzerinden ve Bearer token ile yapılmalı.

## 2. Ortam Değişkenleri
| Değişken | Açıklama |
| --- | --- |
| `PORT`, `NODE_ENV` | Çalışma portu ve ortam |
| `DATABASE_URL` | PostgreSQL bağlantı string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Token imzalama anahtarları |
| `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | 15dk / 30gün önerilir |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | OTP için |
| `EXPO_ACCESS_TOKEN` | Expo push API erişimi |
| `REDIS_URL` | Rate limit / cache |
| `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` | Opsiyonel fiş fotoğrafı |

## 3. Veri Modeli Taslağı
### users
- `id (uuid)`
- `phone (unique, e.164)`
- `full_name`
- `theme_preference (system/light/dark)`
- `created_at`, `updated_at`

### user_sessions
- `id`
- `user_id`
- `refresh_token (hashed)`
- `expires_at`
- `created_at`, `revoked_at`

### vehicles
- `id`
- `user_id`
- `plate`, `brand`, `model`, `model_year`
- `category` (`otomobil`, `motor`, `kamyonet`, `agirsinif`)
- `fuel_type` (`benzin`, `dizel`, `lpg`, `hibrit`, `elektrik`)
- `current_odometer`
- `photo_url`
- `created_at`, `updated_at`

### fuel_entries
- `id`
- `vehicle_id`
- `refuel_date`
- `previous_odometer`
- `current_odometer`
- `distance_km`
- `liters`
- `total_cost`
- `note`
- `receipt_url`
- `season` (backend hesaplar: `kis/ilkbahar/yaz/sonbahar`)
- `created_at`

### reminders
- `id`
- `vehicle_id`
- `type` (`sigorta`, `kasko`, `muayene`, `vergi`)
- `due_date`
- `status` (`pending`, `completed`, `overdue`)
- `note`
- `created_at`, `updated_at`

### notification_logs
- `id`
- `user_id`
- `type`
- `payload`
- `status`
- `sent_at`
- `error`

### user_devices (Expo push token saklama)
- `id`
- `user_id`
- `expo_push_token`
- `last_used_at`
- `device_info`

> İndeksler: `users.phone`, `vehicles.user_id`, `fuel_entries.vehicle_id+refuel_date`, `reminders.vehicle_id+due_date` vb.

## 4. Kimlik Doğrulama & OTP Akışı
1. **OTP İsteği** – `POST /api/v1/auth/otp/request`
   - Body: `{ "phone": "+90..." }`
   - Twilio Verify ile doğrulama kodu gönderilir.
   - Rate limit: 5 deneme / 5 dk (IP & telefon bazlı).
2. **OTP Doğrulama** – `POST /api/v1/auth/otp/verify`
   - Body: `{ "phone": "+90...", "code": "123456", "fullName": "Opsiyonel" }`
   - Doğru ise kullanıcı oluşturulur/güncellenir, access+refresh token döner. Refresh token `user_sessions` tablosuna kaydedilir.
3. **Token Yenileme** – `POST /api/v1/auth/token/refresh`
   - Body: `{ "refreshToken": "..." }` → yeni access/refresh döner.
4. **Çıkış** – `POST /api/v1/auth/logout`
   - Refresh token revoke edilir (`revoked_at`).

Tüm korumalı endpoints → `Authorization: Bearer <accessToken>`.

## 5. API Endpoint Taslağı
### Profil / Kullanıcı
- `GET /api/v1/profile`
- `PATCH /api/v1/profile` → `fullName`, `themePreference`

### Araçlar
- `GET /api/v1/vehicles`
- `POST /api/v1/vehicles`
- `GET /api/v1/vehicles/{id}`
- `PATCH /api/v1/vehicles/{id}`
- `DELETE /api/v1/vehicles/{id}` (soft delete)

### Yakıt Kayıtları
- `POST /api/v1/vehicles/{vehicleId}/fuel-entries`
  - Body: `{ refuelDate, previousOdometer, currentOdometer, liters, totalCost, note?, receiptUrl? }`
  - Validasyon: `current > previous`, `liters > 0`, `totalCost > 0`
  - `distance_km` server’da hesaplanır, `season` otomatik seçilir.
- `GET /api/v1/vehicles/{vehicleId}/fuel-entries?startDate&endDate&page&limit`
- `GET /api/v1/fuel-entries/{id}`
- `PATCH /api/v1/fuel-entries/{id}`
- `DELETE /api/v1/fuel-entries/{id}` (soft delete)

### Rapor & Dashboard
- `GET /api/v1/dashboard/summary`
  - Son 30 gün ortalama tüketim, toplam yakıt maliyeti, aktif araç sayısı.
- `GET /api/v1/vehicles/{vehicleId}/reports/seasonal`
  - Sezon bazında tüketim/maliyet.
- `GET /api/v1/reports/compare?category=otomobil`
  - Araç kategorilerine göre ortalama değerler.

### Hatırlatmalar
- `POST /api/v1/vehicles/{vehicleId}/reminders`
- `GET /api/v1/reminders?status=pending&range=30d`
- `PATCH /api/v1/reminders/{id}`
- Arka plan cron: günlük olarak due date’e yaklaşan kayıtları push ile haber verir.

### Bildirimler
- `POST /api/v1/devices` → Expo push token kaydı
- Cron job → `notification_logs` üzerinden Expo API çağrısı

## 6. Push Bildirim Akışı
1. Mobil uygulama push token’ı `user_devices` tablosuna kaydeder.
2. Cron job (node-cron/BullMQ): her gece `reminders` tablosundan 7 gün/1 gün kala kayıtları bulur.
3. `notification_logs` kayıt altına alınır → Expo push API çağrılır → response loglanır.

## 7. OTP / Rate Limit Güvenliği
- Twilio Verify TTL (5 dk) + 3 yanlış deneme sonrası kilitleme.
- Redis tabanlı IP/telefon rate limiter.
- Telefon formatını backend normalize eder (E.164).
- JWT payload: `{ sub: userId, phone, sessionId }` minimal bilgi.

## 8. Dosya Yükleme (Opsiyonel)
- Fiş/fiş fotoğrafı için presigned URL (PUT) akışı.
- Dosya adı: `fuel-receipts/{userId}/{uuid}.jpg`
- Dosya boyutu max 5 MB, sadece `image/*` mime tipleri.

## 9. Test & DevOps
- **Testler:** Jest + Supertest, Testcontainers aracılığıyla Postgres.
- **Seed Script:** Örnek kullanıcı/araç/yakıt kaydı.
- **Migrations:** Prisma migrate veya TypeORM CLI.
- **Loglama:** Pino logger + request scope; 4xx/5xx alarm webhook (opsiyonel).
- **Monitoring:** DigitalOcean Metrics, opsiyonel Sentry.
- **Backups:** DB günlük yedek (14 gün saklama).

## 10. Cron & Planlı İşler
- Her gece 02:00 → `reminders` taranır, `due_date` yaklaşıyorsa push gönderilir, `status` güncellenir.
- Haftalık (opsiyonel) → Kullanıcıya tüketim özeti gönder.

## 11. Gelecek Geliştirmeler
- Araç paylaşımı: `vehicle_shares` tablosu ile aynı araca birden fazla kullanıcı erişimi.
- Web panel/raporlama için GraphQL veya REST reuse.
- AdMob görüntülenme raporlarını backend’e aktarma (opsiyonel).

Bu doküman backend ekibinin API ve altyapı geliştirmelerini başlatması için referans niteliğindedir. Ayrıntılı OpenAPI şeması ve ER diyagramı geliştirme aşamasında güncellenmelidir.
