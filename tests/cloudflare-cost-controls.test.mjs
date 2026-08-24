import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('worker/src/index.mjs','utf8');
test('imzasız ve Turnstile başarısız istekleri D1 yazımı üretmez',()=>{assert.doesNotMatch(worker,/turnstile_failure/);assert.doesNotMatch(worker,/authorization_failure/)});
test('soru ve plan doğrulanmadan kota tüketilmez',()=>{const start=worker.indexOf("const answerMatch="),end=worker.indexOf("return json({error:'not_found'}",start),answer=worker.slice(start,end);assert.ok(answer.indexOf('SELECT correct_index,solution')<answer.indexOf('consumeQuestion(env,claims.uid,plan)'));assert.ok(answer.indexOf("hasPlan(plan,question.minimum_plan)")<answer.indexOf('consumeQuestion(env,claims.uid,plan)'))});
test('Free kota artırımı tek atomik koşullu UPSERT kullanır',()=>{assert.match(worker,/ON CONFLICT\(user_id,feature,window_key\) DO UPDATE SET used=used\+1[\s\S]*WHERE used<limit_value RETURNING used,limit_value/)});
