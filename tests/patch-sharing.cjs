const assert=require('node:assert/strict'),fs=require('node:fs'),Core=require('../js/patch-sharing-core.js');
const snapshot=Core.snapshot({title:'Patch',fixtures:[{id:'one',fixture:'<script>',channels:0,password:'secret',notes:'Original'}],email:'secret'});
assert.equal(snapshot.fixtures[0].fixture,'<script>');assert(!('password'in snapshot.fixtures[0]));assert(!('email'in snapshot));assert.equal(snapshot.fixtures[0].channels,0);
assert.throws(()=>Core.snapshot({fixtures:[{id:'one'},{id:'one'}]}),/unique/);assert.throws(()=>Core.snapshot({fixtures:[]}),/Share/);
assert.throws(()=>Core.note({requestId:'id',fixtureId:'one',name:'Name',jobRole:'',body:'body',version:1}),/job role/);
assert(Core.TOKEN.test(Core.token()));assert.notEqual(Core.colour(1),Core.colour(2));
const html=fs.readFileSync('index.html','utf8'),sidebar=fs.readFileSync('js/app-sidebar.js','utf8');assert(!html.includes('LampyAccounts'));assert(!sidebar.includes('LampyAccounts'));assert(!html.includes('js/account-'));assert(html.includes('projectShareId:globalThis.LampyPatchShare?.projectKey'));
console.log('PASS: snapshot privacy allowlist, IDs, required note identity, highlight colours and removal of account UI hooks.');

// Snapshot data must preserve the owner's effective parameters and separate internal modes.
const vm=require('node:vm'),context={LampyPatchShare:{isViewer:false},ensureProjectInfo:()=>({file:{projectName:'Show'},positions:[],projectSettings:{units:{measurement:'metric'}},fixtureNameDisplay:{patch:'full'}}),activePatchSheet:()=>({name:'Tour Patch'}),activePatchRows:()=>[{id:'a',fixture:'Fixture',mode:'Same display name',gdtfMode:'mode-a',channels:16},{id:'b',fixture:'Fixture',mode:'Same display name',gdtfMode:'mode-b',channels:16}],fixtureModeParameters:()=>12,fixturePatchViewOptions:{pdf:{}},projectLogo:()=>({}),selectedVendorLogo:()=>null,secondaryLogo:()=>({}),patchPdfControlData:()=>({}),patchPdfNoteItems:()=>[],patchPdfRevisionRows:()=>[],fixturePatchSharePdfSettings:()=>null};
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
 const scope={core:Core,drafts,crypto:globalThis.crypto,loadedVersion:1,viewerName:'Crew',viewerRole:'Lighting',viewer:{id:'share'},notes,guidance:()=>identity.focus(),el:(tag,text='',cls='')=>{const node=new ShareTestElement(tag);node.textContent=text;node.className=cls;node.scrollHeight=24;return node},bridge:{resizePatch(){}},showError:e=>errors.push(e.message),request:async(target,route,method,data)=>{requests.push({...data});return respond(data)},decorate(){},updateViewerStatus(){},document:{},refreshViewer:async()=>{}};
 vm.createContext(scope);vm.runInContext(sharingSource.slice(sharingSource.indexOf(' function attachNoteEditor('),sharingSource.indexOf(' async function prepareSnapshot(')),scope);
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
ShareTestElement.prototype.contains=function(target){return this===target||this.children.some(child=>child.contains?.(target))};
ShareTestElement.prototype.removeAttribute=function(key){delete this.attributes[key]};
Object.defineProperty(ShareTestElement.prototype,'classList',{get(){return {add:(name)=>{if(!this.className.split(' ').includes(name))this.className+=' '+name},contains:name=>this.className.split(' ').includes(name)}}});
const originalQuery=ShareTestElement.prototype.querySelectorAll;
ShareTestElement.prototype.querySelectorAll=function(selector){if(selector==='h1'){const found=[];const walk=n=>{for(const child of n.children){if(child.tagName==='h1')found.push(child);walk(child)}};walk(this);return found}return originalQuery.call(this,selector)};
(async()=>{
 const body=new ShareTestElement('body'),sheet=new ShareTestElement('main');body.append(sheet);const existingHeader=new ShareTestElement('header');existingHeader.className='topHeader';body.append(existingHeader);let renders=0,headerRenders=0,loaded;
 const data=Core.snapshot({title:'Shared show',fixtures:[{id:'one',fixture:'Wash'}],logos:{tour:{name:'Tour',dataUrl:'data:image/png;base64,AAAA'},vendor:{name:'Vendor',dataUrl:'data:image/png;base64,AAAA'},secondary:{name:'Personal',dataUrl:'data:image/png;base64,AAAA'}},summaryNotes:['Keep clear'],control:{consoles:[],npus:[],parameters:0}});
 const events={},document={body,addEventListener:(name,fn,capture)=>{events[name]=fn;assert.equal(capture,true)},createElement:tag=>new ShareTestElement(tag),querySelector:s=>body.querySelector(s),querySelectorAll:s=>body.querySelectorAll(s),getElementById:id=>id==='sheet'?sheet:null};
 const scope={document,location:{href:'https://lampy.example/#patch-view=share.'+'b'.repeat(64),hash:'#patch-view=share.'+'b'.repeat(64)},URL,AbortSignal,crypto:globalThis.crypto,sessionStorage:{getItem:()=>JSON.stringify({name:'Crew',role:'Lighting'}),setItem(){}},localStorage:{getItem:()=> '1',setItem(){}},LampyShareCore:Core,setInterval(){},addEventListener(){},fetch:async url=>Response.json(String(url).endsWith('patch-sharing-config.json')?{apiURL:'https://api.example/shares/'}:{version:1,snapshot:data,notes:[],more:false})};scope.window=scope;
 vm.runInNewContext(sharingSource,scope);
 const make=(cls)=>{const node=new ShareTestElement('div');node.className=cls;return node};
 await scope.LampyPatchShare.setup({load:value=>loaded=value,renderHeader:()=>{headerRenders++},renderPatch:()=>{renders++;const patch=make('fixturePatchView'),toolbar=make('fixturePatchToolbar');toolbar.append(make('fixturePatchToolbarLeft'),make('fixturePatchStats'),make('fixturePatchToolbarRight'));patch.append(toolbar,make('fixturePatchControlBody'),make('fixturePatchPage'));sheet.append(patch)},fixtureSummary:()=>'<div>Fixture summary</div>',positionSummary:()=>'<div>Position summary</div>',controlMarkup:()=>'<table>Console Info</table>',exportPatch(){}});
 assert.equal(loaded.title,'Shared show');assert.equal(renders,1);const patch=sheet.querySelector('.fixturePatchView');assert(patch.querySelector('.fixturePatchControlBody'));assert(patch.querySelector('.fixturePatchStats'));
 const buttons=patch.querySelector('.fixturePatchToolbarLeft').children;await buttons[0].onclick();assert.equal(renders,1);assert.equal(sheet.querySelector('.fixturePatchView'),patch);assert(body.querySelector('.shareSummaryPane').text.includes('Fixture Summary'));
 await buttons[1].onclick();assert.equal(renders,1);assert(body.querySelector('.shareSummaryPane').text.includes('Position Summary'));
 const head=body.querySelector('.shareViewerHeader');assert.equal(head,existingHeader,'Keep the actual app header, not a second copy');assert.equal(headerRenders,1);assert(!head.querySelector('.shareIdentity'));assert(body.classList.contains('hasAppNavigation'));events.click({target:body.querySelector('.shareSummaryPane').children[0]});assert(body.querySelector('.shareSummaryPane'));events.click({target:sheet});assert.equal(body.querySelector('.shareSummaryPane'),null);assert(patch.text.includes('Keep clear'));
 console.log('PASS: main patch renderer and controls retained, summaries open beside the patch, all header logos and shared notes displayed.');
})().catch(error=>{console.error(error);process.exitCode=1});

(async()=>{
 let width,height;
 class LogoImage{constructor(){this.naturalWidth=2400;this.naturalHeight=1200}set src(value){queueMicrotask(()=>this.onload())}}
 const scope={bridge:{snapshot:()=>({fixtures:[{id:'one'}],logos:{tour:{name:'Tour',dataUrl:'data:image/png;base64,'+'A'.repeat(200004)}}})},core:Core,Image:LogoImage,URL,location:{href:'https://lampy.example/',origin:'https://lampy.example'},setTimeout,clearTimeout,document:{createElement:()=>({set width(v){width=v},get width(){return width},set height(v){height=v},get height(){return height},getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/webp;base64,AAAA'})}};
 vm.createContext(scope);vm.runInContext(sharingSource.slice(sharingSource.indexOf(' async function prepareSnapshot('),sharingSource.indexOf(' async function setup(')),scope);
 const result=await scope.prepareSnapshot();assert.equal(width,600);assert.equal(height,300);assert.equal(result.logos.tour.dataUrl,'data:image/webp;base64,AAAA');
 scope.bridge.snapshot=()=>({fixtures:[{id:'one'}],logos:{tour:{dataUrl:'data:image/png;base64,AAAA'}}});assert.equal((await scope.prepareSnapshot()).logos.tour.dataUrl,'data:image/png;base64,AAAA');
 scope.bridge.snapshot=()=>({fixtures:[{id:'one'}],logos:{tour:{src:'https://external.test/logo.png'}}});await assert.rejects(scope.prepareSnapshot(),/project image or a bundled logo/);
 console.log('PASS: logos are bounded raster snapshots; unrelated remote logo URLs are rejected.');
})().catch(error=>{console.error(error);process.exitCode=1});

// Owner/viewer PDF chrome and saved output choices must round-trip through the server allowlist.
const Filenames=require('../js/pdf-filenames.js');
const pdfOwner={file:{projectName:'Test Show',version:'7',versionDate:'2026-11-28',projectOwner:'Owner',email:'private@example.test',includeOwnerDetailsInPdfFooters:false},production:{lightingVendor:'Test Vendor'},exportLogos:{tour:true,vendor:false,secondary:true},projectSettings:{pdf:{paper:'A3',orientation:'portrait',dpi:150,firstHeader:{title:{font:'Arial',size:20,bold:true,colour:'#112233'},subtitle:{font:'Arial',size:18,bold:true,colour:'#112233'}},laterHeader:{font:'Arial',size:7,bold:false,colour:'#111111',left:'{project}',centre:'{document}',right:'Version {version}'},footer:{left:'Page {page} of {pages}',centre:'{project} • Version {version}',right:'{owner}\n{email}',style:{font:'Arial',size:7,colour:'#111111'}},documentDefaults:{patch:{paper:'A3',orientation:'portrait',dpi:150,headerMainSize:20,headerSubSize:18}},fileNames:{parts:[{field:'version'},{field:'document'},{field:'vendor'}]}}}};
let pdfProject=structuredClone(pdfOwner);
const pdfContext={ensureProjectInfo:()=>pdfProject,LampyPdfFilenames:Filenames,fixturePatchViewOptions:{pdf:{showControl:false,showSummary:false,showRevisionNotes:false,showSummaryNotes:true,showUniverseTotal:false,headerMainSize:20,headerSubSize:18}},pdfLinkedTemplateValues:()=>({}),formatDisplayDate:x=>x,escapeHtml:value=>String(value??''),escapeAttr:value=>String(value??'')};
vm.createContext(pdfContext);
for(const name of ['fixturePatchSharePdfSettings','pdfTemplateValues','pdfPageFooterMarkup','pdfLaterPageHeaderMarkup'])vm.runInContext(html.match(new RegExp('function '+name+'\\([^\\n]+'))[0],pdfContext);
vm.runInContext(html.slice(html.indexOf('function expandPdfTemplate('),html.indexOf('\nfunction ',html.indexOf('function expandPdfTemplate(')+1)),pdfContext);
const ownerFooter=pdfContext.pdfPageFooterMarkup('Fixture Patch'),ownerHeader=pdfContext.pdfLaterPageHeaderMarkup('Fixture Patch');
const published=Core.snapshot({fixtures:[{id:'fixture'}],pdfExport:pdfContext.fixturePatchSharePdfSettings()}).pdfExport;
assert.equal(published.project.paper,'A3');assert.equal(published.project.orientation,'portrait');assert.equal(published.options.showControl,false);assert.equal(published.options.showSummary,false);assert.equal(published.logos.vendor,false);assert(!JSON.stringify(published).includes('private@example.test'),'Unselected private footer contact must not leak');assert.equal(published.project.footer.right,'');
assert.deepEqual(Core.snapshot({fixtures:[{id:'fixture'}],pdfExport:published}).pdfExport,published);
pdfProject={file:{projectName:'Test Show',version:published.version,versionDate:published.versionDate},projectSettings:{pdf:published.project},production:{}};
assert.equal(pdfContext.pdfPageFooterMarkup('Fixture Patch'),ownerFooter);assert.equal(pdfContext.pdfLaterPageHeaderMarkup('Fixture Patch'),ownerHeader);
assert.equal(Filenames.filename(published.project.fileNames,'patch',pdfProject,new Date(2026,10,28)),Filenames.filename(pdfOwner.projectSettings.pdf.fileNames,'patch',pdfOwner,new Date(2026,10,28)));
const sharingCss=fs.readFileSync('js/patch-sharing.css','utf8');
assert(!sharingCss.includes('.topHeader:not(.shareViewerHeader)'));assert(!sharingCss.includes('.shareViewerHeader h1{'));assert(!sharingCss.includes('min-height:24px'));
assert.match(sharingCss,/\.shareNoteEntry\{position:absolute;[^}]+height:100%;min-width:0;min-height:0/);
assert(!sharingSource.includes("field.style.height=Math.max(24"));assert(html.includes('exportPatch:()=>openFixturePatchPdfPreview()'));
console.log('PASS: owner/viewer PDF settings, chrome and filenames match; unselected contacts stay private; note input adds no normal-flow height.');

// First-open identity belongs to the guidance dialog, never the page header.
{
 const body=new ShareTestElement('body'),saved=[];
 const scope={viewer:{id:'demo'},viewerName:'',viewerRole:'',sessionStorage:{setItem:(k,v)=>saved.push([k,JSON.parse(v)])},dialog:()=>{const d=new ShareTestElement('dialog');body.append(d);return d},el:(tag,text='',cls='')=>{const n=new ShareTestElement(tag);n.textContent=text;n.className=cls;n.value='';n.reportValidity=()=>{n.invalid=true};return n}};
 vm.createContext(scope);vm.runInContext(sharingSource.slice(sharingSource.indexOf(' function guidance('),sharingSource.indexOf(' function updateViewerStatus(')),scope);
 const d=scope.guidance(),form=d.children.find(n=>n.tagName==='form'),fields=form.children[0].children.map(n=>n.children[0]);
 assert.deepEqual(fields.map(n=>n.name),['name','role']);assert(fields.every(n=>n.required));
 fields[0].value='   ';form.onsubmit({preventDefault(){}});assert.equal(saved.length,0);assert(fields[0].invalid);
 fields[0].value=' Crew ';fields[1].value=' Lighting ';form.onsubmit({preventDefault(){}});assert.equal(scope.viewerName,'Crew');assert.equal(scope.viewerRole,'Lighting');assert.equal(saved[0][1].name,'Crew');
}
assert.equal(Core.snapshot({fixtures:[{id:'a'}],patchName:'Tour Patch',logoVisibility:{vendor:false,secondary:true}}).patchName,'Tour Patch');
assert.equal(Core.snapshot({fixtures:[{id:'a'}],logoVisibility:{vendor:false}}).logoVisibility.vendor,false);
console.log('PASS: original app header reused, opening dialog validates and remembers per-session note identity.');

// Fix IDs keep the requested point size even with saved overrides or narrow cells.
{
 const scope={fixturePatchViewOptions:{tableFormats:{fixId:{fontSize:8,unit:'px'}}},patchFormatCss:x=>x,patchColumnDefaultFormat:()=>({fontSize:16,unit:'pt'}),document:{}};
 vm.createContext(scope);vm.runInContext(html.match(/function patchTableFormatCss\([^\n]+/)[0],scope);assert.equal(scope.patchTableFormatCss('fixId').fontSize,16);assert.equal(scope.patchTableFormatCss('fixId').unit,'pt');
 const fields=['1','12','123','1234'].map(text=>({textContent:text,style:{},dataset:{},scrollWidth:300,clientWidth:30,closest:s=>s.includes('fixId')?{}:null}));
 vm.runInContext(html.match(/function fitPatchTableText\([^\n]+/)[0],scope);scope.fitPatchTableText({querySelectorAll:()=>fields});assert(fields.every(f=>f.style.fontSize==='16pt'));
}
console.log('PASS: 1–4 digit Fix IDs remain 16 pt with no per-cell font fitting.');

(async()=>{
 const writes=[],scope={navigator:{clipboard:{writeText:async value=>writes.push(value)}},document:{execCommand:()=>false},el:(tag,text='',cls='')=>{const n=new ShareTestElement(tag);n.textContent=text;n.className=cls;n.select=()=>{n.selected=true};return n},button:(label,run)=>{const n=new ShareTestElement('button');n.textContent=label;n.onclick=run;return n}};
 vm.createContext(scope);vm.runInContext(sharingSource.slice(sharingSource.indexOf(' function linkField('),sharingSource.indexOf(' async function refresh(')),scope);
 const d=new ShareTestElement('dialog');scope.linkField(d,'Viewer link','https://example.test/#viewer','Copy viewer link');scope.linkField(d,'Private link','https://example.test/#owner','Copy private link');
 const copy=d.children.map(block=>block.querySelector('.shareCopyActions').children[0]);await copy[0].onclick();await copy[1].onclick();assert.deepEqual(writes,['https://example.test/#viewer','https://example.test/#owner']);assert(d.children.every(block=>block.children[1].className==='shareCopyActions'));
 scope.navigator.clipboard.writeText=async()=>{throw Error('blocked')};scope.document.execCommand=cmd=>cmd==='copy';await copy[0].onclick();assert(d.children[0].querySelector('.shareLink').selected);scope.document.execCommand=()=>false;await assert.rejects(copy[1].onclick(),/copying was blocked/);assert.equal(d.children[1].querySelector('.shareCopyStatus').textContent,'');
 console.log('PASS: both link Copy buttons write the exact link, confirm success and handle clipboard rejection honestly.');
})().catch(error=>{console.error(error);process.exitCode=1});
{
 const nav=new ShareTestElement('button'),icon=new ShareTestElement('span'),svg=new ShareTestElement('svg');icon.className='appNavigationIcon';icon.append(svg);nav.append(icon);
 const scope={notes:[{seq:1},{seq:2},{seq:3}],state:{readSeq:1},bridge:{},document:{querySelector:()=>nav,querySelectorAll:()=>[]},el:(tag,text,cls)=>{const n=new ShareTestElement(tag);n.textContent=text;n.className=cls;return n}};
 vm.createContext(scope);vm.runInContext(sharingSource.slice(sharingSource.indexOf(' function decorate('),sharingSource.indexOf(' function dialog(')),scope);scope.renderGeneralNotes=()=>{};scope.decorate();assert.equal(icon.querySelector('.shareBadge').textContent,'2');assert.equal(icon.children[0],svg);assert.equal(nav.children.length,1);assert.equal(nav.attributes['aria-description'],'2 unread viewer notes');scope.state.readSeq=3;scope.decorate();assert.equal(icon.querySelector('.shareBadge'),null);assert.equal(icon.children[0],svg);
}
console.log('PASS: unread count sits inside the existing icon anchor; zero unread notes remove the badge.');

// General notes and reply composers retain failed drafts and retry exactly once per request identity.
(async()=>{
 const requests=[],notes=[],replyDrafts=new Map(),savedIdentity={};let response=async data=>({seq:notes.length+1,...data}),closed=0;
 const scope={core:Core,crypto:globalThis.crypto,isViewer:true,loadedVersion:3,state:{version:3},viewer:{id:'share'},connection:null,viewerName:'Crew',viewerRole:'Lighting',replyDrafts,generalDraft:null,notes,bridge:{},document:{},sessionStorage:{getItem:()=>null,setItem:(k,v)=>savedIdentity[k]=v},decorate(){},updateViewerStatus(){},refresh:async()=>{},el:(tag,text='',cls='')=>{const n=new ShareTestElement(tag);n.textContent=text;n.className=cls;return n},request:async(target,action,method,data)=>{requests.push({...data});return response(data)}};
 vm.createContext(scope);vm.runInContext(sharingSource.slice(sharingSource.indexOf(' function newNoteDraft('),sharingSource.indexOf(' function replyDialog(')),scope);
 const host=new ShareTestElement('section'),field=scope.noteComposer(host,{done:()=>closed++}),form=host.children[0];field.value='General note';field.oninput();
 response=async()=>{throw Error('Offline')};await form.onsubmit({preventDefault(){}});assert.equal(scope.generalDraft.body,'General note');assert(scope.generalDraft.error.includes('Offline'));assert.equal(closed,0);
 response=async data=>({seq:1,...data});await form.onsubmit({preventDefault(){}});assert.equal(requests[0].requestId,requests[1].requestId);assert.equal(notes[0].scope,'patch');assert.equal(notes[0].fixtureId,'');assert.equal(scope.generalDraft.body,'');assert.equal(closed,1);
 scope.loadedVersion=4;const newer=new ShareTestElement('section');scope.noteComposer(newer,{done(){}});assert.equal(scope.generalDraft.version,4,'An empty reused composer takes the latest snapshot version');
 const parent={seq:8,fixtureId:'fixture-1',scope:'fixture',name:'First crew'},replyHost=new ShareTestElement('dialog');const replyField=scope.noteComposer(replyHost,{parent,done:()=>closed++});replyField.value='Reply content';replyField.oninput();await replyHost.children[0].onsubmit({preventDefault(){}});const payload=requests.at(-1);assert.equal(payload.parentSeq,8);assert.equal(payload.fixtureId,'fixture-1');assert.equal(payload.body,'Reply content');assert.equal(payload.name,'Crew');assert.equal(payload.version,4);
 scope.isViewer=false;scope.connection={id:'share',owner:'private'};scope.bridge.ownerIdentity=()=>({name:'Owner',role:''});const ownerHost=new ShareTestElement('dialog');scope.noteComposer(ownerHost,{parent,done(){}});const identityFields=ownerHost.children[0].children[0].children.map(n=>n.children[0]);assert.equal(identityFields.length,2);assert.equal(identityFields[0].value,'Owner');assert.equal(identityFields[1].required,true);
 const threading={notes:[{...parent,body:'Original',jobRole:'Crew'},{seq:9,parentSeq:8,fixtureId:'fixture-1',name:'Second',jobRole:'Crew',body:'Reply',authorType:'viewer'}],isViewer:true,state:{},connection:null,core:Core,el:scope.el,button:(text,run,cls)=>{const n=scope.el('button',text,cls);n.onclick=run;return n},replyDialog(){}};vm.createContext(threading);vm.runInContext(sharingSource.slice(sharingSource.indexOf(' function noteCard('),sharingSource.indexOf(' function generalNotes(')),threading);const card=threading.noteCard(threading.notes[0]);assert.equal(card.querySelectorAll('.shareReplyButton').length,1);assert.equal(card.querySelectorAll('.shareNoteReply').length,1);assert(threading.noteText('fixture-1').includes('Reply — Second'));
 console.log('PASS: general note and reply composer identity, parent linkage, failed-draft retention, idempotent retry, refreshed versions and threaded rendering.');
})().catch(error=>{console.error(error);process.exitCode=1});

// Keep the anchored general-note popup within narrow viewports and flip it above a low anchor.
{
 let rect={top:320,right:351};const dock={style:{},getBoundingClientRect:()=>({height:42.5})},popup={style:{}};
 const scope={generalAnchor:{getBoundingClientRect:()=>rect},generalDock:dock,generalPopup:popup,document:{documentElement:{clientWidth:375}},window:{innerWidth:390,innerHeight:844}};
 vm.createContext(scope);vm.runInContext(sharingSource.slice(sharingSource.indexOf(' function positionGeneralNote('),sharingSource.indexOf(' function mountGeneralNote(')),scope);scope.positionGeneralNote();
 assert.equal(popup.style.width,'351px');assert.equal(popup.style.right,'12px');assert.equal(dock.style.right,'24px');assert(parseFloat(popup.style.top)+parseFloat(popup.style.maxHeight)<=844);
 rect={top:760,right:351};scope.positionGeneralNote();assert.equal(popup.style.top,'auto');assert(parseFloat(popup.style.bottom)>0);assert(parseFloat(popup.style.maxHeight)<760);
 console.log('PASS: general-note popup remains inside narrow viewports and opens above low anchors.');
}
