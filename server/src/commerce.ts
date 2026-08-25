import {SignJWT, importPKCS8} from 'jose';

export type PaidPlan='premium'|'pro'|'pro_plus';
export type CommerceEnv=Env&{
  GOOGLE_PLAY_PACKAGE_NAME:string;
  GOOGLE_PLAY_PRODUCT_PLANS:string;
  ADMOB_REWARD_AD_UNIT_ID:string;
  ADMOB_REWARD_ITEM:string;
  ADMOB_REWARD_AMOUNT:string;
  ADMOB_SESSION_TTL_SECONDS:string;
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?:string;
};
interface ServiceAccount{client_email?:string;private_key?:string;private_key_id?:string}
interface SubscriptionLineItem{productId?:string;expiryTime?:string;latestSuccessfulOrderId?:string}
interface SubscriptionPurchase{
  startTime?:string;
  subscriptionState?:string;
  acknowledgementState?:string;
  lineItems?:SubscriptionLineItem[];
  externalAccountIdentifiers?:{obfuscatedExternalAccountId?:string};
}
interface RewardSessionRow{id:string;user_id:string;user_binding:string;status:string;expires_at:number;created_at:number;transaction_id:string|null}
interface AdMobKey{keyId?:number;pem?:string}
interface AdMobKeys{keys?:AdMobKey[]}

const PROVIDER_TIMEOUT_MS=10000;
const ACTIVE_SUBSCRIPTION_STATES=new Set(['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_CANCELED']);
const ADMOB_KEYS_URL='https://www.gstatic.com/admob/reward/verifier-keys.json';
const ANDROID_PUBLISHER_SCOPE='https://www.googleapis.com/auth/androidpublisher';
const GOOGLE_TOKEN_URL='https://oauth2.googleapis.com/token';

export class CommerceError extends Error{constructor(public readonly status:number,public readonly code:string){super(code)}}

export function commerceStatus(env:CommerceEnv):object{
  return {
    ok:true,
    googlePlay:{configured:googlePlayConfigured(env),mode:'server-verification'},
    rewardedAds:{configured:adMobConfigured(env),provider:'admob',mode:'signed-ssv'},
  };
}

export async function googlePlayAccountBinding(userId:string):Promise<string>{
  return base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`arena-google-play:${userId}`))));
}

export async function verifyGooglePlaySubscription(db:D1Database,env:CommerceEnv,userId:string,body:Record<string,unknown>):Promise<object>{
  if(!googlePlayConfigured(env))throw new CommerceError(503,'google-play-not-configured');
  const purchaseToken=boundedString(body.purchaseToken,20,4096,'invalid-purchase-token');
  const productId=boundedString(body.productId,3,200,'invalid-product-id');
  const plans=productPlans(env);
  const plan=plans[productId];
  if(!plan)throw new CommerceError(400,'unknown-product');
  const tokenHash=await sha256Hex(purchaseToken);
  const existing=await db.prepare('SELECT user_id FROM payment_receipts WHERE provider=? AND token_hash=?').bind('google_play',tokenHash).first<{user_id:string}>();
  if(existing&&existing.user_id!==userId)throw new CommerceError(409,'purchase-token-already-claimed');
  const accessToken=await googleAccessToken(env);
  const packageName=env.GOOGLE_PLAY_PACKAGE_NAME;
  const endpoint=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const providerResponse=await fetch(endpoint,{headers:{authorization:`Bearer ${accessToken}`,accept:'application/json'},signal:AbortSignal.timeout(PROVIDER_TIMEOUT_MS)});
  if(providerResponse.status===404||providerResponse.status===410)throw new CommerceError(400,'purchase-not-found');
  if(!providerResponse.ok)throw new CommerceError(502,'google-play-unavailable');
  const purchase=await boundedJson<SubscriptionPurchase>(providerResponse,262144);
  const line=(purchase.lineItems||[]).find(item=>item.productId===productId);
  if(!line)throw new CommerceError(400,'product-mismatch');
  const expectedBinding=await googlePlayAccountBinding(userId);
  if(purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId!==expectedBinding)throw new CommerceError(403,'purchase-account-mismatch');
  const now=Date.now();
  const startsAt=parseProviderTime(purchase.startTime)||now;
  const endsAt=parseProviderTime(line.expiryTime);
  const active=ACTIVE_SUBSCRIPTION_STATES.has(purchase.subscriptionState||'')&&endsAt>now;
  if(active&&purchase.acknowledgementState==='ACKNOWLEDGEMENT_STATE_PENDING')await acknowledgeSubscription(packageName,productId,purchaseToken,accessToken);
  const receiptId=`gplay_${tokenHash}`;
  const status=active?'active':purchase.subscriptionState==='SUBSCRIPTION_STATE_PENDING'?'pending':endsAt&&endsAt<=now?'expired':'revoked';
  const stored=await db.prepare(`INSERT INTO payment_receipts
    (id,provider,token_hash,user_id,provider_transaction_id,product_id,plan,status,starts_at,ends_at,last_verified_at,created_at,updated_at)
    VALUES (?,'google_play',?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(provider,token_hash) DO UPDATE SET provider_transaction_id=excluded.provider_transaction_id,product_id=excluded.product_id,
      plan=excluded.plan,status=excluded.status,starts_at=excluded.starts_at,ends_at=excluded.ends_at,last_verified_at=excluded.last_verified_at,updated_at=excluded.updated_at
    WHERE payment_receipts.user_id=excluded.user_id RETURNING user_id`)
    .bind(receiptId,tokenHash,userId,line.latestSuccessfulOrderId||null,productId,plan,status,startsAt,endsAt||null,now,now,now).first<{user_id:string}>();
  if(!stored||stored.user_id!==userId)throw new CommerceError(409,'purchase-token-already-claimed');
  if(active){
    await db.prepare(`INSERT INTO entitlements (id,user_id,plan,starts_at,ends_at,source,created_at) VALUES (?,?,?,?,?,'payment',?)
      ON CONFLICT(id) DO UPDATE SET plan=excluded.plan,starts_at=excluded.starts_at,ends_at=excluded.ends_at WHERE entitlements.user_id=excluded.user_id`)
      .bind(receiptId,userId,plan,startsAt,endsAt,now).run();
  }else{
    await db.prepare('DELETE FROM entitlements WHERE id=? AND user_id=? AND source=?').bind(receiptId,userId,'payment').run();
  }
  return {ok:true,provider:'google_play',verified:true,active,plan:active?plan:'free',productId,status,validUntil:active?endsAt:null,serverAt:now};
}

export async function createRewardSession(db:D1Database,env:CommerceEnv,userId:string,window:{key:string;resetAt:number},used:number,limit:number):Promise<object>{
  if(!adMobConfigured(env))throw new CommerceError(503,'reward-provider-not-configured');
  if(limit<1||used>=limit)throw new CommerceError(429,'daily-reward-limit');
  const pending=await db.prepare(`SELECT COUNT(*) AS total FROM ad_reward_sessions WHERE user_id=? AND status='pending' AND expires_at>?`).bind(userId,Date.now()).first<{total:number}>();
  if(used+Number(pending?.total||0)>=limit)throw new CommerceError(429,'daily-reward-limit');
  const now=Date.now();
  const ttl=Math.min(1800,Math.max(300,Number(env.ADMOB_SESSION_TTL_SECONDS)||900));
  const sessionId=crypto.randomUUID();
  const userBinding=await adMobUserBinding(userId);
  const expiresAt=Math.min(now+ttl*1000,window.resetAt);
  await db.prepare(`INSERT INTO ad_reward_sessions (id,user_id,user_binding,status,transaction_id,expires_at,created_at,updated_at) VALUES (?,?,?,'pending',NULL,?,?,?)`)
    .bind(sessionId,userId,userBinding,expiresAt,now,now).run();
  return {ok:true,provider:'admob',mode:'signed-ssv',sessionId,customData:sessionId,userId:userBinding,expiresAt,serverAt:now};
}

export async function rewardSessionStatus(db:D1Database,userId:string,sessionId:string):Promise<object>{
  if(!/^[0-9a-f-]{36}$/i.test(sessionId))throw new CommerceError(400,'invalid-reward-session');
  const row=await db.prepare('SELECT status,transaction_id,expires_at,updated_at FROM ad_reward_sessions WHERE id=? AND user_id=?').bind(sessionId,userId).first<{status:string;transaction_id:string|null;expires_at:number;updated_at:number}>();
  if(!row)throw new CommerceError(404,'reward-session-not-found');
  const status=row.status==='pending'&&row.expires_at<Date.now()?'expired':row.status;
  if(status==='expired'&&row.status==='pending')await db.prepare(`UPDATE ad_reward_sessions SET status='expired',updated_at=? WHERE id=? AND user_id=? AND status='pending'`).bind(Date.now(),sessionId,userId).run();
  return {ok:true,provider:'admob',sessionId,status,verified:status==='verified',transactionId:status==='verified'?row.transaction_id:null,expiresAt:row.expires_at,serverAt:Date.now()};
}

export async function verifyAdMobCallback(request:Request,db:D1Database,env:CommerceEnv,windowFor:(now:number)=>{key:string;resetAt:number},limit:number):Promise<void>{
  if(!adMobConfigured(env))throw new CommerceError(503,'reward-provider-not-configured');
  const parsed=parseAdMobSignedQuery(new URL(request.url).search.slice(1));
  const params=new URLSearchParams(parsed.signedContent);
  const sessionId=params.get('custom_data')||'';
  const userBinding=params.get('user_id')||'';
  const transactionId=params.get('transaction_id')||'';
  const adUnit=params.get('ad_unit')||'';
  const rewardItem=params.get('reward_item')||'';
  const rewardAmount=Number(params.get('reward_amount'));
  const providerTimestamp=normalizedEpoch(Number(params.get('timestamp')));
  if(!/^[0-9a-f-]{36}$/i.test(sessionId)||!/^[A-Za-z0-9._~-]{8,200}$/.test(transactionId))throw new CommerceError(400,'invalid-reward-callback');
  if(adUnit!==env.ADMOB_REWARD_AD_UNIT_ID||rewardItem!==env.ADMOB_REWARD_ITEM||rewardAmount!==Number(env.ADMOB_REWARD_AMOUNT))throw new CommerceError(403,'reward-configuration-mismatch');
  const callbackReceivedAt=Date.now();
  const session=await db.prepare('SELECT id,user_id,user_binding,status,expires_at,created_at,transaction_id FROM ad_reward_sessions WHERE id=?').bind(sessionId).first<RewardSessionRow>();
  if(!session||session.user_binding!==userBinding)throw new CommerceError(403,'reward-session-mismatch');
  if(providerTimestamp<session.created_at-60000||providerTimestamp>session.expires_at+60000)throw new CommerceError(403,'reward-timestamp-rejected');
  if(callbackReceivedAt>session.expires_at+60000)throw new CommerceError(403,'reward-callback-expired');
  await verifyAdMobSignature(parsed);
  const duplicate=await db.prepare('SELECT session_id,user_id FROM ad_reward_transactions WHERE transaction_id=?').bind(transactionId).first<{session_id:string;user_id:string}>();
  if(duplicate){if(duplicate.session_id===sessionId&&duplicate.user_id===session.user_id)return;throw new CommerceError(409,'reward-transaction-replayed')}
  if(session.status==='verified'&&session.transaction_id===transactionId)return;
  if(session.status!=='pending')throw new CommerceError(409,'reward-session-closed');
  const now=callbackReceivedAt,window=windowFor(now);
  try{
    await db.prepare(`INSERT INTO ad_reward_transactions
      (transaction_id,session_id,user_id,provider,ad_unit,reward_item,reward_amount,window_key,limit_value,reset_at,provider_timestamp,verified_at)
      VALUES (?,?,?,'admob',?,?,?,?,?,?,?,?,?)`)
      .bind(transactionId,sessionId,session.user_id,adUnit,rewardItem,rewardAmount,window.key,limit,window.resetAt,providerTimestamp,now).run();
  }catch(error){
    const message=error instanceof Error?error.message:'';
    if(message.includes('daily-reward-limit')){await db.prepare(`UPDATE ad_reward_sessions SET status='rejected',updated_at=? WHERE id=? AND status='pending'`).bind(now,sessionId).run();return}
    const after=await db.prepare('SELECT session_id,user_id FROM ad_reward_transactions WHERE transaction_id=?').bind(transactionId).first<{session_id:string;user_id:string}>();
    if(after?.session_id===sessionId&&after.user_id===session.user_id)return;
    throw new CommerceError(409,'reward-verification-conflict');
  }
}

function googlePlayConfigured(env:CommerceEnv):boolean{return env.GOOGLE_PLAY_PACKAGE_NAME!=='not-configured'&&Object.keys(productPlans(env)).length>0&&!!env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON}
function adMobConfigured(env:CommerceEnv):boolean{return env.ADMOB_REWARD_AD_UNIT_ID!=='not-configured'&&Number(env.ADMOB_REWARD_AMOUNT)>0}
function productPlans(env:CommerceEnv):Record<string,PaidPlan>{
  try{const value=JSON.parse(env.GOOGLE_PLAY_PRODUCT_PLANS) as Record<string,unknown>;const result:Record<string,PaidPlan>={};for(const [key,plan] of Object.entries(value||{}))if(/^[A-Za-z0-9._-]{3,200}$/.test(key)&&['premium','pro','pro_plus'].includes(String(plan)))result[key]=plan as PaidPlan;return result}catch{return {}}
}
async function googleAccessToken(env:CommerceEnv):Promise<string>{
  let service:ServiceAccount;
  try{service=JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON||'{}') as ServiceAccount}catch{throw new CommerceError(503,'google-play-not-configured')}
  if(!service.client_email||!service.private_key)throw new CommerceError(503,'google-play-not-configured');
  const now=Math.floor(Date.now()/1000);
  const key=await importPKCS8(service.private_key,'RS256');
  const assertion=await new SignJWT({scope:ANDROID_PUBLISHER_SCOPE}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:service.private_key_id}).setIssuer(service.client_email).setAudience(GOOGLE_TOKEN_URL).setIssuedAt(now).setExpirationTime(now+3600).sign(key);
  const form=new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion});
  const response=await fetch(GOOGLE_TOKEN_URL,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(PROVIDER_TIMEOUT_MS)});
  if(!response.ok)throw new CommerceError(502,'google-authentication-failed');
  const value=await boundedJson<{access_token?:string}>(response,32768);
  if(!value.access_token)throw new CommerceError(502,'google-authentication-failed');
  return value.access_token;
}
async function acknowledgeSubscription(packageName:string,productId:string,purchaseToken:string,accessToken:string):Promise<void>{
  const endpoint=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const response=await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(PROVIDER_TIMEOUT_MS)});
  if(!response.ok)throw new CommerceError(502,'google-play-acknowledgement-failed');
}
async function adMobUserBinding(userId:string):Promise<string>{return base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`arena-admob:${userId}`))))}
export function parseAdMobSignedQuery(rawQuery:string):{signedContent:string;signature:string;keyId:number}{
  const signatureMarker='&signature=',keyMarker='&key_id=';
  const signatureAt=rawQuery.lastIndexOf(signatureMarker),keyAt=rawQuery.lastIndexOf(keyMarker);
  if(signatureAt<1||keyAt<=signatureAt+signatureMarker.length||rawQuery.indexOf('&',keyAt+keyMarker.length)!==-1)throw new CommerceError(400,'invalid-reward-signature-envelope');
  const signedContent=rawQuery.slice(0,signatureAt);
  const signature=decodeURIComponent(rawQuery.slice(signatureAt+signatureMarker.length,keyAt));
  const keyId=Number(decodeURIComponent(rawQuery.slice(keyAt+keyMarker.length)));
  if(!/^[A-Za-z0-9_-]{40,200}$/.test(signature)||!Number.isSafeInteger(keyId)||keyId<1)throw new CommerceError(400,'invalid-reward-signature-envelope');
  return {signedContent,signature,keyId};
}
async function verifyAdMobSignature(parsed:{signedContent:string;signature:string;keyId:number}):Promise<void>{
  const response=await fetch(ADMOB_KEYS_URL,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:21600},signal:AbortSignal.timeout(PROVIDER_TIMEOUT_MS)});
  if(!response.ok)throw new CommerceError(502,'reward-key-service-unavailable');
  const keys=await boundedJson<AdMobKeys>(response,131072);
  const pem=(keys.keys||[]).find(entry=>entry.keyId===parsed.keyId)?.pem;
  if(!pem)throw new CommerceError(403,'reward-key-not-found');
  const key=await crypto.subtle.importKey('spki',pemBytes(pem),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const signature=derEcdsaToRaw(base64UrlBytes(parsed.signature),32);
  const valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,toArrayBuffer(signature),toArrayBuffer(new TextEncoder().encode(parsed.signedContent)));
  if(!valid)throw new CommerceError(403,'reward-signature-rejected');
}
export function derEcdsaToRaw(der:Uint8Array,size:number):Uint8Array{
  let offset=0;if(der[offset++]!==0x30)throw new CommerceError(400,'invalid-reward-signature');
  const sequenceLength=readDerLength(der,offset);offset=sequenceLength.offset;if(sequenceLength.length!==der.length-offset)throw new CommerceError(400,'invalid-reward-signature');
  const values:Uint8Array[]=[];
  for(let index=0;index<2;index++){if(der[offset++]!==0x02)throw new CommerceError(400,'invalid-reward-signature');const partLength=readDerLength(der,offset);offset=partLength.offset;let part=der.slice(offset,offset+partLength.length);offset+=partLength.length;while(part.length>size&&part[0]===0)part=part.slice(1);if(part.length>size)throw new CommerceError(400,'invalid-reward-signature');const padded=new Uint8Array(size);padded.set(part,size-part.length);values.push(padded)}
  if(offset!==der.length)throw new CommerceError(400,'invalid-reward-signature');const raw=new Uint8Array(size*2);raw.set(values[0],0);raw.set(values[1],size);return raw;
}
function readDerLength(bytes:Uint8Array,offset:number):{length:number;offset:number}{const first=bytes[offset++];if(first===undefined)throw new CommerceError(400,'invalid-reward-signature');if(first<128)return {length:first,offset};const count=first&127;if(count<1||count>2||offset+count>bytes.length)throw new CommerceError(400,'invalid-reward-signature');let length=0;for(let i=0;i<count;i++)length=length*256+bytes[offset++];return {length,offset}}
function pemBytes(pem:string):ArrayBuffer{const value=pem.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');return toArrayBuffer(base64Bytes(value))}
function base64Bytes(value:string):Uint8Array{const binary=atob(value);return Uint8Array.from(binary,char=>char.charCodeAt(0))}
function base64UrlBytes(value:string):Uint8Array{return base64Bytes(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'='))}
function toArrayBuffer(value:Uint8Array):ArrayBuffer{const copy=new Uint8Array(value.byteLength);copy.set(value);return copy.buffer}
function base64Url(value:Uint8Array):string{let binary='';for(const byte of value)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sha256Hex(value:string):Promise<string>{return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(byte=>byte.toString(16).padStart(2,'0')).join('')}
function boundedString(value:unknown,min:number,max:number,code:string):string{if(typeof value!=='string'||value.length<min||value.length>max)throw new CommerceError(400,code);return value}
async function boundedJson<T>(response:Response,maxBytes:number):Promise<T>{
  const declared=Number(response.headers.get('content-length')||0);
  if(declared>maxBytes||!response.body)throw new CommerceError(502,'provider-response-too-large');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;if(value){total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new CommerceError(502,'provider-response-too-large')}chunks.push(value)}}
  const bytes=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  try{return JSON.parse(new TextDecoder().decode(bytes)) as T}catch{throw new CommerceError(502,'invalid-provider-response')}
}
function parseProviderTime(value:unknown):number{if(typeof value!=='string')return 0;const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:0}
function normalizedEpoch(value:number):number{if(!Number.isFinite(value)||value<1)return 0;return value>100000000000000?Math.floor(value/1000):Math.floor(value)}
