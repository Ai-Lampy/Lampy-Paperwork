'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){let start=html.indexOf('function '+name+'(');assert(start>=0,name);if(html.slice(start-6,start)==='async ')start-=6;for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
const c=vm.createContext({});
// Patch rebuilds retain geometry before clearing the sheet and after layout frames.
{
 const frames=[],scrollNode=parent=>({parentElement:parent,isConnected:true,scrollLeft:10,scrollTop:540,style:{minHeight:''},offsetHeight:1800,firstElementChild:{},scrollTo(p){this.scrollLeft=p.left;this.scrollTop=p.top}});
 const outer=scrollNode(null),sheet=scrollNode(outer);let x=20,y=950,renders=0;
 const context=vm.createContext({Map,activeSheetTab:'fixturePatch',activePatchSheetId:'master',fixturePatchScrollRendering:false,$:()=>sheet,window:{get scrollX(){return x},get scrollY(){return y},scrollTo(p){x=p.left;y=p.top}},requestAnimationFrame:fn=>frames.push(fn),prepareLiveResponsiveTargets(){},fitLiveResponsiveLayouts(){y=0},render(){assert(context.fixturePatchScrollRendering);assert.equal(sheet.style.minHeight,'1800px');renders++;sheet.firstElementChild={};sheet.scrollTop=outer.scrollTop=0;y=0}});
 vm.runInContext(source('renderFixturePatchKeepingScroll'),context);
 context.renderFixturePatchKeepingScroll();assert.equal(renders,1);assert.equal(y,950);assert.equal(x,20);assert.equal(sheet.scrollTop,540);assert.equal(outer.scrollTop,540);assert.equal(sheet.style.minHeight,'');assert.equal(context.fixturePatchScrollRendering,false);
 while(frames.length){y=0;frames.shift()();assert.equal(y,950)}
 for(const stale of ['route','patch','content']){
  context.activeSheetTab='fixturePatch';context.activePatchSheetId='master';y=950;context.renderFixturePatchKeepingScroll();
  if(stale==='route')context.activeSheetTab='home';if(stale==='patch')context.activePatchSheetId='comparison';if(stale==='content')sheet.firstElementChild={};
  y=42;while(frames.length)frames.shift()();assert.equal(y,42);
 }
 context.render=()=>{throw Error('render failed')};assert.throws(()=>context.renderFixturePatchKeepingScroll(),/render failed/);assert.equal(context.fixturePatchScrollRendering,false);assert.equal(sheet.style.minHeight,'');
 const renderSource=source('render');assert(renderSource.indexOf('renderFixturePatchKeepingScroll()')<renderSource.indexOf('resetResponsiveSheetLayout()'));
 assert(renderSource.includes("activeSheetTab==='fixturePatch'&&!fixturePatchScrollRendering"));assert(renderSource.includes("querySelector('.fixturePatchView')"));
 assert(source('togglePatchGroupLock').includes('render()'));assert(source('updatePatchRowField').includes('render()'));assert(source('confirmPatchAddressReview').includes('render()'));
 console.log('PASS: Fixture Patch lock/edit rebuilds retain window and ancestor scroll through fitting, reject stale restores and clear guards on errors.');
}
// Rack additions retain page and rebuilt panel scroll, including the library filter.
{
 const frames=[],node=()=>({isConnected:true,scrollTop:350,scrollLeft:7,scrollTo(p){this.scrollTop=p.top;this.scrollLeft=p.left}});
 const outer=node(),sheet=Object.assign(node(),{parentElement:outer,style:{minHeight:''},offsetHeight:1600,firstElementChild:{}});
 let panels,search,x=15,y=800,renders=0;
 const rebuild=()=>{panels={'.rackLibraryGroups':node(),'.rackSettingsCard':node()};search={value:''};Object.values(panels).forEach(n=>n.scrollTop=0)};
 rebuild();panels['.rackLibraryGroups'].scrollTop=280;panels['.rackSettingsCard'].scrollTop=120;search.value='node';
 sheet.querySelector=selector=>selector==='.rackLayoutView'?{}:selector==='.rackLibrarySearch'?search:panels[selector];
 const c=vm.createContext({Map,activeSheetTab:'controlNetwork',activeControlNetworkTab:'racks',activeRackTabId:'rack1',$:()=>sheet,window:{get scrollX(){return x},get scrollY(){return y},scrollTo(p){x=p.left;y=p.top}},requestAnimationFrame:fn=>frames.push(fn),filterRackDeviceLibrary(input){assert.equal(input.value,'node')},prepareLiveResponsiveTargets(){},fitLiveResponsiveLayouts(){y=0},render(){renders++;assert.equal(sheet.style.minHeight,'1600px');rebuild();sheet.firstElementChild={};sheet.scrollTop=outer.scrollTop=0;y=0}});
 vm.runInContext(source('renderRackKeepingScroll'),c);c.renderRackKeepingScroll();
 assert.equal(renders,1);assert.equal(y,800);assert.equal(x,15);assert.equal(sheet.scrollTop,350);assert.equal(outer.scrollTop,350);
 assert.equal(panels['.rackLibraryGroups'].scrollTop,280);assert.equal(panels['.rackSettingsCard'].scrollTop,120);assert.equal(search.value,'node');assert.equal(sheet.style.minHeight,'');
 while(frames.length){y=0;frames.shift()();assert.equal(y,800)}
 for(const stale of ['page','group','rack','content']){
  c.activeSheetTab='controlNetwork';c.activeControlNetworkTab='racks';c.activeRackTabId='rack1';y=800;c.renderRackKeepingScroll();
  if(stale==='page')c.activeSheetTab='home';if(stale==='group')c.activeControlNetworkTab='control';if(stale==='rack')c.activeRackTabId='rack2';if(stale==='content')sheet.firstElementChild={};
  y=42;while(frames.length)frames.shift()();assert.equal(y,42);
 }
 c.render=()=>{throw Error('failed')};assert.throws(()=>c.renderRackKeepingScroll(),/failed/);assert.equal(sheet.style.minHeight,'');assert.equal(c.rackScrollRendering,false);
 for(const name of ['addRackLibraryDevice','addCustomRackDevice'])assert(source(name).includes('persist();renderRackKeepingScroll()'));
 assert(source('addRackAccessoryVariant').includes('addRackLibraryDevice('));
 console.log('PASS: rack additions retain page/panel scroll and search, with stale-navigation guards.');
}
// Approved rack layouts fit down only, with widths redistributed by panel/view state.
{
 const c=vm.createContext({});
 for(const name of ['liveResponsiveScaleValue','fitLiveResponsiveHost'])vm.runInContext(source(name),c);
 for(const available of [500,1000,1410,1800]){
  for(const natural of [1437,1431,1400,1788,1417,1406]){
   const target={scrollWidth:natural,offsetWidth:natural,scrollHeight:820,offsetHeight:820,style:{setProperty(){}}};
   const content={firstElementChild:target,style:{},scrollHeight:820};
   const host={clientWidth:available,dataset:{liveScaleKind:'rack',liveScaleFill:'false',liveScaleNatural:String(natural)},style:{},querySelector:()=>content};
   c.fitLiveResponsiveHost(host);
   assert.equal(Number(host.dataset.liveScale),Math.min(1,available/natural));
   assert.equal(host.style.height,Math.ceil(820*Math.min(1,available/natural))+'px');
   assert.equal(content.style.width,natural+'px');
  }
 }
 console.log('PASS: approved rack workspaces fit without enlargement and retain measured heights.');
}
{
 const c=vm.createContext({rackViewFaces:new Map(),rackViewZooms:new Map(),rackClosedPanels:new Map(),activeRackSettingsDeviceId:'',renderRackKeepingScroll(){},escapeAttr:String});
 for(const name of ['rackClosedPanelSet','rackPanelClosed','setRackPanelClosed','setRackView','rackViewFor','rackViewModesMarkup'])vm.runInContext(source(name),c);
 c.setRackPanelClosed('r','library',true);assert.equal(c.rackViewFaces.get('r'),'dual');assert(c.rackPanelClosed('r','library'));
 c.setRackView('r','rear');assert.equal(c.rackViewFor({id:'r'}),'rear');assert(c.rackPanelClosed('r','library'));
 c.setRackPanelClosed('r','settings',true);assert.equal(c.rackViewFaces.get('r'),'dual');
 c.setRackPanelClosed('r','library',false);assert.equal(c.rackViewFaces.get('r'),'dual');
 c.setRackPanelClosed('r','settings',false);assert.equal(c.rackViewFaces.get('r'),'front');
 c.setRackView('r','dual');assert.equal(c.rackViewFor({id:'r'}),'front');assert(c.rackViewModesMarkup({id:'r'}).includes('Dual View'));
 c.rackInventorySummary=()=>'';c.rackViewModesMarkup=()=>'';c.rackDisplayModesMarkup=()=>'';c.rackPanelRestoreMarkup=()=>'';c.rackDeviceLibraryMarkup=()=>'<aside>library</aside>';c.rackSettingsCardMarkup=()=>'<aside>settings</aside>';c.escapeHtml=String;
 c.rackCardMarkup=(rack,face)=>'<section>'+ (face||'single')+'</section>';
 vm.runInContext(source('rackWorkspaceMarkup'),c);
 let markup=c.rackWorkspaceMarkup({id:'r',name:'Rack',units:12});assert(markup.includes('<section>front</section><section>rear</section>'));assert(markup.includes('library'));assert(markup.includes('settings'));
 c.setRackPanelClosed('r','library',true);markup=c.rackWorkspaceMarkup({id:'r'});assert(!markup.includes('<aside>library'));assert(markup.includes('<section>rear'));
 c.setRackView('r','front');assert(c.rackWorkspaceMarkup({id:'r'}).includes('<section>single</section>'));
 for(const [selector,columns] of [['.rackWorkspace.dual','365px 520px 520px 365px'],['.rackWorkspace.dual.libraryClosed','520px 520px 365px'],['.rackWorkspace.dual.settingsClosed','365px 520px 520px'],['.rackWorkspace.dual.libraryClosed.settingsClosed','700px 700px']])assert(html.includes(selector+'{grid-template-columns:'+columns+'}'));
 console.log('PASS: rack panel transitions, explicit view selection, dual markup and approved column widths.');
}
// Device and rack selection must use the same scroll-preserving refresh as additions.
{
 let refreshes=0;
 const c=vm.createContext({activeRackSettingsRackId:'',activeRackSettingsDeviceId:'',suppressRackDeviceClickUntil:0,Date:{now:()=>100},renderRackKeepingScroll(){refreshes++}});
 for(const name of ['selectRackSettings','selectRackDeviceSettings','openRackDeviceFromCanvas'])vm.runInContext(source(name),c);
 c.openRackDeviceFromCanvas('rack','device');assert.equal(refreshes,1);assert.equal(c.activeRackSettingsRackId,'rack');assert.equal(c.activeRackSettingsDeviceId,'device');
 c.selectRackDeviceSettings('rack','rear-device');assert.equal(refreshes,2);assert.equal(c.activeRackSettingsDeviceId,'rear-device');
 c.selectRackSettings('rack');assert.equal(refreshes,3);assert.equal(c.activeRackSettingsDeviceId,'');
 c.suppressRackDeviceClickUntil=200;c.openRackDeviceFromCanvas('rack','device');assert.equal(refreshes,3);assert.equal(c.activeRackSettingsDeviceId,'');
 console.log('PASS: canvas/device-list and rack-settings selection retain scroll; post-drag click suppression remains intact.');
}
// All rack render callers pass the central guard before sheet geometry is cleared.
{
 const guard=source('render').split('scheduleProjectValidation();')[0];
 let protectedRenders=0,ordinaryRenders=0;
 const c=vm.createContext({activeSheetTab:'controlNetwork',activeControlNetworkTab:'racks',rackScrollRendering:false,fixturePatchScrollRendering:false,$:()=>({querySelector:()=>true}),renderRackKeepingScroll(){protectedRenders++},ordinary(){ordinaryRenders++}});
 vm.runInContext(guard+'ordinary()}',c);
 c.render();assert.equal(protectedRenders,1);assert.equal(ordinaryRenders,0);
 c.rackScrollRendering=true;c.render();assert.equal(ordinaryRenders,1);
 c.rackScrollRendering=false;c.activeControlNetworkTab='control';c.render();assert.equal(ordinaryRenders,2);
 c.activeSheetTab='home';c.render();assert.equal(ordinaryRenders,3);
 const renderSource=source('render');assert(renderSource.indexOf('renderRackKeepingScroll()')<renderSource.indexOf('resetResponsiveSheetLayout()'));
}
// Exercise device movement, deletion/cancellation, clearing, zoom and display actions.
{
 let refreshes=0,saves=0,valid=true,confirmed=true;
 const rack={id:'r',name:'Rack',devices:[{id:'d',startU:1,rackSide:'left'}]};
 const c=vm.createContext({app:{controlNetwork:{racks:[rack]}},activeRackSettingsRackId:'r',activeRackSettingsDeviceId:'d',rackDeviceDragState:{rackId:'r',deviceId:'d'},suppressRackDeviceClickUntil:0,rackViewZooms:new Map(),activeRackTabId:'r',render(){refreshes++},persist(){saves++},confirm:()=>confirmed,closeRackEditor(){},rackDragPlacementStart:()=>4,rackDeviceIsHalf:()=>false,rackDeviceFits:()=>({valid,messages:['Occupied']}),clearRackDropTarget(){},alert(){}});
 for(const name of ['dropRackDevice','removeRackDevice','clearRackDevices','setRackDisplayMode','setRackZoom','normaliseRackZoom','fitRackToScreen','setActiveRackTab','setRackShowOppositeSideDevices'])vm.runInContext(source(name),c);
 const event={preventDefault(){},stopPropagation(){},currentTarget:{}};
 c.dropRackDevice(event,'r');assert.equal(rack.devices[0].startU,4);assert.equal(saves,1);assert.equal(refreshes,1);
 valid=false;c.rackDeviceDragState={rackId:'r',deviceId:'d'};c.dropRackDevice(event,'r');assert.equal(saves,1);assert.equal(refreshes,2);
 confirmed=false;c.removeRackDevice('r','d');assert.equal(refreshes,2);assert.equal(rack.devices.length,1);
 confirmed=true;c.removeRackDevice('r','d');assert.equal(refreshes,3);assert.equal(saves,2);assert.equal(rack.devices.length,0);
 rack.devices.push({id:'e'});c.clearRackDevices('r');assert.equal(refreshes,4);assert.equal(saves,3);
 c.setRackDisplayMode('detailed');c.setRackZoom('r',.5);c.fitRackToScreen('r');c.setActiveRackTab('r');c.setRackShowOppositeSideDevices('r',true);assert.equal(refreshes,9);assert.equal(saves,5);
 for(const name of ['saveRack','saveRackSettingsCard','saveRackDeviceSettingsCard','saveRackPortConfiguration','removeRack'])assert(source(name).includes('render()'),name);
 assert(source('clearRackDeviceSelectionFromOutside').includes("scrollTo({left,top,behavior:'instant'})"));
 console.log('PASS: central rack scroll guard covers movement, deletion, clearing, settings and zoom; cancelled actions do not refresh or save.');
}
// Shared protection covers every live page; navigation, focus and newer renders cancel stale restores.
{
 const frames=[],node=parent=>({parentElement:parent,isConnected:true,scrollLeft:12,scrollTop:420,scrollTo(p){this.scrollLeft=p.left;this.scrollTop=p.top}});
 const outer=node(null),sheet=Object.assign(node(outer),{style:{minHeight:''},offsetHeight:1800,firstElementChild:{},dataset:{}}),pane=node(null);
 let x=17,y=900;
 const c=vm.createContext({Map,activeSheetTab:'home',activeProjectTab:'general',rackScrollRendering:false,fixturePatchScrollRendering:false,liveViewScrollRendering:false,liveViewScrollEpoch:0,$:()=>sheet,document:{activeElement:{},querySelectorAll:()=>[pane]},window:{get scrollX(){return x},get scrollY(){return y},scrollTo(p){x=p.left;y=p.top}},requestAnimationFrame:fn=>frames.push(fn),prepareLiveResponsiveTargets(){},fitLiveResponsiveLayouts(){y=0}});
 for(const name of ['liveViewScrollRoute','shouldPreserveLiveViewScroll','preserveLiveViewScroll','cancelLiveViewScrollRestoration'])vm.runInContext(source(name),c);
 const update=()=>{assert(c.liveViewScrollRendering);assert(!c.shouldPreserveLiveViewScroll());sheet.firstElementChild={};sheet.scrollTop=outer.scrollTop=pane.scrollTop=y=0};
 for(const route of ['home','fixturePatch','powerSheet','controlNetwork','deviceConfig','networkEquipment','ipAddresses','universeDetail','positions','projectSettings','looms','errors','distroLabels']){
  c.activeSheetTab=route;sheet.dataset.liveScrollRoute=c.liveViewScrollRoute();y=900;sheet.scrollTop=outer.scrollTop=pane.scrollTop=420;
  assert(c.shouldPreserveLiveViewScroll(),route);c.preserveLiveViewScroll(update);
  assert.equal(y,900);assert.equal(x,17);assert.equal(sheet.scrollTop,420);assert.equal(outer.scrollTop,420);assert.equal(pane.scrollTop,420);
  while(frames.length){y=0;frames.shift()();assert.equal(y,900)}
  assert.equal(sheet.style.minHeight,'');assert.equal(c.liveViewScrollRendering,false);
 }
 for(const stale of ['page','subpage','content','focus','newer','scroll']){
  c.activeSheetTab='projectSettings';c.activeProjectTab='file';y=900;c.preserveLiveViewScroll(update);
  if(stale==='page')c.activeSheetTab='home';if(stale==='subpage')c.activeProjectTab='logo';if(stale==='content')sheet.firstElementChild={};if(stale==='focus')c.document.activeElement={};if(stale==='newer')c.liveViewScrollEpoch++;if(stale==='scroll')c.cancelLiveViewScrollRestoration();
  y=23;while(frames.length)frames.shift()();assert.equal(y,23,stale);
 }
 sheet.dataset.liveScrollRoute='different';assert(!c.shouldPreserveLiveViewScroll());
 assert.throws(()=>c.preserveLiveViewScroll(()=>{throw Error('fail')}),/fail/);assert.equal(c.liveViewScrollRendering,false);assert.equal(sheet.style.minHeight,'');
 for(const name of ['refreshHomeIfActive','renderPowerSheetView','renderProjectSettingsView','renderGeneralSettings','renderExportSettings','renderFileInfo','renderProductionInfo','renderLogoInfo'])assert(source(name).includes('preserveLiveViewScroll'),name);
 for(const name of ['updateDeviceConfigFilter','updateFixturePatchSearch','updatePatchImportMatchFilter'])assert(source(name).includes('focus({preventScroll:true})'),name);
 assert(source('navigateFromAppFooter').includes('cancelLiveViewScrollRestoration();window.scrollTo({top:0'));
 assert(source('focusProjectErrorTarget').includes('cancelLiveViewScrollRestoration()'));
 assert(source('attachEvents').includes("['wheel','touchstart','pointerdown','keydown']"));
 assert(source('focusFixturePickerButton').includes('scrollIntoView'));
 console.log('PASS: all live page routes retain scroll; stale page/subpage/content/focus/frame restores are rejected; deliberate navigation remains.');
}
{
 const c=vm.createContext({activeSheetTab:'powerSheet',shouldPreserveLiveViewScroll(){throw Error('inactive Home must not restore scroll')}});
 vm.runInContext(source('refreshHomeIfActive'),c);c.refreshHomeIfActive();
}
for(const name of ['applicationTitlePlacement','fixtureNameMode','attachUniverseGridEvents'])vm.runInContext(source(name),c);
// The title remains centred in the available gap, even with unequal logos/sidebar widths.
for(const left of [0,60,200,350])for(const width of [100,300,1000]){
 const result=c.applicationTitlePlacement(left,width,1500,200);
 assert.equal(result.offset+result.width/2,width/2);
 assert(result.offset>=0&&result.offset+result.width<=width);
}
assert(!source('renderHomeView').includes('>Project Info</button>'));
assert(source('renderHomeView').includes("'Edit Home'"));
const display={power:'short',fanOut:'full',labels:'full',patch:'full'};
c.ensureProjectInfo=()=>({fixtureNameDisplay:display});
assert.equal(c.fixtureNameMode('fanOut'),'short');assert.equal(c.fixtureNameMode('labels'),'short');assert.equal(c.fixtureNameMode('patch'),'full');
display.power='full';display.fanOut='short';assert.equal(c.fixtureNameMode('fanOut'),'full');
assert(!source('powerSheetToolbarMarkup').includes("fixtureNameModeControl('fanOut')"));
assert(!html.includes('function powerSubTabsMarkup('));
assert(html.includes('.fanOutTable th,.fanOutTable td{border:1px solid #d4d4d4;'));
const callbacks={},cells=['a','a','a','b','b'].map(id=>({dataset:{universeFixture:id},highlight:false,classList:{toggle(name,on){assert.equal(name,'universeFootprintHover');this.cell.highlight=on}},closest(){return this}}));
cells.forEach(cell=>cell.classList.cell=cell);
const grid={addEventListener(name,fn){(callbacks[name]??=[]).push(fn)},querySelectorAll:()=>cells};
c.$=()=>null;c.attachUniverseGridEvents({querySelector:()=>grid});
callbacks.pointerover[0]({target:cells[1]});assert.deepEqual(cells.map(cell=>cell.highlight),[true,true,true,false,false]);
callbacks.pointerover[0]({target:cells[3]});assert.deepEqual(cells.map(cell=>cell.highlight),[false,false,false,true,true]);
callbacks.pointerleave[0]();assert(cells.every(cell=>!cell.highlight));
callbacks.focusin[0]({target:cells[0]});assert.deepEqual(cells.map(cell=>cell.highlight),[true,true,true,false,false]);
callbacks.focusout[0]({relatedTarget:null});assert(cells.every(cell=>!cell.highlight));
const universe=source('renderUniverseDetailView');
assert(!universe.includes('universeDetailToolbar'));assert(!universe.includes('fixturePatchSubTabsMarkup'));
assert(universe.includes('universeCountStat'));assert(universe.includes('moveSelectedUniverse()'));assert(universe.includes('moveActiveUniverse()'));
console.log('PASS: global Home centring, shared Fan Out name mode, and full-footprint hover/focus.');
// Live width allocation fills spare space without widening fixed columns or changing PDF widths.
vm.runInContext(source('expandLivePatchColumns'),c);
for(const space of [400,900,1800]){
 const widths=[34,100,100,70],settings=[{fixed:34},{},{},{fixed:70}];
 c.expandLivePatchColumns(widths,['fixId','fixture','mode','address'],settings,[34,220,160,70],space);
 assert.equal(widths[0],34);assert.equal(widths[3],70);assert(Math.abs(widths.reduce((a,b)=>a+b)-space)<.001);assert(widths[1]>widths[2]);
}
const wrapped=[100,100,70];c.expandLivePatchColumns(wrapped,['notes','position','address'],[{},{},{fixed:70}],[300,100,70],700);assert.deepEqual(wrapped,[530,100,70]);
assert(source('applyPatchTableColumnWidths').includes("!table.closest('.exportPage,.pdfPageStage')"));
assert(source('scheduleResponsiveSheetLayout').includes('applyPatchTableColumnWidths'));
const payloadContext=vm.createContext({VERSION:'54',app:{labels:[],socaNames:[],socaMeta:[],distros:[],looms:[],fixturePatch:[],patchSheets:[],gdtfFiles:{},gdtfMatches:{},controlNetwork:{},collapsed:{soca:[],previews:[],distros:[]}},activePatchSheetId:'master',fixturePatchViewOptions:{columns:{mode:false},universeAddress:{enabled:true,separator:' . '}},syncPositionsFromPatch(){},normaliseGdtfFiles:x=>x,normaliseLooms:x=>x,ensureProjectInfo:()=>({}),normalisePatchSheets:x=>x,normaliseGdtfMatches:x=>x,normaliseControlNetwork:x=>x,normalisePatchViewOptions:x=>x});
vm.runInContext(source('appPayload'),payloadContext);
const payload=JSON.parse(JSON.stringify(payloadContext.appPayload()));assert.equal(payload.fixturePatchViewOptions.columns.mode,false);assert.equal(payload.fixturePatchViewOptions.universeAddress.separator,' . ');
assert(source('loadProjectPayload').includes('normalisePatchViewOptions(data?.fixturePatchViewOptions||source.fixturePatchViewOptions)'));
vm.runInContext(source('validPatchSeparator'),c);vm.runInContext(source('normalisePatchUniverseAddress'),c);
assert.equal(c.normalisePatchUniverseAddress().separator,' . ');assert.equal(c.normalisePatchUniverseAddress({separator:' / '}).separator,' / ');
assert(!source('renderPatchColumnsModal').includes('patchUniverseAddressControls()'));assert(source('patchControlsMarkup').includes('patchUniverseAddressControls()'));
assert(source('patchUniverseAddressControls').includes('aria-pressed'));
// Custom production fields preserve identifiers across renaming, saving and visibility changes.
let saves=0,refreshes=0,productionRenders=0,answer='Stage Manager';
const project={production:{},productionVisible:{},productionContacts:{},customProductionFields:[]};
const prod=vm.createContext({document:{querySelector:()=>({focus(){}})},ensureProjectInfo:()=>project,productionFieldDefs:[],formatDisplayDate:value=>value||'',prompt:()=>answer,loomId:()=> 'production_stable',persist(){saves++},renderProductionInfo(){productionRenders++},refreshHomeIfActive(){refreshes++},renderExportSettings(){},refreshOpenPdfPreview(){},escapeHtml:String});
for(const name of ['normaliseCustomProductionFields','allProductionFieldDefs','refreshProductionLinkedViews','addCustomProductionField','renameCustomProductionField','productionHeroItem','productionContactHeroMarkup','updateProjectProductionVisibility','pdfLinkedFieldDefinitions','pdfLinkedTemplateValues','pdfProductionContactFields'])vm.runInContext(source(name),prod);
prod.addCustomProductionField();assert.equal(saves,1);assert.equal(project.customProductionFields[0].id,'production_stable');assert.equal(project.productionVisible.production_stable,true);
project.production.production_stable='Alice';prod.renameCustomProductionField({dataset:{productionName:'production_stable'},value:'Stage Lead'});assert.equal(productionRenders,2);assert.equal(project.customProductionFields[0].id,'production_stable');assert.equal(prod.pdfLinkedTemplateValues()['production.production_stable'],'Alice');
assert(prod.productionHeroItem('production_stable','Stage Lead').includes('Alice'));
prod.updateProjectProductionVisibility({dataset:{projectProductionVisible:'production_stable'},getAttribute:()=> 'true',setAttribute(){}});assert.equal(prod.productionHeroItem('production_stable','Stage Lead'),'');assert.equal(project.production.production_stable,'Alice');
const restored=JSON.parse(JSON.stringify(project));assert.equal(prod.normaliseCustomProductionFields(restored.customProductionFields)[0].id,'production_stable');
assert.equal(project.customProductionFields.length,1);assert(!source('addCustomProductionField').includes('prompt('));
assert(source('normaliseProjectInfo').includes('normaliseCustomProductionFields(info.customProductionFields)'));
const exportsMarkup=source('renderExportSettings');assert(exportsMarkup.indexOf('projectSettingsPdfPreview')<exportsMarkup.indexOf('<summary>Remaining-page Header'));
assert(!exportsMarkup.includes('Remaining-page headers use the Footer font'));
assert(!exportsMarkup.slice(exportsMarkup.indexOf('<summary>Footer')).includes('Field not listed?'));
assert(source('settingsFirstHeaderPreview').includes('appendExportLogo(sample,0,ensureProjectInfo().exportLogos)'));assert(source('settingsFirstHeaderPreview').includes('applyPdfProjectSettings(sample,true)'));assert(!source('settingsFirstHeaderPreview').includes('pdfPageFooterMarkup'));
assert(html.includes('#projectSettingsPdfPreview{width:100%;max-width:100%}'));
console.log('PASS: patch persistence/width priorities, merge defaults, custom production identity/visibility and shared header-only previews.');

const samples=[{parentElement:{clientWidth:130,style:{}},scrollHeight:120,style:{}},{parentElement:{clientWidth:600,style:{}},scrollHeight:180,style:{}}];
const preview=vm.createContext({document:{querySelectorAll:()=>samples}});vm.runInContext(source('fitProjectSettingsHeaderSamples'),preview);preview.fitProjectSettingsHeaderSamples();samples.forEach(sample=>{assert.equal(sample.style.transform,'none');assert.equal(sample.style.width,'100%');assert.equal(sample.parentElement.style.height,'auto')});

// Logo replacement/removal refreshes both settings and open export previews.
(async()=>{
 let persisted=0,settings=0,exports=0,logos=0;
 const project={logo:{},secondaryLogo:{},exportLogos:{},logoVisibility:{secondary:true}};
 const context=vm.createContext({ensureProjectInfo:()=>project,activeSheetTab:'projectSettings',persist(){persisted++},renderLogoInfo(){logos++},renderExportSettings(){settings++},refreshOpenPdfPreview(){exports++},updateTourLogoSlot(){},updateProjectHeaderLogos(){},refreshHomeIfActive(){},compactUploadedLogo:async file=>({name:file.name,dataUrl:'data:image/png;base64,new'}),alert(message){throw Error(message)},console});
 for(const name of ['handleTourLogoUpload','removeTourLogo','handleSecondaryLogoUpload','removeSecondaryLogo'])vm.runInContext(source(name),context);
 await context.handleTourLogoUpload({target:{files:[{name:'tour.png',type:'image/png'}]}});
 assert.equal(project.logo.name,'tour.png');assert.equal(settings,1);assert.equal(exports,1);
 context.removeTourLogo();assert.equal(project.logo.dataUrl,'');assert.equal(settings,2);assert.equal(exports,2);
 await context.handleSecondaryLogoUpload({target:{files:[{name:'personal.png',type:'image/png'}]}});
 assert.equal(project.secondaryLogo.name,'personal.png');assert.equal(settings,3);assert.equal(exports,3);
 context.removeSecondaryLogo();assert.equal(project.secondaryLogo.dataUrl,'');assert.equal(project.logoVisibility.secondary,false);
 assert.equal(settings,4);assert.equal(exports,4);assert.equal(logos,4);assert.equal(persisted,4);
 console.log('PASS: logo upload/removal refreshes settings and open export previews.');
})().catch(error=>{console.error(error);process.exitCode=1});
assert(source('renderProductionInfo').includes('onchange="renameCustomProductionField(this)"'));

// Settings icons must all be distinct, including actual SVG artwork.
const sidebar=require('../js/app-sidebar.js'),sections=['Project Settings','Project Info','Production Contacts','Lighting Vendor','Logos','Exports'];
assert.equal(new Set(sections.map(label=>sidebar.subPageIcon('home',label))).size,6);
assert.equal(new Set(sections.map(label=>sidebar.iconMarkup(sidebar.subPageIcon('home',label)))).size,6);
assert(source('projectCustomFieldsMarkup').includes('Custom fields for Project Information'));
assert(!source('patchUniverseAddressControls').includes('<input'));
assert(!source('patchUniverseAddressControls').includes('Example:'));
assert(source('renderProductionInfo').includes('Job Title'));assert(source('renderProductionInfo').includes('Add New Contact'));
// Reorder standard and custom contacts together without changing identities or values.
const orderProject={production:{a:'Alice',b:'Bob',production_c:'Chris'},productionOrder:[]};let orderSaves=0;
const order=vm.createContext({ensureProjectInfo:()=>orderProject,allProductionFieldDefs:()=>[['a','Manager'],['b','Designer'],['production_c','Stage Lead'],['lightingVendor','Vendor']],refreshProductionLinkedViews(){orderSaves++},renderProductionOrderPane(){}});
for(const name of ['orderedProductionFields','moveProductionContact'])vm.runInContext(source(name),order);
order.moveProductionContact('production_c','a');assert.deepEqual(Array.from(orderProject.productionOrder),['production_c','a','b']);
order.moveProductionContact('production_c',1);assert.deepEqual(Array.from(orderProject.productionOrder),['a','production_c','b']);
order.moveProductionContact('a',-1);assert.equal(orderSaves,2);assert.equal(orderProject.production.production_c,'Chris');
orderProject.productionOrder=JSON.parse(JSON.stringify(orderProject.productionOrder));assert.deepEqual(Array.from(order.orderedProductionFields(),item=>item[0]),['a','production_c','b']);
assert(source('normaliseProjectInfo').includes('base.productionOrder='));
vm.runInContext(source('universeViewerCellMarkup'),c);c.escapeHtml=String;c.escapeAttr=String;
const footprint=c.universeViewerCellMarkup(1,new Map([[1,{id:'fixture',fixId:1,fixture:'Spot',mode:'Extended',location:'Truss',address:1,channels:10}]]),1);
assert(footprint.includes('Spot · Extended · Truss'));
console.log('PASS: V54.1 distinct settings icons, inline contacts, saved reordering, merge-only control and universe details.');

// Custom-contact deletion is confirmed, scoped and saved once.
let allowDelete=false,deletionSaves=0;
const deletionProject={customProductionFields:[{id:'production_a',name:'Stage'},{id:'production_b',name:'Rigging'}],production:{production_a:'Alice',production_b:'Bob'},productionVisible:{production_a:true,production_b:false},productionContacts:{production_a:[{id:'email_a'}],production_b:[{id:'phone_b'}]},productionOrder:['production_b','production_a']};
const deletion=vm.createContext({ensureProjectInfo:()=>deletionProject,confirm:()=>allowDelete,refreshProductionLinkedViews(){deletionSaves++},renderProductionOrderPane(){}});vm.runInContext(source('removeCustomProductionField'),deletion);
const beforeDeletion=JSON.stringify(deletionProject);deletion.removeCustomProductionField('production_a');assert.equal(JSON.stringify(deletionProject),beforeDeletion);assert.equal(deletionSaves,0);
allowDelete=true;deletion.removeCustomProductionField('production_a');assert.equal(deletionSaves,1);assert.equal(deletionProject.production.production_b,'Bob');assert.equal(deletionProject.productionVisible.production_b,false);assert.equal(deletionProject.productionContacts.production_b[0].id,'phone_b');assert.deepEqual(deletionProject.productionOrder,['production_b']);assert(!('production_a' in deletionProject.production));deletion.removeCustomProductionField('production_a');assert.equal(deletionSaves,1);
assert(source('renderProductionInfo').includes('custom&&!String(label).trim()'));
assert(source('renderSheetTabMenus').includes("toggle.className='appNavigationDisclosure projectSettingsDisclosure'"));
assert(source('renderSheetTabMenus').includes("toggle.setAttribute('aria-expanded',String(projectSettingsNavExpanded))"));
assert(html.includes('.pdfUnifiedHeader{align-items:center}'));
console.log('PASS: V54.2 contact deletion/cancellation, completed titles, centred logos and settings disclosure.');
// Build and operate the actual nested settings disclosure without a browser.
function navNode(){return {children:[],dataset:{},attrs:{},classList:{contains:()=>true,add(){}},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},addEventListener(){},querySelector(){return null},appendChild(node){if(node.parentElement){const siblings=node.parentElement.children;siblings.splice(siblings.indexOf(node),1)}this.children.push(node);node.parentElement=this;return node},append(...nodes){nodes.forEach(node=>this.appendChild(node))},get firstElementChild(){return this.children[0]},get nextSibling(){const siblings=this.parentElement?.children||[];return siblings[siblings.indexOf(this)+1]}}}
const navHost=navNode(),navButton=navNode();navButton.dataset.sheetTab='home';navHost.appendChild(navButton);
const navContext=vm.createContext({document:{querySelectorAll:()=>[navButton],createElement:navNode},activeSheetTab:'home',projectSettingsNavExpanded:true,closeSheetSubMenus(){},sheetSubMenuRoutes:()=>['Project Settings','Project Info','Production Contacts','Lighting Vendor','Logos','Exports'].map((label,i)=>({label,active:i===0,run(){}}))});
vm.runInContext(source('renderSheetTabMenus'),navContext);navContext.renderSheetTabMenus();
const navMenu=navHost.children[1],navGroup=navMenu.children[0],navToggle=navGroup.children[1],navChildren=navGroup.children[2];
assert.equal(navGroup.children[0].textContent,'Project Settings');assert.equal(navChildren.children.length,5);assert.equal(navToggle.attrs['aria-expanded'],'true');assert.equal(navChildren.hidden,false);navToggle.onclick();assert.equal(navChildren.hidden,true);assert.equal(navToggle.attrs['aria-expanded'],'false');navToggle.onclick();assert.equal(navChildren.hidden,false);
// Home personnel consume the same saved order as Production Contacts.
const homeProject={production:{tourManager:'Alice',lightingDesigner:'Bob',production_stage:'Chris',lightingVendor:'Vendor'},productionVisible:{tourManager:true,lightingDesigner:true,production_stage:true,lightingVendor:true},productionContacts:{production_stage:[{id:'child',type:'email',value:'chris@example.test',visible:true}]},customProductionFields:[{id:'production_stage',name:'Stage Manager'}],productionOrder:['production_stage','lightingDesigner','tourManager']};
const homeOrder=vm.createContext({ensureProjectInfo:()=>homeProject,productionFieldDefs:[['tourManager','Tour Manager'],['lightingDesigner','Lighting Designer'],['lightingVendor','Lighting Vendor']],escapeHtml:String});
for(const name of ['allProductionFieldDefs','orderedProductionFields','productionContactHeroMarkup','productionHeroItem','productionHeroLine','productionHeroMarkup'])vm.runInContext(source(name),homeOrder);
function assertHomeOrder(names){const output=homeOrder.productionHeroMarkup();let last=-1;for(const name of names){const at=output.indexOf(name);assert(at>last,`${name} must follow the saved order`);last=at}return output}
assertHomeOrder(['Chris','chris@example.test','Bob','Alice','Vendor']);
homeProject.productionVisible.lightingDesigner=false;assert(!assertHomeOrder(['Chris','Alice','Vendor']).includes('Bob'));
homeProject.productionOrder=['tourManager','production_stage','lightingDesigner'];assertHomeOrder(['Alice','Chris','Vendor']);
homeProject.productionOrder=JSON.parse(JSON.stringify(homeProject.productionOrder));assertHomeOrder(['Alice','Chris','Vendor']);
homeProject.productionOrder=[];homeProject.productionVisible.lightingDesigner=true;assertHomeOrder(['Alice','Bob','Chris','Vendor']);
console.log('PASS: Home follows saved/default contact order, respects visibility and keeps child details with their contact.');
// Device Config reserves the rendered space for all four octets, even at narrow widths.
{
 const c=vm.createContext({getComputedStyle:n=>n.style||{}});
 for(const name of ['deviceConfigColumnLimits','calculateDeviceConfigWidths','deviceConfigSegmentedWidth'])vm.runInContext(source(name),c);
 const inputs=['255','255','255','255'].map(value=>({value,style:{paddingLeft:'1px',paddingRight:'1px',borderLeftWidth:'0px',borderRightWidth:'0px'}}));
 const segmented={style:{columnGap:'1px'},querySelectorAll:()=>inputs};
 const cell={style:{paddingLeft:'5px',paddingRight:'5px',borderLeftWidth:'1px',borderRightWidth:'1px'},querySelector:()=>segmented};
 const measure=text=>text.length*8;
 assert.equal(c.deviceConfigSegmentedWidth(cell,measure),148);
 inputs.forEach(input=>input.value='');assert.equal(c.deviceConfigSegmentedWidth(cell,measure),148);
 inputs[0].value='888';assert.equal(c.deviceConfigSegmentedWidth(cell,text=>text==='888'?30:measure(text)),172);
 assert.equal(c.deviceConfigSegmentedWidth({querySelector:()=>null},measure),0);
 const keys=['status','name','ip','subnet','delete'];
 for(const available of [250,500,1410]){
  const widths=c.calculateDeviceConfigWidths([20,130,148,172,34],available,false,[],false,keys);
  assert.equal(widths[0],20);assert.equal(widths[4],34);assert(widths[2]>=148);assert(widths[3]>=172);
  if(available===1410)assert(Math.abs(widths.reduce((a,b)=>a+b,0)-available)<.001);
 }
 const hidden=c.calculateDeviceConfigWidths([20,130,148,172,34],250,false,[false,false,true,false,false],true,keys);assert.equal(hidden[2],0);assert(hidden[3]>=172);
 assert.equal(c.deviceConfigColumnLimits(5,true,false,'ip').max,110);
 assert(source('measureDeviceConfigTable').includes("table.dataset.tableView==='deviceConfig'?deviceConfigSegmentedWidth"));
 assert(html.includes('.deviceConfigView .deviceConfigTable .ipSegmentedField{display:grid;width:100%'));
 assert(html.includes('.deviceConfigView .deviceConfigTable .ipSegmentedField input{width:100%!important;min-width:0;box-sizing:border-box}'));
 console.log('PASS: Device Config octet sizing retains readable IP/Subnet widths, fixed action columns and independent Control behaviour.');
}
// Shared device catalogue shape must still load as NPUs, with usable Network table ports.
{
 const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../json/grandMA_NPU.json'),'utf8'));
 const pathway=JSON.parse(fs.readFileSync(path.join(__dirname,'../json/rack_devices/pathway.json'),'utf8'));
 assert.equal(raw.schemaVersion,pathway.schemaVersion);assert.equal(raw.devices.length,4);assert(!Object.hasOwn(raw,'npus'));
 const c=vm.createContext({});
 for(const name of ['normaliseAssetPath','normaliseRackU','normaliseUniverseLimits','normaliseControlSoftwareModes','normaliseReferencePortDirections','referencePortDirectionText','networkPortDetailText','networkReferencePortDetails','normaliseNetworkPower','normaliseNetworkDimensions','normaliseNpuReference','referencePortIsNetwork','connectorDefaultDirection','referencePortPhysicalLabel','deviceConfigPortDefinitions'])vm.runInContext(source(name),c);
 const normalized=c.normaliseNpuReference(raw).npus;
 assert.deepEqual(Array.from(normalized,n=>n.id),['ma-npu-m','ma-npu-l','ma-npu-xl','ma-npu']);
 for(const [index,ref] of normalized.entries()){
  const original=raw.devices[index];
  assert.deepEqual(JSON.parse(JSON.stringify(ref.dimensionsMm)),original.dimensionsMm);
  assert.equal(ref.weightKg,original.weightKg);assert.equal(ref.U,original.rack.heightU);
  assert.deepEqual(Array.from(ref.softwareModes,m=>m.parameterCount),index===0?[4096,4096]:index===1?[4096,8192]:index===2?[4096,16384]:[4096]);
  original.ports.forEach(port=>{assert.equal(typeof port.direction,'string');assert(!Object.hasOwn(port,'directions'))});
  const ports=c.deviceConfigPortDefinitions({source:'npu'},{},ref);
  const dmx=ports.filter(p=>p.category==='dmx'),network=ports.filter(p=>p.category==='network');
  assert.equal(dmx.length,8);assert.equal(network.length,index===3?1:2);
  assert(dmx.every(p=>p.direction==='output'&&!p.directionLocked));
  assert(network.every(p=>p.direction==='network'&&p.directionLocked));
  assert(ports.every(p=>p.facing==='rear'));assert.equal(new Set(ports.map(p=>p.id)).size,ports.length);
  assert(!ports.some(p=>/USB/.test(p.type)));
 }
 for(const key of ['npus','processingUnits']){
  const legacy=c.normaliseNpuReference({manufacturer:raw.manufacturer,[key]:raw.devices}).npus;
  assert.equal(JSON.stringify(legacy),JSON.stringify(normalized));
 }
 console.log('PASS: shared NPU catalogue, legacy loaders, preserved capacities and Network table DMX/Ethernet ports.');
}
