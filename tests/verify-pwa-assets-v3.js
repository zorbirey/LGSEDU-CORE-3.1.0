'use strict';
const fs=require('fs'),assert=require('assert');const build='20260824-25';
for(const file of ['index.html','manifest.webmanifest','pwa.js','arena-core.config.js','config.js','service-worker.js'])assert.match(fs.readFileSync(file,'utf8'),new RegExp(build));
const sw=fs.readFileSync('service-worker.js','utf8');assert.match(sw,/CACHE_PREFIX='lgs-2027-arena-migration-'/);assert.match(sw,/key\.startsWith\(CACHE_PREFIX\)/);assert.match(sw,/isProtected/);assert.doesNotMatch(sw,/keys\.filter\(key=>key!==CACHE_NAME\)/);
for(const asset of ['assets/app-icon-20260823-03-192.png','assets/app-icon-20260823-03-512.png','assets/app-icon-maskable-20260823-03-192.png','assets/app-icon-maskable-20260823-03-512.png','assets/apple-touch-icon-20260823-03.png','assets/lgs2027-cover-fixed.webp','assets/zeus-hero-20260823-02.webp','assets/zeus.webp','assets/zeus-cover.svg'])assert.ok(fs.statSync(asset).size>0,asset);
console.log('Migration PWA identity/cache/assets OK');
