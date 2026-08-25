# ARENA-EDU-CORE-3.3.0

Bu sürüm, onaylanan **STORM / Şimşekli Gökyüzü** yönünü eksiksiz ve kilitli bir Arena görsel paketine dönüştürür.

## Tamamlanan paket

- LGS 2027 Arena ana ikon masterı.
- PWA 192×192 ve 512×512 ikonları.
- Güvenli merkez alanlı maskable 192×192 ve 512×512 ikonları.
- Telefon/dikey tablet ve yatay tablet açılış kompozisyonları.
- Telefon/dikey tablet ve yatay tablet ilk kullanım kompozisyonları.
- Koç, düşünme, uyarı, kutlama ve analiz için gerçek alfa saydamlıklı Zeus varlıkları.
- Zorunlu 16 rol için ölçü, PNG magic bytes, dosya boyutu ve SHA-256 kaydı.
- Eksik rol, yanlış ölçü, bozuk dosya, karma değeri veya Zeus alfa biçiminde testi durduran doğrulama.

## Kalıcı davranış

Yeni Arena EDU projesinde görsel paket topluca üretilir, kullanıcı onayından sonra `approved-locked` durumuna alınır ve kullanıcı açıkça istemedikçe değiştirilmez.

## Etki sınırı

Çalışan LGS PWA'nın HTML, CSS, JavaScript, manifest veya service worker dosyalarına görseller bağlanmamıştır. Mevcut `localStorage` verileri ve Android 16/Chrome giriş akışı değişmez.
