(() => {
  'use strict';
  const ARENA_KEY='lgsArenaPwaV02',PREFERENCE_KEY='lgsArenaPreferenceV1',PROFILE_KEY='lgsArenaProfileV41';
  const LEVELS=window.ArenaCoreV1?.PLAN_LEVEL||Object.freeze({free:0,premium:1,pro:2,pro_plus:3});
  const LABELS=window.ArenaCoreV1?.PLAN_LABEL||Object.freeze({free:'Ücretsiz',premium:'Arena Premium',pro:'Arena Pro',pro_plus:'Arena Pro+'});
  const FEATURES=Object.freeze({
    ...(window.ArenaCoreV1?.FEATURE_PLAN||{}),deviceTransfer:'premium',zeusAi:'pro',aiTests:'pro'
  });
  function read(key=ARENA_KEY){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}}
  function validPlan(value){return Object.prototype.hasOwnProperty.call(LEVELS,value)?value:null}
  function normalize(state=read()){
    const copy={...state},legacy=copy.isPremium===true;
    copy.plan=validPlan(copy.plan)||(legacy?'premium':'free');
    copy.isPremium=LEVELS[copy.plan]>=LEVELS.premium;
    return copy;
  }
  function persist(state){localStorage.setItem(ARENA_KEY,JSON.stringify(normalize(state)))}
  function authority(){return window.ArenaSecureAuthority||null}
  function current(){return authority()?.verified?.()?authority().current():'free'}
  function giftActive(){return false}
  function atLeast(plan){return authority()?.verified?.()===true&&authority().atLeast(plan)}
  function can(feature){const required=FEATURES[feature];return !!required&&atLeast(required)}
  function setPlan(plan){if(window.ARENA_CORE_CONFIG?.security?.allowLocalPlanSimulation!==true||!validPlan(plan)||plan==='pro_plus')return false;const state=normalize();state.plan=plan;state.isPremium=LEVELS[plan]>=1;persist(state);window.dispatchEvent(new CustomEvent('lgsarena:plan-changed',{detail:{plan,label:LABELS[plan]}}));return true}
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
  function bytesToHex(buffer){return [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  async function checksum(payload){if(!crypto?.subtle)return null;return bytesToHex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload)))}
  async function exportBackup(){
    if(!can('deviceTransfer'))return openUpgrade('device-transfer');
    const data={};[ARENA_KEY,PREFERENCE_KEY,PROFILE_KEY].forEach(key=>{const value=localStorage.getItem(key);if(value!==null)data[key]=value});
    const payload=JSON.stringify(data),file={format:'LGS_ARENA_DEVICE_TRANSFER',schema:1,createdAt:new Date().toISOString(),buildId:'20260825-06',automaticSync:false,data,checksum:await checksum(payload)};
    const blob=new Blob([JSON.stringify(file,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`lgs-arena-yedek-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Cihaz aktarım dosyası indirildi.');
  }
  async function importBackup(file){
    if(!can('deviceTransfer'))return openUpgrade('device-transfer');
    try{
      const parsed=JSON.parse(await file.text());if(parsed.format!=='LGS_ARENA_DEVICE_TRANSFER'||parsed.schema!==1||!parsed.data||typeof parsed.data[ARENA_KEY]!=='string')throw new Error('format');
      const expected=await checksum(JSON.stringify(parsed.data));if(parsed.checksum&&expected&&parsed.checksum!==expected)throw new Error('checksum');
      JSON.parse(parsed.data[ARENA_KEY]);
      const recovery={};[ARENA_KEY,PREFERENCE_KEY,PROFILE_KEY].forEach(key=>{const value=localStorage.getItem(key);if(value!==null)recovery[key]=value});localStorage.setItem('lgsArenaBackupBeforeImport',JSON.stringify({createdAt:new Date().toISOString(),data:recovery}));
      Object.entries(parsed.data).forEach(([key,value])=>{if([ARENA_KEY,PREFERENCE_KEY,PROFILE_KEY].includes(key)&&typeof value==='string')localStorage.setItem(key,value)});
      const migrated=normalize(read());persist(migrated);location.reload();
    }catch{toast('Yedek dosyası doğrulanamadı; mevcut veriler değiştirilmedi.')}
  }
  function openUpgrade(origin='pro'){window.dispatchEvent(new CustomEvent('lgsarena:open-membership',{detail:{origin,focus:'pro'}}))}
  function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.remove('hidden');clearTimeout(window.__planToast);window.__planToast=setTimeout(()=>el.classList.add('hidden'),3500)}
  function refresh(){
    const plan=current(),status=document.getElementById('membershipStatus');if(status){status.textContent=giftActive()&&plan==='free'?'HEDİYE PREMIUM':LABELS[plan].toLocaleUpperCase('tr-TR');status.classList.toggle('active',atLeast('premium'))}
    document.querySelectorAll('[data-pro-cta]').forEach(button=>{const active=atLeast('pro');button.textContent=active?'SERVİS BAĞLANTISI BEKLENİYOR':'ARENA PRO’YU İNCELE';button.classList.toggle('is-active',active)});
  }
  function wire(){
    const migrated=normalize();persist(migrated);refresh();
    document.getElementById('deviceExport')?.addEventListener('click',exportBackup);document.getElementById('deviceImport')?.addEventListener('click',()=>document.getElementById('deviceImportFile')?.click());document.getElementById('deviceImportFile')?.addEventListener('change',event=>{const file=event.target.files?.[0];if(file)importBackup(file);event.target.value=''});
    document.querySelectorAll('[data-pro-cta]').forEach(button=>button.addEventListener('click',()=>{if(!atLeast('pro'))openUpgrade(button.dataset.proCta)}));
    window.addEventListener('lgsarena:plan-changed',refresh);window.addEventListener('lgsarena:membership-refresh',refresh);window.addEventListener('lgsarena:premium-changed',refresh);window.addEventListener('lgsarena:access-updated',refresh);window.addEventListener('arena:authority-updated',refresh);
  }
  window.LgsArenaPlans=Object.freeze({current,label:()=>LABELS[current()],atLeast,can,setPlan,normalize,exportBackup,importBackup,features:FEATURES,automaticSync:false,syncMode:'manual-device-transfer',recommendedBackend:'firebase-auth-cloudflare-d1',authority:'ARENA-SERVER-AUTHORITY-V1'});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();
