'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const T=require('../js/truck-pack.js'),root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),ui=fs.readFileSync(path.join(root,'js/truck-pack-view.js'),'utf8');
function fn(text,name){const start=text.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=text.indexOf('}',start);end>=0;end=text.indexOf('}',end+1)){const value=text.slice(start,end+1);try{new Function('return ('+value+')');return value}catch{}}throw Error(name)}
const sharedColourContext=vm.createContext({colourTextToHex:value=>String(value||'').trim().toLowerCase(),normaliseHex:value=>String(value||'').toLowerCase()});vm.runInContext(fn(html,'colourSetPresentation'),sharedColourContext);
function testContext(values){if(values.host&&!values.host.querySelector)values.host.querySelector=()=>null;const context=vm.createContext({root:{},callbacks:{colourPresentation:values=>sharedColourContext.colourSetPresentation(values),stripeWidth:()=>4*96/25.4},selectedGroup:[],inspectorObserver:null,...values});for(const name of ['gridMarkup','caseColourMarkup','caseTextWidth','fitCaseLabel','caseLabelMarkup','selectionIds','selectionRect','casesInSelection','syncInspectorHeight','observeInspector'])vm.runInContext(fn(ui,name),context);return context}
const close=(a,b)=>assert(Math.abs(a-b)<.01,`${a} != ${b}`);
for(const [input,expected] of [['1 m',1000],['12.5 cm',125],['600 mm',600],[`5' 6"`,1676.4],['12"',304.8],[`1' 2 1/2"`,368.3],['½ m',null],['1/2"',12.7]])if(expected===null)assert.throws(()=>T.parseLength(input));else close(T.parseLength(input),expected);
for(const invalid of ['600','-1 m','NaN mm','1/0"','0 mm','10 yards','2 m garbage'])assert.throws(()=>T.parseLength(invalid));
assert.equal(T.parseLength('0 mm',true),0);close(T.parseWeight('10 lbs'),4.5359237);close(T.parseWeight('10','lb'),4.5359237);assert.equal(T.parseWeight('', 'kg',true),null);assert.throws(()=>T.parseWeight('heavy'));
for(const n of [25.4,1676.4,3000.125])close(T.parseLength(T.formatLength(n,'imperial')),n);
assert.equal(T.presets.length,5);assert.equal(T.presets.find(p=>p.id==='30-ft-urban').payload,null);assert.equal(T.presets.find(p=>p.id==='mega-box').length,13450);
const base=(id,values={})=>T.normaliseCase({id,name:id,type:'Case',width:1000,length:1200,height:500,heightIncludesWheels:true,casterHeight:80,weight:100,colour:'#6699aa',...values});
let model=T.empty();model.cases=[base('base'),base('small',{width:400,length:600,height:500,weight:20})];model.trucks=[T.normaliseTruck({...T.presets[0],id:'truck',name:'Test',items:[],payload:110})];model.activeTruckId='truck';let truck=model.trucks[0];
const [lower]=T.addItems(model,'truck','base',1),[upper]=T.addItems(model,'truck','small',1);assert(!lower.packed);assert.notEqual(lower.id,upper.id);
Object.assign(lower,{packed:true,x:0,y:0,z:0});assert.equal(T.truckError(model,truck),'');
assert(T.placement(model,truck,upper,{x:100,y:100,z:0}).error.includes('overlap'));
assert(T.placement(model,truck,upper,{x:2300,y:0,z:0}).error.includes('outside'));
assert(T.placement(model,truck,upper,{x:100,y:100,z:500}).error.includes('lifter'));
Object.assign(upper,{rideOnWheels:false,lifter:true});assert.deepEqual(Object.fromEntries(['width','length','height'].map(k=>[k,T.dimensions(model,upper)[k]])),{width:400,length:500,height:600});
const stacked=T.placement(model,truck,upper,{x:100,y:100,z:0});assert.equal(stacked.error,'');assert.equal(stacked.item.z,500);Object.assign(upper,stacked.item);assert.equal(T.truckError(model,truck),'');
assert(T.totals(model,truck).overPayload);assert.equal(T.totals(model,truck).packed,120);
assert(T.placement(model,truck,lower,{x:1100,y:0,z:0}).error.includes('supported'),'moving a supporting case must not strand a lifter');
assert(T.placement(model,truck,upper,{x:800,y:100,z:500},false).error.includes('supported'),'partial overhang cannot be stacked');
const saved=T.normalise(JSON.parse(JSON.stringify(model)));assert.deepEqual(saved,model);assert.equal(T.truckError(saved,saved.trucks[0]),'');
const invalid=JSON.parse(JSON.stringify(model));invalid.trucks[0].items[1].caseId='missing';assert.throws(()=>T.normalise(invalid),/inventory/);
const duplicate=JSON.parse(JSON.stringify(model));duplicate.cases.push(duplicate.cases[0]);assert.throws(()=>T.normalise(duplicate),/Duplicate/);
assert.throws(()=>T.normaliseCase({...base('test'),heightIncludesWheels:false,casterHeight:null}),/castor height/);
const withoutWheels=base('extra',{heightIncludesWheels:false,casterHeight:100});const extended={...model,cases:[withoutWheels]};close(T.dimensions(extended,{caseId:'extra',rideOnWheels:true}).height,600);
assert.equal(T.normaliseCase({...withoutWheels,type:'Truss',casterHeight:null}).casterHeight,null);
assert.throws(()=>T.normaliseCase({...withoutWheels,type:'Truss Case',casterHeight:null}),/castor height/,'a truss transport case must still include its castor height');
const rows=[['Box','Case','50 cm','1 m','800 mm','yes','22 lb'],['Beam','Truss','300 mm','2 m','300 mm','yes','10 kg']],headers=['Name','Type','W','L','H','Height Inc Wheels?','Weight'];
const imported=T.importRows(rows,T.suggestMapping(headers));assert.equal(imported.length,2);close(imported[0].weight,9.97903214);assert.equal(imported[0].width,500);assert.throws(()=>T.importRows([...rows,['Broken','Case','500','1 m','1 m','yes','1 kg']],T.suggestMapping(headers)),/Row 4/);
// Plain imported numbers use the selected units; explicit units retain precedence.
const dimensionHeaders=['Name','Width','Length','Height','Castor Height','Height Inc Wheels?','Weight'];
const dimensionMapping=T.suggestMapping(dimensionHeaders);
for(const [unit,factor] of [['mm',1],['cm',10],['m',1000],['ft',304.8],['in',25.4]]){
 const [record]=T.importRows([['Case',24,'24',12.75,2,'no',28]],dimensionMapping,'lb',unit);
 close(record.width,24*factor);close(record.length,24*factor);close(record.height,12.75*factor);close(record.casterHeight,2*factor);close(record.weight,12.70058636);
 const [mixed]=T.importRows([['Mixed','600 mm',24,'1 m','2 cm','yes','10 kg']],dimensionMapping,'lb',unit);
 close(mixed.width,600);close(mixed.length,24*factor);close(mixed.height,1000);close(mixed.casterHeight,20);close(mixed.weight,10);
}
assert.throws(()=>T.importRows([['Case',24,24,6]],dimensionMapping),/Select Dimension units/);
assert.throws(()=>T.importRows([['Case',24,24,6]],dimensionMapping,'kg','yards'),/valid dimension unit/);
for(const bad of ['',0,-2,'bad','2 yards','1/0'])assert.throws(()=>T.importRows([['Case',bad,24,6]],dimensionMapping,'kg','in'),/Row 2/);
const [fractional]=T.importRows([['Case','24 1/2','24','12.75',0]],dimensionMapping,'kg','in');close(fractional.width,622.3);assert.equal(fractional.casterHeight,0);
const [noCastor]=T.importRows([['Case',24,24,6]],dimensionMapping,'kg','in');assert.equal(noCastor.casterHeight,null);assert.equal(noCastor.weight,null);
for(const mode of T.perspectives.filter(k=>k!=='orbit')){const camera=T.view({mode,yaw:T.cameras[mode][0],pitch:T.cameras[mode][1]}),plane=['left','right'].includes(mode)?'yz':['front','back'].includes(mode)?'xz':'xy',delta=plane==='xy'?{x:150,y:-240,z:0}:plane==='xz'?{x:150,y:0,z:240}:{x:0,y:150,z:240},screen=T.project(delta,camera),back=T.unprojectDelta(screen.x,screen.y,camera,plane);for(const key of ['x','y','z'])close(back[key],delta[key]);}
// Run the actual SVG renderer with saved data, independent camera windows and staging.
const c=testContext({T,drag:null,selected:upper.id,state:()=>model,truck:()=>truck,esc:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),Math});
vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),c);
for(const name of ['corners','staging','scene','renderSceneData','partMesh','cubeMarkup'])vm.runInContext(fn(ui,name),c);
for(const mode of T.perspectives.filter(v=>v!=='orbit')){model.views[0]=T.view({mode,yaw:T.cameras[mode][0],pitch:T.cameras[mode][1]});const result=c.scene(0);assert(result.markup.includes('base'));assert(result.markup.includes('small'));assert(!/NaN|Infinity/.test(result.markup),mode);for(const match of result.markup.matchAll(/matrix\(([-.\d]+) ([-.\d]+) ([-.\d]+) ([-.\d]+) /g)){const [a,b,c,d]=match.slice(1).map(Number);assert(a>=0&&a*d-b*c>0,'3D labels read left-to-right without mirroring');}assert(result.markup.includes('data-tp-item'));assert(result.markup.includes('REAR / LOAD'));if(mode!=='plan'){assert(result.markup.includes('#303844'),'3D shows castors');assert(c.cubeMarkup(model.views[0]).includes('data-tp-cube-face="top"'));}}
const staged=T.addItems(model,'truck','small',2);assert.equal(c.staging(truck).size,2);assert(c.scene(0).markup.includes('WAITING'));assert.deepEqual(model.views.slice(1),T.empty().views.slice(1),'changing one camera leaves other windows alone');
// Metadata can be saved while a case is still waiting; packing is a separate action.
const formValues={name:'Edited waiting case',department:'Lighting',colour:'#123456',rideOnWheels:'no',lifter:'yes',rotation:'90',x:'0 mm',y:'0 mm',z:'0 mm'},edit=testContext({T,FormData:class{get(k){return formValues[k]}},selected:staged[0].id,state:()=>model,callbacks:{colourHex:v=>v},transaction:change=>change(model)});vm.runInContext(fn(ui,'readCaseColours'),edit);vm.runInContext(fn(ui,'applyItem'),edit);edit.applyItem({},false);assert.equal(staged[0].packed,false);assert.equal(truck.items.find(i=>i.id===staged[0].id).name,'Edited waiting case');
// Import routing invokes the existing parsers without changing fixture-patch import state.
const reader=testContext({readBoundedFileText:async f=>f.text,readBoundedFileBuffer:async f=>f.buffer,xlsxWorkbookSheets:async buffer=>[{name:'Equipment',rows:buffer}],xmlWorksheetRows:()=>rows});vm.runInContext(fn(html,'parseCsvRows'),reader);vm.runInContext(fn(html,'readTruckPackInventory'),reader);
(async()=>{const csv=await reader.readTruckPackInventory({name:'inventory.csv',text:'Name,W,L,H\n"Box, A",600 mm,1 m,800 mm'});assert.equal(csv[0].rows[1][0],'Box, A');const workbook=await reader.readTruckPackInventory({name:'inventory.xlsx',buffer:rows});assert.equal(workbook[0].name,'Equipment');const tsv=await reader.readTruckPackInventory({name:'inventory.tsv',text:'Name\tW\nBox\t600 mm'});assert.equal(tsv[0].rows[1][1],'600 mm');await assert.rejects(reader.readTruckPackInventory({name:'bad.exe',text:''}),/Use CSV/);console.log('PASS: Truck Pack units, fleet presets, imports, atomic validation, staging, end rotation, stacking/support, bounds, payloads, persistence, all camera projections and 2D/3D SVG rendering.');})().catch(e=>{console.error(e);process.exitCode=1});
assert(fn(html,'appPayload').includes('truckPack:app.truckPack'));assert(fn(html,'loadProjectPayload').includes('truckPack:normaliseTruckPack(candidate.truckPack)'));assert(fn(html,'clearProjectState').includes('app.truckPack=normaliseTruckPack(null)'));assert(fn(html,'render').includes('renderTruckPackView()'));

// Exercise the live drag handlers: valid drop, collision rejection and cancellation.
{
 model.views[0]=T.view({mode:'plan',yaw:0,pitch:90});
 const svg={dataset:{tpScene:'0'},getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})},host={querySelector:()=>svg,setPointerCapture(){},releasePointerCapture(){}};
 const d=testContext({T,host,tab:'pack',drag:null,callbacks:{},selected:'',state:()=>model,truck:()=>truck,sceneMaps:[c.scene(0)],renderInspector(){},renderScenes(){},notify(){},save(){},render(){},transaction:change=>{const next=JSON.parse(JSON.stringify(model));change(next);model=T.normalise(next);truck=model.trucks[0]}});
 for(const name of ['svgPoint','pointerDown','pointerMove','pointerUp','cancelDrag'])vm.runInContext(fn(ui,name),d);
 const itemId=staged[1].id,target={dataset:{tpItem:itemId},closest:selector=>selector==='[data-tp-item]'?target:selector==='[data-tp-scene]'?svg:null};
 function down(){d.sceneMaps=[c.scene(0)];d.pointerDown({button:0,pointerId:1,target,clientX:400,clientY:300,preventDefault(){}})}
 down();const origin={...d.drag.origin},wanted={x:1400,y:200,z:0},screen=T.project({x:wanted.x-origin.x,y:wanted.y-origin.y,z:0},model.views[0]);d.pointerMove({clientX:400+screen.x*d.drag.projection.scale,clientY:300+screen.y*d.drag.projection.scale});assert.equal(d.drag.error,'');d.pointerUp({pointerId:1});const placed=truck.items.find(i=>i.id===itemId);assert(placed.packed);close(placed.x,1400);close(placed.y,200);
 const before=JSON.stringify(model);down();const delta=T.project({x:-1400,y:-200,z:0},model.views[0]);d.pointerMove({clientX:400+delta.x*d.drag.projection.scale,clientY:300+delta.y*d.drag.projection.scale});assert(d.drag.error.includes('overlap'));d.pointerUp({pointerId:1});assert.equal(JSON.stringify(model),before);
 down();d.pointerMove({clientX:450,clientY:300});d.cancelDrag();assert.equal(JSON.stringify(model),before,'pointer cancellation keeps the saved placement');
 const original={...model.views[0]};d.drag={type:'orbit',model,index:0,original};model.views[0]={mode:'orbit',yaw:54,pitch:22,zoom:1};d.cancelDrag();assert.deepEqual(JSON.parse(JSON.stringify(model.views[0])),original,'cube cancellation restores the complete camera');
 vm.runInContext(fn(ui,'setView'),d);
 const cube={dataset:{tpCube:'0'}},cubeTarget={closest:selector=>selector==='[data-tp-cube]'?cube:selector==='[data-tp-cube-face]'?{dataset:{tpCubeFace:'front'}}:null};
 d.pointerDown({button:0,pointerId:2,target:cubeTarget,clientX:100,clientY:100,preventDefault(){}});d.pointerMove({clientX:140,clientY:130});assert.equal(model.views[0].mode,'orbit');close(model.views[0].yaw,26);close(model.views[0].pitch,70.5);d.pointerUp({pointerId:2});
 d.pointerDown({button:0,pointerId:2,target:cubeTarget,clientX:100,clientY:100,preventDefault(){}});d.pointerUp({pointerId:2});assert.equal(model.views[0].mode,'front');assert.equal(model.views[0].yaw,180);assert.equal(model.views[0].pitch,0);
}

// Run the actual project loader, including normalization before any app mutation.
{
 const p=testContext({LampyCore:require('../js/project-core.js'),LampyTruckPack:T,app:{collapsed:{}},document:{},fixturePatchViewOptions:{},persisted:0});
 for(const name of ['normaliseLabel','normaliseSocaMeta','normaliseDistro','normaliseLooms','normaliseProjectInfo','normalisePatchFixture','normalisePatchSheets','normaliseGdtfFiles','normaliseGdtfMatches','normaliseControlNetwork','normalisePatchViewOptions'])p[name]=value=>value;
 for(const name of ['resetFixturePatchUndo','closeConsoleRemoval','resetProjectErrors','clearDeviceConfigSelection','closeAllRackPopouts','applyFixtureOverridesToProjectRows','ensureSocaData','syncPositionsFromPatch','resetRevisionTracking'])p[name]=()=>{};
 for(const name of ['repositoryGdtfBytes','unlockedPatchGroups','deviceConfigExpandedDevices','controlExpandedDevices','controlOpenLocations','controlKnownLocations','deviceConfigTableSorts','rackViewZooms','rackViewFaces','rackClosedPanels','rackPopoutDualViews','collapsedLoomCards','knownLoomCardStates'])p[name]=new Set();
 p.persist=()=>p.persisted++;
 for(const name of ['normaliseTruckPack','loadProjectPayload'])vm.runInContext(fn(html,name),p);
 const payload={app:{labels:[],distros:[],fixturePatch:[],looms:[],patchSheets:[],projectInfo:{projectSettings:{}},controlNetwork:{},gdtfFiles:{},gdtfMatches:{},truckPack:JSON.parse(JSON.stringify(model))}};
 p.loadProjectPayload(payload);assert.deepEqual(JSON.parse(JSON.stringify(p.app.truckPack)),T.normalise(model));assert.equal(p.persisted,1);
 const validApp=p.app.truckPack,malformed=JSON.parse(JSON.stringify(payload));malformed.app.truckPack.trucks[0].items[0].x=-100;assert.throws(()=>p.loadProjectPayload(malformed));assert.equal(p.app.truckPack,validApp,'invalid packs cannot partially replace the project');assert.equal(p.persisted,1);
 delete payload.app.truckPack;p.loadProjectPayload(payload);assert.deepEqual(JSON.parse(JSON.stringify(p.app.truckPack)),T.empty(),'older projects load with an empty Truck Pack');
}

// Render actual inventory and multi-view controls, and submit both creation forms.
{
 const moduleContext=testContext({LampyTruckPack:T});vm.runInContext(ui,moduleContext);
 const viewLabels=moduleContext.LampyTruckPackView.labels;
 assert.deepEqual(Object.values(viewLabels).slice(0,8),['2D Top / Plan','3D Top','3D Left','3D Right','3D Back','3D Front','3D Left Isometric','3D Right Isometric']);
 let fresh=T.empty(),submit,formValues={},lastMarkup='',saves=0;
 const modal={querySelector:()=>({value:'',textContent:'',onchange:null}),querySelectorAll:()=>[]};
 const c=testContext({T,labels:viewLabels,esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),state:()=>fresh,unit:()=>({measurement:'metric',weight:'kg'}),length:v=>T.formatLength(v),weight:v=>T.formatWeight(v),callbacks:{colourControl:()=>'<input name="colour">',colourHex:v=>v},FormData:class{get(k){return formValues[k]??''}},showDialog:(title,markup,callback)=>{submit=callback;lastMarkup=markup;return modal},replace:next=>{fresh=T.normalise(next);saves++},closeDialog(){},render(){},selected:'',tab:'pack'});
 for(const name of ['button','input','field']){
  // These helpers are concise arrow declarations in the live module.
  const line=ui.split('\n').find(line=>line.trim().startsWith('const '+name+'='));vm.runInContext(line,c);
 }
 for(const name of ['readCaseColours','caseColourFields','sceneTools','caseDialog','truckDialog','packMarkup','inventoryMarkup'])vm.runInContext(fn(ui,name),c);
 c.caseDialog();assert(lastMarkup.includes('Castor Height'));formValues={name:'Tour Case',type:'Case',width:'600 mm',length:'1 m',height:'700 mm',heightIncludesWheels:'no',casterHeight:'100 mm',weight:'22 lb',department:'Lighting',colour:'#aabbcc'};submit({});assert.equal(fresh.cases.length,1);assert.equal(fresh.cases[0].height,700);assert.equal(fresh.cases[0].casterHeight,100);close(fresh.cases[0].weight,9.97903214);
 c.truckDialog(null);for(const title of ['Trucking Company','Trailer Name/Number','Trailer Reg','Driver Name','Driver E-mail','Driver Phone'])assert(lastMarkup.includes(title));
 formValues={preset:'custom',width:'2.4 m',length:'8 m',height:'2.8 m',payload:'8000 kg',company:'Tour Trucks',name:'Trailer 3',registration:'ABC 123',driver:'Alex',email:'alex@example.com',phone:'+45 12345678'};submit({});assert.equal(fresh.trucks.length,1);assert.equal(fresh.trucks[0].driver,'Alex');assert.equal(fresh.trucks[0].length,8000);assert.equal(saves,2);
 for(const layout of [1,2,4]){fresh.layout=layout;const markup=c.packMarkup(fresh,fresh.trucks[0]);assert.equal((markup.match(/class="tpViewport"/g)||[]).length,layout);for(let i=0;i<layout;i++)assert(markup.includes('data-tp-perspective="'+i+'"'));}
 const inventory=c.inventoryMarkup();for(const title of ['Name','Type','W','L','H','Height Inc Wheels?','Weight (kg)'])assert(inventory.includes('>'+title+'</th>'));assert(inventory.includes('type="checkbox"'));assert(inventory.includes('700 mm'));
}

// Exercise the import dialog: recover from missing units without editing the file,
// preserve the selection across worksheets, and reject invalid imports atomically.
(async()=>{
 let current=T.empty(),submit,markup='',saves=0,closed=0;
 current.cases=[base('existing')];
 const corrections={innerHTML:'',querySelectorAll:()=>[]};
 const units={value:''},error={textContent:''},file={},saveButton={},sheet={};
 const body={innerHTML:'',querySelector:()=>sheet,querySelectorAll:()=>[]};
 const nodes={'[data-tp-import-corrections]':corrections,'[data-tp-dimension-unit]':units,'.tpDialogError':error,'[data-tp-file]':file,'[type="submit"]':saveButton,'[data-tp-import-content]':body};
 const modal={querySelector:selector=>{assert(nodes[selector],selector);return nodes[selector]}};
 const inputSheets=[{name:'Cases',rows:[dimensionHeaders,['Case Unique 2.1 Eighth',24,24,6,'','yes',28]]},{name:'More cases',rows:[dimensionHeaders,['Case Motor Distro Quarter',24,24,12.75,'','yes',39]]}];
 const context=testContext({T,importRequest:0,dialog:null,esc:v=>String(v??''),unit:()=>({weight:'kg'}),state:()=>current,callbacks:{readInventory:async()=>inputSheets},showDialog:(title,html,onSubmit)=>{markup=html;submit=onSubmit;context.dialog=modal;return modal},replace:next=>{current=T.normalise(next);saves++},closeDialog:()=>closed++,render(){},tab:'pack',message:''});
 vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const field=')),context);
 vm.runInContext(fn(ui,'importDialog'),context);context.importDialog();
 assert(markup.includes('Dimension units'));for(const unit of ['mm','cm','m','ft','in'])assert(markup.includes('value="'+unit+'"'));
 await file.onchange({target:{files:[{name:'cases.csv'}]}});
 assert.equal(saveButton.disabled,false);
 const before=JSON.stringify(current);
 try{submit();assert.fail('Missing units must reject the import')}catch(e){assert.match(e.message,/Select Dimension units/);error.textContent=e.message}
 assert.equal(saves,0);assert.equal(closed,0);assert.equal(JSON.stringify(current),before);
 units.value='in';units.onchange();assert.equal(error.textContent,'');
 sheet.onchange({target:{value:'1'}});assert.equal(units.value,'in');
 sheet.onchange({target:{value:'0'}});submit();
 assert.equal(saves,1);assert.equal(closed,1);assert.equal(current.cases.length,2);
 close(current.cases[1].width,609.6);close(current.cases[1].height,152.4);assert.equal(current.cases[1].weight,28);
 assert.equal(current.cases[0].id,'existing');
 inputSheets[0].rows.push(['Invalid',0,24,6]);
 const saved=JSON.stringify(current);assert.throws(()=>submit(),/Row 3/);assert.equal(saves,1);assert.equal(JSON.stringify(current),saved);
 console.log('PASS: Import dialog unit selection, worksheet retention, error recovery and atomic saves.');
})().catch(e=>{console.error(e);process.exitCode=1});

// Sidebar routes use current trucks, select the requested pack, and track Cases.
{
 const viewContext=testContext({LampyTruckPack:T});vm.runInContext(ui,viewContext);
 const view=viewContext.LampyTruckPackView;
 let saves=0;
 const nav=testContext({app:{truckPack:T.empty()},activeSheetTab:'home',distroRanges:()=>[],LampyTruckPackView:view,normaliseTruckPack:T.normalise,persist:()=>saves++});
 nav.setSheetTab=tab=>{nav.activeSheetTab=tab};
 for(const name of ['sheetSubMenuRoutes','openTruckPackTab'])vm.runInContext(fn(html,name),nav);
 const routes=()=>nav.sheetSubMenuRoutes('truckPack');
 assert.deepEqual(Array.from(routes(),r=>r.label),['Cases']);
 routes()[0].run();assert.equal(view.getTab(),'cases');assert.equal(nav.activeSheetTab,'truckPack');assert(routes()[0].active);
 nav.app.truckPack.trucks=[T.normaliseTruck({...T.presets[0],id:'one',name:'Truck A',items:[]}),T.normaliseTruck({...T.presets[1],id:'two',name:'Truck B',items:[]})];
 nav.app.truckPack.activeTruckId='one';nav.activeSheetTab='home';
 assert.deepEqual(Array.from(routes(),r=>r.label),['Truck A','Truck B','Cases']);assert(routes().every(r=>!r.active));
 routes()[1].run();assert.equal(nav.activeSheetTab,'truckPack');assert.equal(view.getTab(),'pack');assert.equal(nav.app.truckPack.activeTruckId,'two');assert.equal(saves,1);
 assert.deepEqual(Array.from(routes(),r=>r.active),[false,true,false]);
 routes()[2].run();assert.equal(view.getTab(),'cases');assert.equal(nav.app.truckPack.activeTruckId,'two');assert.equal(saves,1);assert(routes()[2].active);
 routes()[1].run();assert.equal(view.getTab(),'pack');assert.equal(saves,1);
 nav.app.truckPack.trucks[1].name='Renamed & <Truck>';assert.equal(routes()[1].label,'Renamed & <Truck>');
 const removedRoute=routes()[1];nav.app.truckPack.trucks.pop();nav.app.truckPack.activeTruckId='one';removedRoute.run();assert.equal(nav.app.truckPack.activeTruckId,'one');assert.equal(saves,1);
 assert.deepEqual(Array.from(routes(),r=>r.label),['Truck A','Cases']);
 nav.app.truckPack=null;assert.deepEqual(Array.from(routes(),r=>r.label),['Cases']);routes()[0].run();assert.equal(nav.app.truckPack.trucks.length,0);
 view.reset();assert.equal(view.getTab(),'pack');
}
// Actual view redraws notify the shared navigation after tab and truck changes.
{
 let data=T.empty(),updates=0;
 const host={innerHTML:'',contains:()=>true};
 const context=testContext({T,host,callbacks:{setState:next=>data=next,save(){},navigationChanged:()=>updates++},state:()=>data,truck:()=>data.trucks.find(t=>t.id===data.activeTruckId),tab:'pack',selected:'',message:'',drag:null,dialog:null,sceneMaps:[],importRequest:0,button:()=>'',esc:String,cancelDrag(){},inventoryMarkup:()=>'<table></table>',packMarkup:()=>'<div></div>',renderInspector(){},renderScenes(){},pointerDown(){},pointerMove(){},pointerUp(){},change(){},notify(){}});
 for(const name of ['save','replace','transaction','closeDialog','setTab','click','render'])vm.runInContext(fn(ui,name),context);
 context.render();assert.equal(updates,1);
 const target={dataset:{tpAction:'cases'}};context.click({target:{closest:()=>target}});assert.equal(context.tab,'cases');assert.equal(updates,2);
 context.transaction(next=>{next.trucks.push(T.normaliseTruck({...T.presets[0],id:'new',name:'Added truck',items:[]}))});assert.equal(updates,3);
 context.transaction(next=>{next.trucks[0].name='Updated truck'});assert.equal(updates,4);
 context.transaction(next=>{next.trucks=[]});assert.equal(updates,5);
}
console.log('PASS: Truck Pack navigation routes, active sub-tabs, truck selection and live menu refresh.');

// Three identification colours survive normalisation, imports, instances and reloads.
{
 const data=T.empty();data.cases=[base('three',{colour:'#ff0000',colour2:'#00ff00',colour3:'#0000ff'})];
 data.trucks=[T.normaliseTruck({...T.presets[0],id:'colours',items:[]})];data.activeTruckId='colours';
 const [item]=T.addItems(data,'colours','three',1);
 for(const key of ['colour','colour2','colour3']){assert.equal(item[key],'');assert(!(key in data.cases[0]))}Object.assign(item,{colour:'#ff0000',colour2:'#00ff00',colour3:'#0000ff'});
 assert.deepEqual(T.normalise(JSON.parse(JSON.stringify(data))),data);
 assert(!('colour' in T.normaliseCase({...data.cases[0],colour:'#ffffff'})));
 const old=T.normaliseItem({id:'legacy',caseId:'three',colour:'#112233'});assert.equal(old.colour,'#112233');assert.equal(old.colour2,'');assert.equal(old.colour3,'');
 const headers=['Name','Width','Length','Height','Col 1','Col 2','Col 3'];
 const [imported]=T.importRows([['Colours',600,800,500,'#ff0000','#00ff00','#0000ff']],T.suggestMapping(headers),'kg','mm');
 assert(!('colour2' in imported));assert(!('colour3' in imported));assert(!('colour' in T.suggestMapping(headers)));
 const render=testContext({T,drag:null,selected:'',state:()=>data,truck:()=>data.trucks[0],esc:String,Math});
 vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),render);
 for(const name of ['corners','staging','scene','renderSceneData','partMesh','cubeMarkup'])vm.runInContext(fn(ui,name),render);
 for(const mode of ['plan','leftIso']){data.views[0]=T.view({mode});const result=render.scene(0);for(const colour of ['#ff0000','#00ff00','#0000ff'])assert(result.markup.includes('fill="'+colour+'"'));assert(result.markup.includes('fill="url(#tp-colours-0-'+item.id+')"'));}
 const before=render.scene(0).point({x:0,y:0,z:0});data.views[0].panX=82;data.views[0].panY=-36;const after=render.scene(0).point({x:0,y:0,z:0});close(after.x-before.x,82);close(after.y-before.y,-36);
}
// Scene tools change only their viewport; pan/orbit never move case geometry.
{
 let data=T.empty(),saves=0,draws=0;data.cases=[base('item')];data.trucks=[T.normaliseTruck({...T.presets[0],id:'tools',items:[]})];data.activeTruckId='tools';T.addItems(data,'tools','item',1);
 const svg={dataset:{tpScene:'0'},getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})},host={contains:()=>true,querySelector:()=>svg,setPointerCapture(){},releasePointerCapture(){}};
 const context=testContext({T,host,tab:'pack',drag:null,callbacks:{},selected:'',state:()=>data,truck:()=>data.trucks[0],sceneMaps:[],renderInspector(){},renderScenes(){},notify(){},save:()=>saves++,render:()=>draws++,select:id=>context.selected=id});
 for(const name of ['svgPoint','click','pointerDown','pointerMove','pointerUp','cancelDrag','setView'])vm.runInContext(fn(ui,name),context);
 const action=(name,extra={})=>context.click({target:{closest:()=>({dataset:{tpAction:name,...extra}})}});
 const event=(x,y)=>({button:0,pointerId:2,clientX:x,clientY:y,preventDefault(){},target:{closest:selector=>selector==='[data-tp-scene]'?svg:null}});
 const itemSnapshot=JSON.stringify(data.trucks[0].items),otherViews=JSON.stringify(data.views.slice(1));
 action('tool',{view:'0',tool:'pan'});assert.equal(data.views[0].tool,'pan');
 context.pointerDown(event(100,100));context.pointerMove(event(180,150));close(data.views[0].panX,80);close(data.views[0].panY,50);context.pointerUp(event(180,150));
 assert.equal(JSON.stringify(data.trucks[0].items),itemSnapshot);assert.equal(JSON.stringify(data.views.slice(1)),otherViews);
 const saved=JSON.stringify(data.views[0]);context.pointerDown(event(100,100));context.pointerMove(event(250,220));context.cancelDrag();assert.equal(JSON.stringify(data.views[0]),saved);
 assert.equal(T.normalise(JSON.parse(JSON.stringify(data))).views[0].panX,80);
 action('tool',{view:'0',tool:'rotate'});assert.equal(data.views[0].tool,'rotate');assert.equal(data.views[0].mode,'leftIso');
 const yaw=data.views[0].yaw;context.pointerDown(event(100,100));context.pointerMove(event(140,120));context.pointerUp(event(140,120));assert.equal(data.views[0].mode,'orbit');close(data.views[0].yaw,yaw+26);
 assert.equal(JSON.stringify(data.trucks[0].items),itemSnapshot);assert.equal(JSON.stringify(data.views.slice(1)),otherViews);
 action('tool',{view:'0',tool:'select'});assert.equal(data.views[0].tool,'select');context.selected='selected';context.pointerDown(event(0,0));context.pointerUp(event(0,0));assert.equal(context.selected,'');
 data.views[0].zoom=2;action('fit',{view:'0'});assert.equal(data.views[0].zoom,1);assert.equal(data.views[0].panX,0);assert.equal(data.views[0].panY,0);
 context.setView(0,'plan');action('tool',{view:'0',tool:'rotate'});context.setView(0,'plan');assert.equal(data.views[0].tool,'select');
 data.trucks.push(T.normaliseTruck({...T.presets[0],id:'other',items:[]}));context.selected='old';action('truck',{truckId:'other'});assert.equal(data.activeTruckId,'other');assert.equal(context.selected,'');assert(saves>0&&draws>0);
}
// Details exist only while selected, and outside clicks preserve editing controls.
{
 const data=T.empty();data.cases=[base('detail')];data.trucks=[T.normaliseTruck({...T.presets[0],id:'details',items:[]})];data.activeTruckId='details';const [item]=T.addItems(data,'details','detail',1);
 let hasSelection=false;const children={form:{},'[name="rideOnWheels"]':{},'[data-tp-lifter]':{}},pane={hidden:false,innerHTML:'',closest:()=>({classList:{toggle:(name,value)=>hasSelection=value}}),querySelector:selector=>children[selector]};
 const context=testContext({T,host:{querySelector:()=>pane},state:()=>data,truck:()=>data.trucks[0],selected:'',callbacks:{colourControl:(attrs,value)=>'<input '+attrs+' value="'+value+'">'},esc:String,length:T.formatLength,weight:T.formatWeight,renderScenes(){}});
 for(const name of ['field','input','button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),context);
 for(const name of ['caseColourFields','renderInspector','select','outsidePointer'])vm.runInContext(fn(ui,name),context);
 context.renderInspector();assert(pane.hidden);assert(!hasSelection);assert.equal(pane.innerHTML,'');
 context.select(item.id);assert(!pane.hidden);assert(hasSelection);for(const key of ['colour','colour2','colour3'])assert(pane.innerHTML.includes('name="'+key+'"'));
 context.outsidePointer({target:{closest:()=>pane}});assert.equal(context.selected,item.id);
 context.outsidePointer({target:{closest:()=>null}});assert.equal(context.selected,'');assert(pane.hidden);assert(!hasSelection);
}
// Add case menu filters inventory and commits selected quantities atomically.
{
 let data=T.empty(),submit,markup='',values={},saved=0,closed=0;
 data.cases=[base('a'),base('b')];data.trucks=[T.normaliseTruck({...T.presets[0],id:'add',items:[]})];data.activeTruckId='add';
 const search={},submitButton={},rows=[{dataset:{caseSearch:'a case'},hidden:false},{dataset:{caseSearch:'b case'},hidden:false}];
 const modal={querySelector:selector=>selector==='[type="submit"]'?submitButton:search,querySelectorAll:()=>rows};
 const context=testContext({T,state:()=>data,truck:()=>data.trucks[0],esc:String,length:T.formatLength,FormData:class{get(key){return values[key]}},showDialog:(title,html,handler)=>{submit=handler;markup=html;return modal},replace:next=>{data=T.normalise(next);saved++},closeDialog:()=>closed++,render(){},selected:'old',message:''});
 for(const name of ['input'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),context);
 vm.runInContext(fn(ui,'addCaseDialog'),context);context.addCaseDialog();assert(markup.includes('data-tp-case-search'));assert.equal(submitButton.textContent,'Add cases');
 search.oninput({target:{value:'b'}});assert(rows[0].hidden);assert(!rows[1].hidden);
 assert.throws(()=>submit({}),/at least one/);values={quantity_a:2,quantity_b:-1};assert.throws(()=>submit({}),/whole quantity/);assert.equal(saved,0);assert.equal(data.trucks[0].items.length,0);
 values={quantity_a:2000,quantity_b:1};assert.throws(()=>submit({}),/limit/);assert.equal(saved,0);
 values={quantity_a:2,quantity_b:3};submit({});assert.equal(data.trucks[0].items.length,5);assert(data.trucks[0].items.every(item=>!item.packed));assert.equal(saved,1);assert.equal(closed,1);assert.equal(context.selected,'');
}
{
 const css=fs.readFileSync(path.join(root,'js/truck-pack.css'),'utf8');assert(css.includes('.tpToolbar button,.tpActions button{zoom:0.85}'));assert(css.includes('.tpActions{gap:4px;align-items:center}'));assert(css.includes('.tpInspector[hidden]{display:none}'));
 assert(!fn(ui,'packMarkup').includes('data-tp-inventory'));assert(!fn(ui,'packMarkup').includes('data-tp-quantity'));assert(!fn(ui,'packMarkup').includes('data-tp-truck'));
 assert(fn(ui,'render').includes('data-truck-id'));assert(fn(ui,'render').includes("button('add-case','Add case')"));
 const context=testContext({});vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const button=')),context);vm.runInContext(fn(ui,'sceneTools'),context);
 for(const mode of ['select','pan','rotate']){const markup=context.sceneTools(2,{tool:mode});assert(markup.includes('data-tool="'+mode+'" data-view="2"'));assert.equal((markup.match(/aria-pressed="true"/g)||[]).length,1);assert.equal((markup.match(/<svg/g)||[]).length,3);}
}
console.log('PASS: Truck Pack pan/select/rotate, conditional details, outside deselection, three colours and atomic Add case menu.');

// Cube labels lie in their assigned face planes rather than facing the screen.
{
 const context=testContext({T});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),context);
 for(const name of ['corners','cubeMarkup'])vm.runInContext(fn(ui,name),context);
 for(const mode of ['leftIso','rightIso','front','back','left','right','top','orbit']){
  const markup=context.cubeMarkup(T.view({mode}));assert(!/NaN|Infinity/.test(markup));
  for(const match of markup.matchAll(/<g data-tp-cube-face="([^"]+)"[^>]*><polygon points="([^"]+)"[^>]*\/><text transform="matrix\(([^)]+)\)"[^>]*>([^<]+)<\/text>/g)){
   assert.equal(match[4],match[1].toUpperCase());const pts=match[2].split(' ').map(p=>p.split(',').map(Number)),[a,b,c,d,e,f]=match[3].split(' ').map(Number);
   assert(a>=-1e-10&&a*d-b*c>0,'labels stay readable without mirroring');
   close(e+50*a+50*c,pts.reduce((n,p)=>n+p[0],0)/4);close(f+50*b+50*d,pts.reduce((n,p)=>n+p[1],0)/4);
   // Text basis vectors follow the polygon edges.
   close(a*(pts[1][1]-pts[0][1])-b*(pts[1][0]-pts[0][0]),0);close(c*(pts[3][1]-pts[0][1])-d*(pts[3][0]-pts[0][0]),0);
  }
 }
 const markup=context.cubeMarkup(T.view({mode:'leftIso'}));assert(markup.includes('textLength="70"'));assert(markup.includes('transform="matrix('));
 assert(!fn(ui,'packMarkup').includes('data-tp-layout'));assert(fn(ui,'render').includes('data-tp-layout'));assert(!ui.includes('class="tpPackControls"'));
}
// The supplied CSV has text "various" in two heights, not missing unit selections.
(async()=>{
 const header=['Name','Description','Manufacturer','Length','Width','Height','Weight','Category','Flip'];
 const original=[header,...Array.from({length:139},(_,i)=>['Case '+i,'','Christie','24','24','6','28','Lighting','TRUE'])];
 original[87]=['Dolly Truss Half','','Christie','41','48','various','69.09','Lighting','TRUE'];original[88]=['Dolly Truss','','Christie','41','96','various','125','Lighting','TRUE'];
 const mapping=T.suggestMapping(header),issues=T.importDimensionIssues(original.slice(1),mapping,'ft');
 assert.deepEqual(issues.map(i=>[i.row,i.field,i.value,i.unitRequired]),[[88,'height','various',false],[89,'height','various',false]]);
 assert.throws(()=>T.importRows(original.slice(1),mapping,'kg','ft'),/Row 88: Height: "various"/);
 const copy=JSON.parse(JSON.stringify(original));let submit,data=T.empty(),saves=0;
 const units={value:'ft'},file={},error={textContent:''},saveButton={},sheet={},statuses={},inputs=[];
 const corrections={innerHTML:'',querySelector:selector=>statuses[selector]||(statuses[selector]={textContent:''}),querySelectorAll:()=>{inputs.length=0;for(const m of corrections.innerHTML.matchAll(/data-tp-correction-row="(\d+)" data-tp-correction-field="([^"]+)" value="([^"]*)"/g))inputs.push({dataset:{tpCorrectionRow:m[1],tpCorrectionField:m[2]},value:m[3]});return inputs}};
 const body={innerHTML:'',querySelector:()=>sheet,querySelectorAll:()=>[]};
 const nodes={'[data-tp-dimension-unit]':units,'[data-tp-file]':file,'.tpDialogError':error,'[type="submit"]':saveButton,'[data-tp-import-content]':body,'[data-tp-import-corrections]':corrections},modal={querySelector:selector=>nodes[selector]};
 const context=testContext({T,importRequest:0,dialog:null,esc:v=>String(v??'').replaceAll('"','&quot;'),unit:()=>({weight:'kg'}),state:()=>data,callbacks:{readInventory:async()=>[{name:'cases.csv',rows:copy}]},showDialog:(title,markup,handler)=>{submit=handler;context.dialog=modal;return modal},replace:next=>{data=T.normalise(next);saves++},closeDialog(){},render(){},tab:'pack',message:''});
 vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const field=')),context);vm.runInContext(fn(ui,'importDialog'),context);context.importDialog();
 await file.onchange({target:{files:[{name:'cases.csv'}]}});assert.equal(inputs.length,2);assert.equal(saveButton.disabled,false);assert.equal(error.textContent,'');
 assert.throws(()=>submit(),/Row 88: Height/);assert.equal(saves,0);
 // Explicit test measurements demonstrate correction; they are not assumed library data.
 inputs[0].value='2';inputs[0].oninput();assert(statuses['#tpCorrection_88_height'].textContent.includes('Ready'));
 assert.throws(()=>submit(),/Row 89: Height/);assert.equal(saves,0);
 inputs[1].value='36 in';inputs[1].oninput();submit();assert.equal(saves,1);assert.equal(data.cases.length,139);close(data.cases[86].height,609.6);close(data.cases[87].height,914.4);
 assert.equal(original[87][5],'various');assert.equal(original[88][5],'various');
 console.log('PASS: exact invalid-height diagnostics and editable import corrections with selected feet, preserving the source.');
})().catch(error=>{console.error(error);process.exitCode=1});

// Render the active Pack toolbar, with all window choices inside the action group.
{
 const data=T.empty();data.trucks=[T.normaliseTruck({...T.presets[0],id:'toolbar',name:'Tour Truck',items:[]})];data.activeTruckId='toolbar';
 const host={innerHTML:''},context=testContext({host,tab:'pack',selected:'',message:'',state:()=>data,truck:()=>data.trucks[0],callbacks:{},cancelDrag(){},packMarkup:()=>'<div>Pack content</div>',click(){},change(){},pointerDown(){},pointerMove(){},pointerUp(){},renderInspector(){},renderScenes(){},esc:String});
 for(const name of ['button','field'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),context);
 vm.runInContext(fn(ui,'render'),context);
 for(const layout of [1,2,4]){data.layout=layout;context.render();const actions=host.innerHTML.slice(host.innerHTML.indexOf('<div class="tpActions">'),host.innerHTML.indexOf('<div class="tpMessage'));assert(actions.includes('data-tp-layout'));assert(actions.includes('value="'+layout+'" selected'));assert(actions.includes('data-tp-action="add-case"'));assert(host.innerHTML.includes('data-truck-id="toolbar"'));}
}

// Catalogue deletion removes every instance across trucks, preserving trucks and supported loads.
{
 const data=T.empty();data.cases=[base('support',{width:1200,length:1200,height:500}),base('upper',{width:400,length:400,height:400}),base('other')];
 data.trucks=[T.normaliseTruck({...T.presets[0],id:'first',items:[]}),T.normaliseTruck({...T.presets[0],id:'second',items:[]})];data.activeTruckId='first';
 const [bottom]=T.addItems(data,'first','support',1),[top]=T.addItems(data,'first','upper',1);Object.assign(bottom,{packed:true});Object.assign(top,{packed:true,rideOnWheels:false,lifter:true,x:100,y:100,z:500,colour:'#abcdef'});
 T.addItems(data,'second','support',2);T.addItems(data,'second','other',1);assert.equal(T.truckError(data,data.trucks[0]),'');
 const result=T.removeInventoryCases(data,['support']);assert.deepEqual(result,{inventory:1,removed:3,waiting:1});assert.equal(data.trucks.length,2);assert.equal(top.packed,false);assert.equal(top.colour,'#abcdef');assert.equal(data.trucks[1].items.length,1);assert.doesNotThrow(()=>T.normalise(data));
 const all=T.removeInventoryCases(data,data.cases.map(c=>c.id));assert.equal(all.inventory,2);assert.equal(all.removed,2);assert.equal(data.cases.length,0);assert(data.trucks.every(t=>t.items.length===0));assert.equal(data.activeTruckId,'first');
}
// Marquee handles all directions, multi-view highlights, Shift additions and cancellation.
{
 const data=T.empty();data.cases=[base('box',{width:400,length:400,height:400})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'select',items:[]})];data.activeTruckId='select';
 const items=T.addItems(data,'select','box',3),boxes=items.map((item,i)=>({id:item.id,left:20+i*100,right:70+i*100,top:20,bottom:70}));
 const svg={dataset:{tpScene:'0'},getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})},host={querySelector:()=>svg,setPointerCapture(){},releasePointerCapture(){}};
 let inspections=0;const ctx=testContext({T,host,tab:'pack',drag:null,callbacks:{},selected:items[2].id,state:()=>data,truck:()=>data.trucks[0],sceneMaps:[{hitBoxes:boxes}],renderInspector:()=>inspections++,renderScenes(){},save(){},render(){},notify(){}});
 for(const name of ['svgPoint','pointerDown','pointerMove','pointerUp','cancelDrag'])vm.runInContext(fn(ui,name),ctx);
 const event=(x,y,shiftKey=false)=>({button:0,pointerId:8,clientX:x,clientY:y,shiftKey,preventDefault(){},target:{closest:selector=>selector==='[data-tp-scene]'?svg:null}});
 const original=JSON.stringify(data);
 ctx.pointerDown(event(180,90));ctx.pointerMove(event(10,10));assert.equal(ctx.drag.type,'marquee');assert.deepEqual(Array.from(ctx.drag.ids),items.slice(0,2).map(i=>i.id));assert.equal(inspections,0,'do not resize the scene mid selection');ctx.pointerUp(event(10,10));assert.equal(ctx.selectionIds().length,2);assert.equal(inspections,1);assert.equal(JSON.stringify(data),original);
 ctx.pointerDown(event(210,10,true));ctx.pointerMove(event(280,80,true));ctx.pointerUp(event(280,80,true));assert.equal(ctx.selectionIds().length,3);
 ctx.pointerDown(event(500,500));ctx.pointerMove(event(600,550));ctx.cancelDrag();assert.equal(ctx.selectionIds().length,3,'Escape or pointer cancellation keeps the prior selection');
 ctx.pointerDown(event(500,500));ctx.pointerUp(event(500,500));assert.equal(ctx.selectionIds().length,0);
 const target={dataset:{tpItem:items[1].id},closest:selector=>selector==='[data-tp-item]'?target:selector==='[data-tp-scene]'?svg:null};ctx.pointerDown({...event(120,40,true),target});assert.equal(ctx.selectionIds()[0],items[1].id);ctx.pointerDown({...event(120,40,true),target});assert.equal(ctx.selectionIds().length,0);
 const renderer=testContext({T,drag:null,selected:items[0].id,selectedGroup:items.slice(0,2).map(i=>i.id),state:()=>data,truck:()=>data.trucks[0],esc:String,Math});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),renderer);
 for(const name of ['corners','staging','scene','renderSceneData','partMesh','cubeMarkup'])vm.runInContext(fn(ui,name),renderer);
 const scene=renderer.scene(0);assert.equal(scene.hitBoxes.length,3);assert.equal((scene.markup.match(/stroke="#0060d2"/g)||[]).length,2);
 renderer.drag={type:'marquee',index:0,start:{x:20,y:30},current:{x:120,y:230},ids:[items[2].id]};assert(renderer.scene(0).markup.includes('class="tpSelectionBox" x="20" y="30" width="100" height="200"'));assert.equal((renderer.scene(0).markup.match(/stroke="#0060d2"/g)||[]).length,1);
}
// Shared edits change only touched fields on selected truck instances, never inventory or other trucks.
{
 let data=T.empty();data.cases=[base('shared')];data.trucks=[T.normaliseTruck({...T.presets[0],id:'main',items:[]}),T.normaliseTruck({...T.presets[0],id:'other',items:[]})];data.activeTruckId='main';
 const items=T.addItems(data,'main','shared',3);T.addItems(data,'other','shared',1);items.forEach((item,i)=>Object.assign(item,{department:'Department '+i,colour:i?'#00ff00':'#ff0000',colour2:'#0000ff'}));
 const inventory=JSON.stringify(data.cases),other=JSON.stringify(data.trucks[1]);let changes=[],saves=0,message='';
 const ctx=testContext({T,selected:items[0].id,selectedGroup:items.slice(0,2).map(i=>i.id),state:()=>data,callbacks:{colourHex:v=>/^#[0-9a-f]{6}$/.test(v)?v:''},notify:msg=>message=msg,transaction:change=>{const next=JSON.parse(JSON.stringify(data));change(next);data=T.normalise(next);saves++}});
 vm.runInContext(fn(ui,'applySelectedDetails'),ctx);const form={querySelectorAll:()=>changes};ctx.applySelectedDetails(form);assert.equal(saves,0);
 changes=[{name:'department',value:'Lighting'}];ctx.applySelectedDetails(form);assert.equal(saves,1);assert(data.trucks[0].items.slice(0,2).every(item=>item.department==='Lighting'));assert.equal(data.trucks[0].items[0].colour,'#ff0000');assert.equal(data.trucks[0].items[1].colour,'#00ff00');assert.equal(data.trucks[0].items[2].department,'Department 2');
 changes=[{name:'colour',value:'invalid'}];ctx.applySelectedDetails(form);assert.equal(saves,1);assert(message.includes('valid colour'));
 changes=[{name:'colour',value:'#abcdef'},{name:'colour2',value:''}];ctx.applySelectedDetails(form);assert.equal(saves,2);assert(data.trucks[0].items.slice(0,2).every(item=>item.colour==='#abcdef'&&item.colour2===''));assert.equal(JSON.stringify(data.cases),inventory);assert.equal(JSON.stringify(data.trucks[1]),other);
}
// Details controls, collapse defaults and measured height follow the view grid, including resize.
{
 const data=T.empty();data.cases=[base('pane')];data.trucks=[T.normaliseTruck({...T.presets[0],id:'pane-truck',items:[]})];data.activeTruckId='pane-truck';const [item]=T.addItems(data,'pane-truck','pane',1);
 let height=640,callback,disconnects=0;const form={},pane={style:{},innerHTML:'',closest:()=>({classList:{toggle(){}}}),querySelector:()=>form},grid={getBoundingClientRect:()=>({height})};
 const ctx=testContext({T,host:{querySelector:selector=>selector==='.tpViewGrid'?grid:pane},root:{ResizeObserver:class{constructor(fn){callback=fn}observe(el){assert.equal(el,grid)}disconnect(){disconnects++}}},state:()=>data,truck:()=>data.trucks[0],selected:item.id,callbacks:{colourControl:attrs=>'<input '+attrs+'>'},esc:String,length:T.formatLength,weight:T.formatWeight});
 for(const name of ['field','input','button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);
 for(const name of ['caseColourFields','renderGroupInspector','renderInspector'])vm.runInContext(fn(ui,name),ctx);
 ctx.renderInspector();assert.equal(pane.style.height,'640px');assert(pane.innerHTML.indexOf('Save Details')<pane.innerHTML.indexOf('name="name"'));assert(pane.innerHTML.includes('<details class="tpPositionDetails"><summary>Position from rear-left floor</summary>'));assert(!pane.innerHTML.includes('tpPositionDetails" open'));
 ctx.observeInspector();height=920;callback();assert.equal(pane.style.height,'920px');ctx.observeInspector();assert.equal(disconnects,1);
 const two=T.addItems(data,'pane-truck','pane',1)[0];two.colour='#123456';ctx.selectedGroup=[item.id,two.id];ctx.renderInspector();assert(pane.innerHTML.includes('2 Cases Selected'));assert(pane.innerHTML.indexOf('Save Details')<pane.innerHTML.indexOf('name="department"'));const input={name:'colour',dataset:{}};form.oninput({target:input});assert.equal(input.dataset.tpChanged,'true');
 const css=fs.readFileSync(path.join(root,'js/truck-pack.css'),'utf8');assert(css.includes('.tpCube [data-tp-cube-face]:hover polygon'));assert(css.includes('.tpInspectorHead{position:sticky'));
}
// Inventory UI excludes colours; delete and delete-all are confirmed and cascade atomically.
{
 assert(!fn(ui,'inventoryMarkup').includes('colourControl'));assert(!fn(ui,'caseDialog').includes('caseColourFields'));assert(!('colour' in T.suggestMapping(['Name','Colour'])));assert(fn(ui,'render').includes("field('Views'"));assert(fn(ui,'render').includes("button('delete-all-cases','Delete all'"));
 let data=T.empty(),accepted=false,confirmText='',saves=0;data.cases=[base('delete')];data.trucks=[T.normaliseTruck({...T.presets[0],id:'keep',items:[]})];data.activeTruckId='keep';T.addItems(data,'keep','delete',2);
 const ctx=testContext({T,state:()=>data,confirm:message=>{confirmText=message;return accepted},transaction:change=>{const next=JSON.parse(JSON.stringify(data));change(next);data=T.normalise(next);saves++;return true},notify(){}});vm.runInContext(fn(ui,'deleteInventory'),ctx);
 ctx.deleteInventory(true);assert.equal(saves,0);assert(confirmText.includes('every truck'));accepted=true;ctx.deleteInventory(true);assert.equal(saves,1);assert.equal(data.cases.length,0);assert.equal(data.trucks[0].items.length,0);assert.equal(data.trucks[0].id,'keep');
}
console.log('PASS: catalogue/instance separation, marquee selection, shared edits, matched inspector height, top Save, collapsed position and cascading inventory deletion.');

// Blank colours stay neutral; fitted multiline labels remain inside every projected face.
{
 const ctx=testContext({esc:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')});
 const names=['Case Motor Distro Quarter','WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW','A < B & C','輸送ケース 照明'];
 for(const name of names)for(const [width,height] of [[120,80],[40,180],[240,15],[3,2]]){
  const fit=ctx.fitCaseLabel(name,width,height);assert(fit.size>0&&fit.size<=18);assert(fit.lines.length*fit.lineHeight<=height-2*fit.padding+1e-6);
  assert.equal(fit.lines.join('').replace(/\s/g,''),name.replace(/\s/g,''),'keep all name characters');
  for(const line of fit.lines)assert(ctx.caseTextWidth(line)*fit.size<=fit.width+1e-6,'every line fits the available width');
 }
 const fitted=ctx.fitCaseLabel(names[0],120,80);assert(fitted.lines.length>1,'use multiple lines instead of squeezing a whole name onto one line');
 assert(ctx.fitCaseLabel(names[0],30,20).size<fitted.size,'small footprints reduce font size');
 for(const q of [[{x:0,y:0},{x:120,y:0},{x:120,y:80},{x:0,y:80}],[{x:200,y:50},{x:80,y:20},{x:60,y:100},{x:180,y:130}]]){
  const markup=ctx.caseLabelMarkup(names[2],q);assert(markup.includes('overflow="hidden"'));assert(markup.includes('pointer-events="none"'));assert(markup.includes('&lt;'));assert(markup.includes('&amp;'));assert(!/NaN|Infinity/.test(markup));
 }
 assert.equal(ctx.caseLabelMarkup('Edge on',[{x:0,y:0},{x:100,y:0},{x:150,y:0},{x:50,y:0}]),'');
 let measures=0;const measured=testContext({root:{document:{createElement:()=>({getContext:()=>({font:'',measureText:text=>{measures++;return {width:text.length*8}}})})}}});
 assert.equal(measured.caseTextWidth('Measured'),4);assert.equal(measured.caseTextWidth('Measured'),4);assert.equal(measures,1,'cache actual font metrics');
 const data=T.empty();data.cases=[base('uncoloured',{name:names[0]})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'appearance',items:[]})];data.activeTruckId='appearance';const [item]=T.addItems(data,'appearance','uncoloured',1);
 const renderer=testContext({T,drag:null,selected:'',state:()=>data,truck:()=>data.trucks[0],esc:String,Math});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),renderer);
 for(const name of ['corners','staging','scene','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),renderer);
 for(const mode of T.perspectives){data.views[0]=T.view({mode});for(const packed of [false,true]){
  item.packed=packed;item.colour='';item.colour2='';item.colour3='';const plain=renderer.scene(0).markup;
  assert(plain.includes('fill="#ffffff"'),mode);assert(!plain.includes('#7799bb'));assert(plain.includes('class="tpCaseLabel"'));assert(plain.includes('<tspan'));assert(!/NaN|Infinity/.test(plain));
  item.colour2='#ff0000';assert(renderer.scene(0).markup.includes('fill="#ff0000"'),'assigned colours still show even with a blank first field');
  item.colour3='#00ff00';assert(renderer.scene(0).markup.includes('fill="url(#tp-colours-0-'+item.id+')"'),'multiple assigned colours retain stripes');
  item.colour2='';item.colour3='';assert(renderer.scene(0).markup.includes('fill="#ffffff"'),'clearing all colours restores neutral appearance');
 }}
 assert.equal(T.normalise(JSON.parse(JSON.stringify(data))).trucks[0].items[0].colour,'','neutral display never assigns a stored colour');
 console.log('PASS: neutral uncoloured cases, retained colour stripes, measured multiline labels, small/long-name fitting, escaped text and clipped face-plane rendering.');
}

// Truck Pack delegates text rules to the app and matches shared stripe geometry.
{
 let options,stripe='4';const data=T.empty();data.cases=[base('rules',{name:'Shared colour case label'})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'rules',items:[]})];data.activeTruckId='rules';const [item]=T.addItems(data,'rules','rules',1);
 const appContext=testContext({app:{truckPack:data},document:{createElement:()=>({})},$:id=>id==='stripe'?{value:stripe}:{appendChild(){}},LampyTruckPackView:{mount:(view,callbacks)=>options=callbacks},persist(){},updateSheetTabs(){},projectMeasurementUnit:()=> 'metric',projectWeightUnit:()=> 'kg',colourSetPresentation:sharedColourContext.colourSetPresentation,colourInputControl(){},colourTextToHex:v=>v,styleAllColourInputs(){},readTruckPackInventory(){}});
 vm.runInContext(fn(html,'renderTruckPackView'),appContext);appContext.renderTruckPackView();assert.equal(options.colourPresentation,sharedColourContext.colourSetPresentation,'use the actual shared rule, not a Truck Pack copy');
 close(options.stripeWidth(),4*96/25.4);stripe='6';close(options.stripeWidth(),6*96/25.4);stripe='0.1';close(options.stripeWidth(),.5*96/25.4);stripe='4';
 const ctx=testContext({T,callbacks:options,drag:null,selected:'',state:()=>data,truck:()=>data.trucks[0],esc:String,Math});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);
 for(const name of ['corners','staging','scene','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),ctx);
 const combinations=[[],['#ffffff'],['#FFFFFF','#ffffff'],['#000000'],['#ffff00'],['#ff0000','#FF0000'],['','#00ff00'],['#ff0000','#ffffff'],['#ffffff','#0060d2','#ffff00']];
 for(const colours of combinations){Object.assign(item,{colour:colours[0]||'',colour2:colours[1]||'',colour3:colours[2]||''});const before=JSON.stringify(item),shared=options.colourPresentation(colours),appearance=ctx.caseColourMarkup(item,0);
  assert.deepEqual(Array.from(appearance.colours),Array.from(shared.colours));assert.equal(appearance.text,shared.text);assert.equal(appearance.outline,shared.outline);
  const multi=shared.colours.length>1;assert.equal(appearance.defs.includes('<pattern'),multi);if(multi){assert(appearance.defs.includes('patternTransform="rotate(45)"'));assert(appearance.defs.includes('width="'+shared.colours.length*options.stripeWidth()+'"'));assert.equal((appearance.defs.match(new RegExp('width="'+(.3*96/25.4)+'"','g'))||[]).length,shared.colours.includes('#ffffff')?2:0,'outline only white bands on both edges');}
  for(const mode of ['plan','leftIso','right']){data.views[0]=T.view({mode});const markup=ctx.scene(0).markup,labels=[...markup.matchAll(/<text text-anchor="middle" font-family="Arial"[^>]+>/g)];assert(labels.length);for(const [label] of labels){assert(label.includes('fill="'+shared.text+'"'));assert(label.includes('stroke="'+shared.outline+'"'));assert(label.includes('paint-order="stroke fill"'));assert.equal(label.includes('stroke-width="0"'),shared.outline==='transparent');}assert(markup.includes('overflow="hidden"'));assert(!/NaN|Infinity/.test(markup));}
  assert.equal(JSON.stringify(item),before,'rendering does not change assigned colours');
 }
 console.log('PASS: shared text contrast/outline, duplicate colour removal, configured stripe widths and outlined white bands in plan and 3D.');
}

// Four-column grid anchors case fronts to the trailer front and keeps real dimensions.
{
 const data=T.empty();data.cases=[base('grid',{width:610,length:610,height:500}),base('wide',{width:1220,length:1220,height:500}),base('oversize',{width:2500,length:610,height:500})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'grid',snapToGrid:true,items:[]})];data.activeTruckId='grid';const truck=data.trucks[0];
 const items=T.addItems(data,'grid','grid',41);assert.equal(items.filter(i=>i.packed).length,40);assert(!items[40].packed);
 assert.deepEqual(items.slice(0,5).map(i=>[i.x,i.y,i.z]),[[0,5490,0],[610,5490,0],[1220,5490,0],[1830,5490,0],[0,4880,0]]);assert.equal(items[39].y,0);assert.equal(T.truckError(data,truck),'');
 assert.deepEqual(T.normalise(JSON.parse(JSON.stringify(data))),data,'snap setting and packed coordinates persist');
 const prior=JSON.stringify(truck.items);truck.snapToGrid=false;T.normalise(data);assert.equal(JSON.stringify(truck.items),prior);assert(!T.addItems(data,'grid','grid',1)[0].packed,'off preserves Waiting workflow');
 truck.items=[];truck.snapToGrid=true;const wide=T.addItems(data,'grid','wide',3);assert.deepEqual(wide.map(i=>[i.x,i.y]),[[0,4880],[1220,4880],[0,3660]]);assert.equal(T.truckError(data,truck),'');assert(!T.addItems(data,'grid','oversize',1)[0].packed);
 const waiting=T.normaliseItem({id:'snap',caseId:'grid'});assert.deepEqual(T.snapPosition(data,truck,waiting,{x:650,y:5400,z:23.5}),{x:610,y:5490,z:23.5});
 assert.deepEqual(T.snapPosition(data,truck,waiting,{x:9999,y:-100,z:0}),{x:1830,y:0,z:0});
 assert(T.placement(data,truck,waiting,{x:0,y:5490,z:0}).error.includes('overlap'),'snapping never forces overlapping placements');
 truck.items=[];truck.width=2450;truck.length=5000;const fractional=T.addItems(data,'grid','grid',2);close(fractional[1].x,612.5);assert.equal(T.truckError(data,truck),'');
 const moved=T.placement(data,truck,fractional[1],{x:620,y:4300,z:0});assert.equal(moved.error,'');close(moved.item.x,612.5);close(moved.item.y,4390);
 const rotated={...waiting,rotation:90,caseId:'wide'};const pos=T.snapPosition(data,truck,rotated,{x:2000,y:4999,z:0});assert(pos.x+T.dimensions(data,rotated).width<=truck.width);close(pos.y+T.dimensions(data,rotated).length,truck.length);
 const old={...truck};delete old.snapToGrid;assert.equal(T.normaliseTruck(old).snapToGrid,false);
 // Compare the efficient first-free-row search with exhaustive grid positions for mixed loads.
 truck.width=2440;truck.length=6100;truck.items=[];data.cases.push(base('mixed',{width:1000,length:800,height:500}));
 for(let n=0;n<24;n++){
  const candidate=T.normaliseItem({id:'trial_'+n,caseId:['grid','mixed','wide'][n%3]}),d=T.dimensions(data,candidate);let expected=null;
  for(let row=0;row*610<=truck.length-d.length&&!expected;row++)for(let col=0;col<4;col++){
   const point={x:col*610,y:truck.length-d.length-row*610,z:0};if(point.x+d.width>truck.width)break;
   if(!truck.items.some(other=>other.packed&&T.overlaps({...d,...point},T.box(data,other)))){expected=point;break}
  }
  assert.deepEqual(T.firstGridPosition(data,truck,candidate),expected);if(expected)Object.assign(candidate,expected,{packed:true});truck.items.push(candidate);
 }
 assert.equal(T.truckError(data,truck),'');
}
// Toolbar toggling and metadata saves never repack existing cases.
{
 let data=T.empty(),saves=0;data.cases=[base('toggle',{width:400,length:400,height:400})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'toggle',items:[]}),T.normaliseTruck({...T.presets[0],id:'untouched',items:[]})];data.activeTruckId='toggle';const [item]=T.addItems(data,'toggle','toggle',1);Object.assign(item,{packed:true,x:123.25,y:321.5,z:0});const before=JSON.stringify(item);
 const ctx=testContext({T,host:{contains:()=>true},state:()=>data,transaction:change=>{const next=JSON.parse(JSON.stringify(data));change(next);data=T.normalise(next);saves++}});vm.runInContext(fn(ui,'click'),ctx);
 ctx.click({target:{closest:()=>({dataset:{tpAction:'snap-grid'}})}});assert(data.trucks[0].snapToGrid);assert(!data.trucks[1].snapToGrid);assert.equal(JSON.stringify(data.trucks[0].items[0]),before);assert.equal(saves,1);
 const fields={name:'Updated',department:'Lighting',colour:'#123456',colour2:'',colour3:'',rideOnWheels:'yes',lifter:'no',rotation:'0',x:'123.25 mm',y:'321.5 mm',z:'0 mm'};
 ctx.selected=item.id;ctx.FormData=class{get(key){return fields[key]}};ctx.callbacks={colourHex:v=>v};for(const name of ['readCaseColours','applyItem'])vm.runInContext(fn(ui,name),ctx);ctx.applyItem({},false);assert.equal(data.trucks[0].items[0].x,123.25);assert.equal(data.trucks[0].items[0].y,321.5);assert.equal(data.trucks[0].items[0].colour,'#123456');
 assert(fn(ui,'truckDialog').includes('snapToGrid:existing?.snapToGrid===true'),'truck details preserve the setting');
 assert(fn(ui,'render').includes("button('snap-grid','Snap to grid'"));
}
// Actual Add cases form automatically packs valid quantities and keeps overflow waiting.
{
 let data=T.empty(),submit,markup='',saved=0,values={quantity_auto:5};data.cases=[base('auto',{width:610,length:610,height:400})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'auto',length:610,snapToGrid:true,items:[]})];data.activeTruckId='auto';
 const ctx=testContext({T,state:()=>data,truck:()=>data.trucks[0],esc:String,length:T.formatLength,FormData:class{get(key){return values[key]}},showDialog:(title,html,handler)=>{submit=handler;markup=html;return {querySelector:()=>({}),querySelectorAll:()=>[]}},replace:next=>{data=T.normalise(next);saved++},closeDialog(){},render(){},selected:'',message:''});vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const input=')),ctx);vm.runInContext(fn(ui,'addCaseDialog'),ctx);ctx.addCaseDialog();assert(markup.includes('fill from the front'));submit({});assert.equal(saved,1);assert.equal(data.trucks[0].items.filter(i=>i.packed).length,4);assert.equal(ctx.message,'4 cases packed from the front; 1 added to Waiting.');
 const renderer=testContext({T,drag:null,selected:'',state:()=>data,truck:()=>data.trucks[0],esc:String,Math});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),renderer);for(const name of ['corners','staging','scene','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),renderer);
 for(const mode of T.perspectives){data.views[0]=T.view({mode});const scene=renderer.scene(0);assert(scene.markup.includes('class="tpSnapGrid" data-grid-columns="4"'));assert(scene.markup.includes('pointer-events="none"'));assert(!/NaN|Infinity/.test(scene.markup));}
 data.trucks[0].snapToGrid=false;assert(!renderer.scene(0).markup.includes('tpSnapGrid'));
 const path=renderer.gridMarkup({width:2440,length:6100},p=>p);assert(path.includes('M610,0L610,6100'));assert(path.includes('M0,5490L2440,5490'),'row lines start at the front');
}
// Drag previews and committed drops share snapped coordinates; collision leaves data unchanged.
{
 let data=T.empty();data.cases=[base('drag',{width:610,length:610,height:400})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'drag',items:[]})];data.activeTruckId='drag';const [item]=T.addItems(data,'drag','drag',1);data.trucks[0].snapToGrid=true;
 const host={querySelector:()=>({getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})}),releasePointerCapture(){}},ctx=testContext({T,host,state:()=>data,truck:()=>data.trucks[0],drag:{type:'case',id:item.id,item:{...item},index:0,origin:{x:0,y:0,z:0},start:{x:0,y:0},projection:{scale:1,camera:T.view({mode:'plan'})},plane:'xy'},notify(){},renderScenes(){},transaction:change=>{const next=JSON.parse(JSON.stringify(data));change(next);data=T.normalise(next)}});
 for(const name of ['svgPoint','pointerMove','pointerUp'])vm.runInContext(fn(ui,name),ctx);ctx.pointerMove({clientX:650,clientY:-5400});assert.equal(ctx.drag.error,'');assert.equal(ctx.drag.preview.x,610);assert.equal(ctx.drag.preview.y,5490);ctx.pointerUp({pointerId:1});assert.equal(data.trucks[0].items[0].x,610);assert.equal(data.trucks[0].items[0].y,5490);assert(data.trucks[0].items[0].packed);
 const occupied=T.addItems(data,'drag','drag',1)[0],before=JSON.stringify(data);ctx.drag={type:'case',id:item.id,item:{...data.trucks[0].items[0]},index:0,origin:{x:610,y:5490,z:0},start:{x:0,y:0},projection:{scale:1,camera:T.view({mode:'plan'})},plane:'xy'};ctx.pointerMove({clientX:-600,clientY:0});assert(ctx.drag.error.includes('overlap'));assert.equal(ctx.drag.preview.x,occupied.x);ctx.pointerUp({pointerId:1});assert.equal(JSON.stringify(data),before);
}
console.log('PASS: four-column front-first grid packing, overflow Waiting, mixed/rotated footprints, fractional lanes, saved toggles, unchanged metadata positions and snapped drag collision rejection.');

// Snapping respects non-square rotations and the existing supported-lifter rules.
{
 const data=T.empty();data.cases=[base('support',{width:610,length:610,height:400}),base('lift',{width:300,length:300,height:300}),base('rectangle',{width:300,length:800,height:400})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'stack-grid',snapToGrid:true,items:[]})];data.activeTruckId='stack-grid';const truck=data.trucks[0],[support]=T.addItems(data,truck.id,'support',1);
 const lift=T.normaliseItem({id:'lifted',caseId:'lift',rideOnWheels:false,lifter:true});truck.items.push(lift);const placed=T.placement(data,truck,lift,{x:10,y:truck.length-300,z:0});assert.equal(placed.error,'');assert.equal(placed.item.z,400);Object.assign(lift,placed.item);assert.equal(T.truckError(data,truck),'');assert(T.placement(data,truck,support,{x:650,y:support.y,z:0}).error.includes('supported'));
 const rotated=T.normaliseItem({id:'rotated',caseId:'rectangle',rotation:90});const position=T.snapPosition(data,truck,rotated,{x:2000,y:6000,z:0});assert.equal(position.x,1220);assert.equal(position.y,5800);assert.deepEqual([T.dimensions(data,rotated).width,T.dimensions(data,rotated).length],[800,300]);assert.equal(T.placement(data,truck,rotated,position).error,'');
}

// Lifter is independent of wheels in saved data, placement and single-case edits.
{
 for(const snapToGrid of [false,true]){
  const data=T.empty();data.cases=[base('bottom',{width:1220,length:1220,height:500}),base('wheeled',{width:610,length:610,height:400})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'lifter-wheels',snapToGrid,items:[]})];data.activeTruckId='lifter-wheels';const truck=data.trucks[0];
  const lower=T.normaliseItem({id:'lower',caseId:'bottom',packed:true,x:0,y:snapToGrid?truck.length-1220:0,z:0}),upper=T.normaliseItem({id:'upper',caseId:'wheeled',rideOnWheels:true,lifter:true});truck.items.push(lower,upper);
  assert(upper.lifter&&upper.rideOnWheels);const originalDimensions=T.dimensions(data,upper),position={x:0,y:snapToGrid?truck.length-610:0,z:0},placed=T.placement(data,truck,upper,position);
  assert.equal(placed.error,'');assert.equal(placed.item.z,500);Object.assign(upper,placed.item);assert.deepEqual(T.dimensions(data,upper),originalDimensions,'wheeled lifters retain their actual orientation and castor height');assert.equal(T.truckError(data,truck),'');assert.deepEqual(T.normalise(JSON.parse(JSON.stringify(data))),data);
  assert(T.placement(data,truck,{...upper,lifter:false},{x:upper.x,y:upper.y,z:upper.z},false).error.includes('lifter'));
  assert(T.placement(data,truck,upper,{x:1830,y:upper.y,z:500},false).error.includes('supported'));
  assert(T.placement(data,truck,upper,{x:0,y:upper.y,z:250},false).error.includes('overlap'));
  assert(T.placement(data,truck,upper,{x:0,y:upper.y,z:truck.height},false).error.includes('outside'));
  assert(T.placement(data,truck,lower,{x:1220,y:lower.y,z:0},false).error.includes('supported'),'cannot move the support out from under a wheeled lifter');
 }
 let data=T.empty();data.cases=[base('single')];data.trucks=[T.normaliseTruck({...T.presets[0],id:'single',snapToGrid:true,items:[]})];data.activeTruckId='single';const item=T.normaliseItem({id:'one',caseId:'single',packed:true,x:123,y:321,rideOnWheels:true});data.trucks[0].items.push(item);
 const fields={name:'single',department:'',colour:'',colour2:'',colour3:'',rideOnWheels:'yes',lifter:'yes',rotation:'0',x:'123 mm',y:'321 mm',z:'0 mm'},ctx=testContext({T,selected:item.id,state:()=>data,callbacks:{colourHex:v=>v},FormData:class{get(key){return fields[key]}},transaction:change=>{const next=JSON.parse(JSON.stringify(data));change(next);data=T.normalise(next)}});
 for(const name of ['readCaseColours','applyItem'])vm.runInContext(fn(ui,name),ctx);ctx.applyItem({},false);assert(data.trucks[0].items[0].lifter);assert(data.trucks[0].items[0].rideOnWheels);assert.equal(data.trucks[0].items[0].x,123);assert.equal(data.trucks[0].items[0].y,321);
 fields.lifter='no';ctx.applyItem({},false);assert(!data.trucks[0].items[0].lifter);assert.equal(data.trucks[0].items[0].x,123);
}
// Actual single/multi inspectors expose Lifter; changed-only bulk edits are atomic.
{
 let data=T.empty(),saves=0,message='',changes=[];data.cases=[base('multi',{width:400,length:600,height:400})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'multi',items:[]})];data.activeTruckId='multi';const items=T.addItems(data,'multi','multi',3);items[1].rideOnWheels=false;items[1].lifter=true;
 const form={querySelectorAll:()=>changes},pane={style:{},innerHTML:'',closest:()=>({classList:{toggle(){}}}),querySelector:()=>form};
 const ctx=testContext({T,host:{querySelector:selector=>selector==='.tpInspector'?pane:null},state:()=>data,truck:()=>data.trucks[0],selected:items[0].id,selectedGroup:[],callbacks:{colourControl:attrs=>'<input '+attrs+'>',colourHex:v=>v},esc:String,length:T.formatLength,weight:T.formatWeight,notify:text=>message=text,transaction:change=>{try{const next=JSON.parse(JSON.stringify(data));change(next);data=T.normalise(next);saves++;return true}catch(error){message=error.message;return false}}});
 for(const name of ['field','input','button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);
 for(const name of ['caseColourFields','renderInspector','renderGroupInspector','applySelectedDetails'])vm.runInContext(fn(ui,name),ctx);
 ctx.renderInspector();assert(pane.innerHTML.includes('<div data-tp-lifter>'));assert(pane.innerHTML.includes('name="lifter"'));assert(!pane.innerHTML.includes('data-tp-lifter hidden'));
 ctx.selectedGroup=items.slice(0,2).map(i=>i.id);ctx.renderInspector();assert(pane.innerHTML.includes('name="lifter"'));assert(pane.innerHTML.includes('Mixed — leave unchanged'));
 changes=[];form.onsubmit({preventDefault(){}});assert.equal(saves,0);assert.equal(data.trucks[0].items[0].lifter,false);assert.equal(data.trucks[0].items[1].lifter,true);
 const input={name:'lifter',value:'yes',dataset:{}};form.onchange({target:input});assert.equal(input.dataset.tpChanged,'true');changes=[input];form.onsubmit({preventDefault(){}});assert.equal(saves,1);assert(data.trucks[0].items.slice(0,2).every(i=>i.lifter));assert(!data.trucks[0].items[2].lifter);assert(data.trucks[0].items[0].rideOnWheels);assert(!data.trucks[0].items[1].rideOnWheels);
 changes=[{name:'lifter',value:''}];ctx.applySelectedDetails(form);assert.equal(saves,1,'mixed leave-unchanged does not turn lifters off');
 changes=[{name:'lifter',value:'no'}];ctx.applySelectedDetails(form);assert.equal(saves,2);assert(data.trucks[0].items.every(i=>!i.lifter));
 // A rejected shared edit must not partially change any selected case or other fields.
 data.cases.push(base('support-multi',{width:1220,length:1220,height:500}));const support=T.normaliseItem({id:'support-multi',caseId:'support-multi',packed:true});data.trucks[0].items.push(support);Object.assign(data.trucks[0].items[0],{packed:true,lifter:true,rideOnWheels:true,x:0,y:0,z:500});data=T.normalise(data);const before=JSON.stringify(data);
 changes=[{name:'lifter',value:'no'},{name:'department',value:'Do not partially save'}];ctx.applySelectedDetails(form);assert.equal(saves,2);assert(message.includes('lifter'));assert.equal(JSON.stringify(data),before);
 changes=[{name:'lifter',value:'invalid'}];ctx.applySelectedDetails(form);assert.equal(saves,2);assert(message.includes('Yes or No'));
}
console.log('PASS: always-visible single/bulk lifter controls, untouched mixed values, atomic bulk rejection, independent wheel/lifter persistence and supported wheeled stacking with grid on/off.');
