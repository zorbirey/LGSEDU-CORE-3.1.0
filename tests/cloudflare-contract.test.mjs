import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('worker/src/index.mjs','utf8'),schema=fs.readFileSync('worker/migrations/0001_identity_security.sql','utf8')+fs.readFileSync('worker/migrations/0002_quota_content.sql','utf8'),config=fs.readFileSync('worker/wrangler.toml','utf8'),client=fs.readFileSync('cloudflare-security-v1.js','utf8');
test('wrangler mevcut dashboard secret ve binding sözleşmesini korur',()=>{assert.match(config,/name = "dry-hill-ab5b"/);assert.match(config,/keep_vars = true/);assert.match(config,/binding = "DB"/);assert.match(config,/database_name = "lgs-arena-production"/);assert.match(config,/TURNSTILE_SECRET_KEY/);assert.doesNotMatch(config,/TURNSTILE_SECRET_KEY\s*=\s*["']/)});
test('gerekli D1 tabloları ve ekonomik indeksler bulunur',()=>{for(const table of ['users','devices','sessions','entitlements','daily_quotas','ad_verifications','parent_codes','security_events','question_catalog'])assert.match(schema,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));for(const index of ['idx_sessions_user_expiry','idx_entitlements_user_window','idx_daily_quotas_reset','idx_question_catalog_status_subject'])assert.match(schema,new RegExp(index))});
test('ilk soru cevabı doğru yanıt ve çözümü seçmez',()=>{const initial=/SELECT id,subject,topic,difficulty,prompt,options_json,status,minimum_plan/.exec(worker);assert.ok(initial);assert.doesNotMatch(initial[0],/correct_index|solution/);assert.match(worker,/\/answer/)});
test('reklam istemci bildirimi ödül vermez ve hata durumları fail-closed kalır',()=>{assert.match(worker,/untrusted_client_claim/);assert.match(worker,/rewardGranted:false/);assert.match(worker,/security_service_unavailable/);assert.match(worker,/premium_required/)});
test('istemci oturumu yalnız bellekte tutar',()=>{assert.match(client,/storage:'memory-only'/);assert.doesNotMatch(client,/localStorage\.setItem|sessionStorage\.setItem/)});
