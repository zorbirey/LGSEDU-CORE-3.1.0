# ARENA-EDU-CORE-3.2.0

Bu sürüm, çalışan LGS 8.2.0 PWA tabanını değiştirmeden ortak çekirdeğe `ARENA-VISUAL-PACK-V1` görsel kimlik sözleşmesini ekler.

## Eklenenler

- Yeni proje başlangıcında ikon, açılış, ilk kullanım ve uygulama içi Zeus görsellerini toplu üretme zorunluluğu.
- Kullanıcı onayından sonra görsel yönü kilitleyen değişiklik politikası.
- Telefon, dikey tablet ve yatay tablet için art-directed varlık rolleri.
- Yerel, sürümlü dosya ve SHA-256 bütünlük sözleşmesi.
- Görsele gömülü düğme/metin yerine gerçek HTML arayüz bileşenleri kuralı.
- Eksik zorunlu roller varken paketin tam onaylı duruma geçmesini engelleyen doğrulayıcı.
- LGS 2027 için onaylanan `STORM / Şimşekli Gökyüzü` görsel yönü ve ilk kullanım arka planları.

## Etki sınırı

Bu sürüm çalışan PWA'nın `index.html`, CSS, JavaScript, manifest veya service worker dosyalarına yeni görselleri bağlamaz. Mevcut `localStorage` verileri ve Android giriş akışı değişmez.
