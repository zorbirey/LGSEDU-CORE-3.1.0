(() => {
  'use strict';
  const STANDARD='ARENA-EDU-CORE-3.1.0',SCHEMA=3,BUILD_ID='20260824-25';
  const KEYS=Object.freeze({arena:'lgsArenaPwaV02',preference:'lgsArenaPreferenceV1',profile:'lgsArenaProfileV41',review:'lgsArenaReviewV81',weekly:'lgsArenaWeeklyProgramV1',migration:'lgsArenaMigrationV3',recovery:'lgsArenaRecoveryV3'});
  const FORBIDDEN_BACKUP_FIELDS=/token|secret|password|payment|entitlement|authority|admin|signature|turnstile/i;
  const safeParse=value=>{try{return JSON.parse(value)}catch{return null}};
  function publicSnapshot(){const data={};Object.values(KEYS).filter(key=>![KEYS.migration,KEYS.recovery].includes(key)).forEach(key=>{const raw=localStorage.getItem(key);if(raw===null)return;const parsed=safeParse(raw);if(parsed&&typeof parsed==='object'){const clean={};Object.entries(parsed).forEach(([field,value])=>{if(!FORBIDDEN_BACKUP_FIELDS.test(field))clean[field]=value});data[key]=JSON.stringify(clean)}else data[key]=raw});return data}
  function migrate(){const marker=safeParse(localStorage.getItem(KEYS.migration));if(marker?.schema===SCHEMA)return marker;const recovery={schema:SCHEMA,createdAt:new Date().toISOString(),data:publicSnapshot()};try{localStorage.setItem(KEYS.recovery,JSON.stringify(recovery));const arena=safeParse(localStorage.getItem(KEYS.arena))||{};arena.dataSchema=SCHEMA;arena.legacyPlanDemo=arena.plan||'free';arena.plan='free';arena.isPremium=false;delete arena.freePremiumVerifiedByServer;localStorage.setItem(KEYS.arena,JSON.stringify(arena));const next={schema:SCHEMA,standard:STANDARD,buildId:BUILD_ID,migratedAt:new Date().toISOString(),status:'complete'};localStorage.setItem(KEYS.migration,JSON.stringify(next));return next}catch(error){Object.entries(recovery.data).forEach(([key,value])=>localStorage.setItem(key,value));return {schema:SCHEMA,status:'rolled-back',reason:String(error?.message||error)}}}
  const DIFFICULTY=Object.freeze({'Kolay':'easy','Orta':'medium','Orta Üst':'medium_hard','Orta-Zor':'medium_hard','Zor':'hard','Efsane':'legendary','Efsane Zor':'legendary'});
  function adaptQuestion(question){return Object.freeze({...question,legacyId:question.id,grade:8,unit:question.unit||null,learningOutcome:question.learningOutcome||null,questionType:question.questionType||'multiple_choice',difficultyBand:DIFFICULTY[question.difficulty]||'unmapped',verificationStatus:'legacy_unverified',productionEligible:false,answerVisibility:'after_submission_only'})}
  const GradeAdapter=Object.freeze({grade:8,exam:'LGS',subjects:Object.freeze(['Türkçe','Matematik','Fen Bilimleri','İnkılap Tarihi','Din Kültürü','İngilizce']),adaptQuestion});
  const Entitlements=Object.freeze({status:'backend-not-configured',effectivePlan:()=> 'free',canAccessProtected:()=>false,reason:'server-verification-required'});
  function legacyQuestions(){return Object.freeze((window.QUESTION_BANK||[]).map(adaptQuestion))}
  const migration=migrate();
  window.ArenaEduCoreV3=Object.freeze({standard:STANDARD,buildId:BUILD_ID,schema:SCHEMA,keys:KEYS,migration,GradeAdapter,Entitlements,legacyQuestions,productionQuestionCount:0});
})();
