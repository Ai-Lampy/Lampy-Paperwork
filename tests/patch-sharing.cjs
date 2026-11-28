const assert=require('node:assert/strict'),fs=require('node:fs'),Core=require('../js/patch-sharing-core.js');
const snapshot=Core.snapshot({title:'Patch',fixtures:[{id:'one',fixture:'<script>',channels:0,password:'secret',notes:'Original'}],email:'secret'});
assert.equal(snapshot.fixtures[0].fixture,'<script>');assert(!('password'in snapshot.fixtures[0]));assert(!('email'in snapshot));assert.equal(snapshot.fixtures[0].channels,0);
assert.throws(()=>Core.snapshot({fixtures:[{id:'one'},{id:'one'}]}),/unique/);assert.throws(()=>Core.snapshot({fixtures:[]}),/Share/);
assert.throws(()=>Core.note({requestId:'id',fixtureId:'one',name:'Name',jobRole:'',body:'body',version:1}),/job role/);
assert(Core.TOKEN.test(Core.token()));assert.notEqual(Core.colour(1),Core.colour(2));
const html=fs.readFileSync('index.html','utf8'),sidebar=fs.readFileSync('js/app-sidebar.js','utf8');assert(!html.includes('LampyAccounts'));assert(!sidebar.includes('LampyAccounts'));assert(!html.includes('js/account-'));assert(html.includes('projectShareId:globalThis.LampyPatchShare?.projectKey'));
console.log('PASS: snapshot privacy allowlist, IDs, required note identity, highlight colours and removal of account UI hooks.');

// Snapshot data must preserve the owner's effective parameters and separate internal modes.
const vm=require('node:vm'),context={LampyPatchShare:{isViewer:false},ensureProjectInfo:()=>({file:{projectName:'Show'},positions:[],projectSettings:{units:{measurement:'metric'}}}),activePatchRows:()=>[{id:'a',fixture:'Fixture',mode:'Same display name',gdtfMode:'mode-a',channels:16},{id:'b',fixture:'Fixture',mode:'Same display name',gdtfMode:'mode-b',channels:16}],fixtureModeParameters:()=>12};
vm.createContext(context);vm.runInContext(html.match(/function fixturePatchShareSnapshot\(\)\{[^\n]+/)[0],context);
const shared=Core.snapshot(context.fixturePatchShareSnapshot());
assert.equal(shared.fixtures.reduce((n,row)=>n+row.parameters,0),24);
assert.equal(shared.fixtures[0].watts,null);assert.equal(shared.fixtures[0].gdtfMode,'mode-a');assert.equal(shared.fixtures[1].gdtfMode,'mode-b');
context.LampyPatchShare.isViewer=true;vm.runInContext(html.match(/function fixtureModeParameters\(row\)\{[^\n]+/)[0],context);
assert.equal(context.fixtureModeParameters(shared.fixtures[0]),12);
assert.equal(context.fixtureModeParameters({...shared.fixtures[0],parameters:0}),0);
vm.runInContext(html.match(/function patchGroupKey\(row\)\{[^\n]+/)[0],context);
assert.notEqual(context.patchGroupKey(shared.fixtures[0]),context.patchGroupKey(shared.fixtures[1]));
console.log('PASS: shared fixture groups, effective parameter totals and unknown measurements match the owner.');

// Exercise the actual async dialog flow without a browser or network.
class ShareTestElement{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.className='';this.textContent='';this.open=false;this.dataset={};this.style={};this.listeners={}}
 append(...items){for(const item of items){this.children.push(item);if(item&&typeof item==='object')item.parent=this}}
 setAttribute(key,value){this.attributes[key]=value}
 addEventListener(name,handler){this.listeners[name]=handler}
 showModal(){this.open=true}
 close(){this.open=false;this.listeners.close?.()}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 querySelectorAll(selector){const found=[];const matches=n=>selector==='dialog.shareDialog[open]'?n.tagName==='dialog'&&n.className==='shareDialog'&&n.open:selector==='dialog.shareDialog'?n.tagName==='dialog'&&n.className==='shareDialog':selector.startsWith('.')?n.className.split(' ').includes(selector.slice(1)):false;const walk=n=>{for(const child of n.children||[]){if(typeof child!=='object')continue;if(matches(child))found.push(child);walk(child)}};walk(this);return found}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
 get text(){return this.textContent+this.children.map(x=>typeof x==='object'?x.text:String(x)).join(' ')}
}
function shareDialogHarness(respond){
 const body=new ShareTestElement('body'),connection={id:'shared',owner:'a'.repeat(64),viewer:'b'.repeat(64)},document={body,createElement:tag=>new ShareTestElement(tag),querySelector:s=>body.querySelector(s),querySelectorAll:s=>body.querySelectorAll(s),getElementById:()=>null};let requests=0;
 const scope={document,location:{href:'https://lampy.example/',hash:''},URL,AbortSignal,crypto:globalThis.crypto,localStorage:{getItem:()=>JSON.stringify({project:connection}),setItem(){}},LampyShareCore:Core,setInterval(){},addEventListener(){},fetch:async(url,options)=>{if(String(url).endsWith('patch-sharing-config.json')){assert(options.signal);return new Response(JSON.stringify({apiURL:'https://api.example/shares/'}))}requests++;return respond(url,options)}};
 vm.runInNewContext(fs.readFileSync('js/patch-sharing.js','utf8'),scope);scope.LampyPatchShare.useProject('project');return {api:scope.LampyPatchShare,body,get requests(){return requests}};
}
(async()=>{
 let resolve,reply=new Promise(r=>resolve=r);const h=shareDialogHarness(()=>reply),pending=h.api.ownerDialog();
 const d=h.body.querySelector('dialog.shareDialog[open]');assert(d,'Dialog opens before the API responds');assert(d.text.includes('Loading shared patch'));
 while(!h.requests)await new Promise(r=>setImmediate(r));
 resolve(new Response(JSON.stringify({error:'You must sign in.'}),{status:401}));await pending;
 assert(d.text.includes('Cloudflare sharing Worker needs updating'));assert(d.text.includes('You do not need to sign in'));assert(!d.text.includes('You must sign in.'));assert(!d.text.includes('Loading shared patch'));
 reply=Promise.resolve(new Response(JSON.stringify({version:1,revoked:false,notes:[],readSeq:0,more:false})));
 await d.children.find(x=>x.textContent==='Try again').onclick();
 const recovered=h.body.querySelector('dialog.shareDialog[open]');assert(recovered.text.includes('Published snapshot 1'));assert(!recovered.text.includes('Cloudflare sharing Worker needs updating'));
 const bad=shareDialogHarness(()=>Promise.resolve(new Response('<html>Sign in</html>',{status:200})));await bad.api.ownerDialog();assert(bad.body.querySelector('dialog.shareDialog[open]').text.includes('unexpected response'));
 let finish;const closing=shareDialogHarness(()=>new Promise(r=>finish=r));const closed=closing.api.ownerDialog();while(!closing.requests)await new Promise(r=>setImmediate(r));closing.body.querySelector('dialog.shareDialog[open]').close();finish(new Response(JSON.stringify({version:1,notes:[],more:false})));await closed;assert.equal(closing.body.querySelector('dialog.shareDialog[open]'),null);
 const missing=shareDialogHarness(()=>Promise.resolve(new Response(JSON.stringify({error:'Not found'}),{status:404})));await missing.api.ownerDialog();assert(missing.body.querySelector('dialog.shareDialog[open]').text.includes('Create viewer link'));
 console.log('PASS: immediate sharing dialog, visible account-service errors, retry recovery, invalid responses, missing shares and close-during-load.');
})().catch(error=>{console.error(error);process.exitCode=1});
