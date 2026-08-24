(() => {
  'use strict';
  const BUILD_ID='20260824-25',LEGAL='Türkiye Yüzyılı Maarif Modeli dikkate alınmıştır.';
  window.LGS_ARENA_CONFIG=Object.freeze({
    schemaVersion:14,appVersion:'8.1.1-no-entry-reload',buildId:BUILD_ID,season:2027,appName:'LGS 2027 Arena',coverLocked:true,
    coverStandard:'LGS2027-ZEUS-ARENA-COVER-2026-08-23-V630-20260824-25',coverAsset:'assets/zeus-hero-20260823-02.webp?v='+BUILD_ID,
    coverRule:'Kapak, Durum ve Zeus alanlarındaki görseller gerçek img elemanlarıyla çalışır; yerel raster arka plan yalnız yükleme fallbackidir.',
    examDate:'2027-06-13T09:30:00+03:00',nextSeason:Object.freeze({season:2028,appName:'LGS 2028 Arena',examDate:null}),dailyQuestionTarget:50,questionSeconds:90,
    miniMockDistribution:Object.freeze({'Türkçe':20,'Matematik':20,'Fen Bilimleri':20,'İnkılap Tarihi':10,'Din Kültürü':10,'İngilizce':10}),
    lgsSubjectLimits:Object.freeze({'Türkçe':20,'Matematik':20,'Fen Bilimleri':20,'İnkılap Tarihi':10,'Din Kültürü':10,'İngilizce':10}),
    lgsSubjectWeights:Object.freeze({'Türkçe':4,'Matematik':4,'Fen Bilimleri':4,'İnkılap Tarihi':1,'Din Kültürü':1,'İngilizce':1}),
    googlePlayReview:Object.freeze({enabled:false,packageName:'',webUrl:''}),
    accessModel:Object.freeze({freeDailyQuestions:50,rewardedAdsPerDay:6,freeUnlockHour:8,plans:Object.freeze(['free','premium','pro','pro_plus']),zeusCoaching:'premium',smartNotes:'premium',parentTracking:'premium',preferenceRobot:'premium',deviceTransfer:'premium',zeusAi:'pro',photoSolve:'pro',aiTests:'pro',humanCoach:'pro_plus',weeklyProgram:'free',restDayPlanner:'premium',wrongbook:'premium',challenge:'premium',aiTeacher:'pro',secureSync:'pro',automaticSync:false,arenaCore:'ARENA-CORE-V1'}),legalNotice:LEGAL
  });
  const core=document.createElement('link');core.rel='stylesheet';core.href='./visual-core-v5.css?v='+BUILD_ID;core.dataset.arenaVisualCore='7.3.0';document.head.appendChild(core);
  const layout=document.createElement('link');layout.rel='stylesheet';layout.href='./layout-v52.css?v='+BUILD_ID;layout.dataset.arenaLayout='7.3.0';document.head.appendChild(layout);
  function premium(){if(window.LgsArenaPlans)return window.LgsArenaPlans.atLeast('premium');try{const state=JSON.parse(localStorage.getItem('lgsArenaPwaV02')||'{}'),until=Date.parse(state.freePremiumUntil||'');return !!state.isPremium||(Number.isFinite(until)&&until>Date.now())}catch{return false}}
  function keepStaticCopy(){const notice=document.querySelector('.cover .model-notice');if(notice&&notice.textContent!==LEGAL)notice.textContent=LEGAL;const badge=document.querySelector('section[data-page="subjects"] .page-title>b');if(badge&&badge.textContent!=='6')badge.textContent='6'}
  document.addEventListener('click',event=>{if(event.target.closest?.('#askZeusBtn')&&!premium()){event.preventDefault();event.stopImmediatePropagation();window.dispatchEvent(new CustomEvent('lgsarena:open-membership',{detail:{origin:'zeus'}}))}},true);
  const observer=new MutationObserver(keepStaticCopy);observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});keepStaticCopy();
})();
