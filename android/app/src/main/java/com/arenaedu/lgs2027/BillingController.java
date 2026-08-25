package com.arenaedu.lgs2027;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import java.util.Collections;
import java.util.List;
import org.json.JSONObject;

final class BillingController implements PurchasesUpdatedListener {
  private final MainActivity activity;
  private final BillingClient client;
  private MainActivity.NativeReply pendingReply;
  private String pendingProduct;

  BillingController(MainActivity activity) {
    this.activity = activity;
    client = BillingClient.newBuilder(activity)
      .setListener(this)
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
      .enableAutoServiceReconnection()
      .build();
  }

  void purchase(JSONObject payload, MainActivity.NativeReply reply) {
    if (pendingReply != null) { reply.error("purchase-busy"); return; }
    String productId = payload.optString("productId");
    String accountId = payload.optString("obfuscatedAccountId");
    if (!isAllowedProduct(productId)) { reply.error("invalid-product-id"); return; }
    if (!accountId.matches("^[A-Za-z0-9_-]{20,64}$")) { reply.error("invalid-account-binding"); return; }
    pendingReply = reply;
    pendingProduct = productId;
    connectAndLaunch(productId, accountId);
  }

  private boolean isAllowedProduct(String value) {
    return BuildConfig.PREMIUM_PRODUCT_ID.equals(value) || BuildConfig.PRO_PRODUCT_ID.equals(value);
  }

  private void connectAndLaunch(String productId, String accountId) {
    if (client.isReady()) { queryAndLaunch(productId, accountId); return; }
    client.startConnection(new BillingClientStateListener() {
      @Override public void onBillingSetupFinished(BillingResult result) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) queryAndLaunch(productId, accountId);
        else fail("billing-unavailable");
      }
      @Override public void onBillingServiceDisconnected() { fail("billing-disconnected"); }
    });
  }

  private void queryAndLaunch(String productId, String accountId) {
    QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
      .setProductId(productId).setProductType(BillingClient.ProductType.SUBS).build();
    QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
      .setProductList(Collections.singletonList(product)).build();
    client.queryProductDetailsAsync(params, (result, detailsResult) -> {
      List<ProductDetails> products = detailsResult.getProductDetailsList();
      if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || products.isEmpty()) {
        fail("product-unavailable"); return;
      }
      ProductDetails details = products.get(0);
      List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
      if (offers == null || offers.isEmpty()) { fail("subscription-offer-unavailable"); return; }
      BillingFlowParams.ProductDetailsParams item = BillingFlowParams.ProductDetailsParams.newBuilder()
        .setProductDetails(details).setOfferToken(offers.get(0).getOfferToken()).build();
      BillingFlowParams flow = BillingFlowParams.newBuilder()
        .setProductDetailsParamsList(Collections.singletonList(item))
        .setObfuscatedAccountId(accountId).build();
      BillingResult launched = client.launchBillingFlow(activity, flow);
      if (launched.getResponseCode() != BillingClient.BillingResponseCode.OK) fail("purchase-launch-failed");
    });
  }

  @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
    if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) { fail("purchase-cancelled"); return; }
    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) { fail("purchase-failed"); return; }
    for (Purchase purchase : purchases) {
      if (purchase.getProducts().contains(pendingProduct)) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) { fail("purchase-pending"); return; }
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
          try {
            JSONObject receipt = new JSONObject()
              .put("productId", pendingProduct)
              .put("purchaseToken", purchase.getPurchaseToken());
            MainActivity.NativeReply reply = pendingReply;
            clear();
            reply.success(receipt);
          } catch (Exception error) { fail("invalid-purchase-receipt"); }
          return;
        }
      }
    }
    fail("purchase-not-found");
  }

  private void fail(String code) {
    MainActivity.NativeReply reply = pendingReply;
    clear();
    if (reply != null) reply.error(code);
  }
  private void clear() { pendingReply = null; pendingProduct = null; }
  void close() { clear(); if (client.isReady()) client.endConnection(); }
}
