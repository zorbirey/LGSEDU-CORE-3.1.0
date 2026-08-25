package com.arenaedu.lgs2027;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Collections;
import org.json.JSONObject;

public final class MainActivity extends AppCompatActivity {
  private static final String TRUSTED_ORIGIN="https://zorbirey.github.io";
  private static final String TRUSTED_PATH="/LGSEDU-CORE-3.1.0/";
  private WebView webView;
  private BillingController billing;
  private RewardedAdController rewardedAds;

  @Override protected void onCreate(Bundle state){
    super.onCreate(state);setContentView(R.layout.activity_main);
    webView=findViewById(R.id.arenaWebView);billing=new BillingController(this);rewardedAds=new RewardedAdController(this);
    configureWebView();webView.loadUrl(BuildConfig.WEB_APP_URL);
  }

  private void configureWebView(){
    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    WebSettings settings=webView.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setMediaPlaybackRequiresUserGesture(true);settings.setSafeBrowsingEnabled(true);
    webView.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
        Uri uri=request.getUrl();if(isTrusted(uri))return false;startActivity(new Intent(Intent.ACTION_VIEW,uri));return true;
      }
      @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,android.net.http.SslError error){handler.cancel();}
    });
    if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))throw new IllegalStateException("Secure WebView message bridge is unavailable");
    WebViewCompat.addWebMessageListener(webView,"ArenaNativePort",Collections.singleton(TRUSTED_ORIGIN),(view,message,sourceOrigin,isMainFrame,replyProxy)->{
      if(!isMainFrame||!TRUSTED_ORIGIN.equals(sourceOrigin.toString())){reply(replyProxy,"",false,null,"untrusted-native-request");return;}
      handleNativeMessage(message,replyProxy);
    });
  }

  private boolean isTrusted(Uri uri){return "https".equals(uri.getScheme())&&"zorbirey.github.io".equals(uri.getHost())&&uri.getPath()!=null&&uri.getPath().startsWith(TRUSTED_PATH);}

  private void handleNativeMessage(WebMessageCompat message,androidx.webkit.JavaScriptReplyProxy proxy){
    try{
      JSONObject request=new JSONObject(message.getData());String id=request.optString("id"),action=request.optString("action");JSONObject payload=request.optJSONObject("payload");
      if(id.isEmpty()||id.length()>100){reply(proxy,id,false,null,"invalid-request-id");return;}
      NativeReply result=new NativeReply(proxy,id);
      switch(action){
        case "purchaseSubscription": billing.purchase(payload==null?new JSONObject():payload,result);break;
        case "showRewardedAd": rewardedAds.show(payload==null?new JSONObject():payload,result);break;
        case "cancelRewardedAd": rewardedAds.cancel();result.success(new JSONObject().put("cancelled",true));break;
        default: result.error("unsupported-native-action");
      }
    }catch(Exception error){reply(proxy,"",false,null,"invalid-native-message");}
  }

  static void reply(androidx.webkit.JavaScriptReplyProxy proxy,String id,boolean ok,JSONObject result,String error){
    try{JSONObject value=new JSONObject().put("id",id).put("ok",ok);if(ok)value.put("result",result==null?new JSONObject():result);else value.put("error",error);proxy.postMessage(value.toString());}catch(Exception ignored){}
  }

  @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
  @Override protected void onDestroy(){billing.close();rewardedAds.close();if(webView!=null)webView.destroy();super.onDestroy();}

  static final class NativeReply{
    private final androidx.webkit.JavaScriptReplyProxy proxy;private final String id;private boolean completed;
    NativeReply(androidx.webkit.JavaScriptReplyProxy proxy,String id){this.proxy=proxy;this.id=id;}
    synchronized void success(JSONObject value){if(completed)return;completed=true;reply(proxy,id,true,value,null);}
    synchronized void error(@NonNull String code){if(completed)return;completed=true;reply(proxy,id,false,null,code);}
  }
}
