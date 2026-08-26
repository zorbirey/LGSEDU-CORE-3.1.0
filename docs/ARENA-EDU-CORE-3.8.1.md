# ARENA-EDU-CORE-3.8.1-GUEST-REWARDS

PWA sürümü: `8.7.1-guest-rewards-20260825-07`

Görünür PWA kimliği: `20260825-07`

Bu hotfix, misafirlerin ödüllü reklam geçişinde hesap ekranına yönlendirilmesini kaldırır. Misafir oturumu Firebase Anonymous Authentication ile sunucuda ayrı bir ücretsiz kullanıcı olarak doğrulanır. Ödül yalnız AdMob SSV doğrulaması tamamlandıktan sonra verilir.

Güvenlik sınırları:

- Google Play satın alma ve abonelik doğrulama uçları doğrulanmış e-posta hesabı ister.
- Anonim hesap Premium veya Pro hakkı kazanamaz.
- Misafir daha sonra yeni hesap oluşturursa anonim Firebase kimliği e-posta/parola hesabına bağlanır.
- Mevcut `localStorage` verileri silinmez veya yeniden adlandırılmaz.

Dağıtım ön koşulu: Firebase Console içinde Authentication → Sign-in method → Anonymous sağlayıcısı etkinleştirilmelidir. Web PWA'da AdMob SDK bulunmadığından gerçek ödüllü reklam yalnız Google Play Android paketi ve gerçek AdMob birim kimliği bağlandığında gösterilir.
