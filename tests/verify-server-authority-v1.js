const fs=require('fs');
function read(path){return fs.readFileSync(path,'utf8')}
function must(condition,message){if(!condition)throw new Error(message)}
const config=read('arena-core.config.js');
const plans=read('plans-v80.js');
const app=read('app.js');
const index=read('index.html');
const worker=read('server/src/index.ts');
const migration=read('server/migrations/0003_authority_requests.sql');
must(config.includes("mode:'server-authority'"),'server authority config missing');
must(config.includes('allowLocalPlanSimulation:false'),'local plan simulation must be disabled');
must(plans.includes("authority()?.verified?.()"),'plans must require verified authority');
must(!/function hasPremiumAccess\(\).*state\.isPremium/.test(app),'legacy local Premium path remains');
must(index.includes('arena-secure-authority-v1.js'),'authority client not loaded');
must(worker.includes('jwtVerify'),'Firebase JWT verification missing');
must(worker.includes('FROM entitlements'),'existing entitlement authority missing');
must(worker.includes("status='pending'"),'idempotency pending ledger missing');
must(worker.indexOf('INSERT INTO authority_requests')<worker.indexOf('INSERT INTO daily_quotas'),'idempotency ledger must precede quota mutation');
must(worker.includes('turnstile-hostname-rejected'),'Turnstile hostname verification missing');
must(migration.includes('CREATE TABLE IF NOT EXISTS authority_requests'),'idempotency table missing');
console.log('ARENA-SERVER-AUTHORITY-V1 verification passed');
