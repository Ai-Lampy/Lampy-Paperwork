'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
const row={manufacturer:'Test',fixture:'Spot',mode:'Full',channels:10,fixId:'1',universe:'2',address:'12'};
const c=vm.createContext({VERSION:'test',console,app:{gdtfFiles:{}},patchFixtureRows:()=>[row],base64ToBytes:v=>Buffer.from(v,'base64'),patchImportState:{},patchUndoEpoch:0});
for(const name of ['mvrGdtfForRow','fixturePatchMvrFiles','fixturePatchMvrXml','mvrUuid','mvrUuidValue','mvrXmlEscape','mvrAbsoluteAddress','normaliseGdtfFiles','storeGdtfsFromZipEntries','normalisePatchMode','modeChannels','modeParameters','normaliseImportMatch','fixtureModeKey','fixtureInfoStoredSource'])vm.runInContext(source(name),c);
c.mvrSafeGeometryXml=()=>'';
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
 const host={innerHTML:''};c.$=()=>host;c.escapeHtml=String;c.escapeAttr=String;c.fixtureProductPageUrl=()=>'';c.fixtureInfoHeroMarkup=(name,identity,source,media)=>media;c.gdtfModePanelMarkup=()=>'';vm.runInContext(source('renderGdtfFixtureInfo'),c);c.renderGdtfFixtureInfo(info.detail,info);assert(host.innerHTML.includes(info.image));assert(host.innerHTML.includes('20 Ch'));assert(!host.innerHTML.includes('Wheels'));assert(!host.innerHTML.includes('gdtfSlot'));
 assert(!source('openFixtureInfoModal').includes('unzip'));assert(!source('downloadFixturePatchMvr').includes('loadRepository'));
 console.log('PASS: archive-free library exports, retained imported bytes, save/load provenance, collision isolation, changed footprints and stored Fixture Information.');
})().catch(error=>{console.error(error);process.exitCode=1});
