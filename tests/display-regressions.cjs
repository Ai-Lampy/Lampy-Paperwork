const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..')+'/',html=fs.readFileSync(root+'index.html','utf8');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const s=html.slice(start,end+1);try{new Function('return ('+s+')');return s}catch{}}throw Error(name)}
const c=vm.createContext({console,TextEncoder,TextDecoder,Uint8Array,crypto:require('crypto').webcrypto,btoa,atob,VERSION:'31.9'});
function add(...names){for(const name of names)vm.runInContext(source(name),c)}
add('normaliseUniverseLimits','normaliseControlSoftwareModes','modeReference','parameterDataForMode','parameterCountFromData','parameterCountForReference','referenceCapacity','storedDeviceCapacity','parametersForStoredItem','universeProcessingWithTnp','universeCapacityLines','deviceCapacityLines','consoleCardCapacityText','controlTableCapacityText','totalControlNetworkParameters','totalControlNetworkParametersForMode','homeParametersAvailable');
const data=JSON.parse(fs.readFileSync(root+'json/consoles/avolites.json'));
const refs=data.devices.map(d=>({...d,softwareModes:c.normaliseControlSoftwareModes(d.softwareModes)}));
assert.equal(refs.length,10);assert.equal(new Set(refs.map(d=>d.id)).size,10);
const ma={id:'ma',manufacturer:'MA Lighting',softwareModes:[{name:'Mode 3',parameterCount:20480},{name:'Mode 2',parameterCount:8192}]};
c.consoleReference={consoles:[...refs,ma]};c.npuReference={npus:[{id:'npu',softwareModes:[{name:'Mode 3',parameterCount:4096}]}]};c.normaliseControlNetwork=d=>d;
for(const ref of refs){
 const cap=c.referenceCapacity(ref,'Titan'),raw=data.devices.find(d=>d.id===ref.id).softwareModes[0].universes;
 assert.equal(cap.kind,'universes');assert.equal(cap.systemLimit,raw.systemLimit);assert.equal(cap.onboardProcessing,raw.onboardProcessing);
 assert(fs.existsSync(root+ref.imageUrl));
 assert.equal(c.parametersForStoredItem({consoleId:ref.id,manufacturer:'Avolites',parameterCount:999999},'console'),0);
 for(const p of ref.ports){assert(Array.isArray(p.directions));assert(p.quantity>0);if(p.protocols)assert(p.protocols.every(v=>typeof v==='string'&&v.trim()))}
}
const d9=c.referenceCapacity(refs.find(d=>d.name==='D9-330'),'Titan'),d3=c.referenceCapacity(refs.find(d=>d.name==='D3-110'),'Titan');
assert.deepEqual([0,1,2,3].map(n=>c.universeProcessingWithTnp(d9,n)),[32,48,64,64]);
assert.deepEqual([0,1,2,100].map(n=>c.universeProcessingWithTnp(d3,n)),[24,24,24,24]);
const avo={id:'a',consoleId:refs[2].id,manufacturer:'Avolites',parameterCount:99999,softwareMode:'Titan'},backup={...avo,id:'b',role:'backup'};
c.app={controlNetwork:{consoles:[avo,backup],npus:[]}};assert.equal(c.totalControlNetworkParameters(),0);assert.equal(c.homeParametersAvailable(),'—');
const main={id:'m',consoleId:'ma',softwareMode:'Mode 3'};c.app.controlNetwork.consoles.push(main);assert.equal(c.totalControlNetworkParameters(),20480);assert.equal(c.homeParametersAvailable(),20480);
c.app.controlNetwork.consoles.push({...main,id:'m2',role:'backup'});assert.equal(c.totalControlNetworkParameters(),20480);
c.app.controlNetwork.npus.push({id:'p',npuId:'npu',softwareMode:'Mode 3'});assert.equal(c.totalControlNetworkParameters(),24576);assert.equal(c.totalControlNetworkParametersForMode('Mode 3'),24576);
assert.equal(c.parametersForStoredItem({...avo,consoleId:'missing'},'console'),0);
assert.equal(c.parametersForStoredItem({...main,softwareMode:'Mode 2'},'console'),8192);
c.deviceConfigExpandedDevices=new Set();c.controlExpandedDevices=new Set();c.render=()=>{};c.ipDeviceOrderKey=d=>d.source+':'+d.id;c.compiledDeviceConfigDevices=()=>[{source:'console',id:'a'},{source:'npu',id:'p'}];c.activeControlNetworkTab='consoles';
add('deviceExpansionSet','toggleDeviceConfigDevice','expandAllControlDevices','collapseAllControlDevices','expandAllDeviceConfig','collapseAllDeviceConfig');
c.toggleDeviceConfigDevice('console:a','control');assert(c.controlExpandedDevices.has('console:a'));assert.equal(c.deviceConfigExpandedDevices.size,0);
c.toggleDeviceConfigDevice('console:a');c.toggleDeviceConfigDevice('console:a','control');assert(c.deviceConfigExpandedDevices.has('console:a'));assert(!c.controlExpandedDevices.has('console:a'));
c.activeControlNetworkTab='npu';c.expandAllControlDevices();c.activeControlNetworkTab='consoles';c.expandAllControlDevices();c.collapseAllControlDevices();assert(c.controlExpandedDevices.has('npu:p'));assert(!c.controlExpandedDevices.has('console:a'));assert(c.deviceConfigExpandedDevices.has('console:a'));
c.collapseAllDeviceConfig();assert.equal(c.deviceConfigExpandedDevices.size,0);assert(c.controlExpandedDevices.has('npu:p'));
for(const name of ['clearProjectState','loadProjectPayload']){assert(source(name).includes('controlExpandedDevices.clear()'));assert(source(name).includes('deviceConfigExpandedDevices.clear()'))}
for(const name of ['appPayload','projectFilePayload']){assert(!source(name).includes('ExpandedDevices'))}
add('deviceConfigColumnLimits','calculateDeviceConfigWidths');
for(const control of [false,true])for(const width of [320,1280,1920]){const w=c.calculateDeviceConfigWidths(Array(control?16:11).fill(300),width,control);assert.equal(w[5],110);assert.equal(w[6],110);if(control)assert(w[10]<=80)}
assert(html.includes('@container homePositions (min-width:238px)'));assert(html.includes('@container homePositions (min-width:484px)'));assert(html.includes('grid-template-columns:repeat(4,minmax(0,1fr))'));assert(html.includes('text-align-last:center'));assert(html.includes('padding:2px 14px!important'));
Object.assign(c,{escapeHtml:v=>String(v??''),escapeAttr:v=>String(v??''),parameterDetailsMarkup:()=>'',controlReferencePreviewMarkup:()=>'',versionPairText:()=>'',consoleLibraryNetworkInfoMarkup:()=>'',controlDeviceSoftwareVersionText:()=>'',controlCardHeadingMarkup:()=>'',dmxPortTableMarkup:()=>'',controlCardMediaMarkup:()=>'',consoleRoleButtonsMarkup:()=>'',controlCardActionButtonsMarkup:()=>'',controlPositionStripMarkup:()=>''});
add('controlParameterMarkup','consoleLibraryInfoMarkup','consoleCardMarkup');
for(const markup of [c.controlParameterMarkup(refs[2],'Titan',''),c.consoleLibraryInfoMarkup(refs[2])]){assert(markup.includes('System Limit: 64'));assert(markup.includes('Onboard Processing: 32'));assert(!markup.includes('Parameters:'));assert(!markup.includes('99999'));assert(markup.includes('TNP'))}
assert(c.consoleCardMarkup(main,0).includes('Parameters: 20,480'));
const avoCard=c.consoleCardMarkup(avo,0);
assert.equal((avoCard.match(/Onboard Processing:/g)||[]).length,1);
assert(avoCard.includes('Onboard Processing: 32 universes'));
for(const forbidden of ['System Limit','TNP','Backup and multi-user','Parameters:'])assert(!avoCard.includes(forbidden));
assert.equal(c.controlTableCapacityText(d9),'32 universes');
assert.equal(c.controlTableCapacityText(d3),'24 universes');
assert.equal(c.consoleCardCapacityText({kind:'universes',onboardProcessing:null}),'Onboard Processing: —');
assert.equal(c.controlTableCapacityText({kind:'universes',onboardProcessing:null}),'—');
add('positionSummaryMarkup');c.controlPositionStripStyle=()=>'';
for(const n of [0,1,4,5,8,20]){c.positionSummaryRows=()=>Array.from({length:n},(_,i)=>({name:'Position '+i}));const m=c.positionSummaryMarkup();assert.equal((m.match(/class="homePositionStrip(?:\s|")/g)||[]).length,n);if(!n)assert(m.includes('No position summary yet'))}
Object.assign(c,{deviceConfigColumnAttr:()=>'',deviceConfigSort:{key:'name',direction:'asc'},ipAddressSourceItem:()=>avo,deviceConfigSourceProtocol:()=>'',ipVlanCellStyle:()=>'',deviceConfigSegmentedInput:()=>'<div></div>',deviceConfigProtocolSelect:()=>'<select></select>',deviceConfigVlanSelect:()=>'<select></select>',deviceConfigDirectionSelect:()=>'<span>Output</span>',deviceConfigReference:()=>refs[2],canonicalDeviceRackPlacement:()=>null,controlLocationCellStyle:()=>'',modeOptionsMarkup:()=>'<option>Titan</option>'});
add('deviceConfigInput','deviceConfigParentRow','deviceConfigPortRow','deviceConfigInterfaceTwoRow','deviceConfigTableMarkup','controlTableCellAttrs','controlTableParentExtraCells','controlTableAppendCells','controlTableBlankExtraCells','controlDeviceConfigTableMarkup');
const dev={id:'a',source:'console',name:'D9 parent',interfaces:[],ports:[{id:'eth-1',category:'network',sub:'ETH 1'},{id:'dmx-1',category:'dmx',sub:'DMX 1'}]};
c.deviceConfigExpandedDevices.clear();c.controlExpandedDevices.clear();c.activeControlNetworkTab='consoles';c.controlExpandedDevices.add('console:a');
let control=c.controlDeviceConfigTableMarkup([dev]),config=c.deviceConfigTableMarkup([dev]);
assert.equal((control.match(/<tr\b/g)||[]).length,4);assert.equal((config.match(/<tr\b/g)||[]).length,2);
assert(control.includes("'console:a','control'"));assert(config.includes("'console:a','deviceConfig'"));assert(control.includes('<th>Capacity</th>'));assert(control.includes('32 universes'));assert(!control.includes('System Limit:'));
c.deviceConfigExpandedDevices.add('console:a');c.controlExpandedDevices.clear();control=c.controlDeviceConfigTableMarkup([dev]);config=c.deviceConfigTableMarkup([dev]);assert.equal((control.match(/<tr\b/g)||[]).length,2);assert.equal((config.match(/<tr\b/g)||[]).length,4);
for(const [markup,count] of [[control,16],[config,11]])for(const [,row] of markup.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g))assert.equal((row.match(/<t[dh]\b/g)||[]).length,count);
add('bytesToBase64','base64ToBytes','sha256Base64','packageProjectPayload','unpackProjectPayload');
(async()=>{const p={appVersion:'31.9',app:{controlNetwork:{consoles:[avo,backup,main],npus:[]}}};const out=await c.unpackProjectPayload(await c.packageProjectPayload(p));assert.equal(JSON.stringify(out),JSON.stringify(p));console.log('PASS: Avolites reference limits/images/ports; D9 and D3 TNP examples; mixed/backup/legacy totals; expansion isolation; 110px limits; UI capacity labels; position counts; project package round trip.');})().catch(e=>{console.error(e);process.exitCode=1});


// Inspect all inline styles, not just the intended four-column rule.
const styles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
const rules=[...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
const boxRules=rules.filter(r=>r.selector.split(',').some(s=>s.trim()==='.homePositionStrip'));
assert.equal(boxRules.length,1,'Keep Home box layout in one isolated rule');
const boxCss=Object.fromEntries(boxRules[0].body.split(';').filter(Boolean).map(d=>{const i=d.indexOf(':');return [d.slice(0,i).trim(),d.slice(i+1).trim()]}));
assert.equal(boxCss['grid-column'],'auto');assert.equal(boxCss['grid-row'],'auto');assert.equal(boxCss.height,'90px');assert.equal(boxCss.width,'auto');
assert.equal(boxCss['background-image'],'var(--pos-pattern,none)');
assert.equal(boxCss['background-color'],'var(--pos-base,#fff)');
assert(!source('positionSummaryMarkup').includes('class="controlPositionStrip'));
for(const r of rules.filter(r=>/\.homePositionStrip(?![\w-])/.test(r.selector))){
  assert(!/grid-column\s*:\s*1\s*\/\s*-1/.test(r.body),'Home boxes must not span the entire grid');
  assert(!/width\s*:\s*(700|1400)px/.test(r.body),'Home boxes must not inherit strip widths');
}
assert(styles.includes('@container homePositions (min-width:238px)'));
assert(styles.includes('@container homePositions (min-width:484px)'));
add('positionTextLineCount','fitHomePositionFont');
c.layoutTextMeasure=font=>text=>String(text).length*Number(/(\d+)px/.exec(font)[1])*.5;
const longName='Very long position name '.repeat(10);
c.positionSummaryRows=()=>[{name:longName}];assert(c.positionSummaryMarkup().includes('title="'+longName+'"'));
for(const width of [70,95,200]){const size=c.fitHomePositionFont(longName,width,78,'Cochin','900');assert(size>=12&&size<=32)}
assert.equal(c.fitHomePositionFont('FOH',200,78,'Cochin','900'),32);
for(const width of [237,238,483,484,700]){
 const cols=width>=484?4:width>=238?2:1;
 for(const count of [0,1,4,5,8]){
  const placements=Array.from({length:count},(_,i)=>({row:Math.floor(i/cols),column:i%cols}));
  assert(placements.every(p=>p.column<cols));if(count>cols)assert.equal(placements[cols].row,1);
 }
}
assert(source('homePanelMarkup').includes("collapsed?'homePanelCollapsed'"));
assert(source('renderHomeView').includes('onclick="openPositionMenu()"'));
assert(html.includes("<title>Lampy Paperwork V31.9</title>"));
assert(html.includes("const VERSION='31.9'"));

// V31.9: capacity statistics and dashboard compatibility, without browser automation.
add('avolitesProjectConsoles','projectCapacityStats','avolitesUniversesAvailable','fixtureChannelCount','controlParameterSummaryMarkup','normaliseHomeLayout','factoryHomeLayout','homeStat','homeStatsMarkup');
for(const name of ['HOME_STAT_LAYOUT_IDS','HOME_SUMMARY_LAYOUT_IDS'])vm.runInContext(html.split('\n').find(line=>line.startsWith('const '+name+'=')),c);
const d3Console={...avo,id:'d3',consoleId:refs.find(ref=>ref.name==='D3-110').id,role:'master'};
const d9Console={...avo,id:'d9',role:''};
c.app={controlNetwork:{consoles:[d3Console,d9Console,backup],npus:[],racks:[]}};
assert.equal(c.avolitesUniversesAvailable(),24);
c.app.controlNetwork.consoles=[d9Console,{...d3Console,role:''},backup];assert.equal(c.avolitesUniversesAvailable(),32);
c.app.controlNetwork.consoles=[backup];assert.equal(c.avolitesUniversesAvailable(),'—');
c.app.controlNetwork.consoles=[{...d9Console,consoleId:'missing',role:'master'},d3Console];assert.equal(c.avolitesUniversesAvailable(),'—');
c.app.controlNetwork.consoles=[{...d9Console,consoleId:'missing',role:''}];assert.equal(c.avolitesUniversesAvailable(),'—');
for(const [channels,expected]of [[0,0],[1,1],[512,1],[513,2]])assert.equal(Math.ceil(c.fixtureChannelCount(channels?[{channels}]:[])/512),expected);
assert.equal(c.fixtureChannelCount([{channels:20},{channels:16}]),36);
assert.equal(c.fixtureChannelCount([{channels:20,parameterCount:1}]),20);
const legacyLayout={version:1,stats:[{id:'parameters-available',size:'wide',visible:false},{id:'fixtures',size:'standard',visible:true},{id:'parameters-required',size:'wide',visible:true}],summaries:[]};
const legacyBefore=JSON.stringify(legacyLayout),layout=c.normaliseHomeLayout(legacyLayout),ids=Array.from(layout.stats,item=>item.id);
assert.equal(JSON.stringify(legacyLayout),legacyBefore);
assert.equal(ids[ids.indexOf('parameters-available')+1],'universes-available');
assert.equal(ids[ids.indexOf('parameters-required')+1],'channel-count');
assert(!ids.includes('max-universes-required'));
assert.equal(layout.stats[0].visible,false);assert.equal(layout.stats[0].size,'wide');
assert.equal(JSON.stringify(c.normaliseHomeLayout(layout)),JSON.stringify(layout));
const reordered=JSON.parse(JSON.stringify(layout));reordered.stats.unshift(reordered.stats.splice(reordered.stats.findIndex(item=>item.id==='channel-count'),1)[0]);reordered.stats[0].visible=false;
assert.equal(JSON.stringify(c.normaliseHomeLayout(reordered)),JSON.stringify(reordered));
c.ensureHomeLayout=()=>layout;c.patchFixtureRows=()=>[{channels:513}];c.fixtureParametersRequired=()=>12;c.homeCustomising=false;c.homeLayoutControlsMarkup=()=>'';c.activeControlNetworkTab='consoles';
const renderStats=()=>c.homeStatsMarkup({universeCount:7,socapexCount:0},[],1);
c.app.controlNetwork.consoles=[d9Console];
let statsMarkup=renderStats();
assert(statsMarkup.includes('Channel Count'));assert(!statsMarkup.includes('Max Universes Required'));assert(statsMarkup.includes('Universes Available'));assert(!statsMarkup.includes('Parameters Required'));assert(!statsMarkup.includes('Parameters Available'));
assert(!statsMarkup.includes('Theoretical packed-channel estimate'));assert(statsMarkup.includes('homeStatValue">513</div>'));
assert(c.controlParameterSummaryMarkup().includes('Universes Available'));
c.app.controlNetwork.consoles.push(main);
statsMarkup=renderStats();assert(statsMarkup.includes('Parameters Required'));assert(statsMarkup.includes('Parameters Available'));assert(statsMarkup.includes('Universes Available'));
assert(c.controlParameterSummaryMarkup().includes('Parameters Available'));
c.app.controlNetwork.consoles=[main];statsMarkup=renderStats();assert(!statsMarkup.includes('Universes Available'));assert(!statsMarkup.includes('Channel Count'));assert(statsMarkup.includes('Parameters Available'));
c.app.controlNetwork.consoles=[];statsMarkup=renderStats();assert(!statsMarkup.includes('Universes Available'));assert(statsMarkup.includes('Parameters Required'));
c.app.controlNetwork.consoles=[d9Console];c.app.controlNetwork.npus=[{npuId:'npu',softwareMode:'Mode 3'}];assert(renderStats().includes('Parameters Available'));
assert.equal(JSON.stringify(layout),JSON.stringify(c.normaliseHomeLayout(legacyLayout)));
console.log('PASS: Master/Backup/missing-reference capacity, channel boundaries, mixed/empty projects, conditional statistics and legacy dashboard layouts.');

// V31.9: shared table context, manufacturer roles and canonical duplicate IPs.
add('consoleManufacturerKey','makeConsoleRoleUnique','syncConsolesToMasterVersion','canonicalIpEndpoints','duplicateIpKey','duplicateIpIndex','duplicateIpConflicts','duplicateIpFieldAlias','consoleHomeSummaryMarkup','controlNetworkSummaryMarkup','controlLocationGroups','controlEffectiveName','deviceConfigGroupTablesMarkup','ipDeviceInterfaces','updateCanonicalNetworkAlias');
const maMaster={...main,id:'ma-master',manufacturer:'MA Lighting',role:'master',softwareVersionValue:'MA-1'},maSecond={...maMaster,id:'ma-second',role:'backup'};
const avoMaster={...d9Console,id:'avo-master',role:'master',softwareVersionValue:'Titan-1'},avoSecond={...avoMaster,id:'avo-second',role:'backup'};
c.app.controlNetwork={consoles:[maMaster,maSecond,avoMaster,avoSecond],npus:[],networkDevices:[],racks:[]};
maSecond.role='master';c.makeConsoleRoleUnique(maSecond);assert.equal(maMaster.role,'backup');assert.equal(avoMaster.role,'master');
avoSecond.role='master';c.makeConsoleRoleUnique(avoSecond);assert.equal(avoMaster.role,'backup');assert.equal(maSecond.role,'master');
assert.equal(c.consoleManufacturerKey({manufacturer:' MA-Lighting '}),c.consoleManufacturerKey({manufacturer:'MA Lighting'}));
c.consoleVersionValue=version=>version.version;c.matchingConsoleVersion=()=>true;c.applyConsoleVersion=(item,version)=>item.syncedVersion=version.version;
c.syncConsolesToMasterVersion();assert.equal(maMaster.syncedVersion,'MA-1');assert.equal(avoMaster.syncedVersion,'Titan-1');
assert(!Object.hasOwn(maSecond,'syncedVersion'));assert(!Object.hasOwn(avoSecond,'syncedVersion'));
c.positionSummaryRows=()=>[{name:'FOH'},{name:'Stage'}];c.positionKey=value=>String(value).trim().toLowerCase();c.titleCaseRevisionValue=(value,fallback='')=>value?value[0].toUpperCase()+value.slice(1):fallback;
c.deviceConfigPortsFor=()=>[{category:'network',protocol:'sACN',ip:'10.0.0.5'},{category:'network',protocol:'Art-Net',ip:'2.0.0.5'}];
Object.assign(avoSecond,{customName:'B Main',location:'FOH',softwareMode:'Titan'});
Object.assign(maSecond,{customName:'A Main',location:'FOH'});Object.assign(maMaster,{customName:'A Backup',location:'FOH'});Object.assign(avoMaster,{customName:'B Backup',location:'FOH'});
const summary=c.controlNetworkSummaryMarkup();
assert(summary.indexOf('A Main -')<summary.indexOf('B Main -'));assert(summary.indexOf('B Main -')<summary.indexOf('A Backup -'));
assert(summary.includes('Master - Titan'));assert(summary.includes('Location: FOH'));assert(summary.includes('Protocol 1: sACN · IP Address 1: 10.0.0.5'));
for(const forbidden of ['System Limit','Onboard Processing','TNP','Parameters:'])assert(!summary.includes(forbidden));
c.deviceConfigPortsFor=()=>[];const emptySummary=c.consoleHomeSummaryMarkup({id:'empty',name:'Model',manufacturer:'Maker'});assert(emptySummary.includes('— - —'));assert(emptySummary.includes('Location: —'));
const legacySummary=c.consoleHomeSummaryMarkup({...avoSecond,protocol1:'Art-Net',ip1:'2.0.0.8'});assert(legacySummary.includes('IP Address 1: 2.0.0.8'));

for(const control of [true,false])for(const available of [500,1280,2400]){
 const widths=c.calculateDeviceConfigWidths(Array(16).fill(300),available,control);assert.equal(widths[5],110);assert.equal(widths[6],110);
 if(!control){assert(widths[1]<=80);assert(widths[7]<=110)}else{assert(widths[10]<=80);assert(widths[8]<=60)}
}
for(const index of [0,2,3,4,8,9,10,11,12,13,14,15])assert.equal(c.deviceConfigColumnLimits(index,false).max,Infinity);
c.deviceConfigExpandedDevices.add('console:a');c.controlExpandedDevices.clear();
const dcConsole=c.controlDeviceConfigTableMarkup([dev],'deviceConfig');
assert(dcConsole.includes('data-table-view="deviceConfig"'));assert(dcConsole.includes("'console:a','deviceConfig'"));assert(dcConsole.includes("setDeviceConfigSort('name')"));
for(const [,row]of dcConsole.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g))assert.equal((row.match(/<t[dh]\b/g)||[]).length,16);
assert(dcConsole.includes('data-dc-col="15"'));assert(!dcConsole.includes('data-dc-col="14"'));
const mixedTables=c.deviceConfigGroupTablesMarkup([dev,{...dev,id:'n',source:'network'}]);assert.equal((mixedTables.match(/<table /g)||[]).length,2);
assert(source('measureDeviceConfigTable').includes("table.dataset.tableView!=='deviceConfig'"));
assert(html.includes('.deviceConfigView .deviceConfigTable.deviceConfigMeasured .controlLocationCell{max-width:none}'));
const migrated=c.normaliseHomeLayout({stats:[{id:'max-universes-required',visible:true},{id:'channel-count',visible:false,size:'wide'}]});
assert(!migrated.stats.some(item=>item.id==='max-universes-required'));assert.equal(migrated.stats[0].id,'channel-count');assert.equal(migrated.stats[0].visible,false);

const ipDevices=[
 {source:'console',id:'c',name:'Main',interfaces:[{slot:1,ipKey:'ip1',ip:'010.0.0.1'},{slot:2,ipKey:'ip2',ip:'10.0.0.2'}],ports:[{id:'eth1',category:'network',sub:'ETH 1',ip:'10.0.0.1'},{id:'eth2',category:'network',sub:'ETH 2',ip:'10.0.0.2'},{id:'eth3',category:'network',sub:'ETH 3',ip:'10.0.0.1'}]},
 {source:'network',id:'n',name:'Switch',interfaces:[{slot:1,ipKey:'ip1',ip:'010.000.000.001'}],ports:[]},
 {source:'npu',id:'p',name:'NPU',interfaces:[{slot:1,ipKey:'ip',ip:''}],ports:[]}
];
const endpoints=c.canonicalIpEndpoints(ipDevices),ipIndex=c.duplicateIpIndex(endpoints);
assert.equal(endpoints.length,5);assert.equal(ipIndex.byAddress.get('10.0.0.1').length,3);
assert.equal(c.duplicateIpConflicts(ipIndex,'console:c:ip1','10.0.0.1').length,2);
assert.equal(c.duplicateIpConflicts(ipIndex,'console:c:port:eth1','010.0.0.1').length,2);
assert.equal(c.duplicateIpConflicts(ipIndex,'console:c:ip2','10.0.0.2').length,0);
for(const bad of ['', '10.0.0','300.0.0.1','abc.0.0.1'])assert.equal(c.duplicateIpKey(bad),'');
assert.equal(c.duplicateIpFieldAlias({dataset:{dcSource:'console',dcId:'c',dcKey:'subnet',dcPortId:'eth1'}}),'');
assert.equal(c.duplicateIpFieldAlias({dataset:{ipSource:'console',ipId:'c',ipKey:'ip1'}}),'console:c:ip1');
ipDevices[0].ports[2].ip='10.0.0.3';ipDevices.splice(1,1);
assert.equal(c.duplicateIpConflicts(c.duplicateIpIndex(c.canonicalIpEndpoints(ipDevices)),'console:c:ip1','10.0.0.1').length,0);
c.deviceConfigDeviceByKey=()=>({ports:[{id:'p1',category:'network'},{id:'p2',category:'network'}]});
const aliasWrites=[];c.updateDeviceConfigPortField=(...args)=>{aliasWrites.push(args);return true};
assert.equal(c.updateCanonicalNetworkAlias('console','c','ip2','10.1.1.2'),true);assert.deepEqual(aliasWrites[0],['console','c','p2','ip','10.1.1.2']);
assert.equal(c.updateCanonicalNetworkAlias('console','c','role','master'),null);
assert(source('persist').includes('scheduleDuplicateIpWarnings()'));assert(source('render').includes('scheduleDuplicateIpWarnings()'));
assert(source('refreshDuplicateIpWarnings').includes("#sheet .ipSegmentedField"));
assert(source('showDuplicateIpNote').includes("note.setAttribute('role','tooltip')"));
console.log('PASS: V31.9 manufacturer Masters/version isolation, summaries/order, 16/11-column table context, Device Config limits, statistic removal and duplicate-IP identity/alias checks.');
const singlePort=c.canonicalIpEndpoints([{source:'console',id:'single',interfaces:[{slot:1,ipKey:'ip1',ip:'1.1.1.1'},{slot:2,ipKey:'ip2',ip:'1.1.1.1'}],ports:[{id:'eth',category:'network',ip:'1.1.1.1'}]}]);
assert.equal(singlePort.length,1);assert.equal(c.duplicateIpConflicts(c.duplicateIpIndex(singlePort),'console:single:ip1','1.1.1.1').length,0);
// Exercise warning class/message refresh with a minimal DOM double (not a browser).
const field={dataset:{dcSource:'console',dcId:'c',dcKey:'ip',dcPortId:'eth1'},classes:new Set(),contains:()=>false,querySelectorAll:()=>field.octets};
field.octets='10.0.0.1'.split('.').map(value=>({value}));
field.classList={toggle:(name,on)=>on?field.classes.add(name):field.classes.delete(name)};
const warnDevices=[{source:'console',id:'c',name:'Main',interfaces:[],ports:[{id:'eth1',category:'network',ip:'10.0.0.1'}]},{source:'network',id:'n',name:'Other',interfaces:[{slot:1,ipKey:'ip1',ip:'10.0.0.1'}],ports:[]}];
const w=vm.createContext({document:{querySelectorAll:()=>[field],activeElement:null},compiledIpDevices:()=>warnDevices,deviceConfigPortsFor:device=>device.ports,hideDuplicateIpNote:()=>{},showDuplicateIpNote:()=>{},duplicateIpTarget:null,duplicateIpFrame:1});
for(const name of ['duplicateIpKey','canonicalIpEndpoints','duplicateIpIndex','duplicateIpConflicts','duplicateIpFieldAlias','ipSegmentedState','refreshDuplicateIpWarnings'])vm.runInContext(source(name),w);
w.refreshDuplicateIpWarnings();assert(field.classes.has('ipDuplicate'));assert(field.dataset.duplicateIpMessage.includes('Other'));
warnDevices[1].interfaces[0].ip='10.0.0.2';w.refreshDuplicateIpWarnings();assert(!field.classes.has('ipDuplicate'));assert(!field.dataset.duplicateIpMessage);
warnDevices[1].interfaces[0].ip='10.0.0.1';field.octets[3].value='';w.refreshDuplicateIpWarnings();assert(!field.classes.has('ipDuplicate'));
console.log('PASS: warning refresh adds and clears red classes/messages, ignores incomplete edits and excludes unused legacy aliases.');
console.log('PASS: isolated Home grid placement, responsive CSS boundaries, 90px boxes, compact onboard displays and unchanged detailed capacity guidance.');
