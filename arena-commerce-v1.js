(() => {
  'use strict';
  const VERSION='ARENA-COMMERCE-BRIDGE-1.0.1';
  const config=window.ARENA_CORE_CONFIG?.commerce||{};
  const authority=()=>window.ArenaSecureAuthority||null;
  let busy=false,activeReward=null;
  function nativeBridge(){const name=config.nativeBridgeName||'ArenaNativeCommerce';return window[name]||null}
  function authenticated(){return !!window.ArenaAccountBridge?.currentUser?.()&&authority()?.authenticated?.()===true}
  function rewardAuthenticated(){return !!window.ArenaAccountBridge?.authorityUser?.()&&authority()?.authenticated?.()===true}
  function error(code,message){const value=new Error(message||code);value.code=code;return value}
  function friendly(value){
    const code=value?.code||value?.message||'';
    if(code.includes('authentication-required'))return 'Satın alma için doğrulanmış Arena hesabıyla giriş yapmalısın.';
    if(code.includes('guest-reward-auth-unavailable'))return 'Misafir reklam kimliği hazırlanamadı. Bağlantını kontrol edip yeniden dene.';
    if(code.includes('native-commerce-unavailable'))return 'Bu işlem yalnız Google Play üzerinden kurulan Android Arena uygulamasında kullanılabilir.';
    if(code.includes('google-play-not-configured')||code.includes('product-not-configured'))return 'Google Play ürünleri henüz yayına bağlanmadı.';
    if(code.includes('reward-provider-not-configured'))return 'Ödüllü reklam sağlayıcısı henüz yayına bağlanmadı.';
    if(code.includes('daily-reward-limit'))return 'Günlük ödüllü reklam kotan doldu.';
    if(code.includes('purchase-cancelled'))return 'Satın alma tamamlanmadı.';
    if(code.includes('reward-not-verified'))return 'Reklam ödülü sunucu tarafından doğrulanamadı; geçiş hakkı verilmedi.';
    if(code.includes('commerce-busy'))return 'Devam eden işlem tamamlandıktan sonra yeniden dene.';
    return 'İşlem güvenli biçimde tamamlanamadı. Lütfen daha sonra yeniden dene.';
  }
  function emit(type,detail={}){window.dispatchEvent(new CustomEvent(`arena:commerce-${type}`,{detail:{...detail,version:VERSION}}))}
  function requireAccount(){if(authenticated())return;window.ArenaAccountBridge?.openFirstUse?.({});throw error('authentication-required')}
  async function ensureRewardIdentity(){
    if(rewardAuthenticated())return;
    try{await window.ArenaAccountBridge?.ensureGuestIdentity?.()}catch{throw error('guest-reward-auth-unavailable')}
    if(!rewardAuthenticated())throw error('guest-reward-auth-unavailable');
  }
  async function status(){
    if(!authenticated())return {ok:false,authenticated:false,nativeAvailable:!!nativeBridge(),googlePlay:{configured:false},rewardedAds:{configured:false}};
    const remote=await authority().commerceStatus();return {...remote,authenticated:true,nativeAvailable:!!nativeBridge()};
  }
  async function purchase(plan){
    if(busy)throw error('commerce-busy');requireAccount();if(!['premium','pro'].includes(plan))throw error('invalid-plan');
    const bridge=nativeBridge();if(!bridge||typeof bridge.purchaseSubscription!=='function')throw error('native-commerce-unavailable');
    const remote=await authority().commerceStatus();if(!remote.googlePlay?.configured)throw error('google-play-not-configured');
    const productId=config.googlePlay?.products?.[plan];if(!productId||productId==='not-configured')throw error('product-not-configured');
    busy=true;emit('started',{kind:'purchase',plan});
    try{
      const binding=await authority().googlePlayAccountBinding();
      const receipt=await bridge.purchaseSubscription({productId,obfuscatedAccountId:binding.accountBinding});
      if(!receipt?.purchaseToken)throw error(receipt?.cancelled?'purchase-cancelled':'invalid-purchase-receipt');
      const verified=await authority().verifyGooglePlaySubscription(productId,receipt.purchaseToken);
      if(!verified?.ok||!authority().atLeast(plan))throw error('purchase-not-verified');
      emit('verified',{kind:'purchase',plan:authority().current()});return verified;
    }catch(value){emit('failed',{kind:'purchase',plan,code:value?.code||value?.message||'purchase-failed'});throw value}
    finally{busy=false}
  }
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  async function pollReward(sessionId,expiresAt){
    const interval=Math.max(1000,Number(config.rewardedAds?.pollIntervalMs)||1500);
    while(Date.now()<Number(expiresAt||0)){
      if(activeReward?.cancelled)throw error('reward-cancelled');
      const value=await authority().rewardSessionStatus(sessionId);
      if(value.verified===true&&value.status==='verified')return value;
      if(['expired','rejected'].includes(value.status))throw error('reward-not-verified');
      await wait(interval);
    }
    throw error('reward-not-verified');
  }
  async function watchRewarded(context='İçeriğe devam et'){
    if(busy)throw error('commerce-busy');await ensureRewardIdentity();
    const bridge=nativeBridge();if(!bridge||typeof bridge.showRewardedAd!=='function')throw error('native-commerce-unavailable');
    const remote=await authority().commerceStatus();if(!remote.rewardedAds?.configured)throw error('reward-provider-not-configured');
    busy=true;activeReward={cancelled:false};emit('started',{kind:'reward',context});
    try{
      const session=await authority().createRewardSession();
      await bridge.showRewardedAd({context,sessionId:session.sessionId,customData:session.customData,userId:session.userId});
      const verified=await pollReward(session.sessionId,session.expiresAt);
      emit('verified',{kind:'reward',context,sessionId:session.sessionId});return verified;
    }catch(value){emit('failed',{kind:'reward',context,code:value?.code||value?.message||'reward-failed'});throw value}
    finally{activeReward=null;busy=false}
  }
  function cancelReward(){if(activeReward)activeReward.cancelled=true;try{nativeBridge()?.cancelRewardedAd?.()}catch{}}
  function refreshUi(){
    document.querySelectorAll('[data-plan-purchase]').forEach(button=>{
      const plan=button.dataset.planPurchase,current=authority()?.current?.()||'free',active=current===plan;
      button.classList.toggle('current',active);button.disabled=busy||active;
      button.textContent=active?'BU PLAN AKTİF':plan==='premium'?'ARENA PREMIUM’A GEÇ':'ARENA PRO’YA GEÇ';
    });
  }
  function wire(){
    document.querySelectorAll('[data-plan-purchase]').forEach(button=>button.addEventListener('click',async()=>{
      refreshUi();try{await purchase(button.dataset.planPurchase);refreshUi()}catch(value){emit('notice',{message:friendly(value),code:value?.code||value?.message||''})}
    }));
    ['arena:authority-updated','arena:identity-changed','arena:commerce-verified','arena:commerce-failed'].forEach(name=>window.addEventListener(name,refreshUi));refreshUi();
  }
  Object.defineProperty(window,'ArenaCommerce',{value:Object.freeze({VERSION,status,purchase,watchRewarded,cancelReward,friendly,nativeAvailable:()=>!!nativeBridge(),busy:()=>busy}),configurable:false,writable:false});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
  window.dispatchEvent(new CustomEvent('arena:commerce-ready',{detail:{version:VERSION,nativeAvailable:!!nativeBridge()}}));
})();
