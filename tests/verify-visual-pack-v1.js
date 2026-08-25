'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const standard=require('../arena-visual-pack-v1.js');
const manifestPath=path.join('assets','visual-packs','lgs2027-storm-v1','visual-pack.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const validation=standard.validateManifest(manifest);
assert.equal(validation.ok,true,validation.errors.join('\n'));
assert.equal(manifest.packageStatus,'in-progress');
assert.equal(manifest.styleApproval.status,'approved-locked');
assert.equal(manifest.styleApproval.changePolicy,'user-request-required');
for(const asset of manifest.assets){
  assert.ok(fs.existsSync(asset.path),`asset eksik: ${asset.path}`);
  const bytes=fs.readFileSync(asset.path);
  assert.equal(bytes.length,asset.bytes,`boyut uyuşmuyor: ${asset.path}`);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`PNG magic bytes geçersiz: ${asset.path}`);
  assert.equal(bytes.readUInt32BE(16),asset.width,`genişlik uyuşmuyor: ${asset.path}`);
  assert.equal(bytes.readUInt32BE(20),asset.height,`yükseklik uyuşmuyor: ${asset.path}`);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256,`sha256 uyuşmuyor: ${asset.path}`);
}
const approved={...manifest,packageStatus:'approved-locked'};
const approvedValidation=standard.validateManifest(approved);
assert.equal(approvedValidation.ok,false,'Eksik zorunlu roller varken paket kilitlenmemeli');
assert.ok(approvedValidation.errors.some(error=>error.startsWith('zorunlu asset eksik:')));
console.log('ARENA-VISUAL-PACK-V1 standard and LGS2027 STORM assets OK');
