import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import {CommerceError, commerceStatus, createRewardSession, googlePlayAccountBinding, rewardSessionStatus, verifyAdMobCallback, verifyGooglePlaySubscription, type CommerceEnv} from './commerce';

type Plan = 'free' | 'premium' | 'pro' | 'pro_plus';
type WorkerEnv=CommerceEnv&{TURNSTILE_SECRET_KEY?:string};
interface FirebaseClaims extends JWTPayload { email_verified?: boolean }
interface EntitlementRow { plan: Plan; source: string; ends_at: number | null; created_at: number }
interface QuotaRow { feature: string; used: number }
interface StoredRequest { status: string; response_json: string | null }

const FIREBASE_JWKS=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const PLAN_LEVEL:Readonly<Record<Plan,number>>=Object.freeze({free:0,premium:1,pro:2,pro_plus:3});
const PLAN_LIMITS=Object.freeze({
  free:Object.freeze({questions:50,rewardedAds:6,aiDaily:0}),
  premium:Object.freeze({questions:100000,rewardedAds:0,aiDaily:0}),
  pro:Object.freeze({questions:100000,rewardedAds:0,aiDaily:10}),
  pro_plus:Object.freeze({questions:100000,rewardedAds:0,aiDaily:50}),
});
const JSON_HEADERS=Object.freeze({'content-type':'application/json; charset=utf-8'});

export default {
  async fetch(request:Request,env:WorkerEnv):Promise<Response>{
    const requestId=request.headers.get('cf-ray')||crypto.randomUUID();
    const origin=request.headers.get('origin');
    const cors=corsHeaders(origin,env);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    try{
      const url=new URL(request.url);
      if(request.method==='GET'&&url.pathname==='/v1/health')return json({ok:true,service:'ARENA-SERVER-AUTHORITY-V1',serverAt:Date.now()},200,cors);
      if(!corsAllowed(origin,env))throw new ApiError(403,'origin-not-allowed');
      if(request.method==='POST'&&url.pathname==='/v1/security/turnstile/verify'){
        await requireTurnstile(request,env);
        return json({ok:true,verified:true,serverAt:Date.now()},200,cors);
      }
      if(request.method==='GET'&&url.pathname==='/v1/ads/admob/ssv'){
        await verifyAdMobCallback(request,env.DB,env,quotaWindow,PLAN_LIMITS.free.rewardedAds);
        return new Response(null,{status:204,headers:cors});
      }
      const claims=await authenticate(request,env);
      const userId=claims.sub as string;
      if(request.method==='POST'&&url.pathname==='/v1/session/bootstrap'){
        await requireTurnstile(request,env);
        await upsertUser(env.DB,userId);
        await requireActiveUser(env.DB,userId);
        return json(await sessionSnapshot(env.DB,userId),200,cors);
      }
      await requireActiveUser(env.DB,userId);
      if(request.method==='GET'&&url.pathname==='/v1/session')return json(await sessionSnapshot(env.DB,userId),200,cors);
      if(request.method==='GET'&&url.pathname==='/v1/commerce/status')return json(commerceStatus(env),200,cors);
      if(request.method==='GET'&&url.pathname==='/v1/payments/google-play/account-binding')return json({ok:true,accountBinding:await googlePlayAccountBinding(userId),serverAt:Date.now()},200,cors);
      if(request.method==='POST'&&url.pathname==='/v1/payments/google-play/subscription/verify'){
        const body=await readJson(request);
        const verification=await verifyGooglePlaySubscription(env.DB,env,userId,body);
        return json({...verification,session:await sessionSnapshot(env.DB,userId)},200,cors);
      }
      if(request.method==='POST'&&url.pathname==='/v1/ads/rewarded/session'){
        const now=Date.now(),window=quotaWindow(now),row=await entitlement(env.DB,userId,now),plan=effectivePlan(row),usage=await quotaUsage(env.DB,userId,window.key),limit=PLAN_LIMITS[plan].rewardedAds;
        return json(await createRewardSession(env.DB,env,userId,window,usage.rewardedAds,limit),201,cors);
      }
      const rewardStatus=/^\/v1\/ads\/rewarded\/session\/([0-9a-f-]{36})$/i.exec(url.pathname);
      if(request.method==='GET'&&rewardStatus)return json(await rewardSessionStatus(env.DB,userId,rewardStatus[1]),200,cors);
      if(request.method==='POST'&&url.pathname==='/v1/usage/questions/reserve'){
        const body=await readJson(request);
        const amount=integerInRange(body.count,1,90,'invalid-question-count');
        const idempotencyKey=validIdempotencyKey(body.idempotencyKey);
        return json(await reserveQuestions(env.DB,userId,amount,idempotencyKey),200,cors);
      }
      if(request.method==='POST'&&url.pathname==='/v1/usage/rewarded/claim')throw new ApiError(410,'signed-reward-session-required');
      throw new ApiError(404,'not-found');
    }catch(error){
      const apiError=error instanceof ApiError||error instanceof CommerceError?error:new ApiError(500,'internal-error');
      console.error(JSON.stringify({level:'error',requestId,code:apiError.code,status:apiError.status}));
      return json({ok:false,error:apiError.code,requestId},apiError.status,cors);
    }
  },
} satisfies ExportedHandler<WorkerEnv>;

class ApiError extends Error{constructor(public readonly status:number,public readonly code:string){super(code)}}
function allowedOrigins(env:WorkerEnv):string[]{return env.ALLOWED_ORIGINS.split(',').map(value=>value.trim()).filter(Boolean)}
function corsAllowed(origin:string|null,env:WorkerEnv):boolean{return origin===null||allowedOrigins(env).includes(origin)}
function corsHeaders(origin:string|null,env:WorkerEnv):HeadersInit{
  const headers:Record<string,string>={
    'access-control-allow-headers':'authorization, content-type, idempotency-key, x-turnstile-token',
    'access-control-allow-methods':'GET, POST, OPTIONS','access-control-max-age':'86400','cache-control':'no-store',
    'referrer-policy':'no-referrer','x-content-type-options':'nosniff',
  };
  if(origin&&allowedOrigins(env).includes(origin)){headers['access-control-allow-origin']=origin;headers.vary='Origin'}
  return headers;
}
function json(value:unknown,status:number,extra:HeadersInit={}):Response{return new Response(JSON.stringify(value),{status,headers:{...JSON_HEADERS,...extra}})}

async function authenticate(request:Request,env:WorkerEnv):Promise<FirebaseClaims>{
  const match=/^Bearer ([A-Za-z0-9._~-]+)$/.exec(request.headers.get('authorization')||'');
  if(!match)throw new ApiError(401,'authentication-required');
  try{
    const verified=await jwtVerify(match[1],FIREBASE_JWKS,{algorithms:['RS256'],audience:env.FIREBASE_PROJECT_ID,issuer:`https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,clockTolerance:5});
    const claims=verified.payload as FirebaseClaims;
    if(!claims.sub||claims.sub.length>128||claims.email_verified!==true)throw new ApiError(403,'verified-email-required');
    return claims;
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(401,'invalid-authentication')}
}

async function requireTurnstile(request:Request,env:WorkerEnv):Promise<void>{
  if(env.TURNSTILE_ENFORCE!=='true')return;
  if(!env.TURNSTILE_SECRET_KEY)throw new ApiError(503,'turnstile-not-configured');
  const token=request.headers.get('x-turnstile-token')||'';
  if(!token||token.length>2048)throw new ApiError(400,'turnstile-required');
  const form=new FormData();form.set('secret',env.TURNSTILE_SECRET_KEY);form.set('response',token);form.set('idempotency_key',crypto.randomUUID());
  const ip=request.headers.get('cf-connecting-ip');if(ip)form.set('remoteip',ip);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});
  if(!response.ok)throw new ApiError(502,'turnstile-unavailable');
  const result=await response.json<{success?:boolean;hostname?:string}>();
  if(result.success!==true)throw new ApiError(403,'turnstile-rejected');
  const expectedHosts=allowedOrigins(env).map(value=>new URL(value).hostname);
  if(result.hostname&&!expectedHosts.includes(result.hostname))throw new ApiError(403,'turnstile-hostname-rejected');
}

async function upsertUser(db:D1Database,userId:string):Promise<void>{
  await db.prepare(`INSERT INTO users (id,status,created_at) VALUES (?,'active',?) ON CONFLICT(id) DO NOTHING`).bind(userId,Date.now()).run();
}
async function requireActiveUser(db:D1Database,userId:string):Promise<void>{
  const row=await db.prepare('SELECT status FROM users WHERE id=?').bind(userId).first<{status:string}>();
  if(!row)throw new ApiError(409,'bootstrap-required');
  if(row.status!=='active')throw new ApiError(403,'account-disabled');
}
async function entitlement(db:D1Database,userId:string,now:number):Promise<EntitlementRow|null>{
  return db.prepare(`SELECT plan,source,ends_at,created_at FROM entitlements
    WHERE user_id=? AND starts_at<=? AND (ends_at IS NULL OR ends_at>?)
    ORDER BY CASE plan WHEN 'pro_plus' THEN 3 WHEN 'pro' THEN 2 WHEN 'premium' THEN 1 ELSE 0 END DESC, created_at DESC LIMIT 1`)
    .bind(userId,now,now).first<EntitlementRow>();
}
function effectivePlan(row:EntitlementRow|null):Plan{return row&&row.plan in PLAN_LEVEL?row.plan:'free'}

function quotaWindow(now=Date.now()):{key:string;resetAt:number}{
  const local=new Date(now+3*60*60*1000);const year=local.getUTCFullYear(),month=local.getUTCMonth(),day=local.getUTCDate(),hour=local.getUTCHours();
  const windowDate=new Date(Date.UTC(year,month,hour<8?day-1:day));
  const key=`${windowDate.getUTCFullYear()}-${String(windowDate.getUTCMonth()+1).padStart(2,'0')}-${String(windowDate.getUTCDate()).padStart(2,'0')}`;
  const resetAt=Date.UTC(year,month,hour<8?day:day+1,5,0,0,0);
  return {key,resetAt};
}
async function quotaUsage(db:D1Database,userId:string,key:string):Promise<{questions:number;rewardedAds:number;aiQuestions:number}>{
  const result=await db.prepare(`SELECT feature,used FROM daily_quotas WHERE user_id=? AND window_key=? AND feature IN ('questions','rewarded_ads','ai_questions')`).bind(userId,key).all<QuotaRow>();
  const values={questions:0,rewardedAds:0,aiQuestions:0};
  for(const row of result.results||[]){if(row.feature==='questions')values.questions=row.used;else if(row.feature==='rewarded_ads')values.rewardedAds=row.used;else if(row.feature==='ai_questions')values.aiQuestions=row.used}
  return values;
}
async function sessionSnapshot(db:D1Database,userId:string):Promise<object>{
  const serverAt=Date.now(),window=quotaWindow(serverAt);const row=await entitlement(db,userId,serverAt);const plan=effectivePlan(row);const usage=await quotaUsage(db,userId,window.key);
  return {ok:true,authority:'ARENA-SERVER-AUTHORITY-V1',serverAt,localDate:window.key,resetAt:window.resetAt,plan,entitlement:{source:row?.source||'system',validUntil:row?.ends_at||null,revision:row?.created_at||1},usage,limits:PLAN_LIMITS[plan]};
}

async function storedRequest(db:D1Database,requestId:string,userId:string):Promise<StoredRequest|null>{return db.prepare('SELECT status,response_json FROM authority_requests WHERE request_id=? AND user_id=?').bind(requestId,userId).first<StoredRequest>()}
async function reserveQuestions(db:D1Database,userId:string,amount:number,requestId:string):Promise<object>{
  const now=Date.now(),window=quotaWindow(now),row=await entitlement(db,userId,now),plan=effectivePlan(row),limit=PLAN_LIMITS[plan].questions;
  const stored=await storedRequest(db,requestId,userId);
  if(stored?.status==='applied'&&stored.response_json)return JSON.parse(stored.response_json) as object;
  if(stored?.status==='rejected')throw new ApiError(429,'daily-question-limit');
  if(stored)throw new ApiError(409,'request-in-progress');
  try{
    await db.prepare(`INSERT INTO authority_requests (request_id,user_id,operation,amount,window_key,status,response_json,created_at,updated_at) VALUES (?,?,'questions.reserve',?,?,'pending',NULL,?,?)`).bind(requestId,userId,amount,window.key,now,now).run();
  }catch{
    const duplicate=await storedRequest(db,requestId,userId);
    if(duplicate?.status==='applied'&&duplicate.response_json)return JSON.parse(duplicate.response_json) as object;
    if(duplicate?.status==='rejected')throw new ApiError(429,'daily-question-limit');
    throw new ApiError(409,'request-in-progress');
  }
  const result=await db.prepare(`INSERT INTO daily_quotas (user_id,feature,window_key,used,limit_value,reset_at,updated_at)
    VALUES (?,'questions',?,?,?,?,?)
    ON CONFLICT(user_id,feature,window_key) DO UPDATE SET used=used+excluded.used,limit_value=excluded.limit_value,reset_at=excluded.reset_at,updated_at=excluded.updated_at
    WHERE used+excluded.used<=excluded.limit_value RETURNING used`).bind(userId,window.key,amount,limit,window.resetAt,now).first<{used:number}>();
  if(!result){await db.prepare(`UPDATE authority_requests SET status='rejected',response_json=?,updated_at=? WHERE request_id=? AND user_id=? AND status='pending'`).bind(JSON.stringify({ok:false,error:'daily-question-limit'}),Date.now(),requestId,userId).run();throw new ApiError(429,'daily-question-limit')}
  const response={ok:true,authority:'ARENA-SERVER-AUTHORITY-V1',serverAt:now,localDate:window.key,resetAt:window.resetAt,plan,reserved:amount,usage:{questions:result.used},limits:PLAN_LIMITS[plan]};
  await db.prepare(`UPDATE authority_requests SET status='applied',response_json=?,updated_at=? WHERE request_id=? AND user_id=? AND status='pending'`).bind(JSON.stringify(response),Date.now(),requestId,userId).run();
  return response;
}

async function readJson(request:Request):Promise<Record<string,unknown>>{
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))throw new ApiError(415,'json-required');
  if(Number(request.headers.get('content-length')||0)>4096)throw new ApiError(413,'payload-too-large');
  try{const body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('shape');return body as Record<string,unknown>}catch{throw new ApiError(400,'invalid-json')}
}
function integerInRange(value:unknown,min:number,max:number,code:string):number{const number=Number(value);if(!Number.isInteger(number)||number<min||number>max)throw new ApiError(400,code);return number}
function validIdempotencyKey(value:unknown):string{const key=String(value||'');if(!/^[A-Za-z0-9_-]{20,100}$/.test(key))throw new ApiError(400,'invalid-idempotency-key');return key}
