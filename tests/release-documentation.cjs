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

// Welcome links and temporary walkthrough suspension must also work offline.
assert(actual.welcome.paragraphs.includes('https://ailampy.com/paperwork/'));
assert(JSON.stringify(actual.welcome).includes('info@ailampy.com'));
assert(!JSON.stringify(actual.welcome).includes('github.io'));
assert(actual.html.includes('const WALKTHROUGH_ENABLED=false;'));
const welcomeContext=vm.createContext({WALKTHROUGH_ENABLED:false,LampySidebar:require('../js/app-sidebar.js'),escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),walkthroughSkipped(){throw Error('Disabled walkthrough must not access preferences')},$(){throw Error('Disabled walkthrough must not access DOM')}});
for(const name of ['welcomeParagraphMarkup','welcomeHelpMarkup','maybeOpenWalkthroughAfterWelcome','openWalkthrough']){
 const start=actual.html.search(new RegExp('(?:async )?function '+name+'\\(')),end=actual.html.indexOf('\n',start);assert(start>=0,name);vm.runInContext(actual.html.slice(start,end),welcomeContext);
}
assert(welcomeContext.welcomeParagraphMarkup('https://ailampy.com/paperwork/').includes('href="https://ailampy.com/paperwork/"'));
assert(welcomeContext.welcomeParagraphMarkup('Contact info@ailampy.com').includes('href="mailto:info@ailampy.com"'));
assert(!welcomeContext.welcomeParagraphMarkup('<img src=x onerror=alert(1)>').includes('<img'));
const callout=welcomeContext.welcomeHelpMarkup();assert(callout.includes('welcomeHelpArrow'));assert(callout.indexOf('welcomeHelpArrow')<callout.indexOf('welcomeOpenHelp'));assert(callout.includes('aria-hidden="true"'));assert(callout.includes('Open Help'));
assert(actual.html.includes('animation:welcomeHelpFlash 1s ease-in-out 4'));
assert(actual.html.includes('@media(prefers-reduced-motion:reduce){.welcomeHelpArrow{animation:none}}'));
assert(actual.html.includes('[data-walkthrough-entry][hidden]{display:none!important}'));
assert.equal([...actual.html.matchAll(/<button[^>]+onclick="openWalkthrough\([^>]+>/g)].filter(m=>!m[0].includes('hidden disabled')).length,0);
Promise.all([welcomeContext.maybeOpenWalkthroughAfterWelcome(),welcomeContext.openWalkthrough(),welcomeContext.openWalkthrough({auto:true})]).then(()=>console.log('PASS: welcome site/email, escaped text, Help callout, bounded/reduced-motion arrow and disabled walkthrough launch paths.')).catch(error=>{console.error(error);process.exitCode=1});
