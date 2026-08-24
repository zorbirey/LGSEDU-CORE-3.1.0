(() => {
  'use strict';
  const KEY='lgsArenaPwaV02',PROFILE_KEY='lgsArenaProfileV41';
  const SUBJECTS=['Türkçe','Matematik','Fen Bilimleri','İnkılap Tarihi','Din Kültürü','İngilizce'];
  const LEVELS=['Kolay','Orta','Zor','Efsane'];
  const $=s=>document.querySelector(s),byId=id=>document.getElementById(id);
  function readState(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
  function writeState(state){localStorage.setItem(KEY,JSON.stringify(state))}
  function premium(){if(window.LgsArenaPlans)return window.LgsArenaPlans.atLeast('premium');return false}
  function openMembership(){
    const cover=byId('cover'),shell=byId('shell');
    cover?.classList.remove('active');cover?.classList.add('hidden');shell?.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('lgsarena:open-membership',{detail:{origin:'parent'}}));
  }
  function readProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')}catch{return {}}}
  function writeProfile(profile){localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));window.dispatchEvent(new CustomEvent('arena:profile-updated',{detail:profile}))}
  function ensurePairCode(profile){if(!/^\d{6}$/.test(String(profile.parentPairCode||''))){profile.parentPairCode=String(Math.floor(100000+Math.random()*900000));writeProfile(profile)}return profile.parentPairCode}
  function ensureReferralCode(profile){if(!/^\d{6}$/.test(String(profile.referralCode||''))){profile.referralCode=String(Math.floor(100000+Math.random()*900000));writeProfile(profile)}return profile.referralCode}
  function today(){return new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'})}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function open(id){byId(id)?.classList.remove('hidden')}
  function close(id){byId(id)?.classList.add('hidden')}
  function nameOf(profile){return (profile.studentName||'Öğrenci').trim()||'Öğrenci'}
  function notify(message){const toast=byId('toast');if(!toast)return;toast.textContent=message;toast.classList.remove('hidden');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.add('hidden'),4200)}

  function referralCount(state=readState()){return Math.min(3,Array.isArray(state.referralFriendIds)?state.referralFriendIds.length:0)}
  function applyReferralReward(friendId,verification={}){if(verification.verifiedByServer!==true)return {ok:false,reason:'server-verification-required'};
    const id=String(friendId||'').trim();if(!id)return {ok:false,reason:'missing-friend'};
    const state=readState(),ids=Array.isArray(state.referralFriendIds)?state.referralFriendIds.slice(0,3):[];
    if(ids.includes(id))return {ok:false,reason:'duplicate',count:ids.length};
    if(ids.length>=3)return {ok:false,reason:'complete',count:3};
    const rewardDays=[1,2,3][ids.length];ids.push(id);state.referralFriendIds=ids;
    const current=Date.parse(state.freePremiumUntil||''),base=Number.isFinite(current)&&current>Date.now()?current:Date.now();
    state.freePremiumUntil=new Date(base+rewardDays*86400000).toISOString();state.freePremiumVerifiedByServer=true;writeState(state);
    window.dispatchEvent(new CustomEvent('lgsarena:access-updated',{detail:{source:'referral',rewardDays,count:ids.length}}));
    window.dispatchEvent(new CustomEvent('lgsarena:premium-changed',{detail:{premium:true,source:'referral'}}));
    configureParentEntry();return {ok:true,rewardDays,count:ids.length,until:state.freePremiumUntil};
  }
  function captureReferral(){
    let code='';try{code=new URL(location.href).searchParams.get('ref')||''}catch{}
    if(!/^\d{6}$/.test(code))return;
    const profile=readProfile(),own=ensureReferralCode(profile);if(code===own||profile.referredBy)return;
    profile.referredBy=code;profile.referralCapturedAt=new Date().toISOString();writeProfile(profile);
  }
  async function shareReferral(profile){
    const code=ensureReferralCode(profile),url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('ref',code);
    const data={title:'LGS 2027 Arena',text:'LGS 2027 Arena ile birlikte çalışalım. Davet kodum: '+code,url:url.toString()};
    try{if(navigator.share){await navigator.share(data);return}await navigator.clipboard.writeText(`${data.text} ${data.url}`);notify('Davet bağlantısı panoya kopyalandı.')}catch(error){if(error?.name!=='AbortError')notify('Davet bağlantısı kopyalanamadı.')}
  }

  function deviceInfo(){
    const ua=navigator.userAgent||'',android=/Android/i.test(ua),match=ua.match(/Android\s([0-9]+)(?:\.([0-9]+))?/i),androidMajor=match?Number(match[1]):null;
    const tablet=android?(!/Mobile/i.test(ua)||Math.min(screen.width||innerWidth,screen.height||innerHeight)>=600):Math.min(innerWidth||0,innerHeight||0)>=600;
    return {android,androidMajor,tablet,supported:!android||androidMajor===null||androidMajor>=10,recommended:!android||androidMajor===null||androidMajor>=12,label:android?(androidMajor?`Android ${androidMajor}`:'Android'):'Android dışı ortam'};
  }
  function installCompatibilityLayer(){
    const info=deviceInfo(),root=document.documentElement;root.classList.toggle('arena-tablet',info.tablet);root.classList.toggle('arena-phone',!info.tablet);root.classList.toggle('arena-android',info.android);
    if(!byId('androidCompatV46Style')){const style=document.createElement('style');style.id='androidCompatV46Style';style.textContent=`
      html.arena-tablet .page-host{max-width:1180px;width:100%;margin:0 auto}
      html.arena-tablet .page{padding-left:clamp(18px,3vw,38px)!important;padding-right:clamp(18px,3vw,38px)!important}
      html.arena-tablet .arena-page{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);grid-auto-rows:min-content;gap:14px 18px;align-content:start}
      html.arena-tablet .arena-hero-card{grid-column:1/-1;min-height:300px;max-height:42vh}
      html.arena-tablet .home-progress-card{grid-column:1/2}html.arena-tablet .arena-bottom-row{grid-column:2/3;align-self:stretch;display:grid!important;grid-template-columns:1fr!important;gap:12px!important}
      html.arena-tablet .subject-cards{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-template-rows:repeat(3,minmax(0,1fr))!important;gap:12px!important}
      html.arena-tablet .subject-picker{grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-rows:repeat(2,minmax(0,1fr))!important;gap:12px!important}
      html.arena-tablet .zeus-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}html.arena-tablet .zeus-notes-action{grid-column:1/-1!important}
      html.arena-tablet .quiz-view{max-width:900px;margin:0 auto}html.arena-tablet .option-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      html.arena-tablet .global-zeus-watermark{width:min(64vw,620px)!important;max-height:74%!important}html.arena-tablet .pp-card{width:min(92vw,760px)!important}
      html.arena-tablet .pp-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}html.arena-tablet .pp-stat.wide{grid-column:1/-1}
      html.arena-tablet .bottom-nav{max-width:900px;left:50%!important;right:auto!important;transform:translateX(-50%);width:calc(100% - 32px);border-radius:18px 18px 0 0}
      .pp-system{margin:12px 0;padding:12px;border-radius:13px;background:#06182bcc;border:1px solid #ffffff14}.pp-system h3{margin:0 0 8px;font:700 13px Georgia,serif;color:#f5d88e}
      .pp-system-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.pp-system-grid div{background:#03101ecc;border:1px solid #ffffff10;border-radius:9px;padding:8px}
      .pp-system-grid span{display:block;color:#8297ad;font-size:8px}.pp-system-grid b{display:block;margin-top:2px;color:#fff;font-size:11px}.pp-system-status{margin:8px 0 0;font-size:9px;line-height:1.4;color:#a9bfd5}.pp-system-status.good{color:#8fe7b3}.pp-system-status.warn{color:#ffd58a}.pp-system-status.bad{color:#ff9a9a}
      @media(max-width:767px){.pp-system-grid{grid-template-columns:1fr}.arena-tablet .arena-page{display:block}}
    `;document.head.appendChild(style)}
    if(info.android&&info.androidMajor!==null&&info.androidMajor<10&&!sessionStorage.getItem('arenaAndroidCompatWarned')){sessionStorage.setItem('arenaAndroidCompatWarned','1');setTimeout(()=>notify('Bu cihaz Android 10 altı. LGS Arena için Android 10 veya üzeri gereklidir.'),800)}
    window.LgsArenaDevice={...info,minAndroid:10,recommendedAndroid:12,targetAndroid:16};
  }

  function metrics(state){
    const rows=Array.isArray(state.history)?state.history:[],normal=rows.filter(r=>!r.assisted),answered=normal.filter(r=>r.selected!==null&&r.selected!==undefined),correct=answered.filter(r=>r.correct).length,wrong=Math.max(0,answered.length-correct),blank=normal.filter(r=>r.selected===null||r.selected===undefined).length,net=correct-wrong/3,accuracy=answered.length?Math.round(correct/answered.length*100):0,daily=(state.daily&&state.daily.date===today())?Number(state.daily.count||0):0;
    const perSubject=SUBJECTS.map(subject=>{const r=normal.filter(x=>x.subject===subject),a=r.filter(x=>x.selected!==null&&x.selected!==undefined),c=a.filter(x=>x.correct).length,w=Math.max(0,a.length-c);return {subject,n:r.length,answered:a.length,correct:c,wrong:w,net:c-w/3,accuracy:a.length?Math.round(c/a.length*100):0}}),active=perSubject.filter(x=>x.answered>0),strong=active.length?[...active].sort((a,b)=>b.accuracy-a.accuracy)[0]:null,weak=active.length?[...active].sort((a,b)=>a.accuracy-b.accuracy)[0]:null;
    const topics={};normal.filter(r=>r.selected!==null&&r.selected!==undefined).forEach(r=>{const k=r.topic||'Konu';topics[k]??={n:0,c:0};topics[k].n++;if(r.correct)topics[k].c++});
    const weakTopics=Object.entries(topics).map(([topic,v])=>({topic,pct:Math.round(v.c/v.n*100),n:v.n})).sort((a,b)=>a.pct-b.pct).slice(0,4),adaptive=state.adaptive||{},latestExam=Array.isArray(state.examHistory)&&state.examHistory.length?state.examHistory[state.examHistory.length-1]:null,level=Number.isFinite(Number(adaptive.level))?Number(adaptive.level):1;
    return {rows,correct,wrong,blank,net,accuracy,daily,perSubject,strong,weak,weakTopics,studyMinutes:Math.round(rows.length*1.5),route:adaptive.route||'Dengeli Kazanım + Yeni Nesil',difficulty:adaptive.levelName||LEVELS[level]||'Orta',adaptiveReason:adaptive.reason||'Henüz yeterli deneme verisi yok.',latestExam};
  }
  function coachText(state,m){const timeouts=Number(state.timeoutTerminations||0);if(!m.rows.length)return 'Henüz yeterli çözüm verisi yok. İlk hedef, düzenli ve kısa çalışma oturumlarıyla başlangıç verisi oluşturmak.';if(timeouts>0)return `Süre nedeniyle ${timeouts} test tamamlanamadı. Süre farkındalığını geliştiren kısa çalışmalarla ilerlemek uygun olabilir. ${m.adaptiveReason}`;if(m.weak&&m.weak.accuracy<55)return `${m.weak.subject} tarafında temel kazanımları kısa tekrarlarla güçlendirmek uygun görünüyor. ${m.adaptiveReason}`;return `Genel gidişat düzenli izleniyor. ${m.adaptiveReason}`}
  function panelHtml(state,profile){const m=metrics(state),code=ensurePairCode(profile),score=m.latestExam?.estimatedScore;return `<img class="pp-zeus-watermark" src="./assets/zeus.webp" alt="" aria-hidden="true"><div class="pp-head"><div><span>VELİ TAKİP · DEMO</span><h2>${esc(nameOf(profile))}</h2></div><button class="pp-close" data-pp-close="parentPanel" aria-label="Kapat">×</button></div><p class="pp-copy">Bu demo yalnızca bu cihazdaki öğrenci verilerini okur. Farklı cihaz erişimi için merkezî hesap sistemi gerekir.</p><div class="pp-grid"><div class="pp-stat"><span>Bugün çözülen</span><b>${m.daily} soru</b></div><div class="pp-stat wide"><span>Yanlışlar Defteri</span><b>${state.wrongNotebookLastVisitedAt?'Son giriş: '+new Date(state.wrongNotebookLastVisitedAt).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}):'Henüz girilmedi · veliye raporlandı'}</b></div><div class="pp-stat"><span>Genel çalışma neti</span><b>${m.net.toFixed(2)}</b></div><div class="pp-stat"><span>Son tahmini LGS puanı</span><b>${score!==undefined?Number(score).toFixed(1):'—'}</b></div><div class="pp-stat"><span>Başarı oranı</span><b>%${m.accuracy}</b></div><div class="pp-stat"><span>Doğru / Yanlış / Boş</span><b>${m.correct} / ${m.wrong} / ${m.blank}</b></div><div class="pp-stat"><span>Güçlü ders</span><b>${esc(m.strong?.subject||'—')}</b></div><div class="pp-stat"><span>Zayıf ders</span><b>${esc(m.weak?.subject||'—')}</b></div><div class="pp-stat"><span>Seri / XP</span><b>${Number(state.streak||0)} gün / ${Number(state.xp||0)}</b></div><div class="pp-stat"><span>Yaklaşık çalışma</span><b>${m.studyMinutes} dk</b></div><div class="pp-stat"><span>Öğrenme rotası</span><b>${esc(m.route)}</b></div><div class="pp-stat"><span>Adaptif seviye</span><b>${esc(m.difficulty)}</b></div><div class="pp-stat wide"><span>Seviye / rota gerekçesi</span><b>${esc(m.adaptiveReason)}</b></div></div><div class="pp-section"><h3>Ders bazında netler</h3><div class="pp-subjects">${m.perSubject.map(x=>`<div class="pp-subject"><span>${esc(x.subject)}</span><b>${x.net.toFixed(2)} net</b></div>`).join('')}</div></div><div class="pp-section"><h3>Yanlış yapılan konular</h3><div class="pp-weak">${m.weakTopics.length?m.weakTopics.map(x=>`<span>${esc(x.topic)} · %${x.pct}</span>`).join(''):'<span>Henüz yeterli veri yok</span>'}</div></div><div class="pp-section"><h3>Zeus Veli Koçluğu</h3><div class="pp-coach">${esc(coachText(state,m))}</div></div><div class="pp-code"><span>Bu cihazın eşleştirme kodu</span><b>${code}</b></div>`}

  function renderProfile(){
    const profile=readProfile(),code=ensurePairCode(profile),refCode=ensureReferralCode(profile),state=readState(),count=referralCount(state),d=deviceInfo(),statusClass=!d.supported?'bad':d.recommended?'good':'warn',statusText=!d.supported?'Bu cihaz minimum Android gereksiniminin altında.':d.recommended?'Bu cihaz önerilen sistem aralığında.':'Çalışması desteklenir; Android 12 veya üzeri önerilir.';
    byId('profileCard').innerHTML=`<div class="pp-head"><div><span>ÖĞRENCİ PROFİLİ</span><h2>${esc(nameOf(profile))}</h2></div><button class="pp-close" data-pp-close="profileOverlay" aria-label="Kapat">×</button></div><p class="pp-copy">Profil ve mevcut ilerleme bilgilerin yalnızca bu cihazda korunur.</p><label class="pp-field pp-profile-name"><span>Öğrenci adı</span><input id="studentNameInput" maxlength="32" value="${esc(profile.studentName||'')}" placeholder="Adını yaz"></label><div class="pp-code pp-profile-code"><span>Veli Takip için 6 haneli giriş kodu</span><b>${code}</b></div><section class="pp-referral"><h3>Arkadaşına Tavsiye Et</h3><p>Davet kodun <b>${refCode}</b>. Doğrulanan ilk üç arkadaşın için sırasıyla ücretsiz Premium günleri kazanırsın.</p><div class="pp-referral-grid"><div class="pp-referral-step ${count>=1?'unlocked':''}"><b>1. arkadaş</b><span>+1 gün</span></div><div class="pp-referral-step ${count>=2?'unlocked':''}"><b>2. arkadaş</b><span>+2 gün</span></div><div class="pp-referral-step ${count>=3?'unlocked':''}"><b>3. arkadaş</b><span>+3 gün</span></div></div><button id="shareReferral" class="pp-share">ARKADAŞINA TAVSİYE ET</button><p class="pp-referral-note">Ödül, davet edilen kişinin kurulumu ve ilk kullanımı hesap sistemi tarafından doğrulandığında tanımlanır. Bu prototipte sunucu doğrulaması henüz bağlı değildir.</p></section><section class="pp-system"><h3>Sistem Bilgisi</h3><div class="pp-system-grid"><div><span>Minimum</span><b>Android 10</b></div><div><span>Önerilen</span><b>Android 12 veya üzeri</b></div><div><span>Hedef</span><b>Android 16</b></div><div><span>Bu cihaz</span><b>${esc(d.label)} · ${d.tablet?'Tablet':'Telefon'}</b></div></div><p class="pp-system-status ${statusClass}">${statusText}</p></section><button id="saveStudentProfile" class="pp-primary">PROFİLİ KAYDET</button>`;
    bindCloseButtons();byId('shareReferral').onclick=()=>shareReferral(readProfile());byId('saveStudentProfile').onclick=()=>{const p=readProfile();p.studentName=(byId('studentNameInput').value||'').trim();ensurePairCode(p);ensureReferralCode(p);writeProfile(p);refreshChip();close('profileOverlay')};
  }
  function renderParentLogin(){if(!premium()){openMembership();return}byId('parentLoginCard').innerHTML=`<div class="pp-head"><div><span>VELİ GİRİŞİ</span><h2>Öğrenciyle eşleştir</h2></div><button class="pp-close" data-pp-close="parentLogin" aria-label="Kapat">×</button></div><p class="pp-copy">Öğrenci profilinde görünen 6 haneli eşleştirme kodunu gir.</p><label class="pp-field"><span>Eşleştirme kodu</span><input id="parentCodeInput" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"></label><div id="parentLoginError" class="pp-error"></div><button id="parentLoginBtn" class="pp-primary">VELİ TAKİBİ AÇ</button>`;bindCloseButtons();const submit=()=>{const state=readState(),profile=readProfile(),code=ensurePairCode(profile),v=(byId('parentCodeInput').value||'').replace(/\D/g,'');if(v!==code){byId('parentLoginError').textContent='Eşleştirme kodu doğru değil.';return}close('parentLogin');byId('parentPanelCard').innerHTML=panelHtml(state,profile);bindCloseButtons();open('parentPanel')};byId('parentLoginBtn').onclick=submit;byId('parentCodeInput').onkeydown=e=>{if(e.key==='Enter')submit()}}
  function bindCloseButtons(){document.querySelectorAll('[data-pp-close]').forEach(b=>b.onclick=()=>close(b.dataset.ppClose))}
  function refreshChip(){const profile=readProfile(),chip=byId('studentProfileChip'),label=chip?.querySelector('.profile-chip-label'),name=nameOf(profile),initials=name==='Öğrenci'?'Ö':name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();if(label)label.textContent=initials;else if(chip)chip.textContent=initials;if(chip){chip.title=name;chip.setAttribute('aria-label',`${name} öğrenci profilini aç`)}}
  function configureParentEntry(){const b=byId('parentEntry');if(!b)return;const paid=premium();b.textContent='VELİ TAKİP';b.setAttribute('aria-label',paid?'Veli Takip girişini aç':'Veli Takip Premium üyeliğini aç');b.classList.toggle('premium-locked',!paid);b.onclick=()=>{if(!premium())return openMembership();renderParentLogin();open('parentLogin')}}
  function installUi(){
    installCompatibilityLayer();captureReferral();const cover=byId('cover');let parentEntry=byId('parentEntry');if(cover&&!parentEntry){parentEntry=document.createElement('button');parentEntry.id='parentEntry';parentEntry.className='parent-entry';cover.appendChild(parentEntry)}configureParentEntry();
    const chip=byId('studentProfileChip');if(chip)chip.onclick=()=>{renderProfile();open('profileOverlay')};
    if(!byId('profileOverlay'))document.body.insertAdjacentHTML('beforeend','<div id="profileOverlay" class="pp-overlay hidden"><section id="profileCard" class="pp-card" aria-modal="true" role="dialog"></section></div><div id="parentLogin" class="pp-overlay hidden"><section id="parentLoginCard" class="pp-card" aria-modal="true" role="dialog"></section></div><div id="parentPanel" class="pp-overlay hidden"><section id="parentPanelCard" class="pp-card" aria-modal="true" role="dialog"></section></div>');
    [byId('profileOverlay'),byId('parentLogin'),byId('parentPanel')].forEach(overlay=>overlay?.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.add('hidden')}));refreshChip();
    window.addEventListener('arena:profile-updated',refreshChip);window.addEventListener('lgsarena:premium-changed',configureParentEntry);window.addEventListener('lgsarena:access-updated',configureParentEntry);window.addEventListener('resize',()=>{const now=deviceInfo();document.documentElement.classList.toggle('arena-tablet',now.tablet);document.documentElement.classList.toggle('arena-phone',!now.tablet)},{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUi,{once:true});else installUi();
  window.LgsArenaParent={openProfile:()=>{renderProfile();open('profileOverlay')},openParentLogin:()=>{if(!premium())return openMembership();renderParentLogin();open('parentLogin')},metrics:()=>metrics(readState()),deviceInfo,applyReferralReward,referralCount:()=>referralCount(readState())};
})();
