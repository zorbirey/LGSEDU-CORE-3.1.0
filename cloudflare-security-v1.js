(() => {
  'use strict';
  const STANDARD='ARENA-SECURITY-CORE-V1',SESSION_TTL_MS=15*60*1000;
  let endpoint='',sessionToken='',expiresAt=0,entitlement=Object.freeze({plan:'free',authority:'server',verified:false}),lastQuota=null;
  const memoryOnly=true;
  function configure(options={}){endpoint=String(options.endpoint||'').replace(/\/$/,'');return !!endpoint}
  function clear(){sessionToken='';expiresAt=0;entitlement=Object.freeze({plan:'free',authority:'server',verified:false});lastQuota=null}
  function active(){return !!sessionToken&&expiresAt>Date.now()+5000}
  async function request(path,options={}){if(!endpoint)throw new Error('security_endpoint_not_configured');if(!active())throw new Error('verified_session_required');const response=await fetch(endpoint+path,{...options,cache:'no-store',headers:{'content-type':'application/json','authorization':'Bearer '+sessionToken,...options.headers}});const body=await response.json().catch(()=>({error:'invalid_security_response'}));if(!response.ok)throw Object.assign(new Error(body.error||'security_request_failed'),{status:response.status,body});return body}
  async function bootstrap({turnstileToken,deviceId}){clear();if(!endpoint)throw new Error('security_endpoint_not_configured');const response=await fetch(endpoint+'/v1/session',{method:'POST',cache:'no-store',headers:{'content-type':'application/json','x-turnstile-token':turnstileToken},body:JSON.stringify({deviceId})});const body=await response.json().catch(()=>({error:'invalid_security_response'}));if(!response.ok)throw new Error(body.error||'session_bootstrap_failed');const parsedExpiry=Date.parse(body.expiresAt);if(!body.sessionToken||!Number.isFinite(parsedExpiry)||parsedExpiry-Date.now()>SESSION_TTL_MS+60000)throw new Error('invalid_session_contract');sessionToken=body.sessionToken;expiresAt=parsedExpiry;entitlement=Object.freeze({plan:body.plan||'free',authority:'server',verified:true});return {expiresAt:body.expiresAt,plan:entitlement.plan}}
  async function quota(){try{const result=await request('/v1/quota');lastQuota=result.quota;return result}catch(error){lastQuota=null;throw error}}
  async function consume(feature){return request('/v1/quota/consume',{method:'POST',body:JSON.stringify({feature})})}
  function atLeast(plan){const levels={free:0,premium:1,pro:2,pro_plus:3};return active()&&entitlement.verified&&(levels[entitlement.plan]??0)>=(levels[plan]??999)}
  window.ArenaSecurityV1=Object.freeze({standard:STANDARD,status:()=>endpoint?'configured-session-required':'not-configured',configure,bootstrap,quota,consume,atLeast,clear,active,entitlement:()=>entitlement,lastQuota:()=>lastQuota,storage:'memory-only',memoryOnly});
})();
