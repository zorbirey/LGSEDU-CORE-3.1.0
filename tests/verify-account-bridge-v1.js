const fs=require('fs');
function read(path){return fs.readFileSync(path,'utf8')}
function must(value,message){if(!value)throw new Error(message)}
const bridge=read('arena-account-bridge-v1.js');
const config=read('arena-core.config.js');
const index=read('index.html');
const styles=read('account-v1.css');
const worker=read('server/src/index.ts');
const sw=read('service-worker.js');
must(index.includes('arena-account-bridge-v1.js?v=20260825-04'),'account bridge is not loaded');
must(index.includes('account-v1.css?v=20260825-04'),'account styles are not loaded');
must(bridge.includes('createUserWithEmailAndPassword'),'Firebase account creation missing');
must(bridge.includes('signInWithEmailAndPassword'),'Firebase sign-in missing');
must(bridge.includes('sendEmailVerification'),'email verification missing');
must(bridge.includes("verified-email-required"),'verified email gate missing');
must(bridge.includes('/v1/security/turnstile/verify'),'public Turnstile verification call missing');
must(worker.includes("url.pathname==='/v1/security/turnstile/verify'"),'Worker Turnstile endpoint missing');
must(worker.indexOf("url.pathname==='/v1/security/turnstile/verify'")<worker.indexOf('const claims=await authenticate'),'first-use challenge must be checked before auth');
must(config.includes('allowLocalPlanSimulation:false'),'local paid-plan simulation must remain disabled');
must(config.includes('asciiOnly:true'),'ASCII password policy missing');
must(styles.includes('first-use-storm-portrait-v1.png')&&styles.includes('first-use-storm-landscape-v1.png'),'approved visual pack missing');
must(sw.includes('arena-account-bridge-v1.js')&&sw.includes('account-v1.css'),'account files missing from PWA cache');
must(!bridge.includes('TURNSTILE_SECRET_KEY'),'Turnstile secret must never reach the browser');
must(!bridge.includes('lgsArenaPwaV02'),'learning progress storage must stay untouched');
console.log('ARENA-ACCOUNT-BRIDGE-V1 verification passed');
