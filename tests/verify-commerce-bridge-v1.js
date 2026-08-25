'use strict';
const fs=require('fs');
function read(path){return fs.readFileSync(path,'utf8')}
function must(value,message){if(!value)throw new Error(message)}
const bridge=read('arena-commerce-v1.js'),app=read('app.js'),index=read('index.html'),config=read('arena-core.config.js'),sw=read('service-worker.js'),manifest=read('manifest.webmanifest');
must(bridge.includes('purchaseSubscription'),'native Google Play bridge missing');
must(bridge.includes('obfuscatedAccountId:binding.accountBinding'),'Google Play account binding missing');
must(bridge.includes('verifyGooglePlaySubscription'),'server-side purchase verification missing');
must(bridge.includes('createRewardSession'),'reward session creation missing');
must(bridge.includes('showRewardedAd({context,sessionId:session.sessionId,customData:session.customData,userId:session.userId})'),'AdMob SSV parameters missing');
must(bridge.includes("value.verified===true&&value.status==='verified'"),'server-verified reward gate missing');
must(bridge.includes("throw error('native-commerce-unavailable')"),'browser fail-closed guard missing');
must(!/localStorage|sessionStorage/.test(bridge),'commerce bridge must not persist purchase tokens');
must(!/REWARDED_AD_SECONDS|setInterval\(\(\)=>\{n--/.test(app),'fake countdown reward remains');
must(app.includes('await window.ArenaCommerce.watchRewarded(context)'),'app reward flow is not connected');
must(!index.includes('data-plan-demo'),'demo plan selector remains');
must(!index.includes('TEST REKLAMI · GELİR ÜRETMEZ'),'fake rewarded-ad UI remains');
must(index.includes('arena-commerce-v1.js?v=20260825-05'),'commerce bridge is not loaded');
must(config.includes("mode:'native-bridge-server-authority'"),'commerce mode missing');
must(config.includes("premium:'not-configured'"),'product IDs must fail closed before Play setup');
must(sw.includes("'./arena-commerce-v1.js'"),'commerce bridge missing from offline shell');
must(sw.includes('arena-edu-core-3.7.0-build-20260825-05'),'cache version mismatch');
must(manifest.includes('id=20260825-05'),'manifest build ID mismatch');
console.log('ARENA-COMMERCE-BRIDGE-1.0.0 verification passed');
