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
 const c=vm.createContext({LampyPatchAddress:api,console,app:{fixturePatch:plain(original),patchSheets:[],projectInfo:{positions:[]}},patchAddressReview:null,patchGroupEditPositionFilter:'*',selectedPatchGroupEditIds:new Set(['edited','later','last']),fixturePatchUndoHistory:[],activePatchSheetId:'master',selectedPatchRows:new Set(),selectedPatchCells:new Set(),activePatchCellChange:null,confirmedDuplicateAddressKeys:new Set(),showPatchUndoList:false,patchGroupUnlocked:()=>true,positionKey:v=>String(v||'').trim().toLowerCase(),normalisePatchSheets:v=>v,render:()=>events.renders++,persist:()=>events.saves++,refreshHomeIfActive(){},syncPositionsFromPatch(){events.syncs++},closePatchGroupEditModal(){},alert:m=>events.alerts.push(m),renderPatchAddressReview:()=>events.reviews++,document:{querySelectorAll:()=>[],querySelector:()=>({innerHTML:''})},$:id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',classList:{add(){},remove(){}},focus(){}});return nodes.get(id)}});
 c.patchFixtureRows=()=>c.app.fixturePatch;c.patchGroupEditRows=()=>c.app.fixturePatch.filter(r=>['edited','later','last'].includes(r.id));c.ensureProjectInfo=()=>c.app.projectInfo;
 for(const name of ['clonePatchState','patchAddressSnapshot','openPatchAddressReview','closePatchAddressReview','confirmPatchAddressReview','reviewPatchAddressEdits','updatePatchRowField','recordFixturePatchUndo','undoFixturePatchChange','patchGroupVisibleEditRows','selectedPatchGroupRows','setPatchGroupEditPositionFilter','renderPatchGroupEditSelectionState','toggleAllPatchGroupEditUnits','confirmPatchGroupEdit'])vm.runInContext(source(name),c);
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
// Drive the actual delegated paste/keyboard callbacks without a browser.
{
 const {c,events}=context(),handlers={},controls=[{dataset:{patchId:'edited',patchField:'address',patchGridRow:'0',patchGridCol:'0'},disabled:false,tagName:'INPUT',value:'60'},{dataset:{patchId:'later',patchField:'address',patchGridRow:'1',patchGridCol:'0'},disabled:false,tagName:'INPUT',value:'100'}],cells=controls.map(control=>({querySelector:()=>control})),table={querySelectorAll:()=>[],addEventListener:(name,callback)=>handlers[name]=callback};
 c.fixturePatchEditableCells=()=>cells;c.fixturePatchControlAcceptsValue=()=>true;c.focusFixturePatchCell=()=>{throw Error('Must not navigate past a pending review')};vm.runInContext(source('attachFixturePatchTableEvents'),c);c.attachFixturePatchTableEvents(table);
 handlers.paste({target:{closest:()=>cells[0]},preventDefault(){},clipboardData:{getData:()=> '210\n240'}});assert.equal(events.reviews,1);assert.equal(events.saves,0);assert.equal(c.app.fixturePatch[1].address,'60');assert.equal(c.patchAddressReview.proposals.find(r=>r.id==='later').address,'240');c.closePatchAddressReview();
 controls[0].value='300';controls[0].closest=()=>cells[0];handlers.keydown({key:'Tab',target:controls[0],preventDefault(){}});assert.equal(events.reviews,2);assert.equal(events.saves,0);
}
// Drag-fill uses one staged operation and preserves its explicit target value.
{
 const {c,events}=context(),handlers={},windowHandlers={},controls=[{dataset:{patchId:'edited',patchField:'address',patchGridRow:'0',patchGridCol:'0'},value:'60'},{dataset:{patchId:'later',patchField:'address',patchGridRow:'1',patchGridCol:'0'},value:'100'}],table={querySelectorAll:()=>[]},cells=controls.map(control=>({classList:{add(){},remove(){}},querySelector:()=>control,closest:selector=>selector==='.fixturePatchEditableTable'?table:null}));
 const target={querySelector:()=>controls[1],closest:()=>table};c.fixturePatchEditableCells=()=>cells;c.document.body={classList:{add(){},remove(){}}};c.document.elementFromPoint=()=>({closest:()=>target});c.window={addEventListener:(name,callback)=>windowHandlers[name]=callback,removeEventListener(){}};
 const handle={parentElement:cells[0],setPointerCapture(){},addEventListener:(name,callback)=>handlers[name]=callback};vm.runInContext(source('attachFixturePatchFillHandle'),c);c.attachFixturePatchFillHandle(handle);handlers.pointerdown({preventDefault(){},stopPropagation(){},pointerId:1});windowHandlers.pointermove({clientX:0,clientY:0});windowHandlers.pointerup();
 assert.equal(events.reviews,1);assert.equal(events.saves,0);assert.equal(c.app.fixturePatch[2].address,'100');assert.equal(c.patchAddressReview.proposals.find(r=>r.id==='later').address,'60');
}
assert.match(html,/#patchGroupEditModal>\.modalCard\{max-height:95vh/);
assert.match(source('attachFixturePatchFillHandle'),/if\(field==='address'\).*reviewPatchAddressEdits\(edits,\[\],true\);return/s);
assert.match(html,/if\(e.key==='Escape'&&patchAddressReview\)/);
assert.match(html,/if\(id==='patchAddressReviewModal'\)\{closePatchAddressReview\(\);return\}/);
assert.match(html,/const VERSION='50\.4'/);
console.log('PASS: V50.3 position filtering, footprint sequences, downstream scope, staged edits/paste/keyboard, conflicts, cancellation, stale review and undo.');
