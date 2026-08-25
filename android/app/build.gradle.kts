plugins { id("com.android.application") }

val productionAdMobAppId = providers.gradleProperty("ARENA_ADMOB_APP_ID").orNull
val productionRewardedAdUnitId = providers.gradleProperty("ARENA_ADMOB_REWARDED_ID").orNull
val testAdMobAppId = "ca-app-pub-3940256099942544~3347511713"
val testRewardedAdUnitId = "ca-app-pub-3940256099942544/5224354917"

android {
  namespace = "com.arenaedu.lgs2027"
  compileSdk = 36
  defaultConfig {
    applicationId = "com.arenaedu.lgs2027"
    minSdk = 29
    targetSdk = 36
    versionCode = 1
    versionName = "1.0.0"
    buildConfigField("String", "WEB_APP_URL", "\"https://zorbirey.github.io/LGSEDU-CORE-3.1.0/?source=android&id=20260825-06\"")
    buildConfigField("String", "PREMIUM_PRODUCT_ID", "\"arena_premium_monthly\"")
    buildConfigField("String", "PRO_PRODUCT_ID", "\"arena_pro_monthly\"")
  }
  buildTypes {
    debug {
      manifestPlaceholders["admobAppId"] = testAdMobAppId
      buildConfigField("String", "ADMOB_REWARDED_ID", "\"$testRewardedAdUnitId\"")
    }
    release {
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      manifestPlaceholders["admobAppId"] = productionAdMobAppId ?: "not-configured"
      buildConfigField("String", "ADMOB_REWARDED_ID", "\"${productionRewardedAdUnitId ?: "not-configured"}\"")
    }
  }
  buildFeatures { buildConfig = true }
  compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}

gradle.taskGraph.whenReady {
  if(allTasks.any { it.name.contains("Release", ignoreCase=true) }) {
    require(!productionAdMobAppId.isNullOrBlank() && productionAdMobAppId != "not-configured") { "Release için ARENA_ADMOB_APP_ID zorunludur." }
    require(!productionRewardedAdUnitId.isNullOrBlank() && productionRewardedAdUnitId != "not-configured") { "Release için ARENA_ADMOB_REWARDED_ID zorunludur." }
  }
}

dependencies {
  implementation("androidx.appcompat:appcompat:1.7.1")
  implementation("androidx.webkit:webkit:1.14.0")
  implementation("com.android.billingclient:billing-ktx:9.1.0")
  implementation("com.google.android.gms:play-services-ads:25.4.0")
}
