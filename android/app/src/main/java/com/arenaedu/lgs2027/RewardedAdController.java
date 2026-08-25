package com.arenaedu.lgs2027;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.rewarded.ServerSideVerificationOptions;
import org.json.JSONObject;

final class RewardedAdController {
  private final MainActivity activity;
  private MainActivity.NativeReply pendingReply;
  private RewardedAd activeAd;
  private boolean earned;
  private boolean cancelled;

  RewardedAdController(MainActivity activity) {
    this.activity = activity;
    MobileAds.initialize(activity, status -> {});
  }

  void show(JSONObject payload, MainActivity.NativeReply reply) {
    if (pendingReply != null) { reply.error("reward-busy"); return; }
    if ("not-configured".equals(BuildConfig.ADMOB_REWARDED_ID)) { reply.error("reward-provider-not-configured"); return; }
    String userId = payload.optString("userId");
    String customData = payload.optString("customData");
    if (!userId.matches("^[A-Za-z0-9_-]{20,64}$") || !customData.matches("^[0-9a-fA-F-]{36}$")) {
      reply.error("invalid-reward-binding"); return;
    }
    pendingReply = reply;
    earned = false;
    cancelled = false;
    RewardedAd.load(activity, BuildConfig.ADMOB_REWARDED_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
      @Override public void onAdLoaded(RewardedAd ad) {
        if (cancelled) { clear("reward-cancelled"); return; }
        activeAd = ad;
        ServerSideVerificationOptions options = new ServerSideVerificationOptions.Builder()
          .setUserId(userId).setCustomData(customData).build();
        ad.setServerSideVerificationOptions(options);
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
          @Override public void onAdDismissedFullScreenContent() {
            if (cancelled) clear("reward-cancelled");
            else if (earned) success();
            else clear("reward-not-earned");
          }
          @Override public void onAdFailedToShowFullScreenContent(AdError error) { clear("reward-show-failed"); }
        });
        ad.show(activity, rewardItem -> earned = true);
      }
      @Override public void onAdFailedToLoad(LoadAdError error) { clear("reward-load-failed"); }
    });
  }

  void cancel() {
    cancelled = true;
    if (activeAd == null) clear("reward-cancelled");
  }

  private void success() {
    MainActivity.NativeReply reply = pendingReply;
    reset();
    if (reply != null) {
      try { reply.success(new JSONObject().put("earned", true)); }
      catch (Exception error) { reply.error("reward-result-failed"); }
    }
  }
  private void clear(String code) {
    MainActivity.NativeReply reply = pendingReply;
    reset();
    if (reply != null) reply.error(code);
  }
  private void reset() { pendingReply = null; activeAd = null; earned = false; cancelled = false; }
  void close() { cancel(); reset(); }
}
