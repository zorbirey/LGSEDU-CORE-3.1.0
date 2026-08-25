# ARENA-EDU-CORE-3.7.0

PWA sürümü: `8.6.0-commerce-bridge-20260825-05`

Görünür PWA kimliği: `20260825-05`

## Ticaret köprüsü

Bu sürüm, tarayıcı arayüzü ile ileride eklenecek Android mağaza kabuğu arasında sağlayıcıdan bağımsız bir sözleşme kurar.

Android kabuğu `window.ArenaNativeCommerce` nesnesini sağlamalıdır:

- `purchaseSubscription({ productId, obfuscatedAccountId })`
- `showRewardedAd({ context, sessionId, customData, userId })`
- isteğe bağlı `cancelRewardedAd()`

Köprü yalnız Android sağlayıcısından gelen satın alma belirtecini Worker'a iletir. Premium plan istemci beyanıyla açılmaz; Google Play doğrulaması tamamlandıktan sonra sunucunun döndürdüğü oturum kullanılır.

Ödüllü reklamda hak, reklam penceresinin kapanmasıyla verilmez. Worker tarafından oluşturulan oturum AdMob'a `user_id` ve `custom_data` olarak aktarılır; yalnız imzalı SSV bildirimi doğrulanınca geçiş açılır.

## Güvenli kapalı davranış

Aşağıdaki koşullarda ücret veya hak simülasyonu yapılmaz:

- doğrulanmış Arena hesabı yoksa;
- Android yerel köprüsü yoksa;
- Google Play ürün kimlikleri tanımlanmamışsa;
- Worker sağlayıcı sırları yapılandırılmamışsa;
- reklam SSV bildirimi gelmez, reddedilir veya zaman aşımına uğrarsa.

Tarayıcı PWA'sı çalışmaya devam eder; yalnız gerçek mağaza veya reklam gerektiren işlem anlaşılır bir uyarıyla kapanır.

## Veri koruma

Satın alma belirteçleri localStorage veya sessionStorage içine yazılmaz. Mevcut `lgsArenaPwaV02` öğrenci ilerlemesi değiştirilmez ve silinmez.

## Sonraki dış yapılandırma

1. Android uygulama kimliğinin kesinleştirilmesi.
2. Play Console abonelik ürünlerinin oluşturulması.
3. AdMob ödüllü reklam biriminin oluşturulması ve SSV adresinin Worker uç noktasına bağlanması.
4. Google Play servis hesabının Worker sırrı olarak eklenmesi.
