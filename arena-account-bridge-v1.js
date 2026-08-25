(() => {
  'use strict';

  const VERSION='ARENA-ACCOUNT-BRIDGE-V1';
  const ENTRY_KEY='arenaAccountEntryV1';
  const config=window.ARENA_CORE_CONFIG?.identity||{};
  const authority=()=>window.ArenaSecureAuthority||null;
  let firebase=null,auth=null,currentUser=null,authResolved=false,authPromise=null;
  let overlay=null,card=null,continuation=null,view='choice',busy=false;
  let turnstilePromise=null,turnstileWidget=null,turnstileToken='';

  const text=Object.freeze({
    title:'Arena yolculu\u011funa nas\u0131l ba\u015flamak istersin?',
    subtitle:'Hesab\u0131n ileride cihazlar aras\u0131 ge\u00e7i\u015f ve Premium haklar\u0131n g\u00fcvenli do\u011frulanmas\u0131 i\u00e7in kullan\u0131l\u0131r.',
    create:'HESAP OLU\u015eTUR',
    login:'ZATEN HESABIM VAR',
    guest:'\u015e\u0130MD\u0130 M\u0130SAF\u0130R OLARAK DEVAM ET'
  });

  function esc(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
  function setMessage(message,type='error'){const target=document.getElementById('arenaAccountMessage');if(!target)return;target.textContent=message||'';target.dataset.type=type}
  function setBusy(value){busy=!!value;card?.querySelectorAll('button,input').forEach(element=>{if(element.dataset.allowBusy!=='1')element.disabled=busy});card?.setAttribute('aria-busy',String(busy))}
  function remember(mode){try{localStorage.setItem(ENTRY_KEY,mode)}catch{}}
  function remembered(){try{return localStorage.getItem(ENTRY_KEY)||''}catch{return ''}}
  function userVerified(user=currentUser){return !!user&&user.emailVerified===true}
  function requiresFirstUse(){return !remembered()}
  function emitIdentity(){window.dispatchEvent(new CustomEvent('arena:identity-changed',{detail:{mode:userVerified()?'account':'guest',email:userVerified()?currentUser.email||'':'',verified:userVerified()}}))}

  function ensureOverlay(){
    if(overlay)return;
    overlay=document.createElement('div');overlay.id='arenaAccountOverlay';overlay.className='arena-account-overlay hidden';
    overlay.innerHTML='<section id="arenaAccountCard" class="arena-account-card" role="dialog" aria-modal="true" aria-labelledby="arenaAccountTitle"></section>';
    document.body.appendChild(overlay);card=document.getElementById('arenaAccountCard');
    overlay.addEventListener('click',event=>{if(event.target===overlay&&view==='settings')close()});
  }
  function show(){ensureOverlay();overlay.classList.remove('hidden');document.documentElement.classList.add('arena-account-open')}
  function close(){overlay?.classList.add('hidden');document.documentElement.classList.remove('arena-account-open');removeTurnstile()}
  function closeAndContinue(){const next=continuation;continuation=null;close();if(typeof next==='function')next()}
  function hero(){return '<div class="arena-account-hero" aria-hidden="true"></div>'}
  function shell(body,closable=false){return `${hero()}<div class="arena-account-shade"></div><div class="arena-account-content">${closable?'<button class="arena-account-close" data-account-action="close" aria-label="Kapat">&times;</button>':''}<div class="arena-account-brand"><span>LGS 2027</span><b>ARENA</b></div>${body}</div>`}

  function renderLoading(){
    view='loading';show();card.innerHTML=shell('<div class="arena-account-copy"><span>G\u00dcVENL\u0130 G\u0130R\u0130\u015e</span><h1 id="arenaAccountTitle">Hesab\u0131n kontrol ediliyor</h1><p>L\u00fctfen k\u0131sa bir s\u00fcre bekle.</p></div><div class="arena-account-loader" aria-label="Y\u00fckleniyor"></div>');
  }
  function renderChoice(closable=false){
    view='choice';show();card.innerHTML=shell(`<div class="arena-account-copy"><span>\u0130LK KULLANIM</span><h1 id="arenaAccountTitle">${text.title}</h1><p>${text.subtitle}</p></div><div class="arena-account-actions"><button class="primary" data-account-action="create">${text.create}</button><button class="secondary" data-account-action="login">${text.login}</button><button class="guest" data-account-action="guest">${text.guest}</button></div><p id="arenaAccountMessage" class="arena-account-message" aria-live="polite"></p>`,closable);
    bindActions();
  }
  function passwordRules(){return '<ul class="arena-password-rules"><li>12-64 karakter</li><li>T\u00fcrk\u00e7e karakter kullanma</li><li>B\u00fcy\u00fck ve k\u00fc\u00e7\u00fck harf</li><li>Rakam ve \u00f6zel i\u015faret</li></ul>'}
  function renderForm(mode){
    view=mode;show();const creating=mode==='create';
    card.innerHTML=shell(`<button class="arena-account-back" data-account-action="back" aria-label="Geri">&lsaquo;</button><div class="arena-account-copy compact"><span>${creating?'YEN\u0130 HESAP':'G\u00dcVENL\u0130 G\u0130\u015e'}</span><h1 id="arenaAccountTitle">${creating?'Arena hesab\u0131n\u0131 olu\u015ftur':'Hesab\u0131na giri\u015f yap'}</h1><p>${creating?'Do\u011frulama ba\u011flant\u0131s\u0131 e-posta adresine g\u00f6nderilecek.':'Kay\u0131tl\u0131 e-posta adresin ve parolanla devam et.'}</p></div><form id="arenaAccountForm" class="arena-account-form" novalidate><label><span>E-posta</span><input id="arenaAccountEmail" type="email" inputmode="email" autocomplete="email" maxlength="254" required></label><label><span>Parola</span><input id="arenaAccountPassword" type="password" autocomplete="${creating?'new-password':'current-password'}" minlength="12" maxlength="64" required></label>${creating?passwordRules():''}<div id="arenaTurnstile" class="arena-turnstile" aria-label="G\u00fcvenlik do\u011frulamas\u0131"></div><p id="arenaAccountMessage" class="arena-account-message" aria-live="polite"></p><button class="primary" type="submit">${creating?'HESABI OLU\u015eTUR':'G\u0130R\u0130\u015e YAP'}</button>${creating?'':'<button class="link" type="button" data-account-action="reset">Parolam\u0131 unuttum</button>'}</form>`);
    bindActions();document.getElementById('arenaAccountForm').addEventListener('submit',event=>{event.preventDefault();if(!busy)(creating?createAccount():login())});
    renderTurnstile().catch(()=>setMessage('G\u00fcvenlik kontrol\u00fc y\u00fcklenemedi. Ba\u011flant\u0131n\u0131 kontrol et.'));
  }
  function planLabel(){const plan=authority()?.current?.()||'free';return ({premium:'Arena Premium',pro:'Arena Pro',pro_plus:'Arena Pro+'})[plan]||'\u00dccretsiz'}
  function renderSettings(){
    view='settings';show();const signed=userVerified(),email=signed?esc(currentUser.email||''):'';
    card.innerHTML=shell(`<div class="arena-account-copy compact"><span>HESAP VE AYARLAR</span><h1 id="arenaAccountTitle">${signed?'Hesab\u0131n ba\u011fl\u0131':'Misafir kullan\u0131m'}</h1><p>${signed?email+'<br><b>'+planLabel()+'</b>':'\u0130lerlemen bu cihazda korunur. Hesap olu\u015fturarak sunucu do\u011frulamas\u0131n\u0131 a\u00e7abilirsin.'}</p></div><div class="arena-account-actions settings">${signed?'<button class="secondary" data-account-action="profile">\u00d6\u011eRENC\u0130 PROF\u0130L\u0130</button><button class="danger" data-account-action="logout">HESAPTAN \u00c7IK</button>':'<button class="primary" data-account-action="create">HESAP OLU\u015eTUR</button><button class="secondary" data-account-action="login">ZATEN HESABIM VAR</button><button class="guest" data-account-action="profile">\u00d6\u011eRENC\u0130 PROF\u0130L\u0130</button>'}</div><p id="arenaAccountMessage" class="arena-account-message" aria-live="polite"></p>`,true);
    bindActions();
  }

  function bindActions(){
    card.querySelectorAll('[data-account-action]').forEach(button=>button.addEventListener('click',async()=>{
      const action=button.dataset.accountAction;
      if(action==='create')renderForm('create');
      else if(action==='login')renderForm('login');
      else if(action==='guest'){authority()?.setTokenProvider?.(null);remember('guest');emitIdentity();closeAndContinue()}
      else if(action==='back')renderChoice(continuation===null);
      else if(action==='close')close();
      else if(action==='profile'){close();window.LgsArenaParent?.openProfile?.()}
      else if(action==='logout')await logout();
      else if(action==='reset')await resetPassword();
    }));
  }

  async function ensureFirebase(){
    if(authPromise)return authPromise;
    authPromise=(async()=>{
      if(!config.firebase?.apiKey)throw new Error('firebase-config-missing');
      const version=String(config.firebaseSdkVersion||'12.18.0').replace(/[^0-9.]/g,'');
      const appModule=await import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`);
      const authModule=await import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`);
      const app=appModule.getApps().length?appModule.getApps()[0]:appModule.initializeApp(config.firebase);
      auth=authModule.getAuth(app);await authModule.setPersistence(auth,authModule.browserLocalPersistence);
      firebase={...authModule,app};
      await new Promise(resolve=>{
        let first=true;
        authModule.onAuthStateChanged(auth,async user=>{
          currentUser=user||null;authResolved=true;
          if(userVerified(user)){
            authority()?.setTokenProvider?.(()=>user.getIdToken());
            remember('account');
            await authority()?.refresh?.().catch(()=>{});
          }else authority()?.setTokenProvider?.(null);
          emitIdentity();if(first){first=false;resolve()}
        },()=>{authResolved=true;if(first){first=false;resolve()}});
      });
      return auth;
    })();
    return authPromise;
  }

  function bindVerifiedUser(user){currentUser=user;authority()?.setTokenProvider?.(()=>user.getIdToken());authority()?.setTurnstileProvider?.(()=>turnstileToken)}
  function validatePassword(password){
    const rules=config.passwordPolicy||{};const errors=[];
    if(password.length<(rules.minLength||12)||password.length>(rules.maxLength||64))errors.push('Parola 12-64 karakter olmal\u0131.');
    if(rules.asciiOnly&&/[^\x20-\x7E]/.test(password))errors.push('Parolada T\u00fcrk\u00e7e veya ASCII d\u0131\u015f\u0131 karakter kullanma.');
    if(rules.upper&&!/[A-Z]/.test(password))errors.push('En az bir b\u00fcy\u00fck harf kullan.');
    if(rules.lower&&!/[a-z]/.test(password))errors.push('En az bir k\u00fc\u00e7\u00fck harf kullan.');
    if(rules.number&&!/[0-9]/.test(password))errors.push('En az bir rakam kullan.');
    if(rules.special&&!/[!-/:-@[-`{-~]/.test(password))errors.push('En az bir \u00f6zel i\u015faret kullan.');
    return errors;
  }
  function credentials(){
    const email=(document.getElementById('arenaAccountEmail')?.value||'').trim().toLowerCase();
    const password=document.getElementById('arenaAccountPassword')?.value||'';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('E-posta adresini kontrol et.');
    return {email,password};
  }
  function friendly(error){
    const code=error?.code||error?.message||'';
    if(code.includes('invalid-credential'))return 'E-posta veya parola do\u011fru de\u011fil.';
    if(code.includes('email-already-in-use'))return 'Bu e-posta adresiyle daha \u00f6nce hesap olu\u015fturulmu\u015f.';
    if(code.includes('invalid-email'))return 'E-posta adresini kontrol et.';
    if(code.includes('too-many-requests'))return '\u00c7ok fazla deneme yap\u0131ld\u0131. Bir s\u00fcre sonra yeniden dene.';
    if(code.includes('network-request-failed'))return '\u0130nternet ba\u011flant\u0131s\u0131 kurulamad\u0131.';
    if(code.includes('verified-email-required'))return 'Devam etmeden \u00f6nce e-posta adresini do\u011frula.';
    if(code.includes('turnstile'))return 'G\u00fcvenlik kontrol\u00fc tamamlanamad\u0131. Kutuyu yenileyip tekrar dene.';
    return String(error?.message||'\u0130\u015flem tamamlanamad\u0131.');
  }

  function loadTurnstile(){
    if(window.turnstile)return Promise.resolve(window.turnstile);
    if(turnstilePromise)return turnstilePromise;
    turnstilePromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;
      script.onload=()=>window.turnstile?resolve(window.turnstile):reject(new Error('turnstile-unavailable'));script.onerror=()=>reject(new Error('turnstile-unavailable'));document.head.appendChild(script);
    });return turnstilePromise;
  }
  async function renderTurnstile(){
    const api=await loadTurnstile();const target=document.getElementById('arenaTurnstile');if(!target)return;
    removeTurnstile();turnstileToken='';
    turnstileWidget=api.render(target,{sitekey:config.turnstileSiteKey,theme:'dark',size:'flexible',appearance:'always',action:view==='create'?'account_create':'account_login',callback:token=>{turnstileToken=token;setMessage('', 'info')},'expired-callback':()=>{turnstileToken='';setMessage('G\u00fcvenlik kontrol\u00fc s\u00fcresi doldu; yeniden tamamla.')},'error-callback':()=>{turnstileToken='';setMessage('G\u00fcvenlik kontrol\u00fc tamamlanamad\u0131.')}});
  }
  function removeTurnstile(){if(turnstileWidget!==null&&window.turnstile){try{window.turnstile.remove(turnstileWidget)}catch{}}turnstileWidget=null;turnstileToken=''}
  function requireTurnstileToken(){if(!turnstileToken)throw new Error('turnstile-required');return turnstileToken}
  async function verifyPublicTurnstile(){
    const base=window.ARENA_CORE_CONFIG?.security?.apiBaseUrl;if(!base)throw new Error('turnstile-server-missing');
    const response=await fetch(base.replace(/\/$/,'')+'/v1/security/turnstile/verify',{method:'POST',headers:{'content-type':'application/json','x-turnstile-token':requireTurnstileToken()},body:'{}',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'turnstile-rejected');return body;
  }

  async function createAccount(){
    setMessage('');setBusy(true);
    try{
      await ensureFirebase();const {email,password}=credentials();const errors=validatePassword(password);if(errors.length)throw new Error(errors.join(' '));
      await verifyPublicTurnstile();removeTurnstile();
      const credential=await firebase.createUserWithEmailAndPassword(auth,email,password);
      await firebase.sendEmailVerification(credential.user,{url:location.origin+location.pathname,handleCodeInApp:false});
      await firebase.signOut(auth);remember('');
      renderForm('login');setMessage('Do\u011frulama e-postas\u0131 g\u00f6nderildi. Ba\u011flant\u0131y\u0131 a\u00e7t\u0131ktan sonra giri\u015f yap. Spam klas\u00f6r\u00fcn\u00fc de kontrol et.','success');
    }catch(error){setMessage(friendly(error));renderTurnstile().catch(()=>{})}
    finally{setBusy(false)}
  }
  async function login(){
    setMessage('');setBusy(true);
    try{
      await ensureFirebase();const {email,password}=credentials();requireTurnstileToken();
      const credential=await firebase.signInWithEmailAndPassword(auth,email,password);await credential.user.reload();
      if(!credential.user.emailVerified){await firebase.signOut(auth);throw new Error('verified-email-required')}
      await credential.user.getIdToken(true);bindVerifiedUser(credential.user);
      try{await authority()?.bootstrap?.()}finally{removeTurnstile()}
      remember('account');emitIdentity();closeAndContinue();
    }catch(error){setMessage(friendly(error));renderTurnstile().catch(()=>{})}
    finally{setBusy(false)}
  }
  async function resetPassword(){
    setMessage('');setBusy(true);
    try{
      await ensureFirebase();const email=(document.getElementById('arenaAccountEmail')?.value||'').trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Parola s\u0131f\u0131rlama i\u00e7in e-posta adresini yaz.');
      await verifyPublicTurnstile();removeTurnstile();await firebase.sendPasswordResetEmail(auth,email,{url:location.origin+location.pathname,handleCodeInApp:false});
      setMessage('Parola s\u0131f\u0131rlama e-postas\u0131 g\u00f6nderildi.','success');renderTurnstile().catch(()=>{});
    }catch(error){setMessage(friendly(error));renderTurnstile().catch(()=>{})}
    finally{setBusy(false)}
  }
  async function logout(){
    setBusy(true);try{await ensureFirebase();await firebase.signOut(auth);authority()?.setTokenProvider?.(null);remember('guest');currentUser=null;emitIdentity();renderSettings()}catch(error){setMessage(friendly(error))}finally{setBusy(false)}
  }

  function openFirstUse(options={}){
    continuation=typeof options.onContinue==='function'?options.onContinue:null;renderLoading();
    ensureFirebase().then(()=>{
      if(userVerified()){remember('account');closeAndContinue();return}
      renderChoice(false);
    }).catch(()=>renderChoice(false));
  }
  function openSettings(){continuation=null;renderLoading();ensureFirebase().finally(renderSettings)}
  function openAccount(){continuation=null;renderForm('login')}

  window.ArenaAccountBridge=Object.freeze({VERSION,requiresFirstUse,openFirstUse,openSettings,openAccount,ready:()=>ensureFirebase(),currentUser:()=>userVerified()?currentUser:null,mode:()=>userVerified()?'account':'guest'});
  ensureFirebase().catch(()=>{authResolved=true;emitIdentity()});
  window.dispatchEvent(new CustomEvent('arena:account-bridge-ready',{detail:{version:VERSION}}));
})();
