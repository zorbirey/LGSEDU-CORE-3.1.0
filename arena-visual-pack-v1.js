(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&!root.ArenaVisualPackV1)Object.defineProperty(root,'ArenaVisualPackV1',{value:api,configurable:false,writable:false});
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const VERSION='ARENA-VISUAL-PACK-V1';
  const PACKAGE_STATUS=Object.freeze(['in-progress','review','approved-locked','superseded']);
  const REQUIRED_ROLES=Object.freeze([
    'icon.master','icon.pwa192','icon.pwa512','icon.maskable192','icon.maskable512',
    'launch.phonePortrait','launch.tabletPortrait','launch.tabletLandscape',
    'firstUse.phonePortrait','firstUse.tabletPortrait','firstUse.tabletLandscape',
    'zeus.coach','zeus.thinking','zeus.warning','zeus.celebrating','zeus.analysis'
  ]);
  const RULES=Object.freeze({
    rasterFilesAreLocal:true,
    versionedFileNames:true,
    textAndControlsStayInHtml:true,
    approvedStyleCannotChangeWithoutUserRequest:true,
    changedAssetCreatesNewPackVersion:true,
    responsiveArtDirectionRequired:true,
    integrityHashRequiredForApproval:true
  });
  function validateAsset(asset,errors){
    if(!asset||typeof asset!=='object'){errors.push('asset kaydı geçersiz');return}
    if(!REQUIRED_ROLES.includes(asset.role))errors.push(`bilinmeyen asset rolü: ${asset.role||'eksik'}`);
    if(!/^assets\/[a-z0-9/_-]+\.(png|webp|jpg|jpeg)$/i.test(asset.path||''))errors.push(`yerel asset yolu geçersiz: ${asset.path||'eksik'}`);
    if(!Number.isInteger(asset.width)||asset.width<1||!Number.isInteger(asset.height)||asset.height<1)errors.push(`asset ölçüsü geçersiz: ${asset.role||'eksik'}`);
    if(asset.sha256&&!/^[a-f0-9]{64}$/.test(asset.sha256))errors.push(`sha256 geçersiz: ${asset.role||'eksik'}`);
  }
  function validateManifest(manifest){
    const errors=[];
    if(manifest?.standard!==VERSION)errors.push(`standard ${VERSION} olmalı`);
    if(!/^[a-z0-9-]+-v\d+$/.test(manifest?.packId||''))errors.push('packId geçersiz');
    if(!PACKAGE_STATUS.includes(manifest?.packageStatus))errors.push('packageStatus geçersiz');
    if(manifest?.styleApproval?.status!=='approved-locked')errors.push('görsel yön kullanıcı tarafından approved-locked olmalı');
    if(manifest?.styleApproval?.userApproved!==true)errors.push('userApproved true olmalı');
    const assets=Array.isArray(manifest?.assets)?manifest.assets:[];
    assets.forEach(asset=>validateAsset(asset,errors));
    const duplicateRoles=assets.map(asset=>asset.role).filter((role,index,all)=>all.indexOf(role)!==index);
    if(duplicateRoles.length)errors.push(`tekrarlanan asset rolleri: ${[...new Set(duplicateRoles)].join(', ')}`);
    if(manifest?.packageStatus==='approved-locked'){
      const present=new Set(assets.map(asset=>asset.role));
      REQUIRED_ROLES.filter(role=>!present.has(role)).forEach(role=>errors.push(`zorunlu asset eksik: ${role}`));
      assets.filter(asset=>!asset.sha256).forEach(asset=>errors.push(`sha256 eksik: ${asset.role}`));
    }
    return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors)});
  }
  return Object.freeze({VERSION,PACKAGE_STATUS,REQUIRED_ROLES,RULES,validateManifest});
});
