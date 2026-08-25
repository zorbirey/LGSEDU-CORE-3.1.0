'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const standard=require('../arena-visual-pack-v1.js');
const manifestPath=path.join('assets','visual-packs','lgs2027-storm-v1','visual-pack.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const validation=standard.validateManifest(manifest);
assert.equal(validation.ok,true,validation.errors.join('\n'));
assert.equal(manifest.packageStatus,'approved-locked');
assert.equal(manifest.styleApproval.status,'approved-locked');
assert.equal(manifest.styleApproval.changePolicy,'user-request-required');
assert.deepEqual(new Set(manifest.assets.map(asset=>asset.role)),new Set(standard.REQUIRED_ROLES));
for(const asset of manifest.assets){
  assert.ok(fs.existsSync(asset.path),`asset eksik: ${asset.path}`);
  const bytes=fs.readFileSync(asset.path);
  assert.equal(bytes.length,asset.bytes,`boyut uyuşmuyor: ${asset.path}`);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`PNG magic bytes geçersiz: ${asset.path}`);
  assert.equal(bytes.readUInt32BE(16),asset.width,`genişlik uyuşmuyor: ${asset.path}`);
  assert.equal(bytes.readUInt32BE(20),asset.height,`yükseklik uyuşmuyor: ${asset.path}`);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256,`sha256 uyuşmuyor: ${asset.path}`);
  if(asset.role.startsWith('zeus.')){
    assert.equal(asset.transparentAlpha,true,`saydamlık beyanı eksik: ${asset.role}`);
    assert.equal(bytes[25],6,`Zeus PNG RGBA olmalı: ${asset.path}`);
  }
}
for(const [role,size] of [['icon.pwa192',192],['icon.maskable192',192],['icon.pwa512',512],['icon.maskable512',512]]){
  const asset=manifest.assets.find(item=>item.role===role);
  assert.equal(asset.width,size,`${role} genişliği yanlış`);
  assert.equal(asset.height,size,`${role} yüksekliği yanlış`);
}
const incomplete={...manifest,assets:manifest.assets.filter(asset=>asset.role!=='zeus.analysis')};
const incompleteValidation=standard.validateManifest(incomplete);
assert.equal(incompleteValidation.ok,false,'Eksik zorunlu rol varken paket kilitlenmemeli');
assert.ok(incompleteValidation.errors.includes('zorunlu asset eksik: zeus.analysis'));
console.log('ARENA-VISUAL-PACK-V1 and complete LGS2027 STORM pack OK');
