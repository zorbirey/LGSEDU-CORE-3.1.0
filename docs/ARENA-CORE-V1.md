# ARENA-CORE-V1 uyumu

Bu proje Arena ortak çekirdeğinin `ARENA-CORE-V1` sürümünü kullanır.

- Uygulama/ad alanı: `lgs2027-arena`
- Sınav adaptörü: LGS 2027, 90 soru, sınava özel puanlama
- Ürün planları: Ücretsiz, Arena Premium, Arena Pro, Arena Pro+
- Ücretsiz sınır: 50 soru ve günde en fazla 6 isteğe bağlı ödüllü reklam
- Günlük açılış: Türkiye saatiyle 08.00
- AI alt sözleşmesi: `ARENA-AI-TEACHER-V1`, canlı sunucu bağlanana kadar kapalı
- PWA: tek service worker, zorunlu etkinleşme yenilemesi yok
- Görsel alt sözleşme: `ARENA-VISUAL-PACK-V1`; toplu üretim, kullanıcı onayı, sürümlü yerel varlıklar ve onay sonrası değişiklik kilidi

Mevcut `lgsArenaPwaV02` verisi korunur. Yeni ortak özellikler ayrı
`lgs2027-arena:core:v1:*` anahtarlarında saklanır.
