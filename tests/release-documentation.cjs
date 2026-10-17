'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {readDocumentation,validateDocumentation}=require('../scripts/release-documentation.cjs');
const actual=readDocumentation(path.resolve(__dirname,'..')),result=validateDocumentation(actual);
const clone=()=>JSON.parse(JSON.stringify(actual));
function rejects(change,reason){const sample=clone();change(sample);assert.throws(()=>validateDocumentation(sample),reason)}
rejects(s=>s.welcome.title='Welcome to Lampy Paperwork V0',/Welcome must match/);
rejects(s=>s.walkthrough.title='Lampy Paperwork V0 Walk-through',/Walk-through must match/);
rejects(s=>s.checklist=s.checklist.replace(/^# V[^ ]+/,'# V0'),/Browser checklist must match/);
rejects(s=>s.changelog='## V0 — Stale release\n'+s.changelog,/Latest changelog/);
rejects(s=>s.manifest.version='0',/Update metadata/);
rejects(s=>s.html=s.html.replace(/app-sidebar.css\?v=[^"]+/, 'app-sidebar.css?v=0'),/cache version/);
rejects(s=>s.html=s.html.replace('function fallbackWelcomeMessage(){return ', 'function fallbackWelcomeMessage(){return {title:"Stale",paragraphs:[]}}\nfunction obsoleteWelcome(){return '),/Welcome fallback/);
rejects(s=>s.html=s.html.replace('function fallbackWalkthrough(){return ', 'function fallbackWalkthrough(){return {title:"Stale",sections:[]}}\nfunction obsoleteWalkthrough(){return '),/Walk-through fallback/);
rejects(s=>s.welcome.paragraphs.push('JSON changed without updating fallback.'),/Welcome fallback/);
rejects(s=>s.walkthrough.sections[0].items.push('JSON changed without updating fallback.'),/Walk-through fallback/);
rejects(s=>s.welcome.paragraphs=[],/paragraphs must be populated/);
rejects(s=>s.walkthrough.sections[0].items=[],/Empty walkthrough section/);
// Point releases retain major documentation. Next major releases cannot reuse it.
const point=clone(),nextVersion=result.major+'.999';
point.html=point.html.replace("const VERSION='"+result.version+"';","const VERSION='"+nextVersion+"';").replace('<title>Lampy Paperwork V'+result.version+'</title>','<title>Lampy Paperwork V'+nextVersion+'</title>').replace(/\?v=[^"\s]+/g,'?v='+nextVersion);
point.manifest.version=nextVersion;point.changelog='## V'+nextVersion+' — Point release\n'+point.changelog;
assert.doesNotThrow(()=>validateDocumentation(point));
const next=JSON.parse(JSON.stringify(point)),nextMajor=String(Number(result.major)+1);
next.html=next.html.replaceAll(nextVersion,nextMajor);next.manifest.version=nextMajor;next.changelog='## V'+nextMajor+' — Next major\n'+next.changelog;
assert.throws(()=>validateDocumentation(next),/Welcome must match/);
console.log('PASS: release documentation/fallback parity; stale docs, stale fallbacks, empty content, old changelog and cache versions rejected; point-release compatibility retained.');

// Current release guidance must cover the changed workflows, not just carry a new title.
const guide=JSON.stringify(actual.walkthrough);
for(const phrase of ['Home → Project Settings','Help button above Menu','active sub-page is highlighted','Individual loom cards start collapsed','compact navigation'])assert(guide.includes(phrase),`Missing V53 guidance: ${phrase}`);
for(const phrase of ['Help above Menu','Home → Project Settings','Loom cards start collapsed','single-patch shortcut','JSON loading unavailable'])assert(actual.checklist.includes(phrase),`Missing V53 checklist case: ${phrase}`);
assert(!actual.checklist.includes('1450 px page wrapper'));
assert(!guide.includes('Actions, then open Project Settings'));
assert(!guide.includes('sidebar menu button to switch'));
// Exercise the real load failures and normalisers without DOM/browser automation.
const vm=require('node:vm'),context=vm.createContext({console:{warn(){}},WELCOME_MESSAGE_URL:'welcome',WALKTHROUGH_URL:'walkthrough',fetchJSONWithFallback:async()=>{throw Error('offline')}});
for(const name of ['fallbackWelcomeMessage','fallbackWalkthrough','normaliseWelcomeMessage','normaliseWalkthrough','loadWelcomeMessage','loadWalkthrough']){
 const start=actual.html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);
 const end=actual.html.indexOf('\n',start);vm.runInContext(actual.html.slice(start,end),context);
}
const plain=value=>JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(context.normaliseWelcomeMessage({})),actual.welcome);
assert.deepEqual(plain(context.normaliseWalkthrough({})),actual.walkthrough);
Promise.all([context.loadWelcomeMessage(),context.loadWalkthrough()]).then(([welcome,walkthrough])=>{
 assert.deepEqual(plain(welcome),actual.welcome);assert.deepEqual(plain(walkthrough),actual.walkthrough);
 console.log('PASS: actual offline welcome/walkthrough loaders and empty-data normalisers retain the complete V53 guidance.');
}).catch(error=>{console.error(error);process.exitCode=1});
