# LGS 2027 Arena — HTML/PWA Live Demo

Zeus temalı, mobil öncelikli LGS çalışma uygulaması.

## Canlı demo

GitHub Pages hedef adresi:

https://zorbirey.github.io/LGS2027-Arena/

## Mevcut özellikler

- **Inspired from Zeus** kapak / splash ekranı
- 13 Haziran 2027 canlı geri sayım
- Arena ana sayfası
- Zeus koçluk ekranı
- Fen, Matematik, Türkçe, T.C. İnkılap Tarihi ve Din Kültürü
- Her derste 30 soru, toplam **150 özgün demo sorusu**
- **Akıllı Notlar**: kavram, dikkat noktası ve kısa örnekler
- İpucu, çözüm yolu ve Zeus yönlendirmesi
- Görülen soruları `localStorage` ile takip edip önce yeni soruları getiren seçim mantığı
- Doğru / yanlış / boş / XP / zayıf konu sonuç ekranı
- Türkiye ve il sıralaması için demo kartları
- HMGS Arena mantığına uygun ücretsiz sürüm reklam simülasyonu ve Premium reklamsız sonuç akışı
- Ana sayfalarda telefon ekranına sığan, aşağı kaydırma gerektirmeyen düzen
- PWA manifest ve Service Worker altyapısı
- Telefona uygulama gibi kurulabilme
- Temel çevrimdışı kullanım

## Çok yıllı yapı

Aktif yıl ve sınav tarihi `app.js` içindeki `CONFIG` alanından yönetilir. Böylece ileride LGS 2028, LGS 2029 gibi sezonlara geçiş tek merkezden yapılabilir; kullanıcıdan sezon seçmesi istenmez.

## Yayın

`feature/pwa-live-demo` dalına yapılan her push, GitHub Actions üzerinden GitHub Pages yayını tetikler.

Son yayın tetikleme: 20 Ağustos 2026 21:50 (TR)
## Görsel paket standardı

Yeni Arena EDU projeleri ikon, açılış, ilk kullanım ve uygulama içi Zeus görsellerini tek paket olarak üretir. Kullanıcı onayından sonra görsel yön kilitlenir ve açık kullanıcı talebi olmadan değiştirilmez. Ayrıntılar `docs/ARENA-VISUAL-PACK-V1.md` dosyasındadır.

Tam LGS 2027 STORM görsel paketi `assets/visual-packs/lgs2027-storm-v1/visual-pack.json` altında `approved-locked` olarak kayıtlıdır. Çekirdek sürümü: `ARENA-EDU-CORE-3.3.0`.
