# ARENA-VISUAL-PACK-V1

Bu sözleşme, yeni bir Arena EDU projesi başlamadan önce görsel kimliğin tek paket olarak üretilmesini, kullanıcı tarafından onaylanmasını ve onaydan sonra kilitlenmesini zorunlu kılar.

## Başlangıç akışı

1. Proje adı, hedef sınıf/sınav, renk yönü ve Zeus yorumuna ilişkin kısa görsel brif alınır.
2. İkon, açılış, ilk kullanım ve uygulama içi Zeus varlıkları birlikte üretilir.
3. Telefon, dikey tablet ve yatay tablet önizlemeleri tek onay panosunda gösterilir.
4. Kullanıcı onayı `styleApproval.status: approved-locked` olarak kaydedilir.
5. Eksik varlıklar tamamlandıktan ve doğrulama geçtiğinde paket `approved-locked` durumuna alınır.
6. Kullanıcı açıkça istemedikçe programcı, yapay zekâ veya otomasyon onaylı görsel yönü değiştiremez.

## Zorunlu paket içeriği

- Ana ikon; PWA 192/512 ve Android maskable 192/512 türevleri.
- Telefon dikey, tablet dikey ve tablet yatay açılış görselleri.
- Telefon dikey, tablet dikey ve tablet yatay ilk kullanım görselleri.
- Koç, düşünme, uyarı, kutlama ve performans inceleme durumları için Zeus görselleri.
- Renk, tipografi, güvenli kırpma alanları ve arayüz yerleşim açıklaması.

## Değişmez kurallar

- Görsel dosyalarında düğme, başlık veya kullanıcıya gösterilecek metin bulunmaz; bunlar gerçek HTML bileşenleridir.
- Aktif varlıklar sürümlü, ASCII adlı yerel dosyalardır. Geçici bağlantı veya dış hotlink kullanılmaz.
- Telefon ve tablet için yalnızca otomatik kırpma yeterli kabul edilmez; kompozisyon değişiyorsa art-directed ayrı varlık gerekir.
- Onaylı dosya aynı adla üzerine yazılmaz. Değişiklik yeni paket veya dosya sürümü oluşturur.
- Tam onaydan önce her varlık için ölçü, MIME/magic bytes, çözülebilirlik ve SHA-256 bütünlüğü doğrulanır.
- PWA'ya bağlandığında HTML/CSS, manifest, service worker önbelleği ve görünür yapı kimliği birlikte güncellenir.
- Mevcut `localStorage` alanları görsel paket geçişinde silinmez veya yeniden adlandırılmaz.

## Kilit seviyeleri

- `in-progress`: Görsel yön onaylı olabilir; zorunlu varlıkların bir bölümü henüz eksiktir.
- `review`: Paket tamamdır, cihaz ve bütünlük doğrulaması beklenir.
- `approved-locked`: Tüm zorunlu roller, dosyalar ve bütünlük değerleri tamamdır; kullanıcı talebi olmadan değiştirilemez.
- `superseded`: Daha yeni onaylı paket devreye alınmıştır; geçmiş ve geri dönüş için korunur.

## Mevcut LGS 2027 kararı

- Görsel yön: **STORM / Şimşekli Gökyüzü**.
- Kullanıcı onayı: 25 Ağustos 2026.
- İlk kullanım arka planları: yazısız ve butonsuz telefon/dikey ile tablet/yatay kompozisyonları.
- Paket kimliği: `lgs2027-storm-v1`.
- Bu aşamada görseller çalışan PWA'ya bağlanmamıştır.
