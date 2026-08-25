# Arena EDU Android Commerce Shell 1.0.0

This Android 16 project hosts the production PWA in a locked HTTPS WebView and exposes only an origin-scoped `ArenaNativePort` message channel. It never grants Premium or rewarded access locally.

## Immutable identifiers

- Package: `com.arenaedu.lgs2027`
- Premium subscription: `arena_premium_monthly`
- Pro subscription: `arena_pro_monthly`
- AdMob reward item: `arena_continue`, amount `1`

Create the two subscriptions in Play Console with exactly these IDs. Product IDs and the package name cannot be casually renamed after publication.

## Debug

Debug builds use Google's official sample AdMob app and rewarded-ad unit IDs. They never generate revenue. Install Android Studio with Android SDK 36 and JDK 17, then open this `android` directory.

## Release

Put these values in the user-level Gradle properties file, never in Git:

```
ARENA_ADMOB_APP_ID=ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy
ARENA_ADMOB_REWARDED_ID=ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz
```

A release build fails closed when either production AdMob value is missing. Configure AdMob SSV to:

`https://dry-hill-ab5b.zorbirey73.workers.dev/v1/ads/admob/ssv`

The release also requires a private signing key and Play App Signing setup. Do not commit signing files or passwords.
