const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),zlib=require('zlib');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const LampyCore=require('../js/project-core.js'),LampyArchive=require('../js/archive.js');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const text=html.slice(start,end+1);try{new Function('return ('+text+')');return text}catch{}}throw Error(name)}
const c=vm.createContext({console,LampyCore,crypto:require('crypto').webcrypto,window:{},clearTimeout,Map,Set,Number,Array});
function add(...names){for(const name of names)vm.runInContext(source(name),c)}
const plain=value=>JSON.parse(JSON.stringify(value));
add('normalisePatchMode','modeWatts','distroVoltage','powerSheetRowResults','powerSheetSlotResult','fixtureWatts','normalisePowerSheetRow','blankPhaseTotals','powerSheetPhaseTotals','powerDistroConfiguration','powerSupplyTotals','addPhaseTotals','formatPhaseAmps','escapeHtml','escapeAttr','escapeJsAttr','powerSupplyWarningMarkup');
c.ensureProjectInfo=()=>({powerSupplies:[]});c.patchFixturesFor=()=>[];const fixtures={1:{fixture:'Known',watts:2300},2:{fixture:'Unknown'},3:{fixture:'Zero',watts:0}};c.fixturePatchByFixId=id=>fixtures[id];
assert.equal(c.powerSheetRowResults({fixIds:['1']},230).amps,10);
for(const id of ['2','3','404']){const result=c.powerSheetRowResults({fixIds:['1',id]},230);assert.equal(result.incomplete,true);assert.equal(result.amps,null)}
c.powerSheetRowsForRange=()=>Array.from({length:3},()=>({fixIds:['1']}));c.powerSheetDuplicateFixIds=()=>new Map();c.powerAuxRowsForRange=()=>[];
assert.deepEqual(plain(c.powerSheetPhaseTotals({d:{voltage:'230V',input:'32A 1ø'}})),{p1:30,p2:0,p3:0});
assert.deepEqual(plain(c.powerSheetPhaseTotals({d:{voltage:'230V',input:'32A 3ø',phasing:'Three Phase'}})),{p1:10,p2:10,p3:10});
assert.equal(LampyCore.phaseIndex({input:'125A 3ø',phasing:'Single Phase'},5),0);
assert.equal(LampyCore.phaseIndex({input:'125A 3ø',phasing:'Single Phase'},6),1);
c.powerSupplyTotals=()=>({p1:100,p2:0,p3:0});assert.match(c.powerSupplyWarningMarkup({input:'32A 3ø'},[]),/32 A/);
c.powerSupplyTotals=()=>({p1:NaN,p2:0,p3:0});assert.match(c.powerSupplyWarningMarkup({input:'32A 3ø'},[]),/Incomplete/);
assert.equal(c.formatPhaseAmps(NaN),'Incomplete');
console.log('PASS: circuit voltage, missing loads, single/three-phase allocation and supply warnings');

add('ensureSocaData','ensureDistroOwnership','syncDistroSocapexCounts');c.normaliseSocaMeta=x=>({...x});c.defaultMeta=()=>({});c.blankLabel=()=>({top:''});c.distroTypeForCount=()=>'';c.persist=()=>{};c.render=()=>{};c.chunkCount=()=>Math.ceil(c.app.labels.length/6);
function project(){c.app={distros:[{id:'A',count:1},{id:'B',count:1},{id:'C',count:1}],labels:['A','B','C'].flatMap(top=>Array.from({length:6},()=>({top}))),socaNames:['A loom','B loom','C loom'],socaMeta:[{},{},{}]};c.ensureSocaData()}
project();c.app.distros.splice(0,1);c.syncDistroSocapexCounts(false);assert.deepEqual(plain(c.app.socaNames),['B loom','C loom']);assert.equal(c.app.labels[0].top,'B');
project();c.app.distros.splice(1,1);c.syncDistroSocapexCounts(false);assert.deepEqual(plain(c.app.socaNames),['A loom','C loom']);
project();c.app.distros[0].count=3;c.syncDistroSocapexCounts(false);assert.equal(c.app.labels[18].top,'B');assert.equal(c.app.labels[24].top,'C');c.app.distros[0].count=1;c.syncDistroSocapexCounts(false);assert.equal(c.app.labels[6].top,'B');
const restored=plain(c.app);c.app=restored;c.ensureSocaData();c.syncDistroSocapexCounts(false);assert.deepEqual(plain(c.app),plain(restored));
console.log('PASS: legacy ownership migration, first/middle deletion, resize and JSON round trip');

const hostile="x');auditMarker();//";let called=false,received='';vm.runInNewContext("receive('"+c.escapeJsAttr(hostile)+"')",{receive:value=>received=value,auditMarker:()=>called=true});assert.equal(received,hostile);assert.equal(called,false);
add('powerSupplyCardMarkup');c.supplyDistroNames=()=>[];c.supplyCardPhaseTotalsMarkup=()=>'';c.optionDefault=()=>'';c.distroOptions={};
const markup=c.powerSupplyCardMarkup({id:hostile},[]);assert(!markup.includes('onclick='));assert(markup.includes('data-open-supply='));
const good={labels:[],distros:[],fixturePatch:[]};LampyCore.validateProject(good);
for(const bad of [{},[],{labels:'wrong'},JSON.parse('{"labels":[],"__proto__":{"x":1}}'),{labels:[],distros:[{id:hostile}]},{labels:[],distros:[{count:10000000}]},{labels:[],projectInfo:{logoUrl:'javascript:alert(1)'}}])assert.throws(()=>LampyCore.validateProject(bad));
const stage=vm.createContext({LampyCore,app:{labels:[{top:'KEEP'}]},normaliseLabel:x=>x,normaliseSocaMeta:x=>x,normaliseDistro:()=>{throw Error('Malformed nested data')}});vm.runInContext(source('loadProjectPayload'),stage);assert.throws(()=>stage.loadProjectPayload({labels:[],distros:[{count:1}]}));assert.equal(stage.app.labels[0].top,'KEEP');
assert(LampyCore.validSubnet('255.255.255.0'));assert(!LampyCore.validSubnet('255.0.255.0'));assert(!LampyCore.validSubnet('999.255.0.0'));
add('selectedPatchFixture');c.fixturePatchSelection={manufacturer:'Custom',fixture:'Saved load'};c.patchFixtureRows=()=>[{manufacturer:'Custom',fixture:'Saved load',mode:'Single',channels:1,watts:2300,weight:10}];assert.equal(c.selectedPatchFixture().modes.Single.channels,1);
console.log('PASS: hostile handler arguments, import validation, pre-commit failure, subnet masks and restored custom fixture modes');

add('flushPersist','revisionTrackedState','revisionOutputSettings');c.settingsPayload=()=>({});c.fixturePatchViewOptions={};vm.runInContext('let persistTimer=null,persistIdleHandle=null,suppressRevisionCapture=false,projectStorageConflict=false,projectRestoreFailed=false;',c);
c.ensureSocaData=()=>{};c.syncRackMountedNetworkLocations=()=>{};c.captureRevisionChanges=()=>{};c.STORAGE_KEY='test';c.appPayload=()=>({});let status='';c.setSaveStatus=value=>status=value;c.localStorage={setItem(){throw Error('QuotaExceededError')}};c.console={warn(){}};
assert.equal(c.flushPersist(),false);assert.equal(status,'error');c.localStorage.setItem=()=>{};assert.equal(c.flushPersist(),true);assert.equal(status,'saved');vm.runInContext('projectStorageConflict=true',c);assert.equal(c.flushPersist(),false);
c.ensureProjectInfo=()=>({});assert('Distro Labels' in c.revisionTrackedState());
add('togglePowerSupplyDistro');const supplies={powerSupplies:[{id:'a',distros:[0]},{id:'b',distros:[]}]};c.ensureProjectInfo=()=>supplies;c.renderPowerSheetView=()=>{};c.renderPowerSupplyPane=()=>{};c.distroRanges=()=>[];c.togglePowerSupplyDistro({dataset:{supplyId:'b',supplyDistro:'0'},checked:true});assert.deepEqual(supplies.powerSupplies.map(s=>Array.from(s.distros)),[[],[0]]);c.togglePowerSupplyDistro({dataset:{supplyId:'b',supplyDistro:'0'},checked:false});assert.equal(supplies.powerSupplies[1].distros.length,0);
const supplyContext=vm.createContext({escapeAttr:c.escapeAttr,escapeHtml:c.escapeHtml,alert:message=>supplyContext.alertMessage=message,Date:{now:()=>123},activePowerSupplyId:'',persist:()=>{},renderPowerSheetView:()=>{},distroRanges:()=>[],openPowerSupplyPane:()=>{}});
vm.runInContext("let supplyReference=[],supplyReferencePromise=null,supplyReferenceState='idle';",supplyContext);for(const name of ['normaliseSupplyReference','inputSupplyOptions','addPowerSupply'])vm.runInContext(source(name),supplyContext);
const supplyJson=JSON.parse(fs.readFileSync(path.join(root,'json/power_supply.json'),'utf8')),normalised=supplyContext.normaliseSupplyReference({supplies:[...supplyJson.supplies,{label:supplyJson.supplies[0].label},{label:''}]});assert.deepEqual(Array.from(normalised,item=>item.label),[...new Set(supplyJson.supplies.map(item=>item.label))]);
vm.runInContext("supplyReference=[{label:'32A 3ø'},{label:'63A 3ø'}]",supplyContext);assert(supplyContext.inputSupplyOptions('').startsWith('<option value="" selected>Select Input Supply</option>'));assert(supplyContext.inputSupplyOptions('Legacy Supply').includes('Legacy Supply (Saved)'));
const newSupplyProject={powerSupplies:[]};supplyContext.ensureProjectInfo=()=>newSupplyProject;supplyContext.loadSupplyReference=async()=>[];
(async()=>{await supplyContext.addPowerSupply();assert.equal(newSupplyProject.powerSupplies.length,0);assert(supplyContext.alertMessage.includes('No supply was added.'));supplyContext.loadSupplyReference=async()=>normalised;await supplyContext.addPowerSupply();assert.equal(newSupplyProject.powerSupplies.length,1);assert.equal(newSupplyProject.powerSupplies[0].input,'')})().catch(error=>{console.error(error);process.exitCode=1});
assert(source('saveDeviceConfigPorts').includes("device.source==='network'&&index<2"));assert(source('updateDeviceConfigPortField').includes("if(key==='subnet')port.subnetGlobal=false"));assert(source('updateCanonicalNetworkAlias').includes("'console','npu','network'"));
console.log('PASS: quota recovery, multi-tab guard, revisions, supply assignment and JSON-authoritative supply options');

function zip(name,data,compressed=false){const filename=Buffer.from(name),content=Buffer.from(data),packed=compressed?zlib.deflateRawSync(content):content,crc=LampyArchive.crc32(content),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(compressed?8:0,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(content.length,22);local.writeUInt16LE(filename.length,26);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(compressed?8:0,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(content.length,24);central.writeUInt16LE(filename.length,28);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+filename.length,12);end.writeUInt32LE(local.length+filename.length+packed.length,16);return Buffer.concat([local,filename,packed,central,filename,end])}
(async()=>{
 for(const compressed of [false,true]){const files=await LampyArchive.read(zip('description.xml','<fixture/>',compressed));assert.equal(Buffer.from(files['description.xml']).toString(),'<fixture/>')}
 for(const name of ['../outside','__proto__','/absolute','a\\b'])await assert.rejects(LampyArchive.read(zip(name,'bad')));
 const damaged=zip('ok','hello');damaged[32]^=1;await assert.rejects(LampyArchive.read(damaged));
 const oversized=zip('ok','hello');const central=30+2+5;oversized.writeUInt32LE(70*1024*1024,central+24);await assert.rejects(LampyArchive.read(oversized));
 await assert.rejects(LampyArchive.read(Buffer.from('bad')));
 // Large touring project: validate and round-trip 10,000 fixtures without data loss.
 const arena={labels:[],distros:Array.from({length:12},(_,i)=>({id:'d'+i,count:12})),fixturePatch:Array.from({length:10000},(_,i)=>({id:'f'+i,fixId:String(i+1),universe:String(Math.floor(i/32)+1),address:String((i%32)*16+1),channels:16}))};
 LampyCore.validateProject(arena);const copy=JSON.parse(JSON.stringify(arena));LampyCore.validateProject(copy);assert.deepEqual(copy,arena);
 console.log('PASS: stored/deflated ZIP, CRC corruption, unsafe paths, extraction bounds and 10,000-fixture round trip');
})().catch(error=>{console.error(error);process.exitCode=1});
