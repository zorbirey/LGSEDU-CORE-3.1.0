'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const context={window:{}};context.window.window=context.window;vm.createContext(context);
for(const file of fs.readdirSync('data').filter(name=>name.endsWith('.js')))try{vm.runInContext(fs.readFileSync(path.join('data',file),'utf8'),context)}catch{}
const questions=context.window.QUESTION_BANK||[],ids=questions.map(q=>q.id);assert.equal(questions.length,228);assert.equal(new Set(ids).size,ids.length);for(const q of questions){assert.ok(q.subject&&q.topic&&q.difficulty&&q.solution);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length)}
const blueprint=JSON.parse(fs.readFileSync('data/question-factory-blueprint.json'));assert.equal(blueprint.targetDraftCount,15000);assert.equal(blueprint.activeProductionCount,0);assert.equal(blueprint.automaticActivation,false);assert.equal(blueprint.productionCalibration.minimumRealShadowResponses,100);assert.equal(blueprint.provider.outboundRequestsAllowed,false);
console.log('228 legacy questions preserved; factory gates OK');
