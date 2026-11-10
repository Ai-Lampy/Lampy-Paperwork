'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const api=require('../js/patch-address-review.js'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
function row(id,fixId,address,channels=10,universe='1',location='Front'){return {id,fixId,address:String(address),channels,universe,location,fixture:'Lamp',mode:'Standard'}}
const original=[row('prior','1',1,5),row('edited','10',60),row('later','2',100,20),row('last','11',150,5),row('other','3',80,10,'2')];
const frozen=JSON.stringify(original),proposed=api.downstream(original,[{id:'edited',value:'100'}]);
assert.deepEqual(proposed.map(r=>[r.id,r.address]),[['later','100'],['edited','120'],['last','130']]);assert.equal(JSON.stringify(original),frozen);
assert(api.validate(original,proposed).every(r=>r.state==='valid'));
assert.deepEqual(api.sort([row('empty','',1),row('one','1',1)]).map(r=>r.id),['one','empty']);
assert.deepEqual(api.sort([row('a','2',1),row('b','10',1),row('c','2',1)]).map(r=>r.id),['a','c','b']);
assert.deepEqual(api.grouped([row('a','10',30,20),row('b','2',60,10),row('c','4',100,5,'2')],'1').map(r=>[r.id,r.address,r.universe]),[['b','1','1'],['a','11','1'],['c','1','2']]);
assert.equal(api.downstream([...original,row('blank','20','')],[{id:'blank',value:'200'}]).length,1);
assert.equal(api.downstream(original,[{id:'edited',value:''}]).length,1);
const collision=api.validate(original,[{...original[1],address:'1'}]);assert.equal(collision[0].state,'invalid');assert.match(collision[0].errors.join(' '),/Fix ID 1/);
const internal=api.validate(original,[{...original[1],address:'200'},{...original[2],address:'201'}]);assert(internal.every(r=>r.state==='invalid'));
for(const change of [{address:'0'},{address:'1.5'},{address:'x'},{address:'513'},{address:'500',channels:20},{address:'200',universe:''},{address:'200',channels:0}])assert.equal(api.validate(original,[{...original[1],...change}])[0].state,'invalid',JSON.stringify(change));
assert.equal(api.validate(original,[{...original[1],address:''}])[0].state,'blank');
assert.equal(api.confirmed(original,[{...original[1],address:'1'}])[0].address,'');assert.equal(original[0].address,'1');
const overrides=api.downstream(original,[{id:'edited',value:'200'},{id:'last',value:'400'}]);assert.equal(overrides.find(r=>r.id==='edited').address,'200');assert.equal(overrides.find(r=>r.id==='last').address,'400');
function context(){
 const nodes=new Map(),events={saves:0,renders:0,reviews:0,syncs:0,alerts:[]};
 const c=vm.createContext({LampyPatchHistory:require('../js/patch-history.js'),patchUndoPending:null,patchUndoEpoch:0,patchUndoBatchDepth:0,repositoryGdtfBytes:new Map(),refreshPatchOops(){},confirm:()=>true,duplicateAddressRows:new Set(),duplicatePatchRows:new Set(),universeSelectedIds:new Set(),clearFixturePickerThumbnails(){},refreshOpenPdfPreview(){},LampyPatchAddress:api,console,app:{fixturePatch:plain(original),patchSheets:[],projectInfo:{positions:[],fixtureOverrides:{}},gdtfFiles:{},gdtfMatches:{},controlNetwork:{}},fixturePatchKeyboardNavigating:false,patchPadlockSessions:new Map(),unlockedPatchGroups:new Set(),patchAddressReview:null,patchGroupEditPositionFilter:'*',selectedPatchGroupEditIds:new Set(['edited','later','last']),fixturePatchUndoHistory:[],activePatchSheetId:'master',selectedPatchRows:new Set(),selectedPatchCells:new Set(),activePatchCellChange:null,confirmedDuplicateAddressKeys:new Set(),showPatchUndoList:false,patchGroupUnlocked:()=>true,positionKey:v=>String(v||'').trim().toLowerCase(),normalisePatchSheets:v=>v,render:()=>events.renders++,persist:()=>{c.commitFixturePatchUndo();events.saves++},refreshHomeIfActive(){},syncPositionsFromPatch(){events.syncs++},closePatchGroupEditModal(){},alert:m=>events.alerts.push(m),renderPatchAddressReview:()=>events.reviews++,document:{querySelectorAll:()=>[],querySelector:()=>({innerHTML:''})},$:id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',classList:{add(){},remove(){}},focus(){}});return nodes.get(id)}});
 c.patchFixtureRows=()=>c.app.fixturePatch;c.patchGroupEditRows=()=>c.app.fixturePatch.filter(r=>['edited','later','last'].includes(r.id));c.ensureProjectInfo=()=>c.app.projectInfo;
 for(const name of ['patchPadlockRows','patchPadlockSession','refreshPatchPadlockInputs','stagePatchPadlockProposals','stagePatchPadlockFields','finishPatchPadlockSession','reviewPatchPadlockSession','togglePatchGroupLock','patchGroupKey','cancelPatchFieldUndo','captureFixturePatchUndo','restoreFixturePatchUndo','commitFixturePatchUndo','clonePatchState','patchAddressSnapshot','openPatchAddressReview','closePatchAddressReview','confirmPatchAddressReview','reviewPatchAddressEdits','updatePatchRowField','recordFixturePatchUndo','undoFixturePatchChange','patchGroupVisibleEditRows','selectedPatchGroupRows','setPatchGroupEditPositionFilter','renderPatchGroupEditSelectionState','toggleAllPatchGroupEditUnits','confirmPatchGroupEdit'])vm.runInContext(source(name),c);
 c.patchGroupEditUnitMarkup=r=>r.id;c.applyPatchField=(r,f,v)=>{if(f==='mode'){r.mode=v;r.channels=30}else r[f]=v};c.incrementMaybe=(v,i)=>String(Number(v)+i);c.colourTextToHex=v=>v;
 return {c,nodes,events};
}
{
 const {c,events}=context(),before=JSON.stringify(c.app),input={dataset:{patchId:'edited',patchField:'address'},value:'200'};
 c.updatePatchRowField(input,false);assert.equal(c.patchAddressReview,null);assert.equal(JSON.stringify(c.app),before);assert.equal(events.saves,0);
 c.updatePatchRowField(input,true);assert(c.patchAddressReview);assert.equal(JSON.stringify(c.app),before);assert.equal(events.reviews,1);c.updatePatchRowField(input,true);assert.equal(events.reviews,1);
 c.closePatchAddressReview();assert.equal(JSON.stringify(c.app),before);assert.equal(events.saves,0);
 c.reviewPatchAddressEdits([{id:'edited',value:'200'}]);c.patchAddressReview.proposals.find(r=>r.id==='last').address='520';c.confirmPatchAddressReview();assert.equal(events.saves,1);assert.equal(events.syncs,0);assert.equal(c.fixturePatchUndoHistory.length,1);assert.equal(c.app.fixturePatch.find(r=>r.id==='last').address,'');assert.equal(c.app.fixturePatch.find(r=>r.id==='last').universe,'1');assert.equal(c.app.fixturePatch.find(r=>r.id==='other').address,'80');
 c.undoFixturePatchChange(0);assert.equal(JSON.stringify(c.app),before);assert.equal(events.saves,2);
 c.reviewPatchAddressEdits([{id:'edited',value:'200'}]);c.app.fixturePatch[0].address='9';c.confirmPatchAddressReview();assert.equal(c.patchAddressReview,null);assert.equal(events.saves,2);assert.match(events.alerts[0],/changed/);assert.equal(c.app.fixturePatch[0].address,'9');
}
{
 const {c,events,nodes}=context();c.app.fixturePatch[2].location='Back';c.setPatchGroupEditPositionFilter('back');assert.deepEqual([...c.selectedPatchGroupEditIds],['later']);c.toggleAllPatchGroupEditUnits(false);assert.equal(c.selectedPatchGroupEditIds.size,0);c.toggleAllPatchGroupEditUnits(true);assert.deepEqual([...c.selectedPatchGroupEditIds],['later']);
 c.patchGroupEditPositionFilter='*';c.selectedPatchGroupEditIds=new Set(['edited','later']);c.document.querySelectorAll=()=>[{dataset:{patchGroupApply:'address'}}];c.$('patchGroupEdit_address').value='10';c.confirmPatchGroupEdit();assert.deepEqual(plain(c.patchAddressReview.proposals.map(r=>[r.id,r.address])),[['later','10'],['edited','30']]);assert.equal(events.saves,0);c.closePatchAddressReview();
 c.document.querySelectorAll=()=>['address','mode','universe'].map(field=>({dataset:{patchGroupApply:field}}));c.$('patchGroupEdit_mode').value='New';c.$('patchGroupEdit_universe').value='7';c.confirmPatchGroupEdit();assert.deepEqual(plain(c.patchAddressReview.proposals.map(r=>[r.id,r.address,r.channels,r.universe])),[['later','10',30,'7'],['edited','40',30,'7']]);assert.equal(c.app.fixturePatch[1].mode,'Standard');assert.equal(events.saves,0);
}
// Fixture Type Options must use the same filtered rows as the live Patch.
{
 const {c,events}=context();
 c.activePatchGroupEditKey='Lamp';
 c.patchGroupKey=r=>r.fixture;
 c.activePatchRows=()=>c.app.fixturePatch;
 c.activePatchSheet=()=>null;
 c.patchCompareRows=(a,b)=>Number(a.fixId)-Number(b.fixId);
 c.fixturePatchViewOptions={filters:{type:'',universe:'',position:''}};
 c.renderPatchGroupEditModal=()=>{};
 for(const name of ['visiblePatchRows','patchGroupEditRows','openPatchGroupEdit'])vm.runInContext(source(name),c);
 const ids=()=>plain(c.selectedPatchGroupRows().map(r=>r.id));
 c.app.fixturePatch[2].location='Back';
 c.fixturePatchViewOptions.filters={type:'Lamp',universe:'1',position:'Front'};
 c.openPatchGroupEdit('Lamp');assert.deepEqual(ids(),['prior','edited','last']);
 c.toggleAllPatchGroupEditUnits(false);c.toggleAllPatchGroupEditUnits(true);assert.deepEqual(ids(),['prior','edited','last']);
 c.setPatchGroupEditPositionFilter('back');assert.deepEqual(ids(),[]);
 c.setPatchGroupEditPositionFilter('*');c.toggleAllPatchGroupEditUnits(true);
 c.document.querySelectorAll=()=>[{dataset:{patchGroupApply:'address'}}];
 c.$('patchGroupEdit_address').value='200';c.confirmPatchGroupEdit();
 assert.deepEqual(plain(c.patchAddressReview.proposals.map(r=>r.id)),['prior','edited','last']);
 assert.equal(events.saves,0);
 c.fixturePatchViewOptions.filters={type:'Lamp',universe:'2',position:''};
 c.openPatchGroupEdit('Lamp');assert.deepEqual(ids(),['other']);
 c.fixturePatchViewOptions.filters={type:'Different',universe:'',position:''};
 c.openPatchGroupEdit('Lamp');assert.deepEqual(ids(),[]);
 c.fixturePatchViewOptions.filters={type:'',universe:'',position:''};
 c.openPatchGroupEdit('Lamp');assert.equal(ids().length,5);
}
// Drive the actual delegated paste/keyboard callbacks without a browser.
{
 const {c,events}=context(),handlers={},controls=[{dataset:{patchId:'edited',patchField:'address',patchGridRow:'0',patchGridCol:'0'},disabled:false,tagName:'INPUT',value:'60'},{dataset:{patchId:'later',patchField:'address',patchGridRow:'1',patchGridCol:'0'},disabled:false,tagName:'INPUT',value:'100'}],cells=controls.map(control=>({dataset:{},querySelector:()=>control})),table={querySelectorAll:()=>[],addEventListener:(name,callback)=>handlers[name]=callback};
 controls.forEach((control,index)=>control.closest=()=>cells[index]);vm.runInContext(source('patchCellPasteEdits'),c);c.fixturePatchEditableCells=()=>cells;c.fixturePatchControlAcceptsValue=()=>true;c.focusFixturePatchCell=()=>{throw Error('Must not navigate past a pending review')};vm.runInContext(source('attachFixturePatchTableEvents'),c);c.attachFixturePatchTableEvents(table);
 handlers.paste({target:{closest:()=>cells[0]},preventDefault(){},clipboardData:{getData:()=> '210\n240'}});assert.equal(events.reviews,1);assert.equal(events.saves,0);assert.equal(c.app.fixturePatch[1].address,'60');assert.equal(c.patchAddressReview.proposals.find(r=>r.id==='later').address,'240');c.closePatchAddressReview();
 controls[0].value='300';controls[0].closest=()=>cells[0];handlers.keydown({key:'Tab',target:controls[0],preventDefault(){}});assert.equal(events.reviews,2);assert.equal(events.saves,0);
}
// Drag-fill uses one staged operation and preserves its explicit target value.
{
 const {c,events}=context(),handlers={},windowHandlers={},controls=[{dataset:{patchId:'edited',patchField:'address',patchGridRow:'0',patchGridCol:'0'},value:'60'},{dataset:{patchId:'later',patchField:'address',patchGridRow:'1',patchGridCol:'0'},value:'100'}],table={querySelectorAll:()=>[]},cells=controls.map(control=>({dataset:{},classList:{add(){},remove(){}},querySelector:()=>control,closest:selector=>selector==='.fixturePatchEditableTable'?table:null}));
 const target={querySelector:()=>controls[1],closest:()=>table};c.fixturePatchEditableCells=()=>cells;c.document.body={classList:{add(){},remove(){}}};c.document.elementFromPoint=()=>({closest:()=>target});c.window={addEventListener:(name,callback)=>windowHandlers[name]=callback,removeEventListener(){}};
 const handle={parentElement:cells[0],setPointerCapture(){},addEventListener:(name,callback)=>handlers[name]=callback};vm.runInContext(source('attachFixturePatchFillHandle'),c);c.attachFixturePatchFillHandle(handle);handlers.pointerdown({preventDefault(){},stopPropagation(){},pointerId:1});windowHandlers.pointermove({clientX:0,clientY:0});windowHandlers.pointerup();
 assert.equal(events.reviews,1);assert.equal(events.saves,0);assert.equal(c.app.fixturePatch[2].address,'100');assert.equal(c.patchAddressReview.proposals.find(r=>r.id==='later').address,'60');
}
assert.match(html,/#patchGroupEditModal>\.modalCard\{max-height:95vh/);
assert.match(source('attachFixturePatchFillHandle'),/if\(field==='address'\).*reviewPatchAddressEdits\(edits,\[\],true\);return/s);
assert.match(html,/if\(e.key==='Escape'&&patchAddressReview\)/);
assert.match(html,/if\(id==='patchAddressReviewModal'\)\{closePatchAddressReview\(\);return\}/);
assert.match(html,/const VERSION='57\.14'/);
console.log('PASS: V50.3 position filtering, footprint sequences, downstream scope, staged edits/paste/keyboard, conflicts, cancellation, stale review and undo.');

// Padlock edits are a session draft. Only closing the padlock opens the review.
function unlock(c,id='edited'){
 c.activePatchSheet=()=>null;vm.runInContext(source('patchGroupUnlocked'),c);
 const key=c.patchGroupKey(c.patchPadlockRows().find(row=>row.id===id));c.togglePatchGroupLock(encodeURIComponent(key));return key;
}
{
 const {c,events}=context(),before=JSON.stringify(c.app),key=unlock(c),input={dataset:{patchId:'edited',patchField:'address'},value:'200'};
 c.updatePatchRowField(input,true);input.value='300';c.updatePatchRowField(input,true);
 c.updatePatchRowField({dataset:{patchId:'edited',patchField:'notes'},value:'Draft note'},true);
 c.updatePatchRowField({dataset:{patchId:'edited',patchField:'location'},value:'Rear'},true);
 assert.equal(events.reviews,0);assert.equal(events.saves,0);assert.equal(JSON.stringify(c.app),before);
 assert.equal(c.patchPadlockRows().find(r=>r.id==='edited').notes,'Draft note');
 const drafts=plain(c.patchPadlockRows());c.togglePatchGroupLock(encodeURIComponent(key));
 assert.equal(events.reviews,1);assert.equal(events.saves,0);assert(c.patchAddressReview.padlockSession);
 assert.equal(c.patchAddressReview.proposals.find(r=>r.id==='edited').location,'Rear');
 c.closePatchAddressReview();assert(c.patchGroupUnlocked(c.patchPadlockRows().find(r=>r.id==='edited')));assert.deepEqual(plain(c.patchPadlockRows()),drafts);assert.equal(JSON.stringify(c.app),before);
 c.togglePatchGroupLock(encodeURIComponent(key));c.patchAddressReview.proposals.find(r=>r.id==='last').address='520';c.confirmPatchAddressReview();
 assert.equal(events.saves,1);assert.equal(events.syncs,1);assert.equal(c.patchPadlockSessions.size,0);assert.equal(c.fixturePatchUndoHistory.length,1);
 assert.equal(c.app.fixturePatch.find(r=>r.id==='edited').notes,'Draft note');assert.equal(c.app.fixturePatch.find(r=>r.id==='last').address,'');
 assert(!c.patchGroupUnlocked(c.app.fixturePatch.find(r=>r.id==='edited')));
 c.undoFixturePatchChange(0);assert.equal(JSON.stringify(c.app),before);
}
// No-op locking, mode regrouping, fresh project state and independent unlocked groups.
{
 const {c,events}=context(),key=unlock(c);c.togglePatchGroupLock(encodeURIComponent(key));assert.equal(events.reviews,0);assert.equal(events.saves,0);
 unlock(c);c.reconcilePatchModeAddress=()=>{};
 c.updatePatchRowField({dataset:{patchId:'edited',patchField:'mode'},value:'New'},true);
 const edited=c.patchPadlockRows().find(r=>r.id==='edited'),newKey=c.patchGroupKey(edited);assert.notEqual(newKey,key);assert(c.patchGroupUnlocked(edited));
 c.togglePatchGroupLock(encodeURIComponent(newKey));assert.equal(events.reviews,1);c.confirmPatchAddressReview();assert.equal(c.app.fixturePatch.find(r=>r.id==='edited').mode,'New');assert.equal(c.patchPadlockSessions.size,0);
 unlock(c);vm.runInContext(source('resetFixturePatchUndo'),c);c.resetFixturePatchUndo();assert.equal(c.patchPadlockSessions.size,0);
}
// Paste, keyboard navigation and drag-fill use the same draft rather than interrupting edits.
{
 const {c,events}=context(),key=unlock(c),handlers={},windowHandlers={},controls=['edited','other'].map((id,index)=>({dataset:{patchId:id,patchField:'address',patchGridRow:String(index),patchGridCol:'0'},disabled:false,tagName:'INPUT',value:c.patchPadlockRows().find(r=>r.id===id).address}));
 const table={querySelectorAll:()=>[],addEventListener:(name,fn)=>handlers[name]=fn},cells=controls.map(control=>({dataset:{},classList:{add(){},remove(){}},querySelector:()=>control,closest:()=>table}));
 controls.forEach((control,i)=>control.closest=()=>cells[i]);c.fixturePatchEditableCells=()=>cells;c.fixturePatchControlAcceptsValue=()=>true;c.document.querySelectorAll=()=>controls;
 c.focusFixturePatchCell=()=>events.focus=(events.focus||0)+1;
 for(const name of ['patchCellPasteEdits','attachFixturePatchTableEvents','attachFixturePatchFillHandle'])vm.runInContext(source(name),c);
 c.attachFixturePatchTableEvents(table);handlers.paste({target:controls[0],preventDefault(){},clipboardData:{getData:()=> '210\n240'}});
 assert.equal(events.reviews,0);assert.equal(events.saves,0);assert.equal(controls[1].value,'240');
 controls[0].value='300';handlers.keydown({key:'Tab',target:controls[0],preventDefault(){}});assert.equal(events.focus,1);assert.equal(events.reviews,0);
 c.document.body={classList:{add(){},remove(){}}};c.document.elementFromPoint=()=>({closest:()=>cells[1]});c.window={addEventListener:(name,fn)=>windowHandlers[name]=fn,removeEventListener(){}};
 const handle={parentElement:cells[0],setPointerCapture(){},addEventListener:(name,fn)=>handlers[name]=fn};c.attachFixturePatchFillHandle(handle);handlers.pointerdown({preventDefault(){},stopPropagation(){},pointerId:1});windowHandlers.pointermove({clientX:0,clientY:0});windowHandlers.pointerup();
 assert.equal(events.reviews,0);assert.equal(events.saves,0);assert.equal(controls[1].value,controls[0].value);
 // A padlock click also flushes the focused field before any blur callback runs.
 controls[0].value='350';c.togglePatchGroupLock(encodeURIComponent(key));assert.equal(events.reviews,1);assert(c.patchAddressReview.proposals.some(r=>r.address==='350'));
}
// Merged universe/address edits, including a universe-only edit, are staged together.
{
 const {c,events}=context(),key=unlock(c),fields=['universe','address'].map(field=>({dataset:{patchId:'edited',patchField:field,patchMerged:'1'},value:field==='universe'?'4':'200'})),cell={querySelectorAll:()=>fields};
 fields.forEach(input=>input.closest=()=>cell);c.document.querySelectorAll=()=>fields;
 vm.runInContext(source('commitPatchMergedCell'),c);c.commitPatchMergedCell(cell);assert.equal(events.reviews,0);assert.equal(fields[0].value,'4');assert.equal(c.app.fixturePatch[1].universe,'1');
 fields[0].value='5';c.commitPatchMergedCell(cell);assert.equal(events.reviews,0);assert.equal(c.patchPadlockRows()[1].universe,'5');
 fields[0].value='6';c.togglePatchGroupLock(encodeURIComponent(key));assert.equal(events.reviews,1);assert.equal(c.patchAddressReview.proposals.find(r=>r.id==='edited').universe,'6');assert.equal(events.saves,0);
 c.app.fixturePatch[0].notes='Independent edit';c.confirmPatchAddressReview();assert.equal(events.saves,0);assert.equal(c.patchPadlockSessions.size,1);assert.match(events.alerts.at(-1),/changed/);
}
console.log('PASS: padlock draft cells, merged values, paste/fill, keyboard, finish-time flush, one review, cancel, stale review, mode regrouping, save and undo.');

// Reverting/escaping a field leaves no review, and separate groups retain their own drafts.
{
 const {c,events}=context(),key=unlock(c),input={dataset:{patchId:'edited',patchField:'notes'},value:'Typing'};
 c.updatePatchRowField(input,false);assert.equal(c.patchPadlockRows()[1].notes,'Typing');c.cancelPatchFieldUndo(input);assert.equal(c.patchPadlockRows()[1].notes??'','');
 c.togglePatchGroupLock(encodeURIComponent(key));assert.equal(events.reviews,0);assert.equal(events.saves,0);
 unlock(c);const secondKey=unlock(c,'last');
 c.updatePatchRowField({dataset:{patchId:'edited',patchField:'notes'},value:'First'},true);
 c.updatePatchRowField({dataset:{patchId:'last',patchField:'notes'},value:'Second'},true);
 c.togglePatchGroupLock(encodeURIComponent(key));c.confirmPatchAddressReview();
 assert.equal(c.app.fixturePatch[1].notes,'First');assert.equal(c.app.fixturePatch[3].notes,undefined);assert.equal(c.patchPadlockRows()[3].notes,'Second');assert.equal(c.patchPadlockSessions.size,1);
 c.togglePatchGroupLock(encodeURIComponent(secondKey));c.confirmPatchAddressReview();assert.equal(c.app.fixturePatch[3].notes,'Second');assert.equal(c.patchPadlockSessions.size,0);
}
