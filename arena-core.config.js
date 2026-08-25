window.ARENA_CORE_CONFIG=Object.freeze({
  coreVersion:'ARENA-CORE-V1',
  appId:'lgs2027-arena',
  appName:'LGS 2027 Arena',
  buildId:'20260825-04',
  storageNamespace:'lgs2027-arena:core:v1',
  security:Object.freeze({mode:'server-authority',apiBaseUrl:'https://dry-hill-ab5b.zorbirey73.workers.dev',allowLocalPlanSimulation:false,paidFeaturesRequireOnlineVerification:true,firebaseProjectId:'arena-edu-production'}),
  identity:Object.freeze({
    firebaseSdkVersion:'12.18.0',
    firebase:Object.freeze({apiKey:'AIzaSyDHe8fi82A-ELOwT1ygY9gIIXlJ8G-_fz8',authDomain:'arena-edu-production.firebaseapp.com',projectId:'arena-edu-production',storageBucket:'arena-edu-production.firebasestorage.app',messagingSenderId:'628565077184',appId:'1:628565077184:web:7001e83df91945aad49125'}),
    turnstileSiteKey:'0x4AAAAAAAEagqaF_ktA10HS0',
    requireVerifiedEmail:true,
    passwordPolicy:Object.freeze({minLength:12,maxLength:64,asciiOnly:true,upper:true,lower:true,number:true,special:true})
  }),
  exam:{id:'lgs-2027',questionCount:90,durationMinutes:155,optionCount:4,wrongPenalty:1/3,challengeQuestionCount:90,challengeDurationMinutes:90}
});
