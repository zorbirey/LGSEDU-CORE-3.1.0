# ARENA-EDU-CORE-3.8.0-ANDROID-COMMERCE

PWA sürümü: `8.7.0-android-commerce-20260825-06`

Görünür PWA kimliği: `20260825-06`

Bu sürüm, Arena çekirdeğine Android 16 için güvenli PWA kabuğu, Google Play abonelik ürünleri ve AdMob ödüllü reklam sözleşmesini ekler.

## Sabit ticaret kimlikleri

- Android paket adı: `com.arenaedu.lgs2027`
- Premium abonelik: `arena_premium_monthly`
- Pro abonelik: `arena_pro_monthly`
- AdMob ödül öğesi: `arena_continue`
- AdMob ödül miktarı: `1`

## Güvenlik sınırı

Android tarafı satın alma jetonunu veya reklam sonucunu tek başına üyelik hakkına dönüştürmez. Google Play satın alması Worker üzerinden doğrulanır; ödüllü reklam hakkı yalnız imzalı AdMob SSV bildirimi geldikten sonra açılır. WebView köprüsü yalnız `https://zorbirey.github.io` ana çerçevesine açıktır.

## Yayın öncesi dış adımlar

1. Play Console'da paket adına bağlı uygulamayı ve iki abonelik ürününü tam bu kodlarla oluşturun.
2. AdMob'da Android uygulamasını oluşturup gerçek uygulama ve ödüllü reklam birimi kimliklerini alın.
3. Gerçek AdMob kimliklerini kullanıcı Gradle ayarlarına ekleyin; Git'e yazmayın.
4. Google Play servis hesabı JSON'unu Cloudflare Worker secret olarak ekleyin.
5. AdMob SSV adresini `https://dry-hill-ab5b.zorbirey73.workers.dev/v1/ads/admob/ssv` yapın.
6. Play App Signing ve kapalı test kanalında gerçek satın alma/reklam doğrulaması yapın.

Gerçek AdMob kimlikleri girilmeden Android release paketi üretilmez. Geliştirme sürümü yalnız Google'ın resmi test reklam kimliklerini kullanır ve gelir üretmez.
