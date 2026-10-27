'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const {documentTree,readArchives}=require('../scripts/sync-gdtf-parameters.cjs');
const address=require('../js/patch-address-review.js');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
// A small XML DOM backed by Python's standard parser, not a browser.
class DOMParser {parseFromString(xml){const data=JSON.parse(execFileSync('python3',['-c',`import sys,json,xml.etree.ElementTree as E
def tree(n):return {'tag':n.tag,'attrs':dict(n.attrib),'text':''.join(n.itertext()),'children':[tree(c) for c in n]}
json.dump(tree(E.fromstring(sys.stdin.read())),sys.stdout)`],{input:xml}));const doc=documentTree(data);doc.documentElement=doc.children[0];function link(node,raw,parent){node.textContent=raw.text;node.parentNode=parent;node.parentElement=parent;node.children.forEach((child,i)=>link(child,raw.children[i],node))}link(doc.documentElement,data,null);return doc}}
const c=vm.createContext({DOMParser,TextDecoder,console,VERSION:'test',GDTF_REPOSITORY_BASE_URL:'gdtf/',PATCH_FIXTURE_NORMALISED:Symbol(),normaliseBlankColour:v=>v||'',normaliseImportMatch:v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,''),repositoryFixturePatchReference:{manufacturers:{}},fixturePatchReference:{manufacturers:{}},app:{gdtfFiles:{}},repositoryGdtfBytes:new Map(),patchFixtureRows:()=>[],normaliseGdtfMatches:v=>v||{},normaliseFixtureModeAliases:v=>v||{},patchImportState:{},duplicateIpIndex:()=>({byAddress:new Map()}),duplicateIpKey:()=>'',normaliseBlankColour:v=>v||''});
for(const name of ['normalisePatchMode','modeChannels','modeParameters','modeWatts','modeWeight','normaliseFixtureGdtf','normaliseFixtureList','normalisePatchFixture','normaliseGdtfFiles','fixtureModeKey','fixtureGdtfReference','fixtureModeParameters','fixtureParametersRequired','gdtfAttr','gdtfDirectChildren','xmlChildrenByName','gdtfOffsetValues','gdtfGeometryNode','parseGdtfModeChannelCount','parseGdtfModeParameterCount','parseGdtfDescription','gdtfMatchKey','gdtfSpecKey','gdtfFileMatchesPatchFixture','matchGdtfForRow','rangeForPatchRow','patchUniverseIntervals','patchIntervalsFromRows','addressRangeFree','addressFreeInRows','nextPatchSlot','nextPatchSlotInRows','reconcilePatchModeAddress','mvrUuid','mvrUuidValue','mvrXmlEscape','mvrSafeGeometryXml','mvrAbsoluteAddress','fixturePatchMvrWarnings','fixturePatchMvrXml','detectProjectErrors','duplicateAddressKey','patchImportExactModeName','patchImportMappedRows','parsePatchImportUniAddress','modeMetaFor','applyPatchField'])vm.runInContext(source(name),c);
for(const value of [0,'0',{channels:0},{channels:'0',parameters:0},{chan:0},{dmx:0}])assert.equal(c.normalisePatchMode(value).channels,0);
for(const value of [undefined,null,'',{},'bad',-1])assert.equal(c.normalisePatchMode(value).channels,1);
for(const value of [1,512,1200])assert.equal(c.normalisePatchMode(value).channels,value);
assert.equal(c.normalisePatchMode({channels:0,parameters:0}).parameters,0);
const library=JSON.parse(fs.readFileSync(path.join(root,'json/fixtures/reel-efx.json'))),fixtures=c.normaliseFixtureList(library.fixtures),standard=fixtures.find(f=>f.fixture==='DF-50'),dmx=fixtures.find(f=>f.fixture==='DF-50 DMX');
c.repositoryFixturePatchReference.manufacturers['Reel EFX']=fixtures;c.patchFixturesFor=()=>fixtures;
assert.equal(c.modeChannels(standard.modes['Non-DMX']),0);assert.equal(standard.gdtf.modes['Non-DMX'].parameters,0);
assert(c.fixtureGdtfReference(standard,'Non-DMX',0).gdtfPath.endsWith('Reel_EFX@DF-50@Non_DMX.gdtf'));
assert.equal(c.fixtureModeKey({modes:{Manual:0,DMX:1}},'DMX',0),'','zero must be an exact channel filter, not wildcard');
const files=fixtures.map(f=>path.join(root,'gdtf',f.gdtf.file)),archives=readArchives(files);
for(const fixture of fixtures){const file=path.join(root,'gdtf',fixture.gdtf.file),doc=documentTree(archives[file]);for(const mode of doc.getElementsByTagName('DMXMode')){const count=fixture.fixture==='DF-50'?0:1;assert.equal(c.parseGdtfModeChannelCount(mode),count);assert.equal(c.parseGdtfModeParameterCount(mode),count)}}
const raw={id:'manual',manufacturer:'Reel EFX',fixture:'DF-50',mode:'Non-DMX',channels:0,weight:16,watts:null,fixId:'1',universe:'1',address:'1',...c.fixtureGdtfReference(standard,'Non-DMX',0)},row=c.normalisePatchFixture(raw);
assert.equal(row.universe,'');assert.equal(row.address,'');assert.equal(row.weight,16);assert.equal(row.watts,null);assert.equal(c.normalisePatchFixture(JSON.parse(JSON.stringify(row))).channels,0);
assert.equal(c.fixtureModeParameters(row),0);assert.equal(c.fixtureParametersRequired([row,row]),0);assert.equal(c.rangeForPatchRow(raw),null);
c.patchFixtureRows=()=>[raw];assert.equal(c.patchUniverseIntervals('1').length,0);assert.equal(c.nextPatchSlot(1).address,1);assert.equal(c.nextPatchSlot(0).address,'');assert.equal(c.nextPatchSlotInRows(0,1,[raw]).universe,'');
assert.equal(c.detectProjectErrors([],[row]).length,0);assert.equal(c.detectProjectErrors([],[{...row,mode:''}]).length,1);
for(const name of ['patchInput','patchMergedCellMarkup'])vm.runInContext(source(name),c);
assert(!c.patchInput(row,'address','100').includes('<input'));assert(!c.patchMergedCellMarkup(row,'').includes('<input'));
assert.equal(c.patchImportExactModeName(standard,{mode:'Non-DMX',channels:0}),'Non-DMX');
c.patchImportState={headers:['Mode','Channels'],rows:[['Non-DMX',0]],mapping:['mode','channels']};assert.equal(c.patchImportMappedRows()[0].channels,0);
const normal={id:'dmx',fixId:'2',universe:'1',address:'1',channels:1,mode:'1 Channel'};
// Add fixtures through the real picker and import row builders, including numeric mode 0.
const inputs={patchQuantity:'2',patchFixId:'10',patchUniverse:'1',patchAddress:'100'};
c.$=id=>({value:inputs[id]??''});c.selectedPatchFixture=()=>standard;c.fixturePatchSelection={manufacturer:'Reel EFX',mode:'Non-DMX'};c.colourTextToHex=v=>v;
for(const name of ['incrementMaybe','buildPendingPatchAdds','buildPatchImportRows'])vm.runInContext(source(name),c);
const adds=c.buildPendingPatchAdds();assert.equal(adds.length,2);assert(adds.every(r=>r.channels===0&&r.universe===''&&r.address===''));assert.equal(adds[1].fixId,'11');
c.patchImportMappedRows=()=>[{manufacturer:'Reel EFX',fixture:'DF-50',mode:'Non-DMX',channels:0,universe:'1',address:'100'}];c.patchImportLibraryFixture=()=>standard;c.modeNameForImport=()=> 'Non-DMX';
const savedMatcher=c.matchGdtfForRow;c.matchGdtfForRow=()=>null;const imports=c.buildPatchImportRows();c.matchGdtfForRow=savedMatcher;
assert.equal(imports[0].channels,0);assert.equal(imports[0].address,'');assert.equal(imports[0].universe,'');
const both={fixture:'Both',modes:{Manual:0,DMX:5}},switchRow={...normal,fixture:'Both',manufacturer:'Test'};
c.patchFixturesFor=()=>[both];c.applyPatchField(switchRow,'mode','Manual');assert.equal(switchRow.channels,0);assert.equal(switchRow.address,'');assert.equal(switchRow.universe,'');c.applyPatchField(switchRow,'mode','DMX');assert.equal(switchRow.channels,5);assert.equal(switchRow.address,'');c.patchFixturesFor=()=>fixtures;
const sequence=address.sequence([row,normal],'10');assert.equal(sequence[0].address,'');assert.equal(sequence[1].address,'10');assert(address.validate([],sequence).every(r=>!r.errors.length));
assert.equal(address.confirmed([], [{...row,universe:'1',address:'100'}])[0].universe,'');
c.applyPatchField(row,'address','100');c.applyPatchField(row,'universe','2');assert.equal(row.address,'');assert.equal(row.universe,'');
const fileName=path.basename(standard.gdtf.file),description=execFileSync('python3',['-c','import zipfile,sys;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read("description.xml"))',files.find(f=>f.endsWith(fileName))]).toString(),parsed=c.parseGdtfDescription(description,fileName);
assert.equal(parsed.modes[0].channels,0);assert.equal(parsed.modes[0].parameters,0);
const normalisedFiles=c.normaliseGdtfFiles({[fileName]:{fileName,...parsed,base64:'test'}});assert.equal(normalisedFiles[fileName].modes[0].channels,0);assert.equal(normalisedFiles[fileName].modes[0].parameters,0);c.app.gdtfFiles=normalisedFiles;
c.GDTF_MANUFACTURER_ALIASES={};
for(const name of ['gdtfManufacturerKey','gdtfModeForPatchRow','gdtfCandidateForRow','gdtfExplicitCandidateForRow'])vm.runInContext(source(name),c);
assert.equal(c.fixturePatchMvrWarnings([row]).length,0);
const xml=c.fixturePatchMvrXml([raw]);assert(xml.includes('<Addresses/>'));assert(!xml.includes('<Address break='));assert(xml.includes('<GDTFMode>Non-DMX</GDTFMode>'));
const empty=c.parseGdtfDescription('<GDTF><FixtureType Name="Unknown"><DMXModes/></FixtureType></GDTF>','unknown.gdtf');assert.equal(empty.modes.length,0,'missing modes must not invent a DMX channel');
// Actual MVR import preserves embedded zero counts and missing addresses.
for(const name of ['mvrPatchRows','mvrNamedUuidMap','mvrUuidKey','mvrEmbeddedGdtf','xmlAttrOrText','parseDmxAddressText','mvrAncestorName'])vm.runInContext(source(name),c);
c.unzipBinaryFiles=async()=>({'GeneralSceneDescription.xml':Buffer.from(xml)});c.storeGdtfsFromZipEntries=async()=>Object.values(c.app.gdtfFiles);
(async()=>{const rows=await c.mvrPatchRows(new Uint8Array());assert.equal(rows.length,2);assert.equal(rows[1][9],0);assert.equal(rows[1][5],'');assert.equal(rows[1][6],'');console.log('PASS: non-DMX zero channels/parameters, library identity, save/load, address allocation, mixed sequencing, validation, GDTF and MVR round trip.');})().catch(error=>{console.error(error);process.exitCode=1});
