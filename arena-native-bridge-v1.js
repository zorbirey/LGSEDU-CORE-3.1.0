(() => {
  'use strict';
  const VERSION='ARENA-ANDROID-BRIDGE-1.0.0',port=window.ArenaNativePort;
  if(!port||typeof port.postMessage!=='function')return;
  let sequence=0;const pending=new Map();
  port.onmessage=event=>{
    let message;try{message=JSON.parse(String(event.data||''))}catch{return}
    const item=pending.get(message.id);if(!item)return;pending.delete(message.id);clearTimeout(item.timer);
    if(message.ok)item.resolve(message.result||{});else{const error=new Error(message.error||'native-operation-failed');error.code=message.error||'native-operation-failed';item.reject(error)}
  };
  function call(action,payload={}){
    const id=`${Date.now()}-${++sequence}`;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);const error=new Error('native-operation-timeout');error.code='native-operation-timeout';reject(error)},120000);
      pending.set(id,{resolve,reject,timer});port.postMessage(JSON.stringify({id,action,payload}));
    });
  }
  Object.defineProperty(window,'ArenaNativeCommerce',{value:Object.freeze({
    VERSION,
    purchaseSubscription:payload=>call('purchaseSubscription',payload),
    showRewardedAd:payload=>call('showRewardedAd',payload),
    cancelRewardedAd:()=>call('cancelRewardedAd',{})
  }),configurable:false,writable:false});
  window.dispatchEvent(new CustomEvent('arena:native-commerce-ready',{detail:{version:VERSION}}));
})();
