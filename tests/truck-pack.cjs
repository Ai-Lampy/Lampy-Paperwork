'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const T=require('../js/truck-pack.js'),root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),ui=fs.readFileSync(path.join(root,'js/truck-pack-view.js'),'utf8');
function fn(text,name){const start=text.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=text.indexOf('}',start);end>=0;end=text.indexOf('}',end+1)){const value=text.slice(start,end+1);try{new Function('return ('+value+')');return value}catch{}}throw Error(name)}
const sharedColourContext=vm.createContext({colourTextToHex:value=>String(value||'').trim().toLowerCase(),normaliseHex:value=>String(value||'').toLowerCase()});vm.runInContext(fn(html,'colourSetPresentation'),sharedColourContext);
function testContext(values){if(values.host&&!values.host.querySelector)values.host.querySelector=()=>null;const context=vm.createContext({root:{},host:null,notify(){},renderInspector(){},renderScenes(){},callbacks:{colourPresentation:values=>sharedColourContext.colourSetPresentation(values),stripeWidth:()=>4*96/25.4},selectedGroup:[],inspectorObserver:null,undoStack:[],redoStack:[],showMeasurements:true,inventoryQuery:'',manualDimensionUnit:'',length:T.formatLength,unit:()=>({measurement:'metric',weight:'kg'}),state:()=>({layout:2,trucks:[]}),truck:()=>values.state?.().trucks.find(t=>t.id===values.state().activeTruckId),...values});for(const name of ['inventoryCell','inventoryFieldValue','refreshInventoryCell','startInventoryFill','updateInventoryFill','inventoryFillScroll','finishInventoryFill','caseMetrics','commitPendingDetails','bindDetailsForm','loadSummaryMarkup','detailsTransaction','boundedPan','panelViewport','corners','prepareOrbit','groupedScene','trailerRulers','trailerCaptions','trailerCaptionMarkup','fit3DBounds','fit3DView','historyButtons','inventoryMatches','filterInventory','trailerRuler','syncHistoryButtons','orientationControl','syncOrientationForm','editActions','measurementMarkup','sceneCamera','viewportMarkup','sceneViewport','gridMarkup','caseFaceFrame','caseFaceShade','orderCaseSurfaces','caseColourMarkup','caseTextWidth','fitCaseLabel','caseLabelMarkup','selectionIds','selectionRect','casesInSelection','syncInspectorHeight','observeInspector'])vm.runInContext(fn(ui,name),context);return context}
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
for(const mode of T.perspectives.filter(k=>k!=='orbit')){const camera=T.view({mode,yaw:T.cameras[mode][0],pitch:T.cameras[mode][1]}),plane=['left','right','sides'].includes(mode)?'yz':['front','back'].includes(mode)?'xz':'xy',delta=plane==='xy'?{x:150,y:-240,z:0}:plane==='xz'?{x:150,y:0,z:240}:{x:0,y:150,z:240},screen=T.project(delta,camera),back=T.unprojectDelta(screen.x,screen.y,camera,plane);for(const key of ['x','y','z'])close(back[key],delta[key]);}
// Run the actual SVG renderer with saved data, independent camera windows and staging.
model.layout=2;
const c=testContext({T,drag:null,selected:upper.id,state:()=>model,truck:()=>truck,esc:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),Math});
vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),c);
for(const name of ['corners','staging','scene','renderSceneData','partMesh','cubeMarkup'])vm.runInContext(fn(ui,name),c);
for(const mode of T.perspectives.filter(v=>v!=='orbit')){model.views[0]=T.view({mode,yaw:T.cameras[mode][0],pitch:T.cameras[mode][1]});const result=c.scene(0);assert(result.markup.includes('base'));assert(result.markup.includes('small'));assert(!/NaN|Infinity/.test(result.markup),mode);for(const match of result.markup.matchAll(/matrix\(([-.\d]+) ([-.\d]+) ([-.\d]+) ([-.\d]+) /g)){const [a,b,c,d]=match.slice(1).map(Number);assert(Math.abs(a*d-b*c)>0,'case artwork retains an invertible face projection');}assert(result.markup.includes('data-tp-item'));assert(result.markup.includes('Rear'));if(mode!=='plan'){assert(result.markup.includes('#303844'),'3D shows castors');assert(c.cubeMarkup(model.views[0]).includes('data-tp-cube-face="top"'));}}
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
 d.pointerDown({button:0,pointerId:2,target:cubeTarget,clientX:100,clientY:100,preventDefault(){}});d.pointerMove({clientX:140,clientY:130});assert.equal(model.views[0].mode,'orbit');close(model.views[0].yaw,-9);close(model.views[0].pitch,40.5);d.pointerUp({pointerId:2});
 d.pointerDown({button:0,pointerId:2,target:cubeTarget,clientX:100,clientY:100,preventDefault(){}});d.pointerUp({pointerId:2});assert.equal(model.views[0].mode,'front');assert.equal(model.views[0].yaw,180);assert.equal(model.views[0].pitch,0);
}

// Run the actual project loader, including normalization before any app mutation.
{
 const p=testContext({LampyCore:require('../js/project-core.js'),LampyTruckPack:T,app:{collapsed:{}},document:{},VERSION:'test',fixturePatchViewOptions:{},persisted:0});
 for(const name of ['normaliseLabel','normaliseSocaMeta','normaliseDistro','normaliseLooms','normaliseProjectInfo','normalisePatchFixture','normalisePatchSheets','normaliseGdtfFiles','normaliseGdtfMatches','normaliseControlNetwork','normalisePatchViewOptions'])p[name]=value=>value;
 for(const name of ['resetFixturePatchUndo','closeConsoleRemoval','resetProjectErrors','clearDeviceConfigSelection','closeAllRackPopouts','applyFixtureOverridesToProjectRows','ensureSocaData','syncPositionsFromPatch','resetRevisionTracking'])p[name]=()=>{};
 for(const name of ['repositoryGdtfBytes','unlockedPatchGroups','deviceConfigExpandedDevices','controlExpandedDevices','controlOpenLocations','controlKnownLocations','deviceConfigTableSorts','rackViewZooms','rackViewFaces','rackClosedPanels','rackPopoutDualViews','collapsedLoomCards','knownLoomCardStates'])p[name]=new Set();
 p.persist=()=>p.persisted++;
 for(const name of ['updateProjectTabTitle','normaliseTruckPack','loadProjectPayload'])vm.runInContext(fn(html,name),p);
 const payload={app:{labels:[],distros:[],fixturePatch:[],looms:[],patchSheets:[],projectInfo:{file:{projectName:'Imported tour'},projectSettings:{}},controlNetwork:{},gdtfFiles:{},gdtfMatches:{},truckPack:JSON.parse(JSON.stringify(model))}};
 p.loadProjectPayload(payload);assert.equal(p.document.title,'Imported tour');assert.deepEqual(JSON.parse(JSON.stringify(p.app.truckPack)),T.normalise(model));assert.equal(p.persisted,1);
 const validApp=p.app.truckPack,malformed=JSON.parse(JSON.stringify(payload));malformed.app.truckPack.trucks[0].items[0].x=-100;assert.throws(()=>p.loadProjectPayload(malformed));assert.equal(p.app.truckPack,validApp,'invalid packs cannot partially replace the project');assert.equal(p.persisted,1);
 delete payload.app.truckPack;p.loadProjectPayload(payload);assert.equal(p.document.title,'Imported tour');assert.deepEqual(JSON.parse(JSON.stringify(p.app.truckPack)),T.empty(),'older projects load with an empty Truck Pack');
}

// Render actual inventory and multi-view controls, and submit both creation forms.
{
 const moduleContext=testContext({LampyTruckPack:T});vm.runInContext(ui,moduleContext);
 const viewLabels=moduleContext.LampyTruckPackView.labels;
 assert.deepEqual(Object.values(viewLabels).slice(0,8),['2D Top/Plan','3D Top','3D Sides','3D Back','3D Front','3D Left Isometric','3D Right Isometric','3D Free Rotation']);
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
 for(const layout of [1,2,4]){fresh.layout=layout;const markup=c.packMarkup(fresh,fresh.trucks[0]);assert.equal((markup.match(/class="tpViewport"/g)||[]).length,layout===1?2:layout);if(layout===1){assert(!markup.includes('data-tp-perspective'));assert(!markup.includes('data-tool="rotate"'))}else for(let i=0;i<layout;i++)assert(markup.includes('data-tp-perspective="'+i+'"'));}
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
 for(const mode of ['plan','leftIso']){data.views[0]=T.view({mode});const result=render.scene(0);for(const colour of ['#ff0000','#00ff00','#0000ff'])assert(result.markup.includes('fill="'+colour+'"'));assert(result.markup.includes('fill="url(#tp-colours-'+(['top','sides'].includes(mode)?'0p0':'0')+'-'+item.id+'-'));}
 const before=render.scene(0).point({x:0,y:0,z:0});data.views[0].panX=82;data.views[0].panY=-36;const after=render.scene(0).point({x:0,y:0,z:0});close(after.x-before.x,82);close(after.y-before.y,-36);
}
// Scene tools change only their viewport; pan/orbit never move case geometry.
{
 let data=T.empty(),saves=0,draws=0;data.layout=2;data.cases=[base('item')];data.trucks=[T.normaliseTruck({...T.presets[0],id:'tools',items:[]})];data.activeTruckId='tools';T.addItems(data,'tools','item',1);
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
 action('tool',{view:'0',tool:'rotate'});assert.equal(data.views[0].tool,'rotate');assert.equal(data.views[0].mode,'orbit');
 const yaw=data.views[0].yaw;context.pointerDown(event(100,100));context.pointerMove(event(140,120));context.pointerUp(event(140,120));assert.equal(data.views[0].mode,'orbit');close(data.views[0].yaw,yaw+26);
 assert.equal(JSON.stringify(data.trucks[0].items),itemSnapshot);assert.equal(JSON.stringify(data.views.slice(1)),otherViews);
 action('tool',{view:'0',tool:'select'});assert.equal(data.views[0].tool,'select');context.selected='selected';context.pointerDown(event(0,0));context.pointerUp(event(0,0));assert.equal(context.selected,'');
 data.views[0].zoom=2;action('fit',{view:'0'});assert.equal(data.views[0].zoom,1);assert.equal(data.views[0].panX,0);assert.equal(data.views[0].panY,0);
 context.setView(0,'plan');action('tool',{view:'0',tool:'rotate'});context.setView(0,'plan');assert.equal(data.views[0].mode,'top');assert.equal(data.views[0].tool,'rotate');
 data.trucks.push(T.normaliseTruck({...T.presets[0],id:'other',items:[]}));context.selected='old';action('truck',{truckId:'other'});assert.equal(data.activeTruckId,'other');assert.equal(context.selected,'');assert(saves>0&&draws>0);
}
// Single view keeps an empty inspector; multiple views hide it without a selection.
{
 const data=T.empty();data.cases=[base('detail')];data.trucks=[T.normaliseTruck({...T.presets[0],id:'details',items:[]})];data.activeTruckId='details';const [item]=T.addItems(data,'details','detail',1);
 let hasSelection=false;const children={form:{},'[name="rideOnWheels"]':{},'[data-tp-lifter]':{}},pane={hidden:false,innerHTML:'',closest:()=>({classList:{toggle:(name,value)=>hasSelection=value}}),querySelector:selector=>children[selector]};
 const context=testContext({T,host:{querySelector:()=>pane},state:()=>data,truck:()=>data.trucks[0],selected:'',callbacks:{colourControl:(attrs,value)=>'<input '+attrs+' value="'+value+'">'},esc:String,length:T.formatLength,weight:T.formatWeight,renderScenes(){}});
 for(const name of ['field','input','button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),context);
 for(const name of ['caseColourFields','renderInspector','select','outsidePointer'])vm.runInContext(fn(ui,name),context);
 context.renderInspector();assert(!pane.hidden);assert(hasSelection);assert(!pane.innerHTML.includes('data-tp-select'));assert(!pane.innerHTML.includes('data-tp-item-form'));
 data.layout=2;context.renderInspector();assert(pane.hidden);assert(!hasSelection);assert.equal(pane.innerHTML,'');
 context.select(item.id);assert(!pane.hidden);assert(hasSelection);for(const key of ['colour','colour2','colour3'])assert(pane.innerHTML.includes('name="'+key+'"'));
 context.outsidePointer({target:{closest:()=>pane}});assert.equal(context.selected,item.id);
 context.outsidePointer({target:{closest:()=>null}});assert.equal(context.selected,'');assert(pane.hidden);assert(!hasSelection);
 data.layout=4;context.renderInspector();assert(pane.hidden);data.layout=1;context.renderInspector();assert(!pane.hidden);assert(hasSelection);context.select(item.id);context.outsidePointer({target:{closest:()=>null}});assert(!pane.hidden);assert.equal(context.selected,'');assert(pane.innerHTML.includes('Select cases to view'));
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
 for(const layout of [1,2,4]){data.layout=layout;context.render();const actions=host.innerHTML.slice(host.innerHTML.indexOf('<div class="tpActions">'),host.innerHTML.indexOf('<div class="tpMessage'));assert(actions.includes('data-tp-layout'));assert(actions.includes('>2D Top/Plan</option>'));assert(!actions.includes('>Single</option>'));assert(actions.includes('value="'+layout+'" selected'));assert(actions.includes('data-tp-action="add-case"'));assert(host.innerHTML.includes('data-truck-id="toolbar"'));}
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
 ctx.renderInspector();assert.equal(pane.style.height,'640px');assert(!pane.innerHTML.includes('Save Details'));assert(pane.innerHTML.includes('<details class="tpPositionDetails"><summary>Position from rear-left floor</summary>'));assert(!pane.innerHTML.includes('tpPositionDetails" open'));
 ctx.observeInspector();height=920;callback();assert.equal(pane.style.height,'920px');ctx.observeInspector();assert.equal(disconnects,1);
 const two=T.addItems(data,'pane-truck','pane',1)[0];two.colour='#123456';ctx.selectedGroup=[item.id,two.id];ctx.renderInspector();assert(pane.innerHTML.includes('2 Cases Selected'));assert(!pane.innerHTML.includes('Save Details'));const input={name:'colour',dataset:{}};form.oninput({target:input});assert.equal(input.dataset.tpChanged,'true');
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
 const names=['Case Motor Distro Quarter','WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW','A < B & C','輸送ケース 照明','Supercalifragilisticexpialidocious Case','Motor-Distro_Quarter123 Flight Case'];
 for(const name of names)for(const [width,height] of [[120,80],[40,180],[240,15],[3,2]]){
  const fit=ctx.fitCaseLabel(name,width,height);assert(fit.size>0&&fit.size<=18);assert(fit.lines.length*fit.lineHeight<=height-2*fit.padding+1e-6);
  assert.equal(fit.lines.join('').replace(/\s/g,''),name.replace(/\s/g,''),'keep all name characters');
  assert.deepEqual(Array.from(fit.lines).flatMap(line=>line.split(/\s+/)),name.trim().split(/\s+/),'wrap only between complete words');
  for(const line of fit.lines)assert(ctx.caseTextWidth(line)*fit.size<=fit.width+1e-6,'every line fits the available width');
 }
 const fitted=ctx.fitCaseLabel(names[0],120,80);assert(fitted.lines.length>1,'use multiple lines instead of squeezing a whole name onto one line');
 assert(ctx.fitCaseLabel(names[0],30,20).size<fitted.size,'small footprints reduce font size');
 const unbroken=ctx.fitCaseLabel(names[1],40,180);assert.equal(unbroken.lines.length,1,'a long word stays on one line even when there is room for more lines');assert(unbroken.size<18,'reduce the font to fit a long word');
 const wordLabel=ctx.caseLabelMarkup(names[1],{width:40,height:180,transform:'matrix(1 0 0 1 0 0)'});assert.equal((wordLabel.match(/<tspan /g)||[]).length,1);assert(wordLabel.includes('>'+names[1]+'</tspan>'),'the rendered label retains the whole word');
 for(const q of [[{x:0,y:0},{x:120,y:0},{x:120,y:80},{x:0,y:80}],[{x:200,y:50},{x:80,y:20},{x:60,y:100},{x:180,y:130}]]){
  const local=[{x:0,y:0,z:0},{x:1200,y:0,z:0},{x:1200,y:800,z:0},{x:0,y:800,z:0}],markup=ctx.caseLabelMarkup(names[2],ctx.caseFaceFrame(q,local));assert(markup.includes('overflow="hidden"'));assert(markup.includes('pointer-events="none"'));assert(markup.includes('&lt;'));assert(markup.includes('&amp;'));assert(!/NaN|Infinity/.test(markup));
 }
 assert.equal(ctx.caseLabelMarkup('Edge on',ctx.caseFaceFrame([{x:0,y:0},{x:100,y:0},{x:150,y:0},{x:50,y:0}],[{x:0,y:0,z:0},{x:1000,y:0,z:0},{x:1000,y:500,z:0},{x:0,y:500,z:0}])),'');
 let measures=0;const measured=testContext({root:{document:{createElement:()=>({getContext:()=>({font:'',measureText:text=>{measures++;return {width:text.length*8}}})})}}});
 assert.equal(measured.caseTextWidth('Measured'),4);assert.equal(measured.caseTextWidth('Measured'),4);assert.equal(measures,1,'cache actual font metrics');
 const data=T.empty();data.cases=[base('uncoloured',{name:names[0]})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'appearance',items:[]})];data.activeTruckId='appearance';const [item]=T.addItems(data,'appearance','uncoloured',1);
 const renderer=testContext({T,drag:null,selected:'',state:()=>data,truck:()=>data.trucks[0],esc:String,Math});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),renderer);
 for(const name of ['corners','staging','scene','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),renderer);
 for(const mode of T.perspectives){data.views[0]=T.view({mode});for(const packed of [false,true]){
  item.packed=packed;item.colour='';item.colour2='';item.colour3='';const plain=renderer.scene(0).markup;
  assert(plain.includes('fill="#ffffff"'),mode);assert(!plain.includes('#7799bb'));assert(plain.includes('class="tpCaseLabel"'));assert(plain.includes('<tspan'));assert(!/NaN|Infinity/.test(plain));
  item.colour2='#ff0000';assert(renderer.scene(0).markup.includes('fill="#ff0000"'),'assigned colours still show even with a blank first field');
  item.colour3='#00ff00';assert(renderer.scene(0).markup.includes('fill="url(#tp-colours-'+(['top','sides'].includes(mode)?'0p0':'0')+'-'+item.id+'-'),'multiple assigned colours retain stripes');
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
 for(const colours of combinations){Object.assign(item,{colour:colours[0]||'',colour2:colours[1]||'',colour3:colours[2]||''});const before=JSON.stringify(item),shared=options.colourPresentation(colours),appearance=ctx.caseColourMarkup(item,0,5,{transform:'matrix(1 0 0 1 20 30)'});
  assert.deepEqual(Array.from(appearance.colours),Array.from(shared.colours));assert.equal(appearance.text,shared.text);assert.equal(appearance.outline,shared.outline);
  const multi=shared.colours.length>1;assert.equal(appearance.defs.includes('<pattern'),multi);if(multi){assert(appearance.defs.includes('patternTransform="matrix(1 0 0 1 20 30) rotate(45)"'));assert(appearance.defs.includes('width="'+shared.colours.length*options.stripeWidth()+'"'));assert.equal((appearance.defs.match(new RegExp('width="'+(.3*96/25.4)+'"','g'))||[]).length,shared.colours.includes('#ffffff')?2:0,'outline only white bands on both edges');}
  for(const mode of ['plan','leftIso','right']){data.views[0]=T.view({mode});const markup=ctx.scene(0).markup,labels=[...markup.matchAll(/<text text-anchor="middle" font-family="Arial"[^>]+>/g)];assert(labels.length);for(const [label] of labels){assert(label.includes('fill="'+shared.text+'"'));assert(label.includes('stroke="'+shared.outline+'"'));assert(label.includes('paint-order="stroke fill"'));assert.equal(label.includes('stroke-width="0"'),shared.outline==='transparent');}assert(markup.includes('overflow="hidden"'));assert(!/NaN|Infinity/.test(markup));}
  assert.equal(JSON.stringify(item),before,'rendering does not change assigned colours');
 }
 console.log('PASS: shared text contrast/outline, duplicate colour removal, configured stripe widths and outlined white bands in plan and 3D.');
}

// Face artwork has fixed physical coordinates, independent of the camera.
{
 const data=T.empty();data.cases=[base('anchored',{name:'Christie Lites Very Long Case Name 123',width:800,length:1200,height:650})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'anchored',items:[]})];data.activeTruckId='anchored';
 const items=T.addItems(data,'anchored','anchored',2);Object.assign(items[0],{packed:true,x:300,y:600,z:0});for(const item of items)Object.assign(item,{colour:'#ff0000',colour2:'#ffffff',colour3:'#0060d2'});
 const ctx=testContext({T,drag:null,selected:'',state:()=>data,truck:()=>data.trucks[0],esc:String,Math});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);
 for(const name of ['corners','staging','scene','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),ctx);
 const colour=ctx.caseColourMarkup,label=ctx.caseLabelMarkup;let records=[];
 ctx.caseColourMarkup=(item,index,face,frame)=>{const appearance=colour(item,index,face,frame);records.push({item,index,face,frame,appearance});return appearance};
 ctx.caseLabelMarkup=(name,frame,appearance)=>{const result=label(name,frame,appearance);records.at(-1).label=result;return result};
 const matrix=frame=>frame.transform.slice(7,-1).split(' ').map(Number),mapped=(m,x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]}),samePoint=(a,b)=>{close(a.x,b.x);close(a.y,b.y)};
 const layouts=new Map(),cameras=[{mode:'plan'},{mode:'leftIso'},{mode:'leftIso',panX:137,panY:-92},{mode:'leftIso',zoom:2},{mode:'leftIso',yaw:43,pitch:18},{mode:'leftIso',yaw:137,pitch:73},{mode:'leftIso',yaw:224,pitch:-24},{mode:'leftIso',yaw:315,pitch:30},{mode:'top'},{mode:'front'},{mode:'right'}];
 for(const rideOnWheels of [true,false])for(const rotation of [0,90])for(const camera of cameras){
  for(const item of items)Object.assign(item,{rideOnWheels,rotation});data.views[0]=T.view(camera);const before=JSON.stringify(data);records=[];const rendered=ctx.scene(0);
  assert(records.length);assert(!/NaN|Infinity/.test(rendered.markup));assert.equal(JSON.stringify(data),before,'camera rendering does not mutate project data');
  const ids=[...rendered.markup.matchAll(/<pattern id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'each case face has its own pattern');
  for(const record of records){
   const {item,face,frame,appearance}=record,d=T.dimensions(data,item),position=item.packed?item:rendered.waiting.get(item.id),m=matrix(frame);
   assert(m.every(Number.isFinite));assert(appearance.defs.includes('patternTransform="'+frame.transform+' rotate(45)"'),'colour pattern uses the same face transform as the label');assert(record.label.includes('transform="'+frame.transform+'"'));
   // Independent body vertices and rigid case transform. UV corners must remain
   // attached to these exact physical corners after pan, zoom, orbit and rotation.
   const body=[[0,0,d.caster],[800,0,d.caster],[800,1200,d.caster],[0,1200,d.caster],[0,0,d.total],[800,0,d.total],[800,1200,d.total],[0,1200,d.total]],faces=[[0,3,2,1],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]];
   const world=body.map(([x,y,z])=>{if(!rideOnWheels)[y,z]=[z,1200-y];if(rotation===90)[x,y]=[y,800-x];return {x:position.x+x,y:position.y+y,z:position.z+z}}),q=faces[face].map(i=>world[i]);
   for(const [x,y,i] of [[0,0,3],[frame.width,0,2],[frame.width,frame.height,1],[0,frame.height,0]])samePoint(mapped(m,x,y),rendered.point(q[i]));
   // A particular point inside a stripe stays at the same position on the face.
   const u=(17-23)/Math.sqrt(2),v=(17+23)/Math.sqrt(2),surface={};for(const axis of ['x','y','z'])surface[axis]=q[3][axis]+u/frame.width*(q[2][axis]-q[3][axis])+v/frame.height*(q[0][axis]-q[3][axis]);samePoint(mapped(m,u,v),rendered.point(surface));
   const key=item.id+'-'+face,layout=record.label.slice(record.label.indexOf('<svg'));if(layouts.has(key))assert.equal(layout,layouts.get(key),'font size, wrapping, text position and clipping stay fixed on the face');else layouts.set(key,layout);
  }
 }
 // Viewports must never share SVG pattern IDs.
 data.views[0]=T.view({mode:'leftIso'});data.views[1]=T.view({mode:'rightIso'});const combined=ctx.scene(0).markup+ctx.scene(1).markup,ids=[...combined.matchAll(/<pattern id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 // Subpixel or edge-on faces omit artwork without producing an invalid pattern.
 ctx.caseColourMarkup=colour;ctx.caseLabelMarkup=label;
 Object.assign(data.cases[0],{width:1,length:1,height:1,casterHeight:0});for(const item of items)Object.assign(item,{rideOnWheels:true,rotation:0});
 for(const pitch of [0,90]){data.views[0]=T.view({mode:'plan',pitch,zoom:.25});assert(!/NaN|Infinity/.test(ctx.scene(0).markup));}
 console.log('PASS: colours and multiline text stay fixed to physical case faces during pan, zoom, full orbit, plan view and case rotation, including waiting cases and multiple viewports.');
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

// Group placement preserves offsets and validates the complete truck atomically.
{
 const data=T.empty();data.cases=[base('group',{width:400,length:600,height:400})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'group',items:[]})];data.activeTruckId='group';const truck=data.trucks[0],items=T.addItems(data,'group','group',3);
 Object.assign(items[0],{packed:true,x:100,y:100});Object.assign(items[1],{packed:true,x:700,y:100});Object.assign(items[2],{packed:true,x:1700,y:1000});
 const before=JSON.stringify(data),group=items.slice(0,2);
 for(const snapToGrid of [false,true]){truck.snapToGrid=snapToGrid;const result=T.groupPlacement(data,truck,group,items[1].id,{x:900,y:900,z:0});assert.equal(result.error,'');assert.equal(result.items[1].x-result.items[0].x,600);assert.equal(result.items[1].y-result.items[0].y,0);assert.equal(T.truckError(data,{...truck,items:[...result.items,items[2]]}),'');}
 truck.snapToGrid=false;assert.equal(JSON.stringify(data),before,'placement previews do not mutate saved data');
 assert(T.groupPlacement(data,truck,group,items[0].id,{x:2000,y:100,z:0}).error.includes('outside'));assert(T.groupPlacement(data,truck,group,items[0].id,{x:1100,y:1000,z:0}).error.includes('overlap'));
 // Move a supported stack together; moving only the supporting case is rejected.
 Object.assign(items[1],{x:100,y:100,z:400,lifter:true});const stacked=T.groupPlacement(data,truck,group,items[1].id,{x:700,y:100,z:400});assert.equal(stacked.error,'');assert.equal(stacked.items[1].z-stacked.items[0].z,400);assert(T.placement(data,truck,items[0],{x:700,y:100,z:0}).error.includes('supported'));
 for(const snapToGrid of [false,true]){truck.snapToGrid=snapToGrid;const floor=T.placement(data,truck,items[1],{x:800,y:2000,z:400});assert.equal(floor.error,'');assert.equal(floor.item.z,0,'a lifter dragged away from a stack returns to the floor');const direct=T.placement(data,truck,items[1],{x:800,y:2000,z:0},false);assert.equal(direct.error,'');assert.equal(direct.item.z,0);}
 truck.snapToGrid=false;Object.assign(items[0],{lifter:true,z:400});Object.assign(items[1],{x:700,z:400});const floor=T.groupPlacement(data,truck,group,items[0].id,{x:200,y:2000,z:400});assert.equal(floor.error,'');assert(floor.items.every(item=>item.z===0),'a group of lifters can return to the floor');
}
// Real pointer handlers drag an existing selection, preview every case and save once.
{
 let data=T.empty(),saves=0,message='';data.cases=[base('drag-group',{width:400,length:400,height:400})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'drag-group',items:[]})];data.activeTruckId='drag-group';const items=T.addItems(data,'drag-group','drag-group',3);Object.assign(items[0],{packed:true});Object.assign(items[1],{packed:true,x:600});Object.assign(items[2],{packed:true,x:1600,y:1000});const ids=items.slice(0,2).map(i=>i.id);
 const svg={dataset:{tpScene:'0'},getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})},host={querySelector:()=>svg,setPointerCapture(){},releasePointerCapture(){},contains:()=>true};
 const projection={scale:1,camera:T.view({mode:'plan'}),point:p=>T.project(p,T.view({mode:'plan'})),waiting:new Map()};
 const ctx=testContext({T,host,tab:'pack',drag:null,selected:ids[0],selectedGroup:ids,state:()=>data,truck:()=>data.trucks[0],sceneMaps:[projection],renderInspector(){},renderScenes(){},notify:text=>message=text,esc:String,transaction:change=>{try{const next=JSON.parse(JSON.stringify(data));change(next);data=T.normalise(next);saves++;return true}catch(error){message=error.message;return false}}});
 for(const name of ['svgPoint','pointerDown','pointerMove','pointerUp','cancelDrag','click','corners','staging','scene','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),ctx);vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);
 const event=(x,y,id=ids[1])=>({button:0,pointerId:19,clientX:x,clientY:y,preventDefault(){},target:{closest:selector=>selector==='[data-tp-scene]'?svg:selector==='[data-tp-item]'?{dataset:{tpItem:id}}:null}});
 const original=JSON.stringify(data);ctx.pointerDown(event(0,0));assert.equal(ctx.selectionIds().length,2);assert.equal(ctx.drag.items.length,2);ctx.pointerMove(event(100,-200));assert.equal(ctx.drag.error,'');assert.equal(ctx.drag.previewItems.length,2);assert.deepEqual(Array.from(ctx.drag.previewItems,i=>[i.x,i.y]),[[100,200],[700,200]]);assert.equal(JSON.stringify(data),original);
 const preview=ctx.scene(0);assert.equal(preview.hitBoxes.find(b=>b.id===ids[0]).left,100);assert.equal(preview.hitBoxes.find(b=>b.id===ids[1]).left,700);ctx.pointerUp(event(100,-200));assert.equal(saves,1);assert.equal(ctx.selectionIds().length,2);assert.equal(data.trucks[0].items[0].x,100);assert.equal(data.trucks[0].items[1].x,700);
 const saved=JSON.stringify(data);ctx.pointerDown(event(0,0));ctx.pointerMove(event(2000,0));assert(ctx.drag.error);ctx.pointerUp(event(2000,0));assert.equal(JSON.stringify(data),saved);assert.equal(saves,1);
 ctx.pointerDown(event(0,0));ctx.pointerMove(event(100,0));ctx.cancelDrag();assert.equal(JSON.stringify(data),saved);assert.equal(ctx.selectionIds().length,2);
 ctx.pointerDown(event(0,0));ctx.pointerUp(event(0,0));assert.equal(saves,1,'click without moving preserves selection and does not save');
 // Shared actions affect only the selected truck instances.
 const action=name=>ctx.click({target:{closest:()=>({dataset:{tpAction:name}})}});action('unpack');assert.equal(saves,2);assert(data.trucks[0].items.slice(0,2).every(i=>!i.packed));assert(data.trucks[0].items[2].packed);assert.equal(data.cases.length,1);
 projection.waiting=new Map([[ids[0],{x:3000,y:0,z:0}],[ids[1],{x:3000,y:550,z:0}]]);ctx.pointerDown(event(0,0));ctx.pointerMove(event(-2900,-100));assert.equal(ctx.drag.error,'');ctx.pointerUp(event(-2900,-100));assert(data.trucks[0].items.slice(0,2).every(i=>i.packed));assert.equal(data.trucks[0].items[1].y-data.trucks[0].items[0].y,550,'waiting cases retain their displayed spacing when packed together');
 ctx.pointerDown(event(0,0));ctx.pointerMove(event(4000,0));assert(ctx.drag.unpacked);ctx.pointerUp(event(4000,0));assert(data.trucks[0].items.slice(0,2).every(i=>!i.packed));
 action('remove-item');assert.equal(data.trucks[0].items.length,1);assert.equal(data.trucks[0].items[0].id,items[2].id);assert.equal(data.cases.length,1);
}
// Shared wheel controls and actions are visible, changed-only and atomic.
{
 let data=T.empty(),saves=0,message='',changes=[];data.cases=[base('wheels-group',{width:400,length:400,height:800})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'wheels-group',items:[]})];data.activeTruckId='wheels-group';const items=T.addItems(data,'wheels-group','wheels-group',3);items[1].rideOnWheels=false;
 const ids=items.slice(0,2).map(i=>i.id),form={querySelectorAll:()=>changes},pane={innerHTML:'',querySelector:()=>form},ctx=testContext({T,selected:ids[0],selectedGroup:ids,state:()=>data,truck:()=>data.trucks[0],host:{contains:()=>true},esc:String,callbacks:{colourControl:attrs=>'<input '+attrs+'>'},notify:text=>message=text,transaction:change=>{try{const next=JSON.parse(JSON.stringify(data));change(next);data=T.normalise(next);saves++;return true}catch(error){message=error.message;return false}}});
 for(const name of ['field','input','button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);for(const name of ['caseColourFields','renderGroupInspector','applySelectedDetails','click'])vm.runInContext(fn(ui,name),ctx);
 ctx.renderGroupInspector(pane,items.slice(0,2));assert(pane.innerHTML.includes('name="rideOnWheels"'));assert(pane.innerHTML.includes('Mixed — leave unchanged'));assert(pane.innerHTML.includes('data-tp-action="remove-item"'));
 changes=[{name:'rideOnWheels',value:''}];ctx.applySelectedDetails(form);assert.equal(saves,0);changes=[{name:'rideOnWheels',value:'yes',dataset:{}}];form.onchange({target:changes[0]});assert.equal(changes[0].dataset.tpChanged,'true');form.onsubmit({preventDefault(){}});assert.equal(saves,1);assert(data.trucks[0].items.every(i=>i.rideOnWheels));
 changes=[{name:'rideOnWheels',value:'invalid'}];ctx.applySelectedDetails(form);assert.equal(saves,1);assert(message.includes('Ride on Wheels'));
 Object.assign(data.trucks[0].items[0],{packed:true});Object.assign(data.trucks[0].items[1],{packed:true,y:500});ctx.renderGroupInspector(pane,data.trucks[0].items.slice(0,2));assert(pane.innerHTML.includes('data-tp-action="unpack"'));
 const before=JSON.stringify(data);changes=[{name:'rideOnWheels',value:'no'},{name:'department',value:'Do not save'}];ctx.applySelectedDetails(form);assert(message.includes('overlap'));assert.equal(saves,1);assert.equal(JSON.stringify(data),before);
 // Removing or unpacking a support cannot leave an unselected case floating.
 Object.assign(data.trucks[0].items[2],{packed:true,lifter:true,z:800});const supported=JSON.stringify(data);for(const action of ['unpack','remove-item']){ctx.click({target:{closest:()=>({dataset:{tpAction:action}})}});assert(message.includes('supported'));assert.equal(JSON.stringify(data),supported);}
 assert(fs.readFileSync(path.join(root,'js/truck-pack.css'),'utf8').includes('.tpSceneWrap{position:relative;min-width:0;height:clamp(700px,58vh,800px);overflow:hidden}'));
}
console.log('PASS: rigid group moves, shared wheels/Waiting/removal, atomic collision and support checks, floor lifters, persistent single-view inspector and taller viewer.');

// Fit fills each real viewport, ignoring off-truck inventory and preserving pointer alignment.
{
 const data=T.empty();data.cases=[base('fit-case')];data.trucks=[T.normaliseTruck({...T.presets.find(p=>p.id==='mega-box'),id:'fit-truck',items:[]})];data.activeTruckId='fit-truck';const truck=data.trucks[0];
 const rectangles=[{left:25,top:120,width:350,height:700},{left:390,top:120,width:600,height:450}],svgs=rectangles.map((rect,index)=>({dataset:{tpScene:String(index)},viewBox:{baseVal:{width:900,height:600}},getBoundingClientRect:()=>rect,setAttribute(name,value){assert.equal(name,'viewBox');const [, ,width,height]=value.split(' ').map(Number);this.viewBox.baseVal={width,height}},closest:()=>({querySelector:()=>({hidden:false,innerHTML:''})}),innerHTML:''}));
 const host={querySelector:selector=>svgs[Number(selector.match(/"(\d+)"/)?.[1]||0)],querySelectorAll:()=>svgs,contains:()=>true};let saves=0;
 const ctx=testContext({T,host,tab:'pack',drag:null,selected:'',state:()=>data,truck:()=>truck,sceneMaps:[],esc:String,save:()=>saves++});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);for(const name of ['corners','staging','scene','renderSceneData','partMesh','cubeMarkup','renderScenes','svgPoint','click'])vm.runInContext(fn(ui,name),ctx);
 data.views[0]=T.view({mode:'plan',zoom:.25,panX:200,panY:-400});data.views[1]=T.view({mode:'leftIso'});
 const action=(name,index=0)=>ctx.click({target:{closest:()=>({dataset:{tpAction:name,view:String(index)}})}});
 action('fit');assert.equal(saves,1);assert.equal(data.views[0].zoom,1);assert.equal(data.views[0].panX,0);assert.equal(data.views[0].panY,0);assert.equal(data.views[1].mode,'leftIso');assert.deepEqual(svgs[0].viewBox.baseVal,{width:350,height:700});
 const fit=ctx.sceneMaps[0],rear=fit.point({x:0,y:0,z:0}),front=fit.point({x:0,y:truck.length,z:0});assert(Math.abs(front.y-rear.y)>=550,'the long truck fills the tall viewport instead of a small landscape strip');const initialScale=fit.scale;
 T.addItems(data,truck.id,'fit-case',80);ctx.renderScenes();assert.equal(ctx.sceneMaps[0].scale,initialScale,'Waiting cases cannot shrink the fitted truck');
 for(const mode of T.perspectives.filter(mode=>mode!=='orbit')){data.views[0]=T.view({mode});ctx.renderScenes();const rendered=ctx.sceneMaps[0];for(const p of ctx.corners({x:0,y:0,z:0,width:truck.width,length:truck.length,height:truck.height}).map(rendered.point)){assert(p.x>=0&&p.x<=350);assert(p.y>=0&&p.y<=700)}
  const world={x:truck.width*.35,y:truck.length*.6,z:0},screen=rendered.point(world),pointer=ctx.svgPoint({clientX:rectangles[0].left+screen.x,clientY:rectangles[0].top+screen.y},svgs[0]);close(pointer.x,screen.x);close(pointer.y,screen.y);
 }
 data.views[0]=T.view({mode:'plan'});action('fit');const beforeZoom=ctx.sceneMaps[0].scale;action('zoom-in');assert(ctx.sceneMaps[0].scale>beforeZoom);action('fit');close(ctx.sceneMaps[0].scale,beforeZoom);
 rectangles[0].width=300;rectangles[0].height=520;ctx.renderScenes();assert.deepEqual(svgs[0].viewBox.baseVal,{width:300,height:520});assert.equal(ctx.sceneMaps[0].viewport.width,300);
 // Pointer conversion also handles a resized viewport before its next redraw.
 rectangles[0].width=600;rectangles[0].height=1040;const point=ctx.svgPoint({clientX:25+200,clientY:120+400},svgs[0]);close(point.x,100);close(point.y,200);
}
// Selection/status updates keep their layout boxes rather than shifting the page.
{
 const css=fs.readFileSync(path.join(root,'js/truck-pack.css'),'utf8'),rule=selector=>css.split('}').map(block=>block.split('{')).find(parts=>parts[0].trim()===selector)?.[1];
 assert(rule('.tpMessage').includes('position:fixed'));assert(!/(?:^|;)height:/.test(rule('.tpMessage')));assert(rule('.tpMessage').includes('overflow:auto'));assert.equal(rule('.tpMessage:empty'),'display:none');assert(rule('.tpWorkspace').includes('grid-template-columns:minmax(0,1fr)'));assert(css.includes('.tpWorkspace.hasSelection{grid-template-columns:minmax(0,1fr) 290px}'));
 assert.equal(rule('.tpInspector[hidden]'),'display:none');assert(rule('.truckPackView').includes('overflow-anchor:none'));
 assert(rule('.tpLayout1 .tpViewport').includes('width:350px'));assert(!/(?:^|;)width:/.test(rule('.tpViewport')),'multiple-view widths remain flexible');assert(rule('.tpWorkspace.tpSingleView').includes('minmax(0,1fr) 290px'));
}
console.log('PASS: real-viewport truck fitting, no Waiting-driven shrinking, zoom reset, resize/pointer alignment, 350px single view and stable selection/status layout boxes.');

// Waiting cases line up with sequential free loading rows without changing the pack.
{
 const data=T.empty();data.cases=[base('queue',{width:610,length:610,height:400})];data.trucks=[T.normaliseTruck({id:'queue',width:2440,length:2440,height:2000,items:[]})];data.activeTruckId='queue';const truck=data.trucks[0],items=T.addItems(data,'queue','queue',5);
 Object.assign(items[0],{packed:true,x:0,y:1830});Object.assign(items[1],{packed:true,x:610,y:1830});
 const ctx=testContext({T,state:()=>data});vm.runInContext(fn(ui,'staging'),ctx);const before=JSON.stringify(data),queue=ctx.staging(truck);
 assert.deepEqual(items.slice(2).map(i=>queue.get(i.id).y),[1830,1830,1220]);assert([...queue.values()].every(p=>p.x>truck.width&&p.z===0));assert.equal(JSON.stringify(data),before);assert.equal(ctx.staging(truck),queue,'camera redraws reuse the unchanged queue');
 for(let i=2;i<items.length;i++)for(let j=i+1;j<items.length;j++)assert(!T.overlaps({...T.dimensions(data,items[i]),...queue.get(items[i].id)},{...T.dimensions(data,items[j]),...queue.get(items[j].id)}),'waiting cases do not overlap when they share a loading row');
 Object.assign(items[2],{packed:true,x:1220,y:1830});const updated=ctx.staging(truck);assert.notEqual(updated,queue);assert.equal(updated.size,2);assert.equal(updated.get(items[3].id).y,1830);assert.equal(updated.get(items[4].id).y,1220);
 const narrowBefore=updated;data.cases[0].length=305;assert.notEqual(ctx.staging(truck),narrowBefore,'dimension changes invalidate the staging cache');
 // Full floor: a lifter aligns with its next valid supported position; oversized
 // or excess cases remain parked outside without inventing a packed placement.
 data.cases.push(base('floor',{width:2440,length:2440,height:400}));truck.items=[T.normaliseItem({id:'floor',caseId:'floor',packed:true}),T.normaliseItem({id:'lift-queue',caseId:'queue',lifter:true}),T.normaliseItem({id:'excess',caseId:'queue'})];
 const full=ctx.staging(truck);assert.equal(full.get('lift-queue').y,2135);assert.equal(full.get('excess').y,0);assert(truck.items.slice(1).every(i=>!i.packed));assert.doesNotThrow(()=>T.normalise(data));
}
// The paired plan shows floor cases on the left and actual raised cases on the right.
{
 let data=T.empty(),saves=0;data.cases=[base('layer',{width:610,length:610,height:400})];data.trucks=[T.normaliseTruck({id:'layers',name:'Layer Truck',width:2440,length:2440,height:2000,items:[]})];data.activeTruckId='layers';
 const items=T.addItems(data,'layers','layer',5);Object.assign(items[0],{packed:true,x:0,y:1830});Object.assign(items[1],{packed:true,lifter:true,x:0,y:1830,z:400});Object.assign(items[2],{packed:true,lifter:true,x:610,y:1830});Object.assign(items[3],{packed:true,lifter:true,x:0,y:1830,z:800});
 const svgs=new Map([0,4].map(index=>[index,{dataset:{tpScene:String(index)},viewBox:{baseVal:{width:350,height:700}},getBoundingClientRect:()=>({left:0,top:0,width:350,height:700})}])),host={contains:()=>true,querySelector:selector=>svgs.get(Number(selector.match(/"(\d+)"/)?.[1]||0)),setPointerCapture(){},releasePointerCapture(){}};
 const labels={plan:'2D Top/Plan',leftIso:'3D Left Isometric'},ctx=testContext({T,host,labels,tab:'pack',drag:null,selected:'',state:()=>data,truck:()=>data.trucks[0],sceneMaps:[],esc:String,length:T.formatLength,weight:T.formatWeight,save:()=>saves++,render(){},renderInspector(){},notify(){},transaction:change=>{const next=JSON.parse(JSON.stringify(data));change(next);data=T.normalise(next);saves++;return true}});
 vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);for(const name of ['button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);
 for(const name of ['corners','staging','scene','renderSceneData','partMesh','sceneTools','packMarkup','click','change','svgPoint','pointerDown','pointerMove','pointerUp','cancelDrag'])vm.runInContext(fn(ui,name),ctx);
 const before=JSON.stringify(data),bottom=ctx.scene(0),top=ctx.scene(4),ids=scene=>Array.from(scene.hitBoxes,b=>b.id);assert.deepEqual(ids(bottom),[items[0].id,items[2].id,items[4].id]);assert.deepEqual(ids(top),[items[1].id,items[3].id]);assert(!top.markup.includes('data-tp-item="'+items[2].id+'"'),'floor lifters stay in the bottom viewer');assert(!bottom.markup.includes('data-tp-item="'+items[1].id+'"'));assert.equal(JSON.stringify(data),before);
 const region={left:-1e6,top:-1e6,right:1e6,bottom:1e6};assert.deepEqual(Array.from(ctx.casesInSelection(top.hitBoxes,region)),[items[1].id,items[3].id],'marquee cannot select hidden lower cases');
 const markup=ctx.packMarkup(data,data.trucks[0]);assert.equal((markup.match(/class="tpViewport"/g)||[]).length,2);assert(markup.indexOf('data-tp-scene="0"')<markup.indexOf('data-tp-scene="4"'));assert(markup.includes('Bottom row'));assert(markup.includes('Top row — Lifters'));assert(markup.indexOf('<aside class="tpInspector"')>markup.indexOf('data-tp-scene="4"'));
 const otherCameras=JSON.stringify(data.views.slice(1)),action=name=>ctx.click({target:{closest:()=>({dataset:{tpAction:name,view:'4'}})}});action('zoom-in');assert.equal(data.views[0].zoom,1.25);assert.equal(ctx.scene(0).scale,ctx.scene(4).scale);action('fit');assert.equal(data.views[0].zoom,1);assert.equal(JSON.stringify(data.views.slice(1)),otherCameras);assert.equal(data.views.length,4);assert(ui.includes("cube.hidden=v.mode==='plan'"),'navigation cube remains available in grouped 3D views');
 // Panning and cancelling from the upper viewer operate on the shared camera.
 data.views[0].tool='pan';const event=(x,y,id)=>({button:0,pointerId:32,clientX:x,clientY:y,preventDefault(){},target:{closest:selector=>selector==='[data-tp-scene]'?svgs.get(4):selector==='[data-tp-item]'&&id?{dataset:{tpItem:id}}:null}});ctx.pointerDown(event(50,50));ctx.pointerMove(event(80,90));assert.equal(data.views[0].panX,30);assert.equal(data.views[0].panY,40);ctx.cancelDrag();assert.equal(data.views[0].panX,0);assert.equal(data.views.length,4);assert(ui.includes("cube.hidden=v.mode==='plan'"),'navigation cube remains available in grouped 3D views');
 // Drag the highest lifter off the stack. It remains visible in the source
 // preview, then belongs only to the lower viewer after landing on the floor.
 data.views[0].tool='select';ctx.sceneMaps[4]=ctx.scene(4);const scale=ctx.sceneMaps[4].scale;ctx.pointerDown(event(20,20,items[3].id));assert.equal(ctx.drag.index,4);ctx.pointerMove(event(20+1220*scale,20,items[3].id));assert.equal(ctx.drag.error,'');assert.equal(ctx.drag.preview.z,0);assert(ids(ctx.scene(4)).includes(items[3].id));ctx.pointerUp(event(20+1220*scale,20,items[3].id));assert(ids(ctx.scene(0)).includes(items[3].id));assert(!ids(ctx.scene(4)).includes(items[3].id));
 for(const layout of [2,4]){data.layout=layout;assert.equal(ids(ctx.scene(0)).length,5,'other layouts show the whole load');assert.equal((ctx.packMarkup(data,data.trucks[0]).match(/class="tpViewport"/g)||[]).length,layout)}
 data.views[0]=T.view({mode:'leftIso'});ctx.change({target:{value:'1',matches:selector=>selector==='[data-tp-layout]'}});assert.equal(data.views[0].mode,'plan');assert.equal(data.layout,1);assert.deepEqual(T.normalise(JSON.parse(JSON.stringify(data))),data);
 const css=fs.readFileSync(path.join(root,'js/truck-pack.css'),'utf8');assert(css.includes('.tpWorkspace.tpSingleView{grid-template-columns:minmax(0,1fr) 290px}'));assert(css.includes('.tpLayout1{grid-template-columns:repeat(2,minmax(0,350px))'));
}
console.log('PASS: predictive Waiting alignment/cache, independent floor/raised plan layers, correct layer hit testing, shared cameras, upper-view dragging and right-side details.');

// Every orientation/quarter turn uses the same physical transform for rendering and bounds.
{
 const data=T.empty();data.cases=[base('orient',{width:400,length:700,height:500,casterHeight:80})];data.trucks=[T.normaliseTruck({id:'orientation',width:2400,length:6000,height:2400,items:[]})];data.activeTruckId='orientation';
 const expected={wheels:[400,700,500],tipped:[400,500,700],side:[500,700,400],wheelsUp:[400,700,500]};
 const ctx=testContext({T,drag:null,selected:'',state:()=>data,truck:()=>data.trucks[0],esc:String});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);for(const name of ['corners','staging','scene','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),ctx);
 for(const mode of Object.keys(expected))for(const rotation of [0,90,180,270]){
  const item=T.orientItem(T.normaliseItem({id:'oriented',caseId:'orient',rotation,packed:true}),mode);item.rotation=rotation;data.trucks[0].items=[item];const d=T.dimensions(data,item),dims=expected[mode];assert.deepEqual([d.width,d.length,d.height],rotation%180?[dims[1],dims[0],dims[2]]:dims);
  const corners=Array.from(ctx.corners({x:0,y:0,z:0,width:400,length:700,height:500}),p=>T.casePoint(data,item,p));for(const [axis,size] of [['x',d.width],['y',d.length],['z',d.height]]){close(Math.min(...corners.map(p=>p[axis])),0);close(Math.max(...corners.map(p=>p[axis])),size)}
  const wheel=T.casePoint(data,item,{x:0,y:0,z:0});if(mode==='wheels')close(wheel.z,0);if(mode==='wheelsUp')close(wheel.z,500);
  assert.deepEqual(T.normalise(JSON.parse(JSON.stringify(data))),data);
  for(const camera of ['plan','leftIso','right','top']){data.layout=2;data.views[0]=T.view({mode:camera,yaw:T.cameras[camera][0],pitch:T.cameras[camera][1]});const scene=ctx.scene(0);assert(!/NaN|Infinity/.test(scene.markup));assert(scene.markup.includes('tpCaseLabel'),mode+' '+rotation+' '+camera);assert(scene.markup.includes('oriented'))}
 }
 assert.equal(T.orientation(T.normaliseItem({id:'legacy',caseId:'orient',rideOnWheels:false})),'tipped');
 assert.throws(()=>T.orientItem({},'unknown'),/orientation/);
}
// Rotate and duplicate rigid rows, preserve metadata, and reject invalid edits atomically.
{
 const data=T.empty();data.cases=[base('row',{width:400,length:600,height:500})];data.trucks=[T.normaliseTruck({id:'a',width:2400,length:6000,height:2500,items:[]}),T.normaliseTruck({id:'b',width:2400,length:6000,height:2500,items:[]})];data.activeTruckId='a';const truck=data.trucks[0],items=T.addItems(data,'a','row',2);Object.assign(items[0],{packed:true,x:300,y:4000,colour:'#123456'});Object.assign(items[1],{packed:true,x:700,y:4000});const ids=items.map(i=>i.id),original=JSON.stringify(truck.items);
 for(let n=0;n<4;n++){T.rotateItems(data,truck,ids);assert.equal(T.truckError(data,truck),'')}assert.equal(JSON.stringify(truck.items),original);
 const duplicate=T.duplicateItems(data,truck,ids);assert(duplicate.packed);assert.deepEqual(truck.items.slice(2).map(i=>i.y),[3400,3400]);assert.equal(truck.items[2].colour,'#123456');assert.equal(new Set(truck.items.map(i=>i.id)).size,4);
 const blocked=T.duplicateItems(data,truck,ids);assert(!blocked.packed);assert(truck.items.slice(4).every(i=>!i.packed));
 const snapshot=JSON.stringify(data);Object.assign(truck.items[0],{x:2100,y:4000});const invalid=JSON.stringify(truck);assert.throws(()=>T.rotateItems(data,truck,[ids[0]]));assert.equal(JSON.stringify(truck),invalid);Object.assign(data,JSON.parse(snapshot));
 T.transferItems(data,'a','b',duplicate.ids);assert.equal(data.activeTruckId,'b');assert(data.trucks[1].items.every(i=>!i.packed));assert.equal(data.trucks[1].items[0].colour,'#123456');assert.equal(data.trucks[1].items[0].id,duplicate.ids[0]);assert(!data.trucks[0].items.some(i=>duplicate.ids.includes(i.id)));
 const support=data.trucks[0].items[0],raised=T.normaliseItem({...support,id:'raised',z:500,lifter:true});data.trucks[0].items.push(raised);const before=JSON.stringify(data);assert.throws(()=>T.transferItems(data,'a','b',[support.id]),/supported/);assert.equal(JSON.stringify(data),before);
}
// Clearances account for neighbouring boxes, height, group bounds and empty trailers.
{
 const data=T.empty();data.cases=[base('measure',{width:400,length:600,height:500})];const truck=T.normaliseTruck({id:'measure',width:2400,length:6000,height:2500,items:[]});data.trucks=[truck];data.activeTruckId=truck.id;assert.equal(T.measurements(data,truck).remaining,6000);
 const items=T.addItems(data,truck.id,'measure',3);Object.assign(items[0],{packed:true,x:600,y:3000});Object.assign(items[1],{packed:true,x:1200,y:3000});Object.assign(items[2],{packed:true,x:600,y:4000});const m=T.measurements(data,truck,[items[0].id]);assert.deepEqual([m.left,m.right,m.rear,m.front,m.above,m.remaining],[600,200,3000,400,2000,3000]);
 const group=T.measurements(data,truck,items.slice(0,2).map(i=>i.id));assert.equal(group.right,800);assert.equal(group.bounds.width,1000);assert.equal(group.front,400);
 const saved=JSON.stringify(data),ctx=testContext({T,state:()=>data,truck:()=>truck,selected:items[0].id,esc:String});const markup=ctx.measurementMarkup(truck,items.map(item=>({item,position:item})),p=>({x:p.x/10,y:p.y/10}),{mode:'plan'});assert(markup.includes('200 mm'));assert(markup.includes('6000 mm'));assert(markup.includes('pointer-events="none"'));assert.equal(JSON.stringify(data),saved);
}
// Real commit/undo/redo functions preserve cameras, discard redo after new edits, and reset on project load.
{
 let data=T.empty(),saves=0;data.cases=[base('history')];data.trucks=[T.normaliseTruck({id:'history',width:2400,length:6000,height:2500,items:[]})];data.activeTruckId='history';
 const ctx=testContext({T,drag:null,dialog:null,selected:'',state:()=>data,callbacks:{setState:next=>data=next,save:()=>saves++},render(){},notify(){},cancelDrag(){},closeDialog(){}});for(const name of ['save','replace','transaction','restoreHistory','editingKey','reset'])vm.runInContext(fn(ui,name),ctx);
 ctx.transaction(next=>T.addItems(next,'history','history',1));assert.equal(ctx.undoStack.length,1);data.views[0].panX=42;ctx.restoreHistory();assert.equal(data.trucks[0].items.length,0);assert.equal(data.views[0].panX,42);ctx.restoreHistory(true);assert.equal(data.trucks[0].items.length,1);
 const before=JSON.stringify(data);assert(!ctx.transaction(next=>{next.trucks[0].items[0].x=-1}));assert.equal(JSON.stringify(data),before);assert.equal(ctx.undoStack.length,1);
 ctx.restoreHistory();ctx.transaction(next=>{next.trucks[0].name='Renamed'});assert.equal(ctx.redoStack.length,0);
 let prevented=0;const event={key:'z',metaKey:true,preventDefault:()=>prevented++,target:{closest:()=>null}};assert(ctx.editingKey(event));assert.equal(data.trucks[0].name,'Truck');assert.equal(prevented,1);event.target.closest=()=>({});assert(!ctx.editingKey(event));assert.equal(prevented,1);ctx.reset();assert.equal(ctx.undoStack.length,0);assert.equal(ctx.redoStack.length,0);assert(saves>=5);
}
// Bulk orientation fields sync with the legacy wheel control; plan viewers cannot become 3D.
{
 const mixedCtx=testContext({field:(label,control)=>control});const mixedMarkup=mixedCtx.orientationControl('side',true);assert.equal((mixedMarkup.match(/selected/g)||[]).length,1);assert(mixedMarkup.includes('value="" selected'));
 const fields={orientation:{name:'orientation',value:'side',dataset:{}},rideOnWheels:{name:'rideOnWheels',value:'yes',dataset:{}}},form={querySelector:selector=>fields[selector.includes('rideOnWheels')?'rideOnWheels':'orientation']},ctx=testContext({T});ctx.syncOrientationForm({target:fields.orientation},form);assert.equal(fields.rideOnWheels.value,'no');fields.rideOnWheels.value='yes';ctx.syncOrientationForm({target:fields.rideOnWheels},form);assert.equal(fields.orientation.value,'wheels');
 const data=T.empty();ctx.state=()=>data;ctx.save=()=>{};ctx.render=()=>{};vm.runInContext(fn(ui,'setView'),ctx);ctx.setView(0,'leftIso');assert.equal(data.views[0].mode,'plan');ctx.setView(4,'orbit');assert.equal(data.views[0].mode,'plan');data.layout=2;ctx.setView(0,'leftIso');assert.equal(data.views[0].mode,'leftIso');
}
console.log('PASS: four orientations/quarter turns and SVG geometry, row duplicate/rotation/transfer, clearances, atomic history and fixed-plan controls.');
// Execute the editor actions and orientation save paths, not just their data helpers.
{
 let data=T.empty(),submit,dialogMarkup='',saves=0,error='';data.cases=[base('actions',{width:400,length:800,height:500})];data.trucks=['one','two'].map(id=>T.normaliseTruck({id,name:id,width:2400,length:6000,height:2500,items:[]}));data.activeTruckId='one';const items=T.addItems(data,'one','actions',2);Object.assign(items[0],{packed:true,x:0,y:4000});Object.assign(items[1],{packed:true,x:400,y:4000});
 const ctx=testContext({T,state:()=>data,truck:()=>data.trucks.find(t=>t.id===data.activeTruckId),selected:items[0].id,selectedGroup:items.map(i=>i.id),drag:null,dialog:null,esc:String,callbacks:{setState:next=>data=next,save:()=>saves++},render(){},notify:s=>error=s,closeDialog(){},FormData:class{get(){return 'two'}},showDialog:(title,markup,callback)=>{dialogMarkup=markup;submit=callback}});
 for(const name of ['field','button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);for(const name of ['save','replace','transaction','editSelection','applySelectedDetails'])vm.runInContext(fn(ui,name),ctx);
 // Expanding both packed footprints would overlap: reject every change together.
 let changes=[{name:'orientation',value:'side'},{name:'department',value:'Changed'}],form={querySelectorAll:()=>changes},before=JSON.stringify(data);ctx.applySelectedDetails(form);assert.equal(JSON.stringify(data),before);assert(error.includes('overlap'));assert.equal(saves,0);
 changes=[{name:'orientation',value:'wheelsUp'}];ctx.applySelectedDetails(form);assert(data.trucks[0].items.every(i=>T.orientation(i)==='wheelsUp'));assert.equal(saves,1);
 ctx.editSelection('duplicate-row');assert.equal(data.trucks[0].items.length,4);assert.equal(ctx.selectedGroup.length,2);assert(data.trucks[0].items.slice(2).every(i=>T.orientation(i)==='wheelsUp'));assert.equal(saves,2);
 ctx.editSelection('rotate-selection');assert(data.trucks[0].items.slice(2).every(i=>i.rotation===90));assert.equal(saves,3);
 ctx.editSelection('move-truck');assert(dialogMarkup.includes('value="two"'));assert(!dialogMarkup.includes('value="one"'));submit({});assert.equal(data.activeTruckId,'two');assert(data.trucks[1].items.every(i=>!i.packed&&i.rotation===90&&T.orientation(i)==='wheelsUp'));assert.equal(saves,4);assert.equal(ctx.undoStack.length,4);
 // Returning a mixed field to Leave unchanged must clear the linked field's edit too.
 const peer={value:'no',dataset:{tpChanged:'true'}};ctx.syncOrientationForm({target:{name:'orientation',value:''}},{querySelector:()=>peer});assert.equal(peer.value,'');assert(!peer.dataset.tpChanged);
 // Front elevation uses a width ruler rather than overlapping length ticks.
 const active=data.trucks[1],camera=T.view({mode:'back',yaw:0,pitch:0}),point=p=>{const q=T.project(p,camera);return {x:q.x/10,y:q.y/10}};const ruler=ctx.measurementMarkup(active,[],point,camera);assert(ruler.includes('2400 mm'));assert(!ruler.includes('6000 mm'));
}
console.log('PASS: real editing controls, atomic bulk orientation saves, mixed-field reset and elevation ruler.');

// Ruler baselines, ticks and labels sit outside the projected trailer in every view.
{
 const data=T.empty();data.trucks=[T.normaliseTruck({...T.presets.find(p=>p.id==='mega-box'),id:'external-tape',items:[]})];data.activeTruckId='external-tape';const active=data.trucks[0];
 const ctx=testContext({T,state:()=>data,truck:()=>active,host:{querySelector:()=>({getBoundingClientRect:()=>({width:350,height:700})})},drag:null,selected:'',esc:String});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);for(const name of ['corners','staging','scene','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),ctx);
 const cameras=T.perspectives.filter(p=>p!=='orbit').map(mode=>T.view({mode,yaw:T.cameras[mode][0],pitch:T.cameras[mode][1]}));for(const yaw of [-175,-110,-50,5,80,140])cameras.push(T.view({mode:'orbit',yaw,pitch:32}));
 for(const camera of cameras){data.views[0]=camera;const scene=ctx.scene(0),r=ctx.trailerRuler(active,scene.point);assert(r,camera.mode);const vertices=Array.from(ctx.corners({x:0,y:0,z:0,width:active.width,length:active.length,height:active.height}),scene.point);for(const p of vertices)assert(r.nx*(p.x-r.a.x)+r.ny*(p.y-r.a.y)<=.02,'trailer is inward of ruler edge');
  const markup=ctx.measurementMarkup(active,[],scene.point,camera),tape=markup.match(/<g data-tp-ruler="[xy]"[^>]*>([\s\S]*?)<\/g>/)[1];
  for(const match of tape.matchAll(/(?:M|L)([-.\d]+),([-.\d]+)/g)){const x=Number(match[1]),y=Number(match[2]);assert(r.nx*(x-r.a.x)+r.ny*(y-r.a.y)>=13.9,'ticks and baseline are outside');assert(x>=0&&x<=350&&y>=0&&y<=700,'ruler fits viewport')}
  for(const match of tape.matchAll(/<text x="([-.\d]+)" y="([-.\d]+)"/g)){const x=Number(match[1]),y=Number(match[2]);assert(r.nx*(x-r.a.x)+r.ny*(y-r.a.y)>22,'labels are outside');assert(x>=0&&x<=350&&y>=0&&y<=700)}
 }
 data.views[0]=T.view({mode:'plan',yaw:0,pitch:90});const scene=ctx.scene(0),r=ctx.trailerRuler(active,scene.point);assert.equal(r.axis,'y');assert(r.nx<0,'plan ruler goes to the left outside the trailer');
}
// Manual entry accepts one chosen unit for every dimension, including castors.
{
 let data=T.empty(),markup,submit,values={},saves=0;const ctx=testContext({T,esc:String,state:()=>data,unit:()=>({measurement:'metric',weight:'kg'}),FormData:class{get(key){return values[key]??''}},showDialog:(title,html,handler)=>{markup=html;submit=handler},replace:next=>{data=T.normalise(next);saves++},closeDialog(){},render(){}});
 for(const name of ['field','input'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);vm.runInContext(fn(ui,'caseDialog'),ctx);
 ctx.caseDialog();assert(markup.includes('name="dimensionUnit"'));assert(markup.includes('value="mm" selected'));
 values={name:'Metric case',type:'Case',dimensionUnit:'cm',width:'60',length:'100',height:'80',heightIncludesWheels:'no',casterHeight:'10',weight:'20'};submit({});assert.equal(saves,1);assert.deepEqual(['width','length','height','casterHeight'].map(k=>data.cases[0][k]),[600,1000,800,100]);ctx.caseDialog();assert(markup.includes('value="cm" selected'));
 values={...values,name:'Mixed units',width:'600 mm',length:'1 m',height:'75',casterHeight:'0.1 m'};submit({});assert.deepEqual(['width','length','height','casterHeight'].map(k=>data.cases[1][k]),[600,1000,750,100]);
 values={...values,name:'Imperial',dimensionUnit:'ft',width:'2',length:'3',height:'2',casterHeight:'0.25'};submit({});close(data.cases[2].width,609.6);close(data.cases[2].casterHeight,76.2);
 const before=JSON.stringify(data);values.width='bad';assert.throws(()=>submit({}),/valid measurement/);assert.equal(JSON.stringify(data),before);assert.equal(saves,3);
 ctx.manualDimensionUnit='';ctx.unit=()=>({measurement:'imperial',weight:'kg'});ctx.caseDialog();assert(markup.includes('value="in" selected'));
}
// Search filters existing rows without rebuilding the input or changing inventory.
{
 const data=T.empty();data.cases=[base('alpha',{name:'Alpha Flightcase',department:'Lighting'}),base('beta',{name:'Beta Dolly',type:'Pallet',department:'Audio'})];const rows=data.cases.map(c=>({dataset:{tpCase:c.id},hidden:false})),empty={hidden:true},host={querySelectorAll:()=>rows,querySelector:()=>empty};
 const ctx=testContext({T,state:()=>data,host,esc:v=>String(v).replaceAll('"','&quot;'),unit:()=>({weight:'kg'}),weight:T.formatWeight});for(const name of ['input','button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);vm.runInContext(fn(ui,'inventoryMarkup'),ctx);
 const original=JSON.stringify(data),markup=ctx.inventoryMarkup();assert(markup.includes('data-tp-inventory-search'));assert(markup.includes('aria-label="Delete Alpha Flightcase"'));assert(markup.includes('>❌</button>'));
 for(const [query,expected] of [['ALPHA',[false,true]],[' audio ',[true,false]],['Pallet',[true,false]],['nothing',[true,true]],['',[false,false]]]){ctx.inventoryQuery=query;ctx.filterInventory();assert.deepEqual(rows.map(r=>r.hidden),expected);assert.equal(empty.hidden,!expected.every(Boolean))}
 assert.equal(JSON.stringify(data),original);ctx.inventoryQuery='"test';assert(ctx.inventoryMarkup().includes('value="&quot;test"'));
}
// History appears as accessible icons in each compact viewer toolbar and stays synchronised.
{
 const data=T.empty(),ctx=testContext({T,state:()=>data,labels:{plan:'2D Top/Plan',leftIso:'3D Left Isometric'},esc:String});for(const name of ['button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);vm.runInContext(fn(ui,'sceneTools'),ctx);
 const toolbar=ctx.viewportMarkup(data.views[0],0,'Bottom row').split('<div class="tpSceneWrap"')[0];for(const label of ['Undo','Redo']){assert(toolbar.includes('aria-label="'+label+'"'));assert(!toolbar.includes('>'+label+'</button>'))}assert.equal((toolbar.match(/<svg /g)||[]).length,2);assert(toolbar.includes('tpViewControls'));
 const undo=[{},{}],redo=[{},{}];ctx.host={querySelectorAll:selector=>selector.includes('undo')?undo:redo};ctx.syncHistoryButtons();assert(undo.every(b=>b.disabled)&&redo.every(b=>b.disabled));ctx.undoStack.push('{}');ctx.syncHistoryButtons();assert(undo.every(b=>!b.disabled)&&redo.every(b=>b.disabled));
 const css=fs.readFileSync(path.join(root,'js/truck-pack.css'),'utf8');assert(!css.includes('min-height:88px'));assert(css.includes('.tpViewToolbar{display:flex'));assert(css.includes('min-height:38px'));assert(css.includes('.tpWorkspace.hasSelection{grid-template-columns:minmax(0,1fr) 290px}'));assert(css.includes('.tpInspector[hidden]{display:none}'));assert(css.includes('.tpInventory th:nth-child(9){width:34px}'));
 assert(ui.includes("n===2?'3D View'"));assert(ui.includes('.tpInspector,.tpViewToolbar,.tpDialog'),'viewer controls do not clear selection and shift under the pointer');
}
console.log('PASS: external silhouette rulers, compact icon history, full-width unselected layouts, manual dimension units and live case search.');

// 3D View opens Top/Sides, excludes Plan, and preserves independent camera choices.
{
 const data=T.empty(),ctx=testContext({T,state:()=>data,save(){},render(){},labels:{plan:'2D Top/Plan',top:'3D Top',sides:'3D Sides',front:'3D Front'},esc:String});
 for(const name of ['button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);for(const name of ['sceneTools','change','setView'])vm.runInContext(fn(ui,name),ctx);
 const layout=value=>ctx.change({target:{value:String(value),matches:selector=>selector==='[data-tp-layout]'}});
 data.views[0].panX=100;data.views[1].zoom=2;layout(2);assert.deepEqual(data.views.slice(0,2).map(v=>v.mode),['sides','top']);assert(data.views.slice(0,2).every(v=>v.zoom===1&&v.panX===0&&v.panY===0));
 for(let index=0;index<2;index++){const markup=ctx.viewportMarkup(data.views[index],index);assert(!markup.includes('value="plan"'));assert(markup.includes('value="top"'));assert(markup.includes('value="sides"'))}
 ctx.setView(0,'front');assert.equal(data.views[0].mode,'front');assert.equal(data.views[1].mode,'top');layout(2);assert.equal(data.views[0].mode,'front','same layout does not reset customised cameras');ctx.setView(1,'plan');assert.equal(data.views[1].mode,'top');
 layout(1);assert.equal(data.views[0].mode,'plan');layout(4);assert(ctx.viewportMarkup(data.views[0],0).includes('value="plan"'));layout(2);assert.deepEqual(data.views.slice(0,2).map(v=>v.mode),['sides','top']);
}
// Actual projected trailer, captions and outside ruler fit tightly after pan/zoom/resize.
{
 const data=T.empty();data.layout=2;data.cases=[base('fit-waiting')];data.trucks=[T.normaliseTruck({...T.presets.find(p=>p.id==='mega-box'),id:'fit-3d',items:[]})];data.activeTruckId='fit-3d';const active=data.trucks[0];let viewport={width:350,height:700};
 const ctx=testContext({T,state:()=>data,truck:()=>active,host:{querySelector:()=>({getBoundingClientRect:()=>viewport}),contains:()=>true},drag:null,selected:'',esc:String,save(){},renderScenes(){}});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);for(const name of ['corners','staging','scene','renderSceneData','partMesh','click'])vm.runInContext(fn(ui,name),ctx);
 for(const size of [{width:350,height:700},{width:680,height:700},{width:470,height:280}])for(const mode of ['left','right','front','back','leftIso','rightIso'])for(const measurements of [true,false]){
  viewport=size;ctx.showMeasurements=measurements;data.views[0]=T.view({mode,yaw:T.cameras[mode][0],pitch:T.cameras[mode][1]});const scene=ctx.scene(0),b=ctx.fit3DBounds(active,scene.point,data.views[0]);
  assert(b.left>=11.9&&b.right<=size.width-11.9,mode+' horizontal fit');assert(b.top>=53.9&&b.bottom<=size.height-27.9,mode+' vertical fit');
  const fill=Math.max((b.right-b.left)/(size.width-24),(b.bottom-b.top)/(size.height-82));assert(fill>.995,mode+' should use available fit area');
  if(measurements&&size.width===350&&mode==='left'){const oldScale=(350-144)/active.length;assert(scene.scale>oldScale,'side Fit still improves on old margins while including the height ruler')}
 }
 viewport={width:680,height:700};ctx.showMeasurements=true;data.views[0]=T.view({mode:'left',yaw:-90,pitch:0,zoom:4,panX:600,panY:-250});const second=JSON.stringify(data.views[1]);ctx.click({target:{closest:()=>({dataset:{tpAction:'fit',view:'0'}})}});assert.equal(data.views[0].zoom,1);assert.equal(data.views[0].panX,0);assert.equal(data.views[0].panY,0);assert.equal(JSON.stringify(data.views[1]),second);
 const original=ctx.scene(0);T.addItems(data,active.id,'fit-waiting',50);close(ctx.scene(0).scale,original.scale);assert.deepEqual(ctx.scene(0).point({x:0,y:0,z:0}),original.point({x:0,y:0,z:0}));
}
// The Cases table reuses Device Config's actual button styling, without a competing btn style.
{
 const data=T.empty();data.cases=[base('same-delete')];const ctx=testContext({T,state:()=>data,esc:String,unit:()=>({weight:'kg'}),weight:T.formatWeight});for(const name of ['input','button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);vm.runInContext(fn(ui,'inventoryMarkup'),ctx);
 const button=ctx.inventoryMarkup().match(/<button[^>]*data-tp-action="delete-case"[^>]*>❌<\/button>/)[0];assert(button.includes('class="deviceConfigDeleteButton"'));assert(!button.includes('class="btn'));assert(button.includes('aria-label="Delete same-delete"'));
 const css=fs.readFileSync(path.join(root,'js/truck-pack.css'),'utf8');assert(!css.includes('.tpInventory [data-tp-action="delete-case"]'));assert(css.includes('.tpViewControls .tpHistoryActions{margin-right:10px;padding-right:8px;border-right:1px solid #b9b9b9}'));
}
console.log('PASS: Top/Sides 3D defaults, restricted perspectives, tight 3D fitting, independent Fit and shared delete styling.');

// Grouped 3D scenes share camera controls while retaining separate layer/side projections.
{
 const data=T.empty();data.layout=2;data.cases=[base('grouped',{width:600,length:800,height:500,casterHeight:0})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'grouped',items:[]})];data.activeTruckId='grouped';const active=data.trucks[0],[floor,raised,floorLifter,waiting]=T.addItems(data,active.id,'grouped',4);
 Object.assign(floor,{packed:true,x:100,y:100,z:0,colour:'#ff0000',colour2:'#00ff00'});Object.assign(raised,{packed:true,x:100,y:100,z:500,lifter:true});Object.assign(floorLifter,{packed:true,x:1000,y:100,z:0,lifter:true});
 let viewport={width:680,height:700},saves=0;const svg={dataset:{tpScene:'0'},viewBox:{baseVal:viewport},getBoundingClientRect:()=>({left:0,top:0,...viewport})},host={querySelector:()=>svg,contains:()=>true,setPointerCapture(){},releasePointerCapture(){}};
 const ctx=testContext({T,state:()=>data,truck:()=>active,host,tab:'pack',drag:null,selected:'',esc:String,save(){saves++},render(){},renderInspector(){},notify(){}});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);for(const name of ['staging','scene','renderSceneData','partMesh','click','setView','pointerDown','pointerMove','pointerUp','cancelDrag','svgPoint'])vm.runInContext(fn(ui,name),ctx);
 const itemIds=p=>new Set(p.hitBoxes.map(b=>b.id));
 data.views[0]=T.view({mode:'top'});let result=ctx.scene(0);assert.equal(result.panels.length,2);assert.deepEqual([...itemIds(result.panels[0])].sort(),[floor.id,floorLifter.id,waiting.id].sort());assert.deepEqual([...itemIds(result.panels[1])],[raised.id]);assert(result.panels[0].markup.includes('data-tp-item="'+waiting.id+'"'));assert(!result.panels[1].markup.includes('data-tp-item="'+waiting.id+'"'));
 for(const p of result.panels){const b=ctx.fit3DBounds(active,p.point,p.camera),r=p.rect;assert(b.left>=r.x+11.9&&b.right<=r.x+r.width-11.9);assert(b.top>=r.y+53.9&&b.bottom<=r.y+r.height-27.9)}
 const before=result.panels.map(p=>p.point({x:0,y:0,z:0}));data.views[0].panX=10;data.views[0].panY=10;result=ctx.scene(0);for(let i=0;i<2;i++){const p=result.panels[i].point({x:0,y:0,z:0});close(p.x-before[i].x,10);close(p.y-before[i].y,10)}const scale=result.scale;data.views[0].zoom=2;result=ctx.scene(0);result.panels.forEach(p=>close(p.scale,scale*2));
 data.views[0]=T.view({mode:'sides'});result=ctx.scene(0);assert.equal(result.panels[0].camera.mode,'left');assert.equal(result.panels[1].camera.mode,'right');assert(result.panels[0].rect.y<result.panels[1].rect.y);close(result.panels[0].scale,result.panels[1].scale);
 for(const p of result.panels){assert(p.markup.includes('data-tp-ruler="z" data-internal-size="'+active.height+'"'));const r=ctx.trailerRulers(active,p.point,p.camera).find(r=>r.axis==='z');assert(r);close(r.size,active.height);for(const corner of ctx.corners({x:0,y:0,z:0,width:active.width,length:active.length,height:active.height}).map(p.point))assert(r.nx*(corner.x-r.a.x)+r.ny*(corner.y-r.a.y)<=.02)}
 const patternIds=[...result.markup.matchAll(/<pattern id="([^"]+)"/g)].map(m=>m[1]);assert(patternIds.length);assert.equal(new Set(patternIds).size,patternIds.length);
 // Dragging in the lower Right panel uses its inverse projection, not the Left camera.
 ctx.sceneMaps=[result];const target={dataset:{tpItem:floor.id},closest:selector=>selector==='[data-tp-item]'?target:selector==='[data-tp-panel]'?{dataset:{tpPanel:'1'}}:selector==='[data-tp-scene]'?svg:null};
 ctx.pointerDown({button:0,pointerId:3,target,clientX:350,clientY:500,preventDefault(){}});assert.equal(ctx.drag.panel,1);assert.equal(ctx.drag.projection.camera.mode,'right');assert.equal(ctx.drag.plane,'yz');const delta=T.project({x:0,y:300,z:0},ctx.drag.projection.camera);ctx.pointerMove({clientX:350+delta.x*ctx.drag.projection.scale,clientY:500+delta.y*ctx.drag.projection.scale});close(ctx.drag.preview.y,400);ctx.cancelDrag();
 ctx.drag={type:'marquee',index:0,start:{x:20,y:80},current:{x:400,y:600},ids:[]};assert(ctx.scene(0).markup.includes('class="tpSelectionBox"'));ctx.drag=null;
 // Rotate from Top and Sides; the world-space truck centre and scale stay fixed.
 for(const mode of ['top','sides']){
  data.views[0]=T.view({mode,panX:100,panY:200});ctx.click({target:{closest:()=>({dataset:{tpAction:'tool',view:'0',tool:'rotate'}})}});const camera=data.views[0];assert.equal(camera.mode,'orbit');assert(camera.pitch<89);assert.equal(camera.panX,0);assert.equal(camera.panY,0);const scale=ctx.scene(0).scale;
  for(const yaw of [-160,-70,0,70,150])for(const pitch of [-40,5,40,80]){camera.yaw=yaw;camera.pitch=pitch;const scene=ctx.scene(0),center=scene.point({x:active.width/2,y:active.length/2,z:active.height/2});close(center.x,viewport.width/2);close(center.y,viewport.height/2);close(scene.scale,scale);assert(!scene.markup.includes('fill-opacity="0'));assert(!scene.markup.includes('fill-opacity=".'));assert(scene.markup.includes('data-tp-item="'+floor.id+'"'));assert(scene.markup.lastIndexOf('tpTrailerCaptions')>scene.markup.lastIndexOf('class="tpCase"'))}
  ctx.prepareOrbit(camera,viewport);close(ctx.scene(0).scale,scale);
  ctx.click({target:{closest:()=>({dataset:{tpAction:'fit',view:'0'}})}});const fitted=ctx.scene(0),b=ctx.fit3DBounds(active,fitted.point,camera);assert(b.left>=11.9&&b.right<=viewport.width-11.9&&b.top>=53.9&&b.bottom<=viewport.height-27.9);
 }
 assert.equal(T.normalise(JSON.parse(JSON.stringify(data))).views[0].orbitScale,data.views[0].orbitScale);assert.equal(data.views.length,4);assert(ui.includes("cube.hidden=v.mode==='plan'"),'navigation cube remains available in grouped 3D views');
 // Units follow the project's dimension setting in all views, including height rulers.
 for(const measurement of ['metric','imperial']){ctx.unit=()=>({measurement});ctx.length=n=>T.formatLength(n,measurement);for(const mode of ['top','sides','front','back']){data.views[0]=T.view({mode});const rendered=ctx.scene(0),panels=rendered.panels||[rendered];for(const panel of panels){const rulers=ctx.trailerRulers(active,panel.point,panel.camera);for(const r of rulers)assert(panel.markup.includes(T.formatLength(r.size,measurement)));assert(!/<text[^>]*>[^<]*\d m<\/text>/.test(panel.markup))}}}
 // End captions stay outside the silhouette; end-on views identify the hidden far end.
 for(const mode of ['top','left','right','front','back','leftIso','rightIso']){const camera=T.view({mode}),point=p=>T.project(p,camera),captions=ctx.trailerCaptions(active,point);assert(captions.some(p=>p.text.startsWith('Front')));assert(captions.some(p=>p.text.startsWith('Rear')));if(['front','back'].includes(mode))assert.deepEqual(Array.from(captions,p=>p.text).sort(),['Front','Rear']);else{const front=point({x:0,y:active.length,z:0}),rear=point({x:0,y:0,z:0}),a=captions.find(p=>p.text==='Front'),b=captions.find(p=>p.text==='Rear');assert((a.x-b.x)*(front.x-rear.x)+(a.y-b.y)*(front.y-rear.y)>0)}}
 assert(!ui.includes('Enter dimensions with mm, cm, m,'));
}
console.log('PASS: grouped 3D layers/sides, shared transforms, right-panel dragging, centred stable orbit, solid cases, internal project-unit rulers and visible end captions.');

// V57.27: compact details, rear-facing side orientation, smaller notes and automatic field commits.
{
 const data=T.empty();data.cases=[base('detail',{name:'Long case name',width:400,length:700,height:500,casterHeight:80})];data.trucks=[T.normaliseTruck({id:'details',width:2400,length:6000,height:2500,items:[]})];data.activeTruckId='details';const [item]=T.addItems(data,'details','detail',1);
 T.orientItem(item,'side');assert.equal(item.rotation,270);const wheel=T.casePoint(data,item,{x:200,y:350,z:0}),body=T.casePoint(data,item,{x:200,y:350,z:500});close(wheel.y,0);assert(body.y>wheel.y,'wheels face the trailer rear');item.rotation=90;T.orientItem(item,'side');assert.equal(item.rotation,90,'later detail edits preserve an explicit Rotate 90 action');
 const ctx=testContext({T,state:()=>data,truck:()=>data.trucks[0],esc:String,field:(label,input)=>'<label>'+label+input+'</label>'});vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const button=')),ctx);
 assert(!ctx.editActions().includes('Duplicate row'));assert(ctx.editActions().includes('Rotate 90°'));assert(!fn(ui,'renderInspector').includes('Cases on this truck'));assert(!fn(ui,'renderInspector').includes('name="rotation"'));assert(!fn(ui,'renderInspector').includes('measurementDetails'));assert(!fn(ui,'renderGroupInspector').includes('measurementDetails'));
 assert(ctx.orientationControl('wheels').includes('data-tp-orientation hidden'));assert(!ctx.orientationControl('side').includes('data-tp-orientation hidden'));assert(!ctx.orientationControl('wheels',true).includes('data-tp-orientation hidden'));
 const wrapper={hidden:false},fields={orientation:{name:'orientation',value:'side',dataset:{}},rideOnWheels:{name:'rideOnWheels',value:'no',dataset:{}}},form={querySelector:s=>s==='[data-tp-orientation]'?wrapper:s.includes('rideOnWheels')?fields.rideOnWheels:fields.orientation};fields.rideOnWheels.value='yes';ctx.syncOrientationForm({target:fields.rideOnWheels},form);assert(wrapper.hidden);fields.rideOnWheels.value='no';ctx.syncOrientationForm({target:fields.rideOnWheels},form);assert(!wrapper.hidden);
 for(const note of ['On-Side','Wheels-Up']){const markup=ctx.caseLabelMarkup('Long case name',{width:110,height:85,transform:'matrix(1 0 0 1 0 0)'},undefined,note),mainSize=Number(markup.match(/font-size="([^"]+)"/)[1]),noteSize=Number(markup.match(/<tspan[^>]*font-size="([^"]+)"/)[1]);assert(noteSize<mainSize);assert(markup.includes('>'+note+'</tspan>'));const lines=[...markup.matchAll(/<tspan[^>]*y="([^"]+)"/g)].map(m=>Number(m[1]));assert(lines.at(-1)>lines.at(-2));assert(lines.at(-1)<=85)}
 const css=fs.readFileSync(path.join(root,'js/truck-pack.css'),'utf8');assert(css.includes('display:flex;flex-direction:column;gap:4px'));assert(css.includes('.tpSceneTools[data-panel="1"]'));
 // Field navigation commits without replacing the form, losing focus or moving scroll.
 let commits=0,selectedCalls=0,autoFlag=false,allow=true,focus=null;const first={name:'name',value:'First',dataset:{},matches:()=>true,blur(){focus=null}},next={name:'department',value:'Audio',dataset:{},matches:()=>true,blur(){focus=null}},autoForm={querySelector:()=>null,querySelectorAll:()=>[first,next]},auto=testContext({applyItem:(form,pack,automatic)=>{commits++;assert.equal(form,autoForm);assert(!pack);autoFlag=automatic;return allow},applySelectedDetails:(form,automatic)=>{selectedCalls++;assert(automatic);return allow}});
 auto.bindDetailsForm(autoForm);focus=first;autoForm.oninput({target:first});assert.equal(commits,0);focus=next;autoForm.onfocusout({target:first});assert.equal(commits,1);assert(autoFlag);assert.equal(focus,next);assert(!first.dataset.tpChanged);autoForm.onfocusin({target:next});assert.equal(commits,1,'one commit per edit');
 autoForm.oninput({target:next});let prevented=0;autoForm.onkeydown({key:'Enter',target:next,preventDefault(){prevented++},stopPropagation(){}});assert.equal(commits,2);assert.equal(focus,null);assert.equal(prevented,1);autoForm.onfocusout({target:next});assert.equal(commits,2);
 allow=false;focus=first;autoForm.oninput({target:first});autoForm.onkeydown({key:'Enter',target:first,preventDefault(){},stopPropagation(){}});assert.equal(focus,first,'invalid edits remain available for correction');allow=true;autoForm.tpCommit();assert.equal(commits,4);
 auto.bindDetailsForm(autoForm,true);autoForm.onchange({target:next});autoForm.onfocusout({target:next});assert.equal(selectedCalls,1);
 // Refreshing details preserves pane scroll and the Position section; autosave skips that refresh.
 let redraws=0,scenes=0;const position={open:true},pane={scrollTop:180,scrollLeft:3,querySelector:()=>position},host={querySelector:s=>s==='.tpInspector'?pane:null},saveContext=testContext({host,transaction:(change,redraw)=>{assert.equal(redraw,false);change();return true},renderInspector(){redraws++;pane.scrollTop=0;position.open=false},renderScenes(){scenes++}});
 assert(saveContext.detailsTransaction(()=>{}));assert.equal(pane.scrollTop,180);assert.equal(pane.scrollLeft,3);assert(position.open);assert.equal(redraws,1);saveContext.detailsTransaction(()=>{},false);assert.equal(redraws,1);assert.equal(scenes,2);assert.equal(pane.scrollTop,180);
}
// Sides keep independent saved cameras, tools, panning, orbit and cube selection.
{
 const data=T.empty();data.layout=2;data.views[0]=T.view({mode:'sides'});data.views[1]=T.view({mode:'top'});data.trucks=[T.normaliseTruck({...T.presets[0],id:'independent',items:[]})];data.activeTruckId='independent';const active=data.trucks[0],viewport={width:680,height:700},svg={dataset:{tpScene:'0'},viewBox:{baseVal:viewport},getBoundingClientRect:()=>({left:0,top:0,...viewport})},host={querySelector:s=>s.includes('data-tp-scene')?svg:null,setPointerCapture(){},releasePointerCapture(){},contains:()=>true};
 const ctx=testContext({T,state:()=>data,truck:()=>active,host,tab:'pack',drag:null,selected:'',esc:String,sceneMaps:[],save(){},render(){},notify(){},renderInspector(){}});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);for(const name of ['scene','staging','renderSceneData','partMesh','click','svgPoint','pointerDown','pointerMove','pointerUp','cancelDrag','setView','sceneTools'])vm.runInContext(fn(ui,name),ctx);vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const button=')),ctx);
 ctx.renderScenes=()=>{ctx.sceneMaps[0]=ctx.scene(0)};ctx.render=ctx.renderScenes;ctx.renderScenes();const action=(tool,panel)=>ctx.click({target:{closest:()=>({dataset:{tpAction:'tool',view:'0',panel:String(panel),tool}})}}),event=(x,y)=>({button:0,pointerId:7,clientX:x,clientY:y,preventDefault(){},target:{closest:s=>s==='[data-tp-scene]'?svg:null}});
 const rightBefore=JSON.stringify(data.views[0].sideViews[1]);action('pan',0);ctx.pointerDown(event(120,120));ctx.pointerMove(event(120,145));assert.equal(ctx.drag.panel,0);assert(data.views[0].sideViews[0].panY>0);assert.equal(JSON.stringify(data.views[0].sideViews[1]),rightBefore);ctx.pointerUp(event(120,145));
 action('rotate',1);assert.equal(data.views[0].mode,'sides');assert.equal(data.views[0].sideViews[1].mode,'orbit');const leftBefore=JSON.stringify(data.views[0].sideViews[0]),yaw=data.views[0].sideViews[1].yaw;ctx.pointerDown(event(200,520));ctx.pointerMove(event(240,540));assert.equal(ctx.drag.panel,1);close(data.views[0].sideViews[1].yaw,yaw+26);assert.equal(JSON.stringify(data.views[0].sideViews[0]),leftBefore);ctx.pointerUp(event(240,540));
 const snapshot=JSON.stringify(data);ctx.pointerDown(event(200,520));ctx.pointerMove(event(280,550));ctx.cancelDrag();assert.equal(JSON.stringify(data),snapshot,'cancel restores only the active side');
 ctx.setView(0,'front',1);assert.equal(data.views[0].mode,'sides');assert.equal(data.views[0].sideViews[1].mode,'front');assert.equal(JSON.stringify(data.views[0].sideViews[0]),leftBefore);assert.deepEqual(T.normalise(JSON.parse(JSON.stringify(data))),data);
 const tools=ctx.sceneTools(0,data.views[0].sideViews[1],1);assert(tools.includes('data-panel="1"'));assert.equal((tools.match(/data-tool=/g)||[]).length,3);
 for(const mode of ['top','sides'])for(const zoom of [.5,1])for(const pan of [-100000,100000]){data.views[0]=T.view({mode,zoom,panX:pan,panY:pan});if(mode==='sides')for(const side of data.views[0].sideViews){side.panX=pan;side.panY=pan}const scene=ctx.scene(0);for(const p of scene.panels){const b=ctx.fit3DBounds(active,p.point,p.camera),r=p.rect;assert(b.left>=r.x+7.9&&b.right<=r.x+r.width-7.9,mode+' horizontal pan bounds');assert(b.top>=r.y+7.9&&b.bottom<=r.y+r.height-7.9,mode+' vertical pan bounds')}}
 assert(!ui.includes("['top','sides'].forEach"));assert(ui.includes("['sides','top'].forEach"));
}
console.log('PASS: compact details, rear-facing on-side wheels, smaller orientation notes, blur/Enter autosave, scroll preservation, independent side cameras and bounded grouped panning.');
// The actual single/bulk save paths preserve rotation when the removed field is absent.
{
 let data=T.empty();data.cases=[base('automatic',{width:400,length:800,height:500})];data.trucks=[T.normaliseTruck({id:'auto',width:2400,length:6000,height:2400,items:[]})];data.activeTruckId='auto';const items=T.addItems(data,'auto','automatic',2);items[0].rotation=90;
 let values={name:'Renamed',department:'Audio',colour:'',colour2:'',colour3:'',rideOnWheels:'yes',lifter:'no',orientation:'wheels',x:'0 mm',y:'0 mm',z:'0 mm'},saves=0;
 const ctx=testContext({T,state:()=>data,truck:()=>data.trucks[0],selected:items[0].id,selectedGroup:[items[0].id],drag:null,esc:String,FormData:class{get(k){return values[k]??null}},callbacks:{colourHex:x=>x,setState:next=>data=next,save:()=>saves++},render(){throw Error('Autosave must not rebuild the page')}});
 for(const name of ['save','replace','transaction','readCaseColours','applyItem','applySelectedDetails'])vm.runInContext(fn(ui,name),ctx);
 assert(ctx.applyItem({},false,true));assert.equal(data.trucks[0].items[0].rotation,90);assert.equal(data.trucks[0].items[0].name,'Renamed');assert.equal(saves,1);
 values={...values,orientation:'side',rideOnWheels:'no'};assert(ctx.applyItem({},false,true));assert.equal(data.trucks[0].items[0].rotation,270);assert.equal(T.orientation(data.trucks[0].items[0]),'side');
 ctx.selectedGroup=items.map(i=>i.id);const form={querySelectorAll:()=>[{name:'orientation',value:'side'}]};assert(ctx.applySelectedDetails(form,true));assert(data.trucks[0].items.every(i=>T.orientation(i)==='side'&&i.rotation===270));
 const before=JSON.stringify(data);values={...values,width:'bad',x:'bad'};assert.equal(ctx.applyItem({},false,true),false);assert.equal(JSON.stringify(data),before);
}

// Clicking within the current field must not commit partial text or move the caret.
{
 let commits=0;const ctx=testContext({tab:'pack',commitPendingDetails:()=>{commits++;return true}});vm.runInContext(fn(ui,'pointerDown'),ctx);ctx.pointerDown({button:0,target:{closest:()=>null}});assert.equal(commits,0);
}

// V57.28: drag a fill handle down one visible inventory column; commit as one undoable change.
{
 let data=T.empty(),saves=0,message='',captured=null,cancelledFrames=0,queuedFrame=null,scroll=0;
 data.cases=['source','hidden','target1','target2'].map(id=>base(id,{width:400,length:800,height:500,department:id==='hidden'?'Hidden':'Visible'}));
 const keys=['name','type','width','length','height','heightIncludesWheels','weight','casterHeight'];
 const scroller={get scrollTop(){return scroll},set scrollTop(value){scroll=Math.max(0,Math.min(200,value))},getBoundingClientRect:()=>({top:0,bottom:200})};
 const rows=data.cases.map((record,index)=>{const inputs=Object.fromEntries(keys.map(key=>[key,{name:key,value:['width','length','height','casterHeight'].includes(key)?T.formatLength(record[key]):key==='weight'?T.formatWeight(record[key]):String(record[key]),checked:record[key]===true,type:key==='heightIncludesWheels'?'checkbox':'text'}])),classes=Object.fromEntries(keys.map(key=>[key,new Set()])),cells=Object.fromEntries(keys.map(key=>[key,{classList:{toggle(name,on){on?classes[key].add(name):classes[key].delete(name)},remove(...names){names.forEach(n=>classes[key].delete(n))}}}]));return {dataset:{tpCase:record.id},hidden:index===1,inputs,classes,querySelector(selector){const key=selector.match(/="([^"]+)"/)[1];return selector.includes('data-tp-fill-field')?cells[key]:inputs[key]},getBoundingClientRect(){const i=rows.filter(r=>!r.hidden).indexOf(this);return {top:20+i*40-scroll,bottom:60+i*40-scroll}}}});
 const host={querySelector:s=>s==='.tpInventoryScroll'?scroller:null,querySelectorAll:s=>s==='[data-tp-case]'?rows:[],setPointerCapture:id=>captured=id,releasePointerCapture(){captured=null}};
 const ctx=testContext({T,host,state:()=>data,tab:'cases',inventoryQuery:'Visible',drag:null,dialog:null,selected:'',esc:String,weight:T.formatWeight,callbacks:{setState:next=>data=next,save:()=>saves++},root:{requestAnimationFrame:callback=>{queuedFrame=callback;return 1},cancelAnimationFrame(){cancelledFrames++;queuedFrame=null}},render(){},notify:value=>message=value});
 for(const name of ['save','replace','transaction','restoreHistory','pointerDown','pointerMove','pointerUp','cancelDrag'])vm.runInContext(fn(ui,name),ctx);
 const start=(key,value=rows[0].inputs[key].value)=>{rows[0].inputs[key].value=value;const handle={dataset:{tpFill:key},closest:()=>rows[0]};ctx.pointerDown({button:0,pointerId:4,clientY:30,preventDefault(){},target:{closest:s=>s==='[data-tp-fill]'?handle:null}})},move=y=>ctx.pointerMove({pointerId:4,clientY:y,preventDefault(){}}),up=()=>ctx.pointerUp({pointerId:4});
 const original=JSON.stringify(data);start('width','0.6 m');assert.equal(captured,4);move(110);assert.equal(ctx.drag.end,2);assert(rows[2].classes.width.has('tpFillTarget'));assert(rows[3].classes.width.has('tpFillTarget'));assert(!rows[1].classes.width.size);assert.equal(JSON.stringify(data),original,'preview does not change inventory');up();assert.deepEqual(Array.from(data.cases,c=>c.width),[600,400,600,600]);assert.equal(rows[2].inputs.width.value,'600 mm');assert.equal(ctx.undoStack.length,1);assert.equal(saves,1);assert.equal(captured,null);assert(rows.every(r=>!r.classes.width.size));
 ctx.restoreHistory();assert.equal(JSON.stringify(data),original);ctx.restoreHistory(true);assert.deepEqual(Array.from(data.cases,c=>c.width),[600,400,600,600]);
 const beforeCancel=JSON.stringify(data);start('name','New name');move(110);ctx.cancelDrag();assert.equal(JSON.stringify(data),beforeCancel);assert(rows.every(r=>!r.classes.name.size));
 start('name','New name');move(110);up();assert.deepEqual(Array.from(data.cases,c=>c.name),['New name','hidden','New name','New name']);
 rows[0].inputs.heightIncludesWheels.checked=false;start('heightIncludesWheels');move(110);up();assert.deepEqual(Array.from(data.cases,c=>c.heightIncludesWheels),[false,true,false,false]);
 start('weight','');move(110);up();assert.deepEqual(Array.from(data.cases,c=>c.weight),[null,100,null,null]);
 // Invalid source dimensions and invalid packed results leave all inventory unchanged.
 let before=JSON.stringify(data);start('height','bad');assert.equal(ctx.drag,null);assert.equal(JSON.stringify(data),before);assert(message.includes('measurement')||message.includes('unit'));
 data.trucks=[T.normaliseTruck({id:'fill-truck',width:2400,length:6000,height:2500,items:[]})];data.activeTruckId='fill-truck';const [a]=T.addItems(data,'fill-truck','target1',1),[b]=T.addItems(data,'fill-truck','target2',1);Object.assign(a,{packed:true,x:0,y:0});Object.assign(b,{packed:true,x:800,y:0});before=JSON.stringify(data);const history=ctx.undoStack.length;start('width','1000 mm');move(110);up();assert.equal(JSON.stringify(data),before);assert.equal(ctx.undoStack.length,history);assert(message.includes('overlap'));
 // Upward/no-distance drags do not write; unrelated pointers cannot finish this fill.
 start('width','600 mm');move(0);up();assert.equal(JSON.stringify(data),before);start('name','Not committed');ctx.pointerUp({pointerId:99});assert(ctx.drag);ctx.cancelDrag();
 // Auto-scroll continues at the table edge and stops cleanly on cancellation.
 start('name','Scrolling');move(195);assert(scroll>0);assert(queuedFrame);const prior=scroll;queuedFrame();assert(scroll>prior);ctx.cancelDrag();assert(cancelledFrames>0);assert.equal(queuedFrame,null);assert.equal(JSON.stringify(data),before);
 // A stale model cannot receive a delayed drop.
 scroll=0;start('name','Stale');move(110);data=T.normalise(data);before=JSON.stringify(data);up();assert.equal(JSON.stringify(data),before);
}
// Fill controls cover editable cells only; truss images retain faces/labels without diagonal lines.
{
 const data=T.empty();data.cases=[base('plain-truss',{type:'Truss',width:300,length:2000,height:300,casterHeight:null})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'plain-truss',items:[]})];data.activeTruckId='plain-truss';const [item]=T.addItems(data,'plain-truss','plain-truss',1);Object.assign(item,{packed:true,x:0,y:0,z:0});
 const ctx=testContext({T,state:()=>data,truck:()=>data.trucks[0],drag:null,selected:'',esc:String,weight:T.formatWeight});for(const name of ['input','button'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);for(const name of ['inventoryMarkup','scene','staging','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),ctx);vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);
 assert.equal((ctx.inventoryMarkup().match(/data-tp-fill="/g)||[]).length,8);assert(!ui.includes('Save Details'));assert(!fn(ui,'renderSceneData').includes('#3f4f5f'));
 for(const mode of ['plan','top','sides','leftIso','rightIso','orbit']){data.views[0]=T.view({mode});const markup=ctx.scene(0).markup;assert(markup.includes('data-tp-item="'+item.id+'"'));assert(markup.includes('tpCaseLabel'));assert(!markup.includes('#3f4f5f'));assert(!/NaN|Infinity/.test(markup))}
 const css=fs.readFileSync(path.join(root,'js/truck-pack.css'),'utf8');assert(css.includes('.tpSceneTools{transform:scale(.8);transform-origin:top left;'));assert(css.includes('.tpFillHandle'));assert(css.includes('touch-action:none;opacity:0'));
}
console.log('PASS: editable-cell drag fill, visible-row filtering, typed values, atomic validation, Undo, cancellation, auto-scroll, no save buttons and plain truss faces.');

// V57.28 follow-up: dimension remapping uses the original columns for the entire inventory.
{
 const data=T.empty();data.cases=[base('mapped-a',{width:400,length:800,height:600}),base('mapped-b',{width:500,length:1000,height:700})];const before=JSON.stringify(data),keys=['width','length','height'];
 for(const order of [['width','length','height'],['width','height','length'],['length','width','height'],['length','height','width'],['height','width','length'],['height','length','width']]){
  const mapping=Object.fromEntries(keys.map((key,i)=>[key,order[i]])),next=T.reassignDimensions(data,mapping);for(let i=0;i<data.cases.length;i++){for(const key of keys)assert.equal(next.cases[i][key],data.cases[i][mapping[key]]);for(const key of ['id','name','type','weight','department','heightIncludesWheels','casterHeight'])assert.equal(next.cases[i][key],data.cases[i][key])}assert.equal(JSON.stringify(data),before);assert.deepEqual(T.normalise(JSON.parse(JSON.stringify(next))),next);
 }
 for(const mapping of [null,{}, {width:'length',length:'length',height:'height'}, {width:'name',length:'length',height:'height'}])assert.throws(()=>T.reassignDimensions(data,mapping),/once each/);
 data.trucks=[T.normaliseTruck({id:'mapped-truck',width:2400,length:6000,height:2500,items:[]})];data.activeTruckId='mapped-truck';const [a,b]=T.addItems(data,'mapped-truck','mapped-a',2);Object.assign(a,{packed:true,x:0,y:0});Object.assign(b,{packed:true,x:500,y:0});const packed=JSON.stringify(data);assert.throws(()=>T.reassignDimensions(data,{width:'length',length:'width',height:'height'}),/overlap/);assert.equal(JSON.stringify(data),packed,'a failed batch never alters cases or truck instances');
 const unchanged=T.reassignDimensions(data,{width:'width',length:'length',height:'height'});assert.deepEqual(unchanged.trucks,data.trucks);
}
// Use the actual reassignment dialog and its Undo entry, independent of the inventory search.
{
 let data=T.empty(),submit,title,markup,saves=0,closed=0;data.cases=[base('dialog-a',{width:400,length:800,height:600}),base('dialog-b',{width:500,length:900,height:700})];
 const controls=Object.fromEntries(['width','length','height'].map(key=>[key,{value:key}])),preview={innerHTML:''},button={textContent:''},modal={querySelector:s=>s==='[type="submit"]'?button:s==='[data-tp-dimension-preview]'?preview:controls[s.match(/name="([^"]+)"/)[1]]};
 const ctx=testContext({T,state:()=>data,inventoryQuery:'dialog-a',selected:'',dialog:null,drag:null,esc:String,callbacks:{setState:next=>data=next,save:()=>saves++},render(){},closeDialog(){closed++},FormData:class{get(key){return controls[key].value}},showDialog:(heading,html,callback)=>{title=heading;markup=html;submit=callback;return modal}});
 for(const name of ['field'])vm.runInContext(ui.split('\n').find(line=>line.trim().startsWith('const '+name+'=')),ctx);for(const name of ['save','replace','restoreHistory','dimensionMappingDialog'])vm.runInContext(fn(ui,name),ctx);
 ctx.dimensionMappingDialog();assert.equal(title,'Reassign case dimensions');assert(markup.includes('all 2 inventory cases'));assert.equal(button.textContent,'Apply to all cases');assert(preview.innerHTML.includes('400 mm → 400 mm'));
 const before=JSON.stringify(data);controls.width.value='length';controls.width.onchange();assert(preview.innerHTML.includes('400 mm → 800 mm'));assert.throws(()=>submit({}),/once each/);assert.equal(JSON.stringify(data),before);assert.equal(saves,0);
 controls.length.value='height';controls.height.value='width';submit({});assert.deepEqual(Array.from(data.cases,c=>[c.width,c.length,c.height]),[[800,600,400],[900,700,500]]);assert.equal(saves,1);assert.equal(closed,1);assert.equal(ctx.undoStack.length,1);ctx.restoreHistory();assert.equal(JSON.stringify(data),before);
}
// Tipped/On End selects rear-facing wheels, without overriding later Rotate 90 actions.
{
 let data=T.empty();data.cases=[base('tipped',{width:400,length:800,height:600})];data.trucks=[T.normaliseTruck({id:'tipped',width:2400,length:6000,height:2500,items:[]})];data.activeTruckId='tipped';const items=T.addItems(data,'tipped','tipped',3);items.forEach((item,i)=>item.rotation=[90,180,270][i]);
 for(const item of items){T.orientItem(item,'tipped');assert.equal(item.rotation,0);const wheel=T.casePoint(data,item,{x:200,y:400,z:0}),body=T.casePoint(data,item,{x:200,y:400,z:600});close(wheel.y,0);assert(body.y>wheel.y);item.rotation=90;T.orientItem(item,'tipped');assert.equal(item.rotation,90)}
 // Exercise the forms, which set Ride on Wheels before resolving Orientation.
 items.forEach(item=>T.orientItem(item,'wheels'));let values={name:'Tipped',department:'',colour:'',colour2:'',colour3:'',rideOnWheels:'no',orientation:'tipped',lifter:'no',x:'0 mm',y:'0 mm',z:'0 mm'};
 const ctx=testContext({T,state:()=>data,truck:()=>data.trucks[0],selected:items[0].id,selectedGroup:[items[0].id],drag:null,FormData:class{get(key){return values[key]??null}},callbacks:{colourHex:x=>x,setState:next=>data=next,save(){}},render(){}});for(const name of ['save','replace','transaction','readCaseColours','applyItem','applySelectedDetails'])vm.runInContext(fn(ui,name),ctx);
 assert(ctx.applyItem({},false,true));assert.equal(data.trucks[0].items[0].rotation,0);ctx.selectedGroup=items.map(item=>item.id);assert(ctx.applySelectedDetails({querySelectorAll:()=>[{name:'rideOnWheels',value:'no'},{name:'orientation',value:'tipped'}]},true));assert(data.trucks[0].items.every(item=>item.rotation===0&&T.orientation(item)==='tipped'));
 data.trucks[0].items[0].rotation=90;ctx.selectedGroup=[items[0].id];assert(ctx.applyItem({},false,true));assert.equal(data.trucks[0].items[0].rotation,90);
}
// Every ruler retains the requested tick interval at every zoom; captions use exactly Front/Rear.
{
 const data=T.empty();data.trucks=[T.normaliseTruck({id:'ruler',width:2500,length:13600,height:2800,items:[]})];data.activeTruckId='ruler';data.layout=2;const active=data.trucks[0],ctx=testContext({T,state:()=>data,truck:()=>active,drag:null,selected:'',esc:String});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);for(const name of ['staging','scene','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),ctx);
 for(const measurement of ['metric','imperial'])for(const mode of ['plan','top','sides','front','back'])for(const zoom of [.5,1,2]){ctx.unit=()=>({measurement});ctx.length=n=>T.formatLength(n,measurement);data.views[0]=T.view({mode,zoom});const scene=ctx.scene(0);assert.equal(scene.markup.includes('class="tpSideDivider"'),mode==='sides');for(const panel of scene.panels||[scene]){
  const captions=ctx.trailerCaptions(active,panel.point);assert.deepEqual(Array.from(captions,p=>p.text).sort(),['Front','Rear']);
  for(const ruler of panel.markup.matchAll(/<g data-tp-ruler="([xyz])" data-internal-size="([^"]+)">([\s\S]*?)<\/g>/g)){const size=Number(ruler[2]),ticks=Array.from(ruler[3].matchAll(/data-tp-tick="([^"]+)"/g),m=>Number(m[1])),step=measurement==='imperial'?2438.4:2500,expected=[0];for(let i=1;i*step<size-T.EPS;i++)expected.push(i*step);expected.push(size);assert.equal(ticks.length,expected.length);ticks.forEach((tick,i)=>close(tick,expected[i]));assert(ruler[3].includes(T.formatLength(size,measurement)))}
 }}
 assert(fs.readFileSync(path.join(root,'js/truck-pack.css'),'utf8').includes('.tpSideDivider{stroke:#b9b9b9;stroke-width:1;opacity:.6;'));
 assert.equal(html.match(/const VERSION='([^']+)'/)[1],'57.36');
}
console.log('PASS: all-inventory W/L/H swaps, preview/Undo, atomic invalid-pack rejection, rear-facing tipped wheels, fixed ruler intervals, Front/Rear labels and side divider.');

// V57.29: full cuboids, visible outward faces and fixed lighting during free rotation.
{
 const data=T.empty();data.layout=2;data.cases=[base('volume',{width:600,length:900,height:700,casterHeight:0})];data.trucks=[T.normaliseTruck({...T.presets[0],id:'volume',items:[]})];data.activeTruckId='volume';const active=data.trucks[0],[item]=T.addItems(data,active.id,'volume',1);Object.assign(item,{packed:true,x:300,y:1200,z:0,colour:'#ff0000',colour2:'#ffffff'});
 const ctx=testContext({T,state:()=>data,truck:()=>active,selected:'',drag:null,esc:String,showMeasurements:false});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);for(const name of ['scene','staging','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),ctx);
 const faceIndices=[[0,3,2,1],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]],colour=ctx.caseColourMarkup,records=[];
 ctx.caseColourMarkup=(item,index,face,frame)=>{records.push({face,frame});return colour(item,index,face,frame)};
 for(const orientation of ['wheels','tipped','side','wheelsUp'])for(const rotation of [0,90,180,270]){
  T.orientItem(item,orientation);item.rotation=rotation;
  const vertices=Array.from(ctx.corners({x:0,y:0,z:0,width:600,length:900,height:700}),p=>T.casePoint(data,item,p)),center=T.casePoint(data,item,{x:300,y:450,z:350}),shades=new Map();
  for(const yaw of [-165,-105,-45,15,75,135])for(const pitch of [-55,-20,20,55,80]){
   const camera=T.view({mode:'orbit',yaw,pitch,orbitScale:.00015});data.views[0]=camera;records.length=0;const result=ctx.scene(0),centerDepth=T.project(center,camera).depth;
   // A face is visible when its centre is nearer the camera than the cuboid centre.
   const expected=faceIndices.flatMap((face,i)=>{const mid=face.reduce((p,k)=>({x:p.x+vertices[k].x/4,y:p.y+vertices[k].y/4,z:p.z+vertices[k].z/4}),{x:0,y:0,z:0});return T.project(mid,camera).depth>centerDepth+.01?[i]:[]});
   assert.deepEqual(records.map(r=>r.face).sort(),expected.sort(),`${orientation}/${rotation}: outward faces at ${yaw}/${pitch}`);assert.equal(records.length,3,'oblique views show three solid faces');
   const overlays=[...result.markup.matchAll(/<polygon class="tpCaseShade" points="([^"]+)" fill="#000000" opacity="([^"]+)"/g)];assert.equal(overlays.length,3);assert.equal(new Set(overlays.map(m=>m[2])).size,3,'adjacent faces have distinct lighting');assert(result.markup.includes('fill-opacity="1"'));assert(result.markup.includes('fill="#ff0000"'));assert(result.markup.includes('fill="#ffffff"'));assert(!/NaN|Infinity/.test(result.markup));
   for(const {face,frame} of records){assert(frame);const shade=ctx.caseFaceShade(faceIndices[face].map(i=>vertices[i]));if(shades.has(face))close(shade,shades.get(face));shades.set(face,shade)}
   const before=overlays.map(m=>m[2]);camera.panX=75;camera.panY=-30;camera.zoom=2;const changed=ctx.scene(0);assert.deepEqual([...changed.markup.matchAll(/class="tpCaseShade"[^>]*opacity="([^"]+)"/g)].map(m=>m[1]),before,'pan and zoom preserve lighting');
  }
 }
 T.orientItem(item,'wheels');item.rotation=0;item.colour='';item.colour2='';data.views[0]=T.view({mode:'orbit',yaw:35,pitch:30});let markup=ctx.scene(0).markup;assert(markup.includes('fill="#ffffff" fill-opacity="1"'),'unassigned cases remain neutral under lighting');assert(markup.includes('tpCaseShade'));data.views[0]=T.view({mode:'plan'});assert(!ctx.scene(0).markup.includes('tpCaseShade'),'2D plans keep their original colour rendering');
 // Aligned cases paint the far one first, leaving the nearer opaque cuboid in front.
 const [far]=T.addItems(data,active.id,'volume',1);Object.assign(far,{packed:true,x:item.x,y:item.y+1500,z:0});data.views[0]=T.view({mode:'orbit',yaw:0,pitch:0});markup=ctx.scene(0).markup;assert(markup.indexOf(`data-tp-item="${far.id}"`)<markup.indexOf(`data-tp-item="${item.id}"`));
}
console.log('PASS: solid cuboid faces across 480 orbit/orientation combinations, fixed face lighting, neutral/striped colours, unchanged plans and near/far occlusion.');

// V57.30: compare the final face order against a depth buffer, not just face counts.
{
 const data=T.empty();data.layout=2;data.trucks=[T.normaliseTruck({...T.presets[4],id:'occlusion',items:[]})];data.activeTruckId='occlusion';const active=data.trucks[0];
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const mode=['wheels','tipped','side','wheelsUp'][(row+col)%4],id=`occlusion_${row}_${col}`,record=base(id,{width:mode==='side'?700:450+col*40,length:mode==='tipped'?700:650+row*400+col*130,height:mode==='side'?500:550+row*80,casterHeight:60,type:col===0&&row===0?'Truss':'Case'});data.cases.push(record);
  for(let level=0;level<2;level++){const [item]=T.addItems(data,active.id,id,1);T.orientItem(item,mode);item.rotation=0;const size=T.dimensions(data,item);Object.assign(item,{packed:true,x:col*610,y:row*2600+4500,z:level*size.height,lifter:!!level,colour:level?'#ffffff':'#ff0000',colour2:col%2?'#ffff00':''})}
 }
 assert.equal(T.truckError(data,active),'','the regression load is a valid supported pack');
 const ctx=testContext({T,state:()=>data,truck:()=>active,drag:null,selected:'',esc:String,showMeasurements:false});vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),ctx);for(const name of ['staging','scene','renderSceneData','partMesh'])vm.runInContext(fn(ui,name),ctx);
 const originalOrder=ctx.orderCaseSurfaces,captures=[];ctx.orderCaseSurfaces=(faces,camera)=>{const ordered=originalOrder(faces,camera);captures.push({faces,ordered});return ordered};
 const projected=(face,point)=>{const q=face.vertices.map(point);return {q,left:Math.min(...q.map(p=>p.x)),right:Math.max(...q.map(p=>p.x)),top:Math.min(...q.map(p=>p.y)),bottom:Math.max(...q.map(p=>p.y))}};
 function depthAt(face,x,y){if(x<=face.left||x>=face.right||y<=face.top||y>=face.bottom)return null;const q=face.q;for(let i=1;i<q.length-1;i++){const [a,b,c]=[q[0],q[i],q[i+1]],det=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(det)<1e-9)continue;const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/det,v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/det,w=1-u-v;if(u>=-1e-8&&v>=-1e-8&&w>=-1e-8)return u*a.depth+v*b.depth+w*c.depth}return null}
 let samples=0,oldErrors=0,splitFaces=0;
 for(const yaw of [-145,-100,-55,-10,35,80,125,170])for(const pitch of [-30,30]){
  captures.length=0;data.views[0]=T.view({mode:'sides',sideViews:[{mode:'orbit',yaw,pitch},{mode:'orbit',yaw:yaw+180,pitch:-pitch}]});const scene=ctx.scene(0);assert.equal(captures.length,2);
  const ids=Array.from(scene.markup.matchAll(/<clipPath id="([^"]+)"/g),m=>m[1]);assert.equal(new Set(ids).size,ids.length,'split-face clips are unique across both panels');
  scene.panels.forEach((panel,panelIndex)=>{
   const {faces,ordered}=captures[panelIndex],expected=faces.map(f=>projected(f,panel.point)),drawn=ordered.map(f=>projected(f,panel.point)),old=[...faces].sort((a,b)=>a.depth-b.depth).map(f=>projected(f,panel.point));splitFaces+=ordered.filter(f=>f.clipped).length;
   assert.deepEqual(Array.from(panel.markup.matchAll(/<g data-tp-item="([^"]+)"/g),m=>m[1]),Array.from(ordered,f=>f.markup.match(/data-tp-item="([^"]+)"/)[1]),'the SVG uses the tested surface order');
   const r=panel.rect;for(let y=r.y+1.37;y<r.y+r.height;y+=5)for(let x=r.x+1.73;x<r.x+r.width;x+=5){
    let nearest=-Infinity,painted=null,previous=null;for(const face of expected){const d=depthAt(face,x,y);if(d!==null)nearest=Math.max(nearest,d)}if(nearest===-Infinity)continue;
    for(const face of drawn){const d=depthAt(face,x,y);if(d!==null)painted=d}for(const face of old){const d=depthAt(face,x,y);if(d!==null)previous=d}
    samples++;assert(painted!==null,'face splitting leaves no holes');assert(Math.abs(painted-nearest)<.02,`nearer surface stays visible at ${yaw}/${pitch}, panel ${panelIndex}`);if(previous<nearest-.02)oldErrors++;
   }
  });
 }
 assert(samples>1000);assert(oldErrors>0,'the test reproduces the former average-depth failure');assert(splitFaces>0,'overlapping face spans exercise geometric splitting');
 console.log(`PASS: ${samples} depth-buffer samples across both side viewers; no missing/overpainted faces (${oldErrors} failures reproduced with the previous order).`);
}

// V57.31: loading, the rotate tool and cube drags cannot put a camera under the floor.
{
 const saved={mode:'orbit',orbitScale:7.485189680071589e-5,yaw:88.44726562500001,pitch:-16.807617187500007,zoom:1.9531250000000013,panX:0,panY:0,tool:'rotate'},view=T.view(saved);
 assert.equal(view.pitch,5);for(const key of ['yaw','zoom','orbitScale','panX','panY','tool'])assert.equal(view[key],saved[key],'correct only the unsafe camera angle');
 for(const mode of T.perspectives){assert(T.view({mode,pitch:-30}).pitch>=0);assert(T.view({mode,pitch:120}).pitch<=90)}
 for(const mode of ['left','right','front','back','sides'])assert.equal(T.view({mode}).pitch,0,'keep true elevation presets');assert.equal(T.view({mode:'top'}).pitch,90);
 const data=T.empty();data.cases=[base('floor-check')];data.trucks=[T.normaliseTruck({...T.presets[0],id:'floor-check',items:[]})];data.activeTruckId='floor-check';data.layout=2;const [item]=T.addItems(data,data.activeTruckId,'floor-check',1);Object.assign(item,{packed:true,x:100,y:100});data.views[0]=saved;data.views[1]=T.view({mode:'sides'});data.views[1].sideViews=[{...saved},{...saved,pitch:-60}];const before=JSON.stringify([data.cases,data.trucks]),loaded=T.normalise(data);assert.equal(JSON.stringify([loaded.cases,loaded.trucks]),before,'camera correction preserves cases and placements');assert.equal(loaded.views[0].pitch,5);loaded.views[1].sideViews.forEach(side=>assert.equal(side.pitch,5));assert.deepEqual(T.normalise(loaded),loaded,'the corrected camera saves and reopens consistently');
 const ctx=testContext({T,state:()=>loaded,truck:()=>loaded.trucks[0],drag:null});vm.runInContext(fn(ui,'pointerMove'),ctx);
 for(const panel of [null,0,1]){
  const index=panel===null?0:1,camera=panel===null?loaded.views[0]:loaded.views[1].sideViews[panel],other=panel===null?null:JSON.stringify(loaded.views[1].sideViews[1-panel]);camera.pitch=30;camera.yaw=0;
  for(const zoom of [.25,1,2,8]){
   camera.zoom=zoom;ctx.drag={type:'orbit',index,panel,startX:100,startY:100,yaw:0,pitch:30};ctx.pointerMove({clientX:2000,clientY:10000});assert.equal(camera.pitch,5);assert.equal(camera.zoom,zoom);assert(camera.yaw>360,'horizontal rotation stays unrestricted');ctx.pointerMove({clientX:-1000,clientY:-10000});assert.equal(camera.pitch,89);assert.equal(camera.zoom,zoom);
  }
  if(other!==null)assert.equal(JSON.stringify(loaded.views[1].sideViews[1-panel]),other,'rotating one side leaves the other camera alone');
 }
 for(const mode of ['top','left','right','front','back','orbit']){const camera=T.view({mode});camera.pitch=-30;ctx.prepareOrbit(camera,{width:900,height:700});assert(camera.pitch>=5&&camera.pitch<=89,'entering free rotation always starts above the floor')}
}
console.log('PASS: above-floor saved cameras, independent side views, tool/cube rotation bounds at every zoom, unrestricted horizontal orbit and unchanged case data.');
