# ⚡ Carlog - Şarj İstasyonu Fiyatları

Bu klasör, Carlog mobil uygulamasının şarj istasyonu fiyatlarını barındırır.

## 📄 Dosya

- `charging_prices.json` - Türkiye'deki şarj operatörlerinin güncel fiyatları

## 🔄 Güncelleme

Fiyatları güncellemek için:

1. `charging_prices.json` dosyasını düzenleyin
2. Commit ve push yapın
3. Mobil uygulama kullanıcıları otomatik olarak güncel fiyatları alacak

## 📊 Son Güncelleme

- **Tarih**: 5 Aralık 2024
- **Operatör Sayısı**: 10
- **Kaynak**: Resmi operatör web siteleri

## 🏢 Operatörler

1. ZES (Zorlu Energy)
2. Eşarj (Enerjisa)
3. Trugo (Togg)
4. Voltrun
5. Sharz.net
6. Tesla Supercharger
7. Beefull
8. Astor Şarj
9. Tunçmatik Charge
10. Shell Recharge

## 📱 Kullanım

Bu JSON dosyası Carlog mobil uygulaması tarafından otomatik olarak çekilir:

```
https://raw.githubusercontent.com/ztektolga/carlog/main/carlog-prices/charging_prices.json
```

## 🔧 JSON Formatı

```json
{
  "id": "operator-id",
  "name": "Operatör Adı",
  "keywords": ["anahtar", "kelimeler"],
  "website": "https://operator-website.com",
  "tariffs": {
    "ac": 8.99,
    "dc_low": 11.99,
    "dc_high": 13.99,
    "note": "Özel notlar"
  }
}
```

## ⚠️ Not

Fiyatlar operatörlerin resmi web sitelerinden alınmıştır ve değişebilir. En güncel fiyatlar için operatör web sitelerini ziyaret edin.

## 📞 İletişim

Hatalı veya güncel olmayan fiyatlar için issue açabilirsiniz.

