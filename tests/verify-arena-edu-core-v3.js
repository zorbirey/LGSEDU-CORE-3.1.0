'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const store=new Map([['lgsArenaPwaV02',JSON.stringify({xp:42,streak:7,history:[{id:'x'}],plan:'pro',isPremium:true})]]);
const context={window:{},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},CustomEvent:function(){}};context.window.window=context.window;vm.createContext(context);
vm.runInContext(fs.readFileSync('arena-edu-core-v3.js','utf8'),context);
const state=JSON.parse(store.get('lgsArenaPwaV02'));assert.equal(state.xp,42);assert.equal(state.streak,7);assert.equal(state.history.length,1);assert.equal(state.plan,'free');assert.equal(state.isPremium,false);assert.ok(store.has('lgsArenaRecoveryV3'));
assert.equal(context.window.ArenaEduCoreV3.Entitlements.canAccessProtected(),false);assert.equal(context.window.ArenaEduCoreV3.productionQuestionCount,0);
console.log('ARENA EDU data migration/security adapter OK');
