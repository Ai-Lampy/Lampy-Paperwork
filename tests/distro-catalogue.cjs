'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),D=require('../js/distro-catalogue.js'),Core=require('../js/project-core.js');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),raw=JSON.parse(fs.readFileSync(path.join(root,'json/distro_options.json'),'utf8')),catalogue=D.normalise(raw),copy=v=>JSON.parse(JSON.stringify(v));
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const text=html.slice(start,end+1);try{new Function('return ('+text+')');return text}catch{}}throw Error(name)}
function configured(index=0,name='A'){return D.configure({id:name,name,voltage:'230V',input:'200A P/Lock - 3P + N + E',auxGroups:[],outputGroups:[],feed:null},catalogue.distroType[index],catalogue)}
function optional(d,connector){const o=d.catalogue.type.outputs.find(o=>o.connector===connector||o.connectorOptions?.includes(connector));D.addOptional(d,o,connector,()=>({meta:{},labels:[{},{},{}]}),text=>({text}));return o}
assert.deepEqual(catalogue.distroType.map(t=>t.socapexes),[12,8,6,4,2]);assert.equal(catalogue.distroType[0].weightKg,149);assert.equal(catalogue.distroType[1].weightKg,null);
for(let i=0;i<5;i++){
 const d=configured(i);assert.equal(D.availableMappings(d).includes('soca_per_phase'),[0,2].includes(i));
 optional(d,'True 1');optional(d,'16A CEE Form');const batch=i<2?6:3;
 assert.equal(d.auxGroups.length*3,batch*2);assert.equal(d.auxGroups[0].connector,'True 1');assert.equal(d.auxGroups.at(-1).connector,'16A CEE Form');
 assert.deepEqual(d.auxGroups.flatMap(g=>g.labels.map(l=>l.top)),Array.from({length:batch*2},(_,n)=>'Aux Out '+(n+1)));
 for(const [mode,sequence] of Object.entries({alternating:[0,1,2,0,1,2],paired:[0,0,1,1,2,2],soca_per_phase:[0,0,0,0,0,0]})){
  d.wayMapping=mode;assert.deepEqual(Array.from({length:6},(_,n)=>D.phaseIndex(d,n)),sequence);
  assert.deepEqual(Array.from({length:12},(_,n)=>D.phaseIndex(d,n,true)),Array.from({length:12},(_,n)=>mode==='paired'?Math.floor(n%6/2):n%3));
  assert.equal(Core.phaseIndex({...d,input:'32A 1ø'},8),0);
 }
}
assert.equal(D.phaseIndex({phasing:'Single Phase'},6),1);assert.equal(D.phaseIndex({phasing:'Single Phase'},6,true),0);
assert.equal(D.phaseIndex({phasing:'Three Phase'},4),1);
for(const mutate of [r=>r.socapexWayMappings.push(r.socapexWayMappings[0]),r=>r.distroType[0].outputs[0].totalCircuits=71,r=>r.distroType[0].outputs[1].phaseSource.reference='missing',r=>r.distroType[0].outputs[0].defaultWayMapping='missing',r=>r.socapexWayMappings[0].mapping.L2.ways=[1,2,5]]){const invalid=copy(raw);mutate(invalid);assert.throws(()=>D.normalise(invalid))}
const a=configured(0,'A'),b=configured(2,'B'),c=configured(2,'C'),e=configured(2,'E');
for(let i=0;i<14;i++)optional(a,'63A 3Ph CEE Form');optional(b,'63A 3Ph CEE Form');
assert.equal(D.outlets(a).length,14);assert.equal(new Set(D.outlets(a).map(o=>o.id)).size,14);assert.equal(D.outlets(a).at(-1).name,'63/3ø Output 14');
b.inputConnector='63A 3Ph CEE Form';c.inputConnector='63A 3Ph CEE Form';e.inputConnector='63A 3Ph CEE Form';
b.feed={distroId:a.id,outletId:D.outlets(a)[0].id,adaptor:false};c.feed={distroId:b.id,outletId:D.outlets(b)[0].id,adaptor:false};e.feed={distroId:a.id,outletId:D.outlets(a)[1].id,adaptor:false};
let all=[a,b,c,e];for(const d of all)assert.equal(D.connectionError(d,d.feed,all),'');
assert.equal(D.rootDistro(c,all),a);assert.match(D.connectionError(a,{distroId:b.id,outletId:D.outlets(b)[0].id},[a,b]),/circular/);
assert.match(D.connectionError(e,b.feed,all),/already/);assert.match(D.connectionError({...b,voltage:'208V'},b.feed,all),/voltages/);
assert.match(D.connectionError({...b,inputConnector:'PowerLock 3P + N + E'},b.feed,all),/adaptor/);
assert.equal(D.connectionError({...b,inputConnector:'PowerLock 3P + N + E'},{...b.feed,adaptor:true},all),'');
assert.match(D.connectionError(b,{...b.feed,outletId:'missing'},all),/missing/);
const own=d=>({p1:{A:1,B:2,C:3,E:4}[d.id],p2:1,p3:2});assert.deepEqual(D.totals(a,all,own),{p1:10,p2:4,p3:8});assert.deepEqual(D.totals(b,all,own),{p1:5,p2:2,p3:4});
assert(Number.isNaN(D.totals(a,all,d=>d===c?{p1:NaN,p2:0,p3:0}:own(d)).p1));
b.input='32A 3ø';assert(D.warnings(b,all,{p1:40,p2:0,p3:0}).some(s=>s.includes('32 A')));
assert.equal(D.rootDistro(c,[e,c,b,a]),a);assert.equal(D.totals(a,[e,c,b,a],own).p1,10);
const cxt=vm.createContext({console,Math,Number,Array,Map,Set,JSON,LampyCore:Core,LampyDistro:D,crypto:require('node:crypto').webcrypto,DEFAULT_FONT:'Georgia',normaliseBlankColour:v=>v||'',defaultColour:()=>'',normaliseRearFormat:v=>v||{},defaultRearFormat:()=>({}),normaliseWayTextFormat:v=>v,projectDefaultVoltage:()=>230,distroCatalogueError:'',distroOptions:catalogue,app:{distros:all,labels:[],socaMeta:[],socaNames:[]},distroDraft:null,distroDraftSupplyId:'',activeSingleDistro:null});
const add=(...names)=>names.forEach(name=>vm.runInContext(source(name),cxt));
add('blankLabel','normaliseLabel','normaliseAuxGroup','blankOutputLabel','normaliseOutputLabel','normaliseOutputGroup','groupedOutputGroups','normaliseRcbo','normaliseDistro','optionDefault','createDistroDraft','escapeHtml','escapeAttr','escapeJsAttr','auxGroupCount','outputLabelCount','distroCatalogueType','distroSelectOptions','distroFeedRoot','distroAssignedSupply','assignedPowerSupplyId','distroFeedValue','distroFeedOptions','distroSettingsMarkup','rcboOptionsMarkup','commitDistroFeed');
cxt.distroTypeForCount=n=>n+' Socapex';let info={powerSupplies:[{id:'supply',name:'Supply',input:'200A 3ø',distros:[0]}],powerAuxSheets:{},powerSheets:{}};cxt.ensureProjectInfo=()=>info;
let roundTrip=cxt.normaliseDistro(copy(a));assert.equal(roundTrip.outputGroups[0].qty,14);assert.deepEqual(copy(D.outlets(roundTrip)),copy(D.outlets(a)));assert.deepEqual(copy(roundTrip.catalogue),copy(a.catalogue));assert.equal(cxt.normaliseDistro(copy(c)).feed.outletId,c.feed.outletId);
const legacy=cxt.normaliseDistro({count:8,type:'Saved Custom',phasing:'Single Phase',outputGroups:[{type:'Custom',qty:12,labels:Array.from({length:12},(_,i)=>({text:'Keep '+i}))}],auxGroups:[{labels:[{top:'Keep'},{},{}]}]});assert.equal(legacy.count,8);assert.equal(legacy.wayMapping,'soca_per_phase');assert.equal(legacy.catalogue,null);assert.equal(legacy.outputGroups[0].labels.length,12);assert.equal(legacy.auxGroups[0].labels[0].top,'Keep');
assert.match(cxt.distroSelectOptions(['PowerLock 3P + N + E'],''),/^<option value="" selected>Select an option<\/option>/);
const savedMeta=copy(a.catalogue);catalogue.distroType[0].weightKg=999;assert.deepEqual(copy(cxt.normaliseDistro(a).catalogue),savedMeta);catalogue.distroType[0].weightKg=149;
// Both panes expose only the approved configuration fields, with catalogue output actions.
for(let i=0;i<5;i++)for(const draft of [false,true]){
 const d=configured(i),before=copy(d),markup=cxt.distroSettingsMarkup(d,draft),attribute=draft?'data-distro-draft':'data-single-distro';
 assert.deepEqual([...markup.matchAll(new RegExp(attribute+'="([^"]+)"','g'))].map(m=>m[1]),['name','type','wayMapping','inputConnector','rcbo']);
 const labels=['Distro Name','Distro Type','Phase Mapping','Input Connector','Include P/Lock Adaptor?','>Supply</label>','>RCBO</label>','Additional Outputs','Aux Out Type','3ø Outs'];
 let previous=-1;for(const label of labels){const position=markup.indexOf(label);assert(position>previous,label);previous=position}
 for(const removed of ['Number of Socapexes','Input Supply','Feed Source','Circuit Voltage','Dimensions','Weight',' × Aux Outlets • ','readonly'])assert(!markup.includes(removed),removed);
 for(const key of ['name','supply','rcbo'])assert(markup.includes('<div class="full"><label for="'+(draft?'newDistro':'editDistro')+'-'+key+'">'));
 const definitions=d.catalogue.type.outputs.filter(o=>o.optional);
 assert.equal((markup.match(/data-distro-add=/g)||[]).length,definitions.length);
 for(const o of definitions)assert(markup.includes(o.phaseSource?'Add '+o.quantity+' Aux Outs':'Add '+o.quantity+' × '+o.connector));
 assert(markup.includes('No Source Assigned'));assert(markup.includes('value="supply:supply"'));assert(markup.includes('value="output:'));
 assert.deepEqual(copy(d),before,'Rendering must preserve hidden settings and outputs');
}
assert(!html.includes('outputQtyCustom'));assert(!html.includes('id="sheetStatus"'));
assert(!source('renderSingleDistroSettings').includes('toggleSingleDistroTableC3'));
assert(source('renderSingleDistroSettings').includes('distroSettingsMarkup(d,false)'));assert(source('renderDistroCards').includes('distroSettingsMarkup(distroDraft,true)'));
assert(html.includes('.distroSettingsLayout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
assert(html.includes('@media(max-width:480px){.distroSettingsLayout{grid-template-columns:minmax(0,1fr)}}'));
assert(cxt.distroSettingsMarkup(configured(4),true).includes('Add 3 Aux Outs'));
assert(!cxt.distroSettingsMarkup(configured(4),true).includes('Add 1 × 125A'));
let saves=0,renders=0,alerts=[];cxt.persist=()=>saves++;cxt.render=()=>renders++;cxt.alert=m=>alerts.push(m);cxt.confirm=()=>true;cxt.ensureSocaData=()=>{};cxt.syncDistroSocapexCounts=(render,save)=>{assert.equal(render,false);assert.equal(save,false)};cxt.closeDistroSettings=()=>{cxt.distroDraft=null};cxt.renderDistroCards=()=>{};
add('saveDistroDraft','reviewedDistroFeed','distroChangeType','updateDistroDraftField','distroConnectionProblems','updateDistroField','removeDistro','removeOutputGroup','powerDistroConfiguration','blankPhaseTotals','addPhaseTotals','powerDistroOwnPhaseTotals','powerSheetPhaseTotals','powerSupplyTotals','powerSupplyWarningEntries','powerSupplyWarningMarkup','formatPhaseAmps','distroCardPhaseTotalsMarkup','supplyCardPhaseTotalsMarkup','phaseTotalsMarkup','powerSupplyCardMarkup','powerPhaseConnectorGraphic','powerPhaseLinkedGroupMarkup','distroTreeMarkup','powerFeedOverview','powerSuppliesMarkup','powerPhaseTotalsOverviewMarkup','powerPdfAssignedSupply','powerPdfDistroSummaryMarkup','preparePowerPdfTotals');
// A visible name edit and final creation retain all hidden catalogue/default data.
const hiddenDraft=cxt.createDistroDraft(),hiddenBefore=copy(hiddenDraft);cxt.distroDraft=hiddenDraft;
cxt.updateDistroDraftField({dataset:{distroDraft:'name'},value:'Renamed draft'});
assert.deepEqual(copy(cxt.distroDraft),{...hiddenBefore,name:'Renamed draft'});
const editBefore=copy(a),editSaves=saves;cxt.updateDistroField(0,{dataset:{distro:'name'},value:'Renamed saved'});
assert.deepEqual(copy(a),{...editBefore,name:'Renamed saved'});assert.equal(saves,editSaves+1);a.name=editBefore.name;saves=0;
const before=copy(cxt.app);cxt.distroDraft=cxt.createDistroDraft();const hiddenSaved=copy(cxt.distroDraft);assert.deepEqual(copy(cxt.app),before);assert.equal(saves,0);assert.equal(cxt.distroDraft.count,12);cxt.distroDraftSupplyId='supply:supply';cxt.saveDistroDraft();assert.equal(saves,1);assert.equal(cxt.app.distros.length,5);for(const key of ['input','voltage','count','catalogue'])assert.deepEqual(copy(cxt.app.distros[4][key]),hiddenSaved[key]);assert(info.powerSupplies[0].distros.includes(4));cxt.saveDistroDraft();assert.equal(saves,1);
cxt.distroCatalogueError='Invalid catalogue';assert.equal(cxt.createDistroDraft(),null);assert(cxt.distroSettingsMarkup(a,false).includes('role="alert"'));cxt.distroCatalogueError='';
cxt.app.distros=all=[a,b,c,e];info.powerSupplies[0].distros=[0];cxt.commitDistroFeed(b,'supply:supply',null);assert.equal(b.feed,null);assert(info.powerSupplies[0].distros.includes(1));b.feed={distroId:a.id,outletId:D.outlets(a)[0].id,adaptor:false};cxt.commitDistroFeed(b,'output:'+a.id+':'+b.feed.outletId,b.feed);assert(!info.powerSupplies[0].distros.includes(1));
cxt.distroRanges=()=>all.map((d,idx)=>({d,idx}));cxt.powerDistroOwnPhaseTotals=r=>own(r.d);assert.deepEqual(copy(cxt.powerSupplyTotals(info.powerSupplies[0],cxt.distroRanges())),{p1:10,p2:4,p3:8});
const live=cxt.powerPhaseTotalsOverviewMarkup(cxt.distroRanges()),pdf=cxt.powerPdfDistroSummaryMarkup(cxt.distroRanges()[2],cxt.distroRanges());for(const text of ['A','B','C','E','63/3ø Output 1','data-power-phase-links="2"']){assert(live.includes(text));assert(pdf.includes(text))}assert(live.includes('data-open-supply'));assert(!pdf.includes('data-open-supply'));assert.equal((pdf.match(/powerPhaseConnectorGraphic/g)||[]).length,3);
cxt.document={createElement:()=>({})};assert.equal(cxt.preparePowerPdfTotals(cxt.distroRanges()).innerHTML,cxt.powerFeedOverview(cxt.distroRanges(),false));
info.powerSupplies=[];assert(cxt.powerPhaseTotalsOverviewMarkup(cxt.distroRanges()).includes('Unassigned Distros'));
let snapshot=copy(a);cxt.confirm=()=>false;assert.equal(cxt.distroChangeType(a,catalogue.distroType[4].value),false);assert.deepEqual(copy(a),snapshot);
cxt.confirm=()=>true;assert(cxt.distroChangeType(a,catalogue.distroType[4].value));assert.equal(a.count,2);assert.equal(b.feed,null);assert.equal(e.feed,null);assert(c.feed);assert.equal(a.outputGroups.length,0);
assert(source('powerPdfDomPdfBytes').includes('.powerFeedLabel,.powerFeedWarning'));assert(source('fitPowerPhaseLinkedGroup').includes(':scope > .powerPhaseConnectorGraphic'));assert(source('fitPowerPhaseLinkedGroup').includes('geometry.height/=scale'));assert(source('fitPowerPhaseLinkedGroups').includes('.reverse()'));
assert(!source('distroChangeType').includes('generated'));assert(!source('saveDistroDraft').includes('syncGeneratedLabelSnapshot'));
console.log('PASS: V51.4 catalogue quantities, mappings, persistent metadata, draft saves, feed graphs, totals, adapters and shared live/PDF trees.');
// Deletion, cancellation, stale selections and actual pane cleanup.
const p1=configured(0,'parent'),p2=configured(2,'child'),p3=configured(2,'grandchild');optional(p1,'63A 3Ph CEE Form');optional(p2,'63A 3Ph CEE Form');p2.inputConnector=p3.inputConnector='63A 3Ph CEE Form';p2.feed={distroId:p1.id,outletId:D.outlets(p1)[0].id};p3.feed={distroId:p2.id,outletId:D.outlets(p2)[0].id};
cxt.app.distros=[p1,p2,p3];all=cxt.app.distros;info.powerSupplies=[];cxt.app.collapsed={soca:new Set(),previews:new Set()};cxt.outputGroup=(d,g)=>d.outputGroups[g];cxt.outputPreviewKey=(d,g)=>d+'_'+g;cxt.closeSingleDistroSettings=()=>{};cxt.cleanupPowerSupplyDistroIndexes=()=>{};cxt.renderSingleDistroSettings=()=>{};
let initial=copy(all),savedBefore=saves;cxt.confirm=()=>false;cxt.removeOutputGroup(0,0);assert.deepEqual(copy(all),initial);assert.equal(saves,savedBefore);
cxt.confirm=()=>true;cxt.removeOutputGroup(0,0);assert.equal(p2.feed,null);assert(p3.feed);assert.equal(saves,savedBefore+1);assert.equal(p2.outputGroups.length,1);
cxt.removeDistro(1);assert.equal(p3.feed,null);assert.equal(cxt.app.distros.length,2);assert.equal(saves,savedBefore+2);
const pane={classList:{remove:()=>{},add:()=>{}}};cxt.$=()=>pane;add('closeDistroSettings');cxt.distroDraft=cxt.createDistroDraft();initial=copy(cxt.app);cxt.closeDistroSettings();assert.equal(cxt.distroDraft,null);assert.deepEqual(copy(cxt.app),initial);assert.equal(saves,savedBefore+2);
cxt.distroDraft=cxt.createDistroDraft();cxt.distroDraft.feed={distroId:'removed',outletId:'removed'};cxt.saveDistroDraft();assert.equal(saves,savedBefore+2);assert(alerts.at(-1).includes('missing'));
// Retain Aux names after deleting an earlier batch and then adding again.
const numbered=configured();optional(numbered,'True 1');optional(numbered,'True 1');numbered.auxGroups.splice(0,2);optional(numbered,'True 1');const names=numbered.auxGroups.flatMap(g=>g.labels.map(l=>l.top));assert.equal(new Set(names).size,names.length);assert.equal(names.at(-1),'Aux Out 18');
// Persisted connections are validated before project loading commits state.
assert.throws(()=>Core.validateProject({distros:[{id:'bad',count:1,feed:{distroId:'missing',outletId:'missing'}}]}),/missing/);
const rootFeed=configured(0,'root'),childFeed=configured(2,'child');optional(rootFeed,'63A 3Ph CEE Form');childFeed.inputConnector='63A 3Ph CEE Form';childFeed.feed={distroId:rootFeed.id,outletId:D.outlets(rootFeed)[0].id};assert.doesNotThrow(()=>Core.validateProject({distros:[rootFeed,childFeed]}));
// Connector positioning uses immediate cards, accounting for a scaled ancestor.
add('powerPhaseConnectorGeometry','fitPowerPhaseLinkedGroup');
function element(){return {attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},toggleAttribute(k,v){if(v)this.attrs[k]='';else delete this.attrs[k]}}}
const supplyLine=element(),trunk=element(),branches=[0,1].map(()=>{const line=element(),arrow=element();return {...element(),line,arrow,querySelector:q=>q==='line'?line:arrow}}),svg={style:{},...element(),querySelector:q=>q.includes('supply-line')?supplyLine:trunk,querySelectorAll:()=>branches};
const cardRect=[{top:110,height:30},{top:150,height:50}],cards=cardRect.map(r=>({matches:()=>false,getBoundingClientRect:()=>r}));
const group={offsetWidth:600,dataset:{},getBoundingClientRect:()=>({top:100,height:110,width:300}),querySelector:q=>q.includes('Graphic')?svg:{getBoundingClientRect:()=>({top:125,height:40})},querySelectorAll:()=>cards};
cxt.fitPowerPhaseLinkedGroup(group);assert.deepEqual(branches.map(b=>b.line.attrs.y1),[50,150]);assert.equal(supplyLine.attrs.y1,90);assert.equal(trunk.attrs.y1,50);assert.equal(trunk.attrs.y2,150);assert.equal(svg.style.height,'220px');
// V51.6 live output deletion reuses the confirmed, feed-aware group removal.
assert(source('powerOutputSheetMarkup').includes('data-power-remove-output="${groupIndex}"'));
assert(source('powerOutputSheetMarkup').includes('data-power-remove-output-index="${index}"'));
assert(source('renderPowerSheetView').includes('removeSingleOutput(range.idx,Number(button.dataset.powerRemoveOutput),Number(button.dataset.powerRemoveOutputIndex))'));
assert(source('preparePowerPdfView').includes("view.querySelectorAll('.powerOutletAction').forEach(cell=>cell.remove())"));
assert(source('bindDistroSettings').includes('preservePowerViewScroll(()=>{if(draft)renderDistroCards()'));
// Simulate the page and pane collapsing during a rebuild and subsequent layout frames.
const frames=[],scrollElement=(parent=null)=>({parentElement:parent,isConnected:true,scrollLeft:3,scrollTop:480,style:{minHeight:''},offsetHeight:900,firstElementChild:{},scrollTo(p){this.scrollLeft=p.left;this.scrollTop=p.top;assert.equal(p.behavior,'instant')}});
const outer=scrollElement(),sheetScroll=scrollElement(outer),paneScroll=scrollElement();let wx=7,wy=800;
const scrollContext=vm.createContext({Map,window:{get scrollX(){return wx},get scrollY(){return wy},scrollTo(p){wx=p.left;wy=p.top;assert.equal(p.behavior,'instant')}},document:{querySelectorAll:()=>[paneScroll]},$:()=>sheetScroll,activeSheetTab:'powerSheet',activePowerDistro:0,requestAnimationFrame:fn=>frames.push(fn),prepareLiveResponsiveTargets:()=>{},fitLiveResponsiveLayouts:()=>{},fitPowerPhaseLinkedGroups:()=>{}});
vm.runInContext(source('preservePowerViewScroll'),scrollContext);
scrollContext.preservePowerViewScroll(()=>{assert.equal(sheetScroll.style.minHeight,'900px');sheetScroll.firstElementChild={};outer.scrollTop=sheetScroll.scrollTop=paneScroll.scrollTop=0;wy=0});
assert.equal(wy,800);assert.equal(wx,7);for(const el of [outer,sheetScroll,paneScroll])assert.equal(el.scrollTop,480);assert.equal(sheetScroll.style.minHeight,'');
while(frames.length){wy=0;frames.shift()();assert.equal(wy,800)}
scrollContext.preservePowerViewScroll(()=>{});scrollContext.activeSheetTab='home';wy=40;frames.shift()();assert.equal(wy,40,'Do not restore a stale page after navigation');
assert.throws(()=>scrollContext.preservePowerViewScroll(()=>{throw Error('Cancelled update')}),/Cancelled/);assert.equal(sheetScroll.style.minHeight,'');
// Inclusion commits once and retains colours, with rendering inside the scroll guard.
let includeSaves=0,includeRenders=0,inGuard=false,retained=0;const includeRows=[{include:false}];
const includeContext=vm.createContext({parseInt,powerAuxRowsForRange:()=>includeRows,retainPowerAuxColourSettings:()=>retained++,persist:()=>includeSaves++,distroRanges:()=>[],preservePowerViewScroll:fn=>{inGuard=true;fn();inGuard=false},renderPowerSheetView:()=>{assert(inGuard);includeRenders++}});
vm.runInContext(source('togglePowerAuxInclude'),includeContext);const includeButton={dataset:{powerAuxInclude:'0'},closest:()=>({})};
includeContext.togglePowerAuxInclude({},includeButton);assert(includeRows[0].include);includeContext.togglePowerAuxInclude({},includeButton);assert(!includeRows[0].include);assert.equal(includeSaves,2);assert.equal(includeRenders,2);assert.equal(retained,2);
console.log('PASS: V51.6 output deletion controls, PDF exclusion, scroll restoration and Include save-once behaviour.');
// V51.7 single-row deletion preserves sibling outlets, labels, identities and feeds.
add('removeSingleOutput','removeAuxGroup','sortedPowerOutputGroups');
const deletionParent=configured(0,'delete-parent'),deletionChild=configured(2,'delete-child'),otherChild=configured(2,'other-child');
for(let i=0;i<3;i++)optional(deletionParent,'63A 3Ph CEE Form');
deletionParent.outputGroups=copy(deletionParent.outputGroups.map(g=>cxt.normaliseOutputGroup(g)));
const outputIds=D.outlets(deletionParent).map(o=>o.id);deletionChild.feed={distroId:deletionParent.id,outletId:outputIds[1]};otherChild.feed={distroId:deletionParent.id,outletId:outputIds[2]};
cxt.app.distros=[deletionParent,deletionChild,otherChild];const siblings=copy(deletionParent.outputGroups[0].labels);let priorSaves=saves;
cxt.confirm=()=>false;cxt.removeSingleOutput(0,0,1);assert.deepEqual(copy(deletionParent.outputGroups[0].labels),siblings);assert.equal(saves,priorSaves);assert(deletionChild.feed);
let prompt='';cxt.confirm=message=>{prompt=message;return true};cxt.removeSingleOutput(0,0,1);
assert(prompt.includes('delete-child'));assert(!prompt.includes('other-child'));assert.equal(deletionChild.feed,null);assert.equal(otherChild.feed.outletId,outputIds[2]);
assert.equal(saves,priorSaves+1);assert.equal(deletionParent.outputGroups[0].qty,2);assert.deepEqual(copy(deletionParent.outputGroups[0].labels),[siblings[0],siblings[2]]);
assert.deepEqual(copy(cxt.normaliseDistro(deletionParent).outputGroups[0].labels),[siblings[0],siblings[2]]);
cxt.removeSingleOutput(0,0,0);assert.equal(deletionParent.outputGroups[0].qty,1);cxt.removeSingleOutput(0,0,0);assert.equal(deletionParent.outputGroups.length,0);assert.equal(otherChild.feed,null);
priorSaves=saves;cxt.removeSingleOutput(0,0,0);assert.equal(saves,priorSaves);
const ordered={outputGroups:[{type:'125/3ø'},{type:'32/3ø'},{type:'Custom'},{type:'63/3ø'},{type:'32/3ø',connector:'32A 3Ph CEE Form'}]},beforeOrder=copy(ordered);
assert.deepEqual(copy(cxt.sortedPowerOutputGroups(ordered).map(o=>o.groupIndex)),[1,4,3,0,2]);assert.deepEqual(ordered,beforeOrder);
// Rendered output order retains original edit/delete indexes; every row has its own action.
const rowContext=vm.createContext({escapeHtml:cxt.escapeHtml,escapeAttr:cxt.escapeAttr,outputGroupCount:d=>d.outputGroups.length,outputGroup:(d,g)=>d.outputGroups[g],powerExtraLabelCellMarkup:()=>'<td>Label</td>',powerExtraColourCellMarkup:()=>'<td>Colours</td>'});
vm.runInContext(source('sortedPowerOutputGroups')+';'+source('powerOutputSheetMarkup'),rowContext);
const rowGroups=beforeOrder.outputGroups.map((g,i)=>({...g,qty:i===0?2:1,labels:Array.from({length:i===0?2:1},()=>({text:'Keep'}))}));
const rowMarkup=rowContext.powerOutputSheetMarkup({idx:0,d:{outputGroups:rowGroups}});
assert.deepEqual([...rowMarkup.matchAll(/data-power-remove-output="(\d+)"/g)].map(m=>Number(m[1])),[1,4,3,0,0,2]);assert.equal((rowMarkup.match(/data-power-remove-output-index=/g)||[]).length,6);
assert(!rowMarkup.includes('output group'));assert(source('powerSheetAuxRowMarkup').includes('rowspan="3"'));assert(source('powerSheetAuxRowMarkup').includes('way===0?'));
assert(source('renderPowerSheetView').includes('removeAuxGroup(range.idx,Number(button.dataset.powerRemoveAux))'));
// Aux group deletion removes only its three load rows and labels, and saves once.
const auxD=configured();optional(auxD,'True 1');optional(auxD,'True 1');cxt.app.distros=[auxD];const auxBefore=copy(auxD.auxGroups),loadRows=Array.from({length:12},(_,i)=>({id:i,include:true,watts:[i]}));
info.powerAuxSheets={'0':copy(loadRows)};cxt.powerSheetKey=()=> '0';cxt.auxPreviewKey=(d,g)=>d+'_'+g;priorSaves=saves;cxt.confirm=()=>false;cxt.removeAuxGroup(0,1);assert.equal(saves,priorSaves);assert.deepEqual(copy(auxD.auxGroups),auxBefore);
cxt.confirm=()=>true;cxt.removeAuxGroup(0,1);assert.equal(saves,priorSaves+1);assert.deepEqual(copy(auxD.auxGroups),[auxBefore[0],...auxBefore.slice(2)]);assert.deepEqual(copy(info.powerAuxSheets['0']),[...loadRows.slice(0,3),...loadRows.slice(6)]);
console.log('PASS: V51.7 per-output deletion, sibling feed retention, rating ordering and three-outlet Aux deletion.');
// Catalogue load failures clear old choices and keep creation disabled.
add('normaliseDistroOptions','loadDistroOptions');cxt.distroDraft=null;cxt.activeSingleDistro=null;cxt.DISTRO_OPTIONS_URL='json/distro_options.json';cxt.$=()=>({textContent:''});cxt.console={warn:()=>{}};cxt.fetchJSONWithFallback=async()=>{throw Error('Unreadable catalogue')};
(async()=>{await cxt.loadDistroOptions();assert.match(cxt.distroCatalogueError,/Unreadable catalogue/);assert.equal(cxt.distroOptions.distroType.length,0);assert.equal(cxt.createDistroDraft(),null);cxt.fetchJSONWithFallback=async()=>raw;await cxt.loadDistroOptions();assert.equal(cxt.distroCatalogueError,'');assert.equal(cxt.createDistroDraft().count,12);console.log('PASS: V51.4 output deletion, draft cancellation, stale feeds, load validation and measured scaled connectors.');})().catch(error=>{console.error(error);process.exitCode=1});
