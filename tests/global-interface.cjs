'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){let start=html.indexOf('function '+name+'(');assert(start>=0,name);if(html.slice(start-6,start)==='async ')start-=6;for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
const c=vm.createContext({});
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
const sidebar=require('../js/app-sidebar.js'),sections=['General','Project Info','Production Contacts','Lighting Vendor','Logos','Exports'];
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
