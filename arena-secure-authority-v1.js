(() => {
  'use strict';
  const VERSION='ARENA-SERVER-AUTHORITY-CLIENT-V1';
  const LEVELS=Object.freeze({free:0,premium:1,pro:2,pro_plus:3});
  const config=window.ARENA_CORE_CONFIG?.security||{};
  let tokenProvider=null,turnstileProvider=null,snapshot=null,refreshPromise=null;
  function validPlan(value){return Object.prototype.hasOwnProperty.call(LEVELS,value)?value:'free'}
  function verified(value=snapshot){return !!value&&value.ok===true&&value.authority==='ARENA-SERVER-AUTHORITY-V1'&&Number.isFinite(Number(value.serverAt))}
  function current(){return verified()?validPlan(snapshot.plan):'free'}
  function atLeast(plan){return LEVELS[current()]>=LEVELS[validPlan(plan)]}
  function configured(){return typeof config.apiBaseUrl==='string'&&/^https:\/\//.test(config.apiBaseUrl)}
  function authenticated(){return typeof tokenProvider==='function'}
  function setTokenProvider(provider){if(provider!==null&&typeof provider!=='function')throw new TypeError('token provider must be a function');tokenProvider=provider;snapshot=null}
  function setTurnstileProvider(provider){if(provider!==null&&typeof provider!=='function')throw new TypeError('turnstile provider must be a function');turnstileProvider=provider}
  async function request(path,options={}){
    if(!configured())throw new Error('authority-not-configured');
    if(!tokenProvider)throw new Error('authentication-required');
    const token=await tokenProvider();if(!token)throw new Error('authentication-required');
    const headers={'authorization':`Bearer ${token}`,'content-type':'application/json',...(options.headers||{})};
    const response=await fetch(config.apiBaseUrl.replace(/\/$/,'')+path,{...options,headers,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    const body=await response.json().catch(()=>({ok:false,error:'invalid-server-response'}));
    if(!response.ok){const error=new Error(body.error||`authority-${response.status}`);error.status=response.status;error.code=body.error;throw error}
    return body;
  }
  function accept(value){snapshot=Object.freeze({...value,plan:validPlan(value.plan),receivedPerfAt:performance.now()});window.dispatchEvent(new CustomEvent('arena:authority-updated',{detail:{plan:current(),serverAt:snapshot.serverAt}}));return snapshot}
  async function refresh(){if(refreshPromise)return refreshPromise;refreshPromise=request('/v1/session').then(accept).finally(()=>{refreshPromise=null});return refreshPromise}
  async function bootstrap(){const turnstile=turnstileProvider?await turnstileProvider():'';return accept(await request('/v1/session/bootstrap',{method:'POST',headers:turnstile?{'x-turnstile-token':turnstile}:{},body:'{}'}))}
  function randomKey(){const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('')}
  async function reserveQuestions(count){
    if(!configured()||!authenticated())return {ok:true,mode:'guest-local'};
    const value=await request('/v1/usage/questions/reserve',{method:'POST',body:JSON.stringify({count,idempotencyKey:randomKey()})});
    if(value.ok)accept({...snapshot,...value,authority:'ARENA-SERVER-AUTHORITY-V1'});
    return value;
  }
  Object.defineProperty(window,'ArenaSecureAuthority',{value:Object.freeze({VERSION,configured,authenticated,verified,current,atLeast,setTokenProvider,setTurnstileProvider,refresh,bootstrap,reserveQuestions,snapshot:()=>snapshot}),configurable:false,writable:false});
  window.dispatchEvent(new CustomEvent('arena:authority-ready',{detail:{version:VERSION,configured:configured()}}));
})();
