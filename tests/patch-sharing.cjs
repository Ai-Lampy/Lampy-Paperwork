const assert=require('node:assert/strict'),fs=require('node:fs'),Core=require('../js/patch-sharing-core.js');
const snapshot=Core.snapshot({title:'Patch',fixtures:[{id:'one',fixture:'<script>',channels:0,password:'secret',notes:'Original'}],email:'secret'});
assert.equal(snapshot.fixtures[0].fixture,'<script>');assert(!('password'in snapshot.fixtures[0]));assert(!('email'in snapshot));assert.equal(snapshot.fixtures[0].channels,0);
assert.throws(()=>Core.snapshot({fixtures:[{id:'one'},{id:'one'}]}),/unique/);assert.throws(()=>Core.snapshot({fixtures:[]}),/Share/);
assert.throws(()=>Core.note({requestId:'id',fixtureId:'one',name:'Name',jobRole:'',body:'body',version:1}),/job role/);
assert(Core.TOKEN.test(Core.token()));assert.notEqual(Core.colour(1),Core.colour(2));
const html=fs.readFileSync('index.html','utf8'),sidebar=fs.readFileSync('js/app-sidebar.js','utf8');assert(!html.includes('LampyAccounts'));assert(!sidebar.includes('LampyAccounts'));assert(!html.includes('js/account-'));assert(html.includes('projectShareId:globalThis.LampyPatchShare?.projectKey'));
console.log('PASS: snapshot privacy allowlist, IDs, required note identity, highlight colours and removal of account UI hooks.');

// Snapshot data must preserve the owner's effective parameters and separate internal modes.
const vm=require('node:vm'),context={LampyPatchShare:{isViewer:false},ensureProjectInfo:()=>({file:{projectName:'Show'},positions:[],projectSettings:{units:{measurement:'metric'}},fixtureNameDisplay:{patch:'full'}}),activePatchRows:()=>[{id:'a',fixture:'Fixture',mode:'Same display name',gdtfMode:'mode-a',channels:16},{id:'b',fixture:'Fixture',mode:'Same display name',gdtfMode:'mode-b',channels:16}],fixtureModeParameters:()=>12,fixturePatchViewOptions:{pdf:{}},projectLogo:()=>({}),selectedVendorLogo:()=>null,secondaryLogo:()=>({}),patchPdfControlData:()=>({}),patchPdfNoteItems:()=>[],patchPdfRevisionRows:()=>[]};
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

// Publish only explicit display data, including safe raster logos; never project contacts or executable markup.
const extended=Core.snapshot({fixtures:[{id:'one'}],logos:{tour:{name:'Tour',dataUrl:'data:image/png;base64,AAAA'},vendor:{dataUrl:'https://untrusted.test/track'},secondary:{dataUrl:'data:image/svg+xml;base64,PHN2Zz4='}},control:{consoles:[{protocols:['sACN','Art-Net'],cells:['Desk','Main','Mode 3','2.3','10.0.0.1','2.0.0.1'],password:'private'}],npus:[{type:'Processor',quantity:2}],parameters:8192},summaryNotes:['Cover note'],revisionNotes:[{version:'1',date:'Today',note:'Patch note',private:'secret'}],presentation:{columns:{notes:true,mode:false},titleFormat:{font:'Arial',fontSize:24},tableFormats:{notes:{font:'x;background:url(secret)',align:'left'}},ownerToken:'secret'},typography:{bodyFont:'Arial'},contacts:{email:'secret'}});
assert.equal(extended.schema,2);assert.deepEqual(Object.keys(extended.logos),['tour']);assert.equal(extended.control.consoles[0].cells[4],'10.0.0.1');assert(!('password' in extended.control.consoles[0]));assert(!('contacts'in extended));assert(!('private'in extended.revisionNotes[0]));assert(!('ownerToken'in extended.presentation));assert(!('font'in extended.presentation.tableFormats.notes));assert.deepEqual(Core.snapshot(extended),extended,'Repeated client/server normalization preserves display data');
assert.equal(extended.presentation.columns.mode,false);assert.deepEqual(extended.summaryNotes,['Cover note']);

// Notes measure the widest individual line/header, never the concatenation of every note.
const measureScope={CSS:{escape:x=>x},getComputedStyle:()=>({fontSize:'14px',fontWeight:'400',fontStyle:'normal',fontFamily:'Arial'}),patchTextWidth:value=>value.length*7};
vm.createContext(measureScope);vm.runInContext(html.match(/function patchColumnContentWidth\([^\n]+/)[0],measureScope);
const part=(text,note=false)=>({textContent:text,matches:()=>false,closest:()=>note?{}:null});
const noteCells=[{...part('Notes'),tagName:'TH',querySelectorAll:()=>[]},{tagName:'TD',querySelectorAll:()=>[part('Owner'),...Array.from({length:40},()=>part('Crew\nShort note',true))]}];
assert.equal(measureScope.patchColumnContentWidth({querySelectorAll:()=>noteCells},'notes'),104);

// Exercise inline note entry, identity, blur/Enter, retries and preservation across rerenders without a browser.
const sharingSource=fs.readFileSync('js/patch-sharing.js','utf8');
ShareTestElement.prototype.focus=function(){this.focused=true};ShareTestElement.prototype.blur=function(){this.blurred=true;return this.onblur?.()};
function inlineHarness(){
 const drafts=new Map(),requests=[],notes=[],errors=[],identity=new ShareTestElement('input');let respond=async data=>({seq:1,...data});
 const scope={core:Core,drafts,crypto:globalThis.crypto,loadedVersion:1,viewerName:'Crew',viewerRole:'Lighting',viewer:{id:'share'},notes,header:{querySelector:()=>identity},el:(tag,text='',cls='')=>{const node=new ShareTestElement(tag);node.textContent=text;node.className=cls;node.scrollHeight=24;return node},bridge:{resizePatch(){}},showError:e=>errors.push(e.message),request:async(target,route,method,data)=>{requests.push({...data});return respond(data)},decorate(){},updateViewerStatus(){},document:{},refreshViewer:async()=>{}};
 vm.createContext(scope);vm.runInContext(sharingSource.slice(sharingSource.indexOf(' function attachNoteEditor('),sharingSource.indexOf(' function renderHeaderLogos(')),scope);
 const cell=new ShareTestElement('td');scope.attachNoteEditor(cell,'one');return {scope,cell,drafts,requests,notes,errors,identity,get field(){return cell.querySelector('.shareNoteEntry')},respond:fn=>respond=fn};
}
(async()=>{
 const h=inlineHarness();assert(!h.cell.children.some(node=>node.tagName==='button'),'Notes cell has no Add Note button');
 h.scope.viewerName='';h.field.onfocus();assert(h.identity.focused);h.field.value='Keep this note';h.field.oninput();await h.field.onblur();assert.equal(h.requests.length,0);assert.equal(h.drafts.get('one').body,'Keep this note');
 h.scope.viewerName='Crew';let fail=true;h.respond(async data=>{if(fail)throw Error('Connection lost');return {seq:4,...data}});
 await h.field.onblur();assert.equal(h.field.value,'Keep this note');assert(h.errors.at(-1).includes('Connection lost'));
 const replacement=new ShareTestElement('td');h.scope.attachNoteEditor(replacement,'one');const field=replacement.querySelector('.shareNoteEntry');assert.equal(field.value,'Keep this note','Rerender preserves draft');
 fail=false;await field.onblur();assert.equal(h.notes.length,1);assert.equal(field.value,'');assert.equal(h.requests[0].requestId,h.requests[1].requestId,'Uncertain retry uses the same idempotency key');
 field.value='Second note';field.oninput();let prevented=false;field.onkeydown({key:'Enter',shiftKey:true,preventDefault(){prevented=true}});assert(!prevented);assert.equal(h.notes.length,1);
 field.onkeydown({key:'Enter',isComposing:true,preventDefault(){throw Error('Composition must not send')}});assert.equal(h.requests.length,2);
 field.onkeydown({key:'Enter',preventDefault(){prevented=true}});await new Promise(resolve=>setImmediate(resolve));assert(prevented);assert(field.blurred);assert.equal(h.requests.length,3);assert.notEqual(h.requests[1].requestId,h.requests[2].requestId);
 console.log('PASS: safe display snapshot, compact note measurement, inline identity/entry, multiline/composition, blur, Enter, retries and preserved drafts.');
})().catch(error=>{console.error(error);process.exitCode=1});

// Viewer routing keeps the actual patch renderer and opens summaries as side panes.
ShareTestElement.prototype.replaceChildren=function(...items){this.children=[];this.append(...items)};
ShareTestElement.prototype.prepend=function(...items){for(const item of items){item.parent=this}this.children.unshift(...items)};
ShareTestElement.prototype.after=function(item){this.parent?.append(item)};
ShareTestElement.prototype.removeAttribute=function(key){delete this.attributes[key]};
Object.defineProperty(ShareTestElement.prototype,'classList',{get(){return {add:(name)=>{if(!this.className.split(' ').includes(name))this.className+=' '+name},contains:name=>this.className.split(' ').includes(name)}}});
const originalQuery=ShareTestElement.prototype.querySelectorAll;
ShareTestElement.prototype.querySelectorAll=function(selector){if(selector==='h1'){const found=[];const walk=n=>{for(const child of n.children){if(child.tagName==='h1')found.push(child);walk(child)}};walk(this);return found}return originalQuery.call(this,selector)};
(async()=>{
 const body=new ShareTestElement('body'),sheet=new ShareTestElement('main');body.append(sheet);let renders=0,loaded;
 const data=Core.snapshot({title:'Shared show',fixtures:[{id:'one',fixture:'Wash'}],logos:{tour:{name:'Tour',dataUrl:'data:image/png;base64,AAAA'},vendor:{name:'Vendor',dataUrl:'data:image/png;base64,AAAA'},secondary:{name:'Personal',dataUrl:'data:image/png;base64,AAAA'}},summaryNotes:['Keep clear'],control:{consoles:[],npus:[],parameters:0}});
 const document={body,createElement:tag=>new ShareTestElement(tag),querySelector:s=>body.querySelector(s),querySelectorAll:s=>body.querySelectorAll(s),getElementById:id=>id==='sheet'?sheet:null};
 const scope={document,location:{href:'https://lampy.example/#patch-view=share.'+'b'.repeat(64),hash:'#patch-view=share.'+'b'.repeat(64)},URL,AbortSignal,crypto:globalThis.crypto,localStorage:{getItem:()=> '1',setItem(){}},LampyShareCore:Core,setInterval(){},addEventListener(){},fetch:async url=>Response.json(String(url).endsWith('patch-sharing-config.json')?{apiURL:'https://api.example/shares/'}:{version:1,snapshot:data,notes:[],more:false})};scope.window=scope;
 vm.runInNewContext(sharingSource,scope);
 const make=(cls)=>{const node=new ShareTestElement('div');node.className=cls;return node};
 await scope.LampyPatchShare.setup({load:value=>loaded=value,renderPatch:()=>{renders++;const patch=make('fixturePatchView'),toolbar=make('fixturePatchToolbar');toolbar.append(make('fixturePatchToolbarLeft'),make('fixturePatchStats'),make('fixturePatchToolbarRight'));patch.append(toolbar,make('fixturePatchControlBody'),make('fixturePatchPage'));sheet.append(patch)},fixtureSummary:()=>'<div>Fixture summary</div>',positionSummary:()=>'<div>Position summary</div>',controlMarkup:()=>'<table>Console Info</table>',exportPatch(){}});
 assert.equal(loaded.title,'Shared show');assert.equal(renders,1);const patch=sheet.querySelector('.fixturePatchView');assert(patch.querySelector('.fixturePatchControlBody'));assert(patch.querySelector('.fixturePatchStats'));
 const buttons=patch.querySelector('.fixturePatchToolbarLeft').children;await buttons[0].onclick();assert.equal(renders,1);assert.equal(sheet.querySelector('.fixturePatchView'),patch);assert(body.querySelector('.shareSummaryPane').text.includes('Fixture Summary'));
 await buttons[1].onclick();assert.equal(renders,1);assert(body.querySelector('.shareSummaryPane').text.includes('Position Summary'));
 const logos=body.querySelector('.shareHeaderLogos').children;assert.equal(logos.length,4);assert(!logos.some(logo=>String(logo.src).includes('lampy-paperwork-logo')));assert(patch.text.includes('Keep clear'));
 console.log('PASS: main patch renderer and controls retained, summaries open beside the patch, all header logos and shared notes displayed.');
})().catch(error=>{console.error(error);process.exitCode=1});

(async()=>{
 let width,height;
 class LogoImage{constructor(){this.naturalWidth=2400;this.naturalHeight=1200}set src(value){queueMicrotask(()=>this.onload())}}
 const scope={bridge:{snapshot:()=>({fixtures:[{id:'one'}],logos:{tour:{name:'Tour',dataUrl:'data:image/png;base64,AAAA'}}})},core:Core,Image:LogoImage,URL,location:{href:'https://lampy.example/',origin:'https://lampy.example'},setTimeout,clearTimeout,document:{createElement:()=>({set width(v){width=v},get width(){return width},set height(v){height=v},get height(){return height},getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/webp;base64,AAAA'})}};
 vm.createContext(scope);vm.runInContext(sharingSource.slice(sharingSource.indexOf(' async function prepareSnapshot('),sharingSource.indexOf(' async function setup(')),scope);
 const result=await scope.prepareSnapshot();assert.equal(width,600);assert.equal(height,300);assert.equal(result.logos.tour.dataUrl,'data:image/webp;base64,AAAA');
 scope.bridge.snapshot=()=>({fixtures:[{id:'one'}],logos:{tour:{src:'https://external.test/logo.png'}}});await assert.rejects(scope.prepareSnapshot(),/project image or a bundled logo/);
 console.log('PASS: logos are bounded raster snapshots; unrelated remote logo URLs are rejected.');
})().catch(error=>{console.error(error);process.exitCode=1});
