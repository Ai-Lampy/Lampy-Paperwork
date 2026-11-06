'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
const row={manufacturer:'Test',fixture:'Spot',mode:'Full',channels:10,fixId:'1',universe:'2',address:'12'};
const c=vm.createContext({VERSION:'test',console,app:{gdtfFiles:{}},patchFixtureRows:()=>[row],base64ToBytes:v=>Buffer.from(v,'base64'),patchImportState:{},patchUndoEpoch:0});
for(const name of ['mvrGdtfForRow','fixturePatchMvrFiles','fixturePatchMvrXml','mvrUuid','mvrUuidValue','mvrXmlEscape','mvrAbsoluteAddress','normaliseGdtfFiles','storeGdtfsFromZipEntries','normalisePatchMode','modeChannels','modeParameters','normaliseImportMatch','fixtureModeKey','fixtureInfoStoredSource','loadFixtureInfoDefinition'])vm.runInContext(source(name),c);
c.mvrSafeGeometryXml=()=>'';c.fixtureInfoDefinitionCache=new Map();c.fixtureInfoModes=[];
(async()=>{
 let files=c.fixturePatchMvrFiles();assert.equal(files.length,1);assert(!files[0].data.includes('<GDTFSpec>'));assert(files[0].data.includes('manufacturer="Test" fixture="Spot" mode="Full" channels="10"'));assert.equal(row.mvrUuid,undefined,'export must not mutate patch');
 const bytes=Buffer.from([0,1,127,128,255]),name='fixture.gdtf';Object.assign(row,{gdtfSpec:name,gdtfMode:'Raw Full'});
 c.app.gdtfFiles[name]={fileName:name,origin:'',modes:[{name:'Raw Full',channels:10}],base64:bytes.toString('base64')};assert.equal(c.fixturePatchMvrFiles().length,1,'untrusted/old standalone archives are not exported');
 c.app.gdtfFiles[name].origin='imported-mvr';c.app.gdtfFiles=c.normaliseGdtfFiles(JSON.parse(JSON.stringify(c.app.gdtfFiles)));
 files=c.fixturePatchMvrFiles();assert.equal(files.length,2);assert.equal(files[1].name,name);assert.deepEqual(files[1].data,bytes);assert(files[0].data.includes('<GDTFSpec>fixture.gdtf</GDTFSpec><GDTFMode>Raw Full</GDTFMode>'));
 assert.equal(c.fixturePatchMvrFiles(false).length,1);row.channels=11;assert.equal(c.fixturePatchMvrFiles().length,1);row.channels=10;
 // Same-name imports retain both binary versions and retain their original name.
 c.app.gdtfFiles[name].sha256='old';c.parseGdtfFileBytes=async()=>({fileName:name,sha256:'new',modes:[{name:'Raw Full',channels:10}],base64:'AQ=='});
 c.capturePatchUndoAssets=()=>JSON.parse(JSON.stringify({gdtfFiles:c.app.gdtfFiles}));c.storeGdtfFile=file=>{c.app.gdtfFiles[file.fileName]=file};
 const imported=await c.storeGdtfsFromZipEntries({[name]:Buffer.from([1])});assert.equal(imported[0].fileName,'fixture-new.gdtf');assert.equal(imported[0].originalFileName,name);assert.equal(imported[0].origin,'imported-mvr');assert.equal(c.app.gdtfFiles[name].sha256,'old');assert.equal(c.patchImportState.assetChanges.length,1);
 // Fixture Information requests stored JSON only, and uses standalone artwork.
 const fixture=JSON.parse(fs.readFileSync(path.join(root,'json/fixtures/fine-art.json'))).fixtures.find(f=>f.fixture==='FINE 407 WASH');
 c.repositoryFixturePatchReference={manufacturers:{'Fine Art':[fixture]}};c.fixtureInfoLibraryEntry=()=>fixture;c.fixtureOverrideFor=()=>null;c.fixtureInfoMetadataSource=()=>({});let requested=[];
 c.fetchJSONWithFallback=async file=>{requested.push(file);return JSON.parse(fs.readFileSync(path.join(root,file)))};
 const info=await c.fixtureInfoStoredSource({manufacturer:'Fine Art',fixture:fixture.fixture,mode:'STND',channels:20});assert.equal(info.watts,330);assert.equal(info.weight,6.8);assert.equal(info.image,fixture.image);assert.equal(info.detail.modes[0].channels,20);assert.deepEqual(requested,[fixture.details]);
 await c.fixtureInfoStoredSource({manufacturer:'Fine Art',fixture:fixture.fixture,mode:'STND',channels:20});assert.equal(requested.length,1,'reopening reuses the loaded definition');
 c.fixtureInfoDefinitionCache.clear();requested=[];
 const preview=await c.fixtureInfoStoredSource({manufacturer:'Fine Art',fixture:fixture.fixture,mode:'STND',channels:20},false);assert.equal(requested.length,0,'metadata and image do not wait for detail downloads');assert.equal(preview.image,fixture.image);assert.equal(preview.detail.modes[0].loading,true);
 let release;let fetches=0;c.fetchJSONWithFallback=()=>{fetches++;return new Promise(resolve=>{release=resolve})};const one=c.loadFixtureInfoDefinition('shared.json'),two=c.loadFixtureInfoDefinition('shared.json');assert.equal(fetches,1,'concurrent views share one request');release(info.detail);assert.equal(await one,await two);
 c.fetchJSONWithFallback=async()=>{throw Error('offline')};await assert.rejects(c.loadFixtureInfoDefinition('retry.json'),/offline/);assert(!c.fixtureInfoDefinitionCache.has('retry.json'),'a failed request can be retried');c.fetchJSONWithFallback=async()=>info.detail;assert.equal(await c.loadFixtureInfoDefinition('retry.json'),info.detail);
 const host={innerHTML:''};c.$=()=>host;c.escapeHtml=String;c.escapeAttr=String;c.fixtureProductPageUrl=()=>'';c.fixtureInfoHeroMarkup=(name,identity,source,media)=>media;c.gdtfModePanelMarkup=()=>'';vm.runInContext(source('renderGdtfFixtureInfo'),c);c.renderGdtfFixtureInfo(info.detail,info);assert(host.innerHTML.includes(info.image));assert(host.innerHTML.includes('20 Ch'));assert(!host.innerHTML.includes('Wheels'));assert(!host.innerHTML.includes('gdtfSlot'));
 assert(!source('openFixtureInfoModal').includes('unzip'));assert(!source('downloadFixturePatchMvr').includes('loadRepository'));
 for(const name of ['gdtfModePanelMarkup','gdtfModePanelContents','toggleGdtfModeDetails'])vm.runInContext(source(name),c);
 c.renderGdtfFixtureInfo(info.detail,info);assert(!host.innerHTML.includes('<table'),'collapsed modes do not build channel tables');
 const button={dataset:{gdtfModeButton:'0'},expanded:'false',getAttribute(){return this.expanded},setAttribute(name,value){this.expanded=value}},panel={dataset:{},innerHTML:'',classList:{add(){},remove(){}}};
 host.querySelector=selector=>selector.includes('aria-expanded')?null:selector.includes('mode-button')?button:panel;host.querySelectorAll=selector=>selector.includes('mode-button')?[button]:[panel];
 let builds=0;const contents=c.gdtfModePanelContents;c.gdtfModePanelContents=mode=>{builds++;return contents(mode)};c.toggleGdtfModeDetails(0);assert(panel.innerHTML.includes('<table'));assert.equal((panel.innerHTML.match(/<tr>/g)||[]).length,info.detail.modes[0].channelList.length+1);c.toggleGdtfModeDetails(0);c.toggleGdtfModeDetails(0);assert.equal(builds,1,'reopening a mode reuses its table');
 vm.runInContext(source('readProjectFile'),c);let validations=0,loads=0;const project={app:{labels:[],distros:[],fixturePatch:[]}};c.LampyCore={MAX_PROJECT_BYTES:1024,validateProject:data=>{validations++;return data.app}};c.readBoundedFileText=async()=>JSON.stringify(project);c.app={labels:[],distros:[],fixturePatch:[]};c.loadProjectPayload=(data,save,validated)=>{assert.equal(validated,data.app);loads++};for(const key of ['selectedPatchRows','duplicatePatchRows','duplicateAddressRows','confirmedDuplicateAddressKeys'])c[key]=new Set();c.render=()=>{};c.alert=()=>{};await c.readProjectFile({target:{files:[{size:10}],value:'selected'}});assert.equal(validations,1);assert.equal(loads,1);
 console.log('PASS: archive-free library exports, retained imported bytes, save/load provenance, collision isolation, changed footprints and stored Fixture Information.');
})().catch(error=>{console.error(error);process.exitCode=1});
