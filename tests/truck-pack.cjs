'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const T=require('../js/truck-pack.js'),root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),ui=fs.readFileSync(path.join(root,'js/truck-pack-view.js'),'utf8');
function fn(text,name){const start=text.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=text.indexOf('}',start);end>=0;end=text.indexOf('}',end+1)){const value=text.slice(start,end+1);try{new Function('return ('+value+')');return value}catch{}}throw Error(name)}
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
for(const mode of T.perspectives.filter(k=>k!=='orbit')){const camera=T.view({mode,yaw:T.cameras[mode][0],pitch:T.cameras[mode][1]}),plane=['left','right'].includes(mode)?'yz':['front','back'].includes(mode)?'xz':'xy',delta=plane==='xy'?{x:150,y:-240,z:0}:plane==='xz'?{x:150,y:0,z:240}:{x:0,y:150,z:240},screen=T.project(delta,camera),back=T.unprojectDelta(screen.x,screen.y,camera,plane);for(const key of ['x','y','z'])close(back[key],delta[key]);}
// Run the actual SVG renderer with saved data, independent camera windows and staging.
const c=vm.createContext({T,drag:null,selected:upper.id,state:()=>model,truck:()=>truck,esc:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),Math});
vm.runInContext(ui.split('\n').find(line=>line.includes('const faces=')),c);
for(const name of ['corners','staging','scene','renderSceneData','partMesh','cubeMarkup'])vm.runInContext(fn(ui,name),c);
for(const mode of T.perspectives.filter(v=>v!=='orbit')){model.views[0]=T.view({mode,yaw:T.cameras[mode][0],pitch:T.cameras[mode][1]});const result=c.scene(0);assert(result.markup.includes('base'));assert(result.markup.includes('small'));assert(!/NaN|Infinity/.test(result.markup),mode);for(const match of result.markup.matchAll(/matrix\(([-.\d]+) ([-.\d]+) ([-.\d]+) ([-.\d]+) /g)){const [a,b,c,d]=match.slice(1).map(Number);assert(a>=0&&a*d-b*c>0,'3D labels read left-to-right without mirroring');}assert(result.markup.includes('data-tp-item'));assert(result.markup.includes('REAR / LOAD'));if(mode!=='plan'){assert(result.markup.includes('#303844'),'3D shows castors');assert(c.cubeMarkup(model.views[0]).includes('data-tp-cube-face="top"'));}}
const staged=T.addItems(model,'truck','small',2);assert.equal(c.staging(truck).size,2);assert(c.scene(0).markup.includes('WAITING'));assert.deepEqual(model.views.slice(1),T.empty().views.slice(1),'changing one camera leaves other windows alone');
// Metadata can be saved while a case is still waiting; packing is a separate action.
const formValues={name:'Edited waiting case',department:'Lighting',colour:'#123456',rideOnWheels:'no',lifter:'yes',rotation:'90',x:'0 mm',y:'0 mm',z:'0 mm'},edit=vm.createContext({T,FormData:class{get(k){return formValues[k]}},selected:staged[0].id,state:()=>model,callbacks:{colourHex:v=>v},transaction:change=>change(model)});vm.runInContext(fn(ui,'applyItem'),edit);edit.applyItem({},false);assert.equal(staged[0].packed,false);assert.equal(truck.items.find(i=>i.id===staged[0].id).name,'Edited waiting case');
// Import routing invokes the existing parsers without changing fixture-patch import state.
const reader=vm.createContext({readBoundedFileText:async f=>f.text,readBoundedFileBuffer:async f=>f.buffer,xlsxWorkbookSheets:async buffer=>[{name:'Equipment',rows:buffer}],xmlWorksheetRows:()=>rows});vm.runInContext(fn(html,'parseCsvRows'),reader);vm.runInContext(fn(html,'readTruckPackInventory'),reader);
(async()=>{const csv=await reader.readTruckPackInventory({name:'inventory.csv',text:'Name,W,L,H\n"Box, A",600 mm,1 m,800 mm'});assert.equal(csv[0].rows[1][0],'Box, A');const workbook=await reader.readTruckPackInventory({name:'inventory.xlsx',buffer:rows});assert.equal(workbook[0].name,'Equipment');const tsv=await reader.readTruckPackInventory({name:'inventory.tsv',text:'Name\tW\nBox\t600 mm'});assert.equal(tsv[0].rows[1][1],'600 mm');await assert.rejects(reader.readTruckPackInventory({name:'bad.exe',text:''}),/Use CSV/);console.log('PASS: Truck Pack units, fleet presets, imports, atomic validation, staging, end rotation, stacking/support, bounds, payloads, persistence, all camera projections and 2D/3D SVG rendering.');})().catch(e=>{console.error(e);process.exitCode=1});
assert(fn(html,'appPayload').includes('truckPack:app.truckPack'));assert(fn(html,'loadProjectPayload').includes('truckPack:normaliseTruckPack(candidate.truckPack)'));assert(fn(html,'clearProjectState').includes('app.truckPack=normaliseTruckPack(null)'));assert(fn(html,'render').includes('renderTruckPackView()'));

// Exercise the live drag handlers: valid drop, collision rejection and cancellation.
{
 model.views[0]=T.view({mode:'plan',yaw:0,pitch:90});
 const svg={dataset:{tpScene:'0'},getBoundingClientRect:()=>({left:0,top:0,width:900,height:600})},host={querySelector:()=>svg,setPointerCapture(){},releasePointerCapture(){}};
 const d=vm.createContext({T,host,tab:'pack',drag:null,callbacks:{},selected:'',state:()=>model,truck:()=>truck,sceneMaps:[c.scene(0)],renderInspector(){},renderScenes(){},notify(){},save(){},render(){},transaction:change=>{const next=JSON.parse(JSON.stringify(model));change(next);model=T.normalise(next);truck=model.trucks[0]}});
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
 const p=vm.createContext({LampyCore:require('../js/project-core.js'),LampyTruckPack:T,app:{collapsed:{}},document:{},fixturePatchViewOptions:{},persisted:0});
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
 const moduleContext=vm.createContext({LampyTruckPack:T});vm.runInContext(ui,moduleContext);
 const viewLabels=moduleContext.LampyTruckPackView.labels;
 assert.deepEqual(Object.values(viewLabels).slice(0,8),['2D Top / Plan','3D Top','3D Left','3D Right','3D Back','3D Front','3D Left Isometric','3D Right Isometric']);
 let fresh=T.empty(),submit,formValues={},lastMarkup='',saves=0;
 const modal={querySelector:()=>({value:'',textContent:'',onchange:null}),querySelectorAll:()=>[]};
 const c=vm.createContext({T,labels:viewLabels,esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),state:()=>fresh,unit:()=>({measurement:'metric',weight:'kg'}),length:v=>T.formatLength(v),weight:v=>T.formatWeight(v),callbacks:{colourControl:()=>'<input name="colour">',colourHex:v=>v},FormData:class{get(k){return formValues[k]??''}},showDialog:(title,markup,callback)=>{submit=callback;lastMarkup=markup;return modal},replace:next=>{fresh=T.normalise(next);saves++},closeDialog(){},render(){},selected:'',tab:'pack'});
 for(const name of ['button','input','field']){
  // These helpers are concise arrow declarations in the live module.
  const line=ui.split('\n').find(line=>line.trim().startsWith('const '+name+'='));vm.runInContext(line,c);
 }
 for(const name of ['caseDialog','truckDialog','packMarkup','inventoryMarkup'])vm.runInContext(fn(ui,name),c);
 c.caseDialog();assert(lastMarkup.includes('Castor Height'));formValues={name:'Tour Case',type:'Case',width:'600 mm',length:'1 m',height:'700 mm',heightIncludesWheels:'no',casterHeight:'100 mm',weight:'22 lb',department:'Lighting',colour:'#aabbcc'};submit({});assert.equal(fresh.cases.length,1);assert.equal(fresh.cases[0].height,700);assert.equal(fresh.cases[0].casterHeight,100);close(fresh.cases[0].weight,9.97903214);
 c.truckDialog(null);for(const title of ['Trucking Company','Trailer Name/Number','Trailer Reg','Driver Name','Driver E-mail','Driver Phone'])assert(lastMarkup.includes(title));
 formValues={preset:'custom',width:'2.4 m',length:'8 m',height:'2.8 m',payload:'8000 kg',company:'Tour Trucks',name:'Trailer 3',registration:'ABC 123',driver:'Alex',email:'alex@example.com',phone:'+45 12345678'};submit({});assert.equal(fresh.trucks.length,1);assert.equal(fresh.trucks[0].driver,'Alex');assert.equal(fresh.trucks[0].length,8000);assert.equal(saves,2);
 for(const layout of [1,2,4]){fresh.layout=layout;const markup=c.packMarkup(fresh,fresh.trucks[0]);assert.equal((markup.match(/class="tpViewport"/g)||[]).length,layout);for(let i=0;i<layout;i++)assert(markup.includes('data-tp-perspective="'+i+'"'));}
 const inventory=c.inventoryMarkup();for(const title of ['Name','Type','W','L','H','Height Inc Wheels?','Weight (kg)'])assert(inventory.includes('>'+title+'</th>'));assert(inventory.includes('type="checkbox"'));assert(inventory.includes('700 mm'));
}
