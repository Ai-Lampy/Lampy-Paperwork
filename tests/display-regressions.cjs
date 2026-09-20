const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..')+'/',html=fs.readFileSync(root+'index.html','utf8');
const appVersion=html.match(/^const VERSION='([^']+)';$/m)?.[1];
assert(appVersion,'Application version declaration is missing');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const s=html.slice(start,end+1);try{new Function('return ('+s+')');return s}catch{}}throw Error(name)}
const c=vm.createContext({console,TextEncoder,TextDecoder,Uint8Array,crypto:require('crypto').webcrypto,btoa,atob,VERSION:'32'});
function add(...names){for(const name of names)vm.runInContext(source(name),c)}
add('escapeJsAttr','safeEncodeURIComponent');
// V32.2 header/rack regression checks: bounds, recovery, scheduling and layout variants.
add('applicationTitleFontSize');
assert.equal(c.applicationTitleFontSize(1000,size=>size*10),28);
assert.equal(c.applicationTitleFontSize(50,size=>size*10),8);
assert(c.applicationTitleFontSize(200,size=>size*10)>=19.9&&c.applicationTitleFontSize(200,size=>size*10)<=20);
assert.equal(c.applicationTitleFontSize(280,size=>size*10),28);
assert.equal(c.applicationTitleFontSize(0,size=>size*10),8);
assert.match(html,/grid-template-columns:240px minmax\(0,1fr\) 400px/);
assert.match(html,/\.top #projectHeaderLogoSlot\{width:240px;max-width:100%\}/);
assert.match(html,/\.topActions\{display:grid;grid-template-columns:max-content max-content 165px;[^}]*width:400px;[^}]*gap:4px/);
assert.match(html,/\.reportIssueBtn\{border:2px solid #111;[^}]*border-radius:60px;padding:8px 8px/);
assert.match(html,/\.tourLogoSlot\{[^}]*width:165px/);
assert.match(html,/\.topTitle h1\{[^}]*white-space:nowrap;[^}]*line-height:1\.05/);
assert.match(html,/@media\(max-width:900px\)\{\.top\{grid-template-columns:1fr/);
for(const [selector,columns] of [['.rackWorkspace','375px 690px 360px'],['.rackWorkspace.libraryClosed','690px 360px'],['.rackWorkspace.settingsClosed','375px 690px'],['.rackWorkspace.libraryClosed.settingsClosed','690px']]){
 const rule=html.slice(html.indexOf(selector+'{')).split('}')[0];assert.equal(rule.split('grid-template-columns:')[1].split(';')[0],columns);
}
assert.match(html,/\.rackCard\{width:690px/);assert.match(html,/\.rackSettingsCard\{width:360px/);assert.match(html,/\.rackDeviceLibraryCard\{width:375px/);
assert.match(html,/\.rackWorkspaceHeader\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(html,/\.rackPopoutBody \.rackCard\{width:100%;height:calc\(100vh - 24px\)/);
const titleCallbacks=[],titleEvents=[],titleElement={parentElement:{clientWidth:200,getBoundingClientRect:()=>({left:100})},textContent:'Project ~ Home',style:{}};
const titleContext=vm.createContext({$:()=>titleElement,getComputedStyle:()=>({fontStyle:'normal',fontWeight:'700',fontFamily:'Arial',letterSpacing:'normal'}),document:{createElement:()=>({getContext:()=>({font:'',measureText(){return {width:parseFloat(this.font.split(' ')[2])*10}}})}),fonts:{ready:{then:fn=>titleEvents.push(fn)},addEventListener:(event,fn)=>titleEvents.push(fn)}},window:{addEventListener:(event,fn)=>titleEvents.push(fn)},ResizeObserver:class{constructor(fn){this.callback=fn}observe(element){this.element=element}},requestAnimationFrame:fn=>{titleCallbacks.push(fn);return titleCallbacks.length}});
vm.runInContext('let applicationTitleFitFrame=0,applicationTitleFitStarted=false,applicationTitleResizeObserver=null;',titleContext);
titleContext.document.documentElement={clientWidth:1000};titleContext.layoutTextMeasure=()=>()=>280;
for(const name of ['applicationTitleFontSize','applicationTitlePlacement','fitApplicationTitle','scheduleApplicationTitleFit'])vm.runInContext(source(name),titleContext);
titleContext.scheduleApplicationTitleFit();titleContext.scheduleApplicationTitleFit();assert.equal(titleCallbacks.length,1);assert.equal(titleEvents.length,3);
titleCallbacks[0]();assert(parseFloat(titleElement.style.fontSize)>=19.9);assert.equal(titleElement.title,'Project ~ Home');
titleElement.parentElement.clientWidth=500;titleContext.scheduleApplicationTitleFit();titleCallbacks[1]();assert.equal(titleElement.style.fontSize,'28px');
titleElement.parentElement.clientWidth=50;titleContext.scheduleApplicationTitleFit();titleCallbacks[2]();assert.equal(titleElement.style.fontSize,'8px');assert.equal(titleElement.style.whiteSpace,'normal');assert.equal(titleElement.style.overflow,'visible');
add('applicationTitlePlacement','consoleTableScale');
assert.deepEqual(JSON.parse(JSON.stringify(c.applicationTitlePlacement(100,800,1000,200))),{width:200,offset:300});
assert.deepEqual(JSON.parse(JSON.stringify(c.applicationTitlePlacement(100,300,1000,200))),{width:200,offset:100});
assert.equal(c.consoleTableScale([100,100],402),2);assert.equal(c.consoleTableScale([100,100],100),1);assert.equal(c.consoleTableScale([0,0],100),1);
for(const available of [1000,1600,2400]){const widths=[20,60,130,60,100,110,110,80,70,90,80,70,80,85,80,120],total=widths.reduce((a,b)=>a+b,0)+2,scale=c.consoleTableScale(widths,available);assert(Math.abs(total*scale-Math.max(total,available+2))<0.0001)}
assert.match(source('applyDeviceConfigTableWidths'),/control&&table\.dataset\.consoleTable==='true'\?String\(consoleTableScale/);
const scaleTable={dataset:{consoleTable:'true'},style:{},classList:{add(){}},querySelector:()=>({children:[{style:{}},{style:{}}]}),querySelectorAll:()=>[]},scaleContext=vm.createContext({});
for(const name of ['consoleTableScale','applyDeviceConfigTableWidths'])vm.runInContext(source(name),scaleContext);
scaleContext.applyDeviceConfigTableWidths({table:scaleTable,widths:[100,100],hidden:[false,false],available:402});assert.equal(scaleTable.style.width,'202px');assert.equal(scaleTable.style.zoom,'2');
scaleContext.applyDeviceConfigTableWidths({table:scaleTable,widths:[100,100],hidden:[false,false],available:100});assert.equal(scaleTable.style.zoom,'1');
scaleTable.dataset.consoleTable='false';scaleContext.applyDeviceConfigTableWidths({table:scaleTable,widths:[100,100],hidden:[false,false],available:402});assert.equal(scaleTable.style.zoom,'');
for(const removed of ['matchingConsoleVersion','colourCellMarkup','positionSummaryUsesColour3'])assert(!html.includes('function '+removed+'('));
console.log('PASS: V32.2 header fitting/scheduling and rack width variants (static/VM).');
vm.runInContext(html.split('\n').find(line=>line.startsWith('const CONSOLE_COLUMN_LIMITS=')),c);
add('consoleTableVersionSelect','consoleAvailableVersions','storedConsoleVersion','consoleVersionValue','consoleVersionForMode');
c.consoleRefForItem=item=>c.consoleReference?.consoles.find(ref=>ref.id===item.consoleId);
add('compactConsoleCapacityText','normaliseUniverseLimits','normaliseControlSoftwareModes','modeReference','parameterDataForMode','parameterCountFromData','parameterCountForReference','referenceCapacity','storedDeviceCapacity','parametersForStoredItem','universeProcessingWithTnp','universeCapacityLines','deviceCapacityLines','consoleCardCapacityText','controlTableCapacityText','totalControlNetworkParameters','totalControlNetworkParametersForMode','homeParametersAvailable');
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
const d9=c.referenceCapacity(refs.find(d=>d.id==='avolites-d9-330'),'Titan'),d3=c.referenceCapacity(refs.find(d=>d.id==='avolites-d3-110'),'Titan');
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
vm.runInContext(html.split('\n').find(line=>line.startsWith('const DEVICE_CONFIG_WIDTH_DEFAULTS=')),c);
add('deviceConfigColumnLimits','calculateDeviceConfigWidths');
for(const width of [320,1280,1920]){const w=c.calculateDeviceConfigWidths(Array(13).fill(300),width,false);assert(w[6]>=110);assert(w[7]>=110);if(width>=1280)assert(Math.abs(w.reduce((sum,value)=>sum+value,0)-width)<0.001)}
for(const width of [320,1280,1920]){const w=c.calculateDeviceConfigWidths(Array(16).fill(300),width,true,[],true);assert.equal(w[5],110);assert.equal(w[6],110);assert(w[10]<=80)}
assert.deepEqual(JSON.parse(JSON.stringify(c.deviceConfigColumnLimits(1,false,false))),{min:45,max:70});assert.deepEqual(JSON.parse(JSON.stringify(c.deviceConfigColumnLimits(2,false,false))),{min:40,max:60});
assert.deepEqual(JSON.parse(JSON.stringify(c.deviceConfigColumnLimits(1,true,true))),{min:40,max:60});
assert(html.includes('@container homePositions (min-width:238px)'));assert(html.includes('@container homePositions (min-width:484px)'));assert(html.includes('grid-template-columns:repeat(4,minmax(0,1fr))'));assert(html.includes('text-align-last:center'));assert(html.includes('padding:2px 8px!important'));
Object.assign(c,{escapeHtml:v=>String(v??''),escapeAttr:v=>String(v??''),parameterDetailsMarkup:()=>'',controlReferencePreviewMarkup:()=>'',versionPairText:()=>'',consoleLibraryNetworkInfoMarkup:()=>'',controlDeviceSoftwareVersionText:()=>'',controlCardHeadingMarkup:()=>'',dmxPortTableMarkup:()=>'',controlCardMediaMarkup:()=>'',consoleRoleButtonsMarkup:()=>'',controlCardActionButtonsMarkup:()=>'',controlPositionStripMarkup:()=>'',ipVlanSetup:()=>({enabled:true})});
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
add('deviceConfigNetworkPorts','deviceConfigNetworkParentMode','deviceConfigIsLuminex','deviceConfigPromotedNetworkPort','deviceConfigVisiblePorts','deviceConfigHasSecondaryInterface','deviceConfigHasChildren','deviceConfigFacingText','deviceConfigInput','deviceConfigLocationControl','deviceConfigRowWithLocation','deviceConfigRowWithEmptyLocation','deviceConfigParentRow','deviceConfigPortRow','deviceConfigInterfaceTwoRow','deviceConfigTableMarkup','controlTableCellAttrs','controlTableParentExtraCells','controlTableAppendCells','controlTableBlankExtraCells','controlDeviceConfigTableMarkup');
const dev={id:'a',source:'console',name:'D9 parent',interfaces:[],ports:[{id:'eth-1',category:'network',sub:'ETH 1'},{id:'dmx-1',category:'dmx',sub:'DMX 1'}]};
c.deviceConfigExpandedDevices.clear();c.controlExpandedDevices.clear();c.activeControlNetworkTab='consoles';c.controlExpandedDevices.add('console:a');
let control=c.controlDeviceConfigTableMarkup([dev]),config=c.deviceConfigTableMarkup([dev]);
assert.equal((control.match(/<tr\b/g)||[]).length,4);assert.equal((config.match(/<tr\b/g)||[]).length,2);
assert(control.includes("'console:a','control'"));assert(config.includes("'console:a','deviceConfig'"));assert(control.includes('<th>Capacity</th>'));assert(control.includes('32 Uni'));assert(!control.includes('System Limit:'));
c.deviceConfigExpandedDevices.add('console:a');c.controlExpandedDevices.clear();control=c.controlDeviceConfigTableMarkup([dev]);config=c.deviceConfigTableMarkup([dev]);assert.equal((control.match(/<tr\b/g)||[]).length,2);assert.equal((config.match(/<tr\b/g)||[]).length,3);assert(!config.includes('ETH 1'));assert(config.includes('DMX 1'));
for(const sourceType of ['console','npu','network']){const one={...dev,source:sourceType,ports:[dev.ports[0]],interfaces:[]};assert.equal(c.deviceConfigPromotedNetworkPort(one)?.id,'eth-1');assert.equal(c.deviceConfigVisiblePorts(one).length,0);assert.equal(c.deviceConfigHasChildren(one),false);assert(!c.deviceConfigParentRow(one,0).includes('deviceConfigTreeButton'))}
const multi={...dev,source:'network',ports:[dev.ports[0],{...dev.ports[0],id:'eth-2',sub:'ETH 2'}]};assert.equal(c.deviceConfigPromotedNetworkPort(multi),null);assert.equal(c.deviceConfigVisiblePorts(multi).length,2);assert(c.deviceConfigParentRow(multi,0).includes('<td class="deviceConfigIpCol"></td>'));assert(c.deviceConfigPortRow(multi,multi.ports[0],1).includes('data-dc-port-id="eth-1"'));
assert.equal(c.deviceConfigFacingText('rear'),'Rear');assert.equal(c.deviceConfigFacingText('side/end'),'Side / End');
const oldSegmented=c.deviceConfigSegmentedInput,oldProtocol=c.deviceConfigProtocolSelect,oldVlan=c.deviceConfigVlanSelect;c.deviceConfigSegmentedInput=(device,key)=>`<seg data-key="${key}"></seg>`;c.deviceConfigProtocolSelect=()=>'<protocol></protocol>';c.deviceConfigVlanSelect=()=>'<vlan></vlan>';
const managementBase={...multi,interfaces:[{slot:1,ip:'10.0.0.1',ipKey:'ip1',subnet:'255.255.255.0',subnetKey:'subnet1',vlan:'2',vlanKey:'vlan1'}],ports:multi.ports.map((port,index)=>({...port,facing:index?'rear':'front'}))},dmxNode={...managementBase,reference:{type:'DMX Node'}},networkSwitch={...managementBase,reference:{type:'Network Switch'}};
assert.equal(c.deviceConfigNetworkParentMode(dmxNode),'dmx-node');assert.equal(c.deviceConfigPromotedNetworkPort(dmxNode),null);assert.equal(c.deviceConfigVisiblePorts(dmxNode).length,2);assert.equal(c.deviceConfigHasSecondaryInterface({...dmxNode,interfaces:[...dmxNode.interfaces,{slot:2}]}),false);
const singleNode={...dmxNode,ports:[dmxNode.ports[0]]},singleSwitch={...networkSwitch,ports:[networkSwitch.ports[0]]};assert.equal(c.deviceConfigPromotedNetworkPort(singleNode)?.id,'eth-1');assert.equal(c.deviceConfigVisiblePorts(singleNode).length,0);assert.equal(c.deviceConfigPromotedNetworkPort(singleSwitch)?.id,'eth-1');assert.equal(c.deviceConfigVisiblePorts(singleSwitch).length,0);
const nodeParent=c.deviceConfigParentRow(dmxNode,0),singleNodeParent=c.deviceConfigParentRow(singleNode,0),switchParent=c.deviceConfigParentRow(networkSwitch,0),nodePort=c.deviceConfigPortRow(dmxNode,dmxNode.ports[0],1),switchPort=c.deviceConfigPortRow(networkSwitch,networkSwitch.ports[0],1),singleSwitchParent=c.deviceConfigParentRow(singleSwitch,0),luminexNode={...dmxNode,reference:{type:'DMX Node',manufacturer:'Luminex'}};assert(nodeParent.includes('<seg data-key="ip1">'));assert(nodeParent.includes('<protocol>'));assert(!nodeParent.includes('<vlan>'));assert(singleNodeParent.includes('<vlan>'));assert(switchParent.includes('<seg data-key="ip1">'));assert(!switchParent.includes('<protocol>'));assert(!switchParent.includes('<vlan>'));assert(!nodePort.includes('<seg'));assert(!nodePort.includes('<protocol>'));assert(!nodePort.includes('<vlan>'));assert(nodePort.includes('>Front<'));assert(switchPort.includes('<vlan>'));assert(singleSwitchParent.includes('<vlan>'));assert(c.deviceConfigPortRow(luminexNode,luminexNode.ports[0],1).includes('<vlan>'));
c.deviceConfigSegmentedInput=oldSegmented;c.deviceConfigProtocolSelect=oldProtocol;c.deviceConfigVlanSelect=oldVlan;
for(const [markup,count] of [[control,16],[config,14]])for(const [,row] of markup.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g))assert.equal((row.match(/<t[dh]\b/g)||[]).length,count);
assert(config.includes('>Location<'));assert(config.includes('deviceConfigFacingCol'));assert(config.includes('data-dc-key="location"'));assert(config.includes('data-dc-col="11"'));assert(config.includes('data-dc-col="12"'));
assert(!config.includes('minimum width'));assert(!config.includes('maximum width'));
const rackLocation=c.canonicalDeviceRackPlacement;c.canonicalDeviceRackPlacement=()=>({rack:{location:'Rack Room'}});assert(c.deviceConfigLocationControl(dev,'Ignored',0,11,'',true).includes('Managed by Rack Layout'));assert(c.deviceConfigLocationControl(dev,'Port Location',0,11,'eth-1',false).includes('data-dc-port-id="eth-1"'));c.canonicalDeviceRackPlacement=rackLocation;
const portContext=vm.createContext({normaliseVlan:value=>String(value||'0')});vm.runInContext(source('normaliseDeviceConfigPort'),portContext);assert.equal(portContext.normaliseDeviceConfigPort({id:'p',location:'Dimmer City'}).location,'Dimmer City');assert.equal(portContext.normaliseDeviceConfigPort({id:'p'}).location,'');
assert(source('deviceConfigPortsFor').includes("if(!Object.hasOwn(raw,'location')&&!(definition.category==='dmx'&&device.source==='network'))base.location=device.location||''"));
assert(source('updateDeviceConfigField').includes("if(key==='location'&&!portId)render()"));
assert(config.includes('deviceConfigDeleteButton'));assert(config.includes('❌'));assert(!control.includes('deviceConfigDeleteButton'));
assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('DEVICE_CONFIG_WIDTH_DEFAULTS',c))),[[30,30],[45,70],[40,60],[100,130],[60,60],[100,180],[110,110],[110,110],[40,100],[40,100],[40,150],[80,120],[80,90],[110,180],[70,110],[80,120],[90,220],[34,34]]);
const directionContext=vm.createContext({escapeHtml:c.escapeHtml,escapeAttr:c.escapeAttr});vm.runInContext(source('connectorDefaultDirection'),directionContext);vm.runInContext(source('deviceConfigDirectionSelect'),directionContext);const directionDevice={source:'network',id:'n'};assert.equal(directionContext.connectorDefaultDirection('XLR-5 female','input'),'output');assert.equal(directionContext.connectorDefaultDirection('XLR-5 male','output'),'input');assert.equal(directionContext.connectorDefaultDirection('RJ45','network'),'network');assert(!directionContext.deviceConfigDirectionSelect(directionDevice,{id:'p',direction:'network',directions:['network']},0,9).includes('<select'));const bidirectional=directionContext.deviceConfigDirectionSelect(directionDevice,{id:'p',type:'XLR-5 female',direction:'',directions:['input','output']},0,9);assert(bidirectional.includes('<select'));assert(bidirectional.includes('>Input<'));assert(bidirectional.includes('>Output<'));assert(bidirectional.includes('value="output" selected'));assert(!bidirectional.includes('>Network<'));assert(directionContext.deviceConfigDirectionSelect(directionDevice,{id:'p',direction:'output',directions:[]},0,9).includes('>Bidirectional<'));
add('bytesToBase64','base64ToBytes','sha256Base64','packageProjectPayload','unpackProjectPayload');
(async()=>{const p={appVersion:'32',app:{controlNetwork:{consoles:[avo,backup,main],npus:[]}}};const out=await c.unpackProjectPayload(await c.packageProjectPayload(p));assert.equal(JSON.stringify(out),JSON.stringify(p));const located={app:{controlNetwork:{networkDevices:[{id:'n',deviceConfigPorts:[{id:'p',location:'Dimmer City'}]}]}}};const locatedOut=await c.unpackProjectPayload(await c.packageProjectPayload(located));assert.equal(locatedOut.app.controlNetwork.networkDevices[0].deviceConfigPorts[0].location,'Dimmer City');console.log('PASS: Avolites reference limits/images/ports; D9 and D3 TNP examples; mixed/backup/legacy totals; expansion isolation; 110px limits; UI capacity labels; position counts; project package round trip.');})().catch(e=>{console.error(e);process.exitCode=1});


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
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));

// V32: capacity statistics and dashboard compatibility, without browser automation.
add('avolitesProjectConsoles','projectCapacityStats','avolitesUniversesAvailable','fixtureChannelCount','controlParameterSummaryMarkup','normaliseHomeLayout','factoryHomeLayout','homeStat','homeStatsMarkup');
for(const name of ['HOME_STAT_LAYOUT_IDS','HOME_SUMMARY_LAYOUT_IDS'])vm.runInContext(html.split('\n').find(line=>line.startsWith('const '+name+'=')),c);
const d3Console={...avo,id:'d3',consoleId:refs.find(ref=>ref.id==='avolites-d3-110').id,role:'master'};
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
assert.deepEqual(ids,['fixtures','universes','consoles','parameters-required','channel-count','parameters-available','universes-available','distros','looms','data-racks']);
assert(!ids.includes('max-universes-required'));
assert.equal(layout.stats.find(item=>item.id==='parameters-available').visible,false);assert(layout.stats.every(item=>item.size==='standard'));
assert.equal(layout.summaries.at(-1).id,'revision-summary');assert.equal(layout.summaries.at(-1).size,'wide');
assert.equal(JSON.stringify(c.normaliseHomeLayout(layout)),JSON.stringify(layout));
const reordered=JSON.parse(JSON.stringify(layout));reordered.stats.unshift(reordered.stats.splice(reordered.stats.findIndex(item=>item.id==='channel-count'),1)[0]);reordered.stats[0].visible=false;
const renormalised=c.normaliseHomeLayout(reordered);assert.deepEqual(Array.from(renormalised.stats,item=>item.id),ids);assert.equal(renormalised.stats.find(item=>item.id==='channel-count').visible,false);
c.ensureHomeLayout=()=>layout;c.patchFixtureRows=()=>[{channels:513}];c.fixtureParametersRequired=()=>12;c.normaliseLooms=value=>Array.isArray(value)?value:[];c.app.looms=[];c.homeCustomising=false;c.homeLayoutControlsMarkup=()=>'';c.activeControlNetworkTab='consoles';
const renderStats=()=>c.homeStatsMarkup({universeCount:7,socapexCount:0},[],1);
c.app.controlNetwork.consoles=[d9Console];
let statsMarkup=renderStats();
assert(statsMarkup.includes('Channel Count'));assert(!statsMarkup.includes('Max Universes Required'));assert(statsMarkup.includes('Universes Available'));assert(!statsMarkup.includes('Parameters Required'));assert(!statsMarkup.includes('Parameters Available'));
assert(!statsMarkup.includes('Theoretical packed-channel estimate'));assert(statsMarkup.includes('homeStatValue">513</div>'));
assert(c.controlParameterSummaryMarkup().includes('Universes Available'));
c.app.controlNetwork.consoles.push(main);
statsMarkup=renderStats();assert(statsMarkup.includes('Parameters Required'));assert(statsMarkup.includes('Parameters Available'));assert(statsMarkup.includes('Universes Available'));
assert(c.controlParameterSummaryMarkup().includes('Mode 3 Parameters'));
c.app.controlNetwork.consoles=[main];statsMarkup=renderStats();assert(!statsMarkup.includes('Universes Available'));assert(!statsMarkup.includes('Channel Count'));assert(statsMarkup.includes('Parameters Available'));
c.app.controlNetwork.consoles=[];statsMarkup=renderStats();assert(!statsMarkup.includes('Universes Available'));assert(statsMarkup.includes('Parameters Required'));
c.app.controlNetwork.consoles=[d9Console];c.app.controlNetwork.npus=[{npuId:'npu',softwareMode:'Mode 3'}];assert(renderStats().includes('Parameters Available'));
assert.equal(JSON.stringify(layout),JSON.stringify(c.normaliseHomeLayout(legacyLayout)));
console.log('PASS: Master/Backup/missing-reference capacity, channel boundaries, mixed/empty projects, conditional statistics and legacy dashboard layouts.');

// V32: shared table context, manufacturer roles and canonical duplicate IPs.
add('consoleManufacturerKey','makeConsoleRoleUnique','canonicalIpEndpoints','duplicateIpKey','duplicateIpIndex','duplicateIpConflicts','duplicateIpFieldAlias','consoleHomeSummaryMarkup','controlNetworkSummaryMarkup','controlLocationGroups','controlEffectiveName','deviceConfigGroupTablesMarkup','ipDeviceInterfaces','updateCanonicalNetworkAlias');
const maMaster={...main,id:'ma-master',manufacturer:'MA Lighting',role:'master',softwareVersionValue:'MA-1'},maSecond={...maMaster,id:'ma-second',role:'backup'};
const avoMaster={...d9Console,id:'avo-master',role:'master',softwareVersionValue:'Titan-1'},avoSecond={...avoMaster,id:'avo-second',role:'backup'};
c.app.controlNetwork={consoles:[maMaster,maSecond,avoMaster,avoSecond],npus:[],networkDevices:[],racks:[]};
maSecond.role='master';c.makeConsoleRoleUnique(maSecond);assert.equal(maMaster.role,'backup');assert.equal(avoMaster.role,'master');
avoSecond.role='master';c.makeConsoleRoleUnique(avoSecond);assert.equal(avoMaster.role,'backup');assert.equal(maSecond.role,'master');
assert.equal(c.consoleManufacturerKey({manufacturer:' MA-Lighting '}),c.consoleManufacturerKey({manufacturer:'MA Lighting'}));
c.consoleVersionValue=version=>version.version;c.applyConsoleVersion=(item,version)=>item.syncedVersion=version.version;
assert.equal(maMaster.softwareVersionValue,'MA-1');assert.equal(avoMaster.softwareVersionValue,'Titan-1');assert(!html.includes('function syncConsolesToMasterVersion'));
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

for(const available of [500,1280,2400]){const widths=c.calculateDeviceConfigWidths(Array(13).fill(300),available,false);assert(widths[6]>=110);assert(widths[7]>=110);if(available>=1280)assert(Math.abs(widths.reduce((sum,value)=>sum+value,0)-available)<0.001)}
for(const available of [500,1280,2400]){const widths=c.calculateDeviceConfigWidths(Array(16).fill(300),available,true);assert.equal(widths[5],110);assert.equal(widths[6],110);assert(widths[10]<=80);assert(widths[8]<=60)}
const deviceLimits=[[30,30],[45,70],[40,60],[100,130],[60,60],[100,180],[110,110],[110,110],[40,100],[40,100],[40,150],[80,120],[80,90],[110,180],[70,110],[80,120],[90,220],[34,34]];
deviceLimits.forEach(([min,max],index)=>assert.deepEqual(JSON.parse(JSON.stringify(c.deviceConfigColumnLimits(index,false))),{min,max}));
c.deviceConfigExpandedDevices.add('console:a');c.controlExpandedDevices.clear();
const dcConsole=c.controlDeviceConfigTableMarkup([dev],'deviceConfig');
assert(dcConsole.includes('data-table-view="deviceConfig"'));assert(dcConsole.includes("'console:a','deviceConfig'"));assert(dcConsole.includes("setDeviceConfigSort('name')"));
for(const [,row]of dcConsole.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g))assert.equal((row.match(/<t[dh]\b/g)||[]).length,18);
assert(dcConsole.includes('data-dc-col="16"'));assert(dcConsole.includes('deviceConfigFacingCol'));
const mixedTables=c.deviceConfigGroupTablesMarkup([dev,{...dev,id:'n',source:'network'}]);assert.equal((mixedTables.match(/<table /g)||[]).length,2);
assert(source('measureDeviceConfigTable').includes("table.dataset.tableView!=='deviceConfig'"));
assert(html.includes('.deviceConfigView .deviceConfigTable.deviceConfigMeasured .controlLocationCell{max-width:none}'));
const migrated=c.normaliseHomeLayout({stats:[{id:'max-universes-required',visible:true},{id:'channel-count',visible:false,size:'wide'}]});
assert(!migrated.stats.some(item=>item.id==='max-universes-required'));assert.equal(migrated.stats[0].id,'fixtures');assert.equal(migrated.stats.find(item=>item.id==='channel-count').visible,false);assert.equal(migrated.stats.find(item=>item.id==='channel-count').size,'standard');

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
console.log('PASS: V32 manufacturer Masters/version isolation, summaries/order, mixed table context, Device Config limits, statistic removal and duplicate-IP identity/alias checks.');
const singlePort=c.canonicalIpEndpoints([{source:'console',id:'single',interfaces:[{slot:1,ipKey:'ip1',ip:'1.1.1.1'},{slot:2,ipKey:'ip2',ip:'1.1.1.1'}],ports:[{id:'eth',category:'network',ip:'1.1.1.1'}]}]);
assert.equal(singlePort.length,1);assert.equal(c.duplicateIpConflicts(c.duplicateIpIndex(singlePort),'console:single:ip1','1.1.1.1').length,0);
// Exercise warning class/message refresh with a minimal DOM double (not a browser).
const field={dataset:{dcSource:'console',dcId:'c',dcKey:'ip',dcPortId:'eth1'},classes:new Set(),contains:()=>false,querySelectorAll:()=>field.octets};
field.octets='10.0.0.1'.split('.').map(value=>({value}));
field.classList={toggle:(name,on)=>on?field.classes.add(name):field.classes.delete(name)};
const warnDevices=[{source:'console',id:'c',name:'Main',interfaces:[],ports:[{id:'eth1',category:'network',ip:'10.0.0.1'}]},{source:'network',id:'n',name:'Other',interfaces:[{slot:1,ipKey:'ip1',ip:'10.0.0.1'}],ports:[]}];
const w=vm.createContext({document:{querySelectorAll:()=>[field],activeElement:null},compiledIpDevices:()=>warnDevices,deviceConfigPortsFor:device=>device.ports,hideDuplicateIpNote:()=>{},showDuplicateIpNote:()=>{},duplicateIpTarget:null,duplicateIpFrame:1,duplicateIpTimer:null,clearTimeout:()=>{}});
for(const name of ['duplicateIpKey','canonicalIpEndpoints','duplicateIpIndex','duplicateIpConflicts','duplicateIpFieldAlias','ipSegmentedState','refreshDuplicateIpWarnings'])vm.runInContext(source(name),w);
w.refreshDuplicateIpWarnings();assert(field.classes.has('ipDuplicate'));assert(field.dataset.duplicateIpMessage.includes('Other'));
warnDevices[1].interfaces[0].ip='10.0.0.2';w.refreshDuplicateIpWarnings();assert(!field.classes.has('ipDuplicate'));assert(!field.dataset.duplicateIpMessage);
warnDevices[1].interfaces[0].ip='10.0.0.1';field.octets[3].value='';w.refreshDuplicateIpWarnings();assert(!field.classes.has('ipDuplicate'));
console.log('PASS: warning refresh adds and clears red classes/messages, ignores incomplete edits and excludes unused legacy aliases.');

// V32: table scope, network routes and active project-error detection.
add('compactConsoleCapacityText','consoleCellFontSize','detectProjectErrors','reconcileProjectErrors','duplicateAddressKey');
assert.equal(c.compactConsoleCapacityText({kind:'parameters',parameters:20480}),'20,480');
assert.equal(c.compactConsoleCapacityText({kind:'universes',onboardProcessing:32}),'32 Uni');
assert.equal(c.controlTableCapacityText({kind:'parameters',parameters:4096}),'Parameters: 4,096');
assert.equal(c.consoleCellFontSize(40,60),12);assert.equal(c.consoleCellFontSize(120,60),9);assert.equal(c.consoleCellFontSize(100,90),10.8);
{const widths=c.calculateDeviceConfigWidths(Array(16).fill(250),1600,true,[],true);assert(widths[7]<=80);assert(widths[9]<=90)}
{const widths=c.calculateDeviceConfigWidths(Array(17).fill(250),1600,false,[],true);assert(widths[6]>=110);assert(widths[7]>=110)}
assert.equal(c.deviceConfigColumnLimits(7,true,false).min,90);
assert.equal(c.deviceConfigColumnLimits(8,false,false).max,100);
assert.equal(c.deviceConfigColumnLimits(10,false,false).max,150);
const goodPatch={id:'p1',fixId:'1',fixture:'Light',universe:'1',address:'1',channels:10,mode:'Standard'};
assert.equal(c.detectProjectErrors([],[],new Set()).length,0);
assert.equal(c.detectProjectErrors([],[goodPatch],new Set()).length,0);
const conflictPatch=[goodPatch,{...goodPatch,id:'p2',address:'5'}],detected=c.detectProjectErrors([],conflictPatch,new Set());
assert.equal(detected.length,2);assert(detected.some(error=>error.id==='fixture-id:1'));assert(detected.some(error=>error.id.startsWith('overlap:')));
assert.equal(c.detectProjectErrors([],conflictPatch,new Set(['p1|p2'])).length,1);
const bad=c.detectProjectErrors([],[{...goodPatch,universe:'',address:'0',channels:0,mode:''}],new Set());
assert.equal(bad.length,4);assert.equal(new Set(bad.map(error=>error.id)).size,4);
assert(c.detectProjectErrors([],[{...goodPatch,address:510}],new Set()).some(error=>error.id==='range:p1'));
assert(c.detectProjectErrors([],[{...goodPatch,universe:'1x'}],new Set()).some(error=>error.id==='invalid:p1:universe'));
const duplicateEndpoints=[{key:'a',aliases:['a'],name:'A',port:'ETH 1',ip:'10.0.0.1'},{key:'b',aliases:['b'],name:'B',port:'ETH 1',ip:'010.0.0.001'},{key:'c',aliases:['c'],name:'C',port:'ETH 1',ip:'10.0..1'}];
const ipErrors=c.detectProjectErrors(duplicateEndpoints,[],new Set());assert.equal(ipErrors.length,2);
assert.equal(ipErrors.find(error=>error.id.startsWith('duplicate-ip:')).targets.length,2);
let order=0,errors=c.reconcileProjectErrors(new Map(),detected,()=>++order);
const initialOrder=errors.get('fixture-id:1').order;
errors=c.reconcileProjectErrors(errors,detected,()=>++order);assert.equal(order,2);assert.equal(errors.get('fixture-id:1').order,initialOrder);
errors=c.reconcileProjectErrors(errors,[],()=>++order);assert.equal(errors.size,0);
errors=c.reconcileProjectErrors(errors,detected,()=>++order);assert(errors.get('fixture-id:1').order>initialOrder);
assert(source('collectProjectErrors').includes('app.fixturePatch||[]'));assert(!source('collectProjectErrors').includes('patchSheets'));
assert(source('openProjectError').includes('deviceConfigExpandedDevices.add'));assert(source('openProjectError').includes("activePatchSheetId='master'"));
assert(source('openProjectError').includes('fixturePatchViewOptions.columns[column.key]=true'));
assert(source('clearProjectState').includes('resetProjectErrors()'));assert(source('loadProjectPayload').includes('resetProjectErrors()'));
assert(!html.includes('data-sheet-tab="deviceConfig"'));assert(!html.includes('data-sheet-tab="ipAddresses"'));assert(html.includes('data-sheet-tab="network"'));
const navigation=vm.createContext({activeNetworkSubTab:'deviceConfig',activeSheetTab:'home',activeControlNetworkTab:'consoles',controlViewMode:'card',activeDistroLabelTab:'labels',labelsHaveBeenGenerated:()=>false,render:()=>{},closeProjectErrorsMenu:()=>{},closeFrontEditorPane:()=>{},closeFanOutFormat:()=>{},closePatchFormatModal:()=>{},closeDeviceConfigFormat:()=>{},closeDeviceConfigColumns:()=>{},closeRackEditor:()=>{},closeSheetSubMenus:()=>{}});
for(const name of ['setSheetTab','activeApplicationPageName'])vm.runInContext(source(name),navigation);
navigation.setSheetTab('network');assert.equal(navigation.activeSheetTab,'deviceConfig');assert.equal(navigation.activeApplicationPageName(),'Network ~ Device Config');
navigation.setSheetTab('ipAddresses');assert.equal(navigation.activeSheetTab,'deviceConfig');assert.equal(navigation.activeApplicationPageName(),'Network ~ Device Config');
const menu={dataset:{},innerHTML:'',contains:()=>false},menuProject={ignoredProjectErrors:[]},menuContext=vm.createContext({projectErrors:new Map(),document:{activeElement:null},$:()=>menu,escapeAttr:c.escapeAttr,escapeHtml:c.escapeHtml,ensureProjectInfo:()=>menuProject});
for(const name of ['projectErrorToken','ignoredProjectErrorIds','orderedProjectErrors','activeProjectErrorList','updateProjectErrorsMenu'])vm.runInContext(source(name),menuContext);
menuContext.updateProjectErrorsMenu();assert(menu.innerHTML.includes('No active project errors'));assert(menu.innerHTML.includes('Show All Errors'));
for(let i=0;i<7;i++)menuContext.projectErrors.set(String(i),{id:String(i),description:'Error '+i,order:i});
menuContext.updateProjectErrorsMenu();assert.equal((menu.innerHTML.match(/data-error-key=/g)||[]).length,5);assert(menu.innerHTML.indexOf('Error 6')<menu.innerHTML.indexOf('Error 5'));assert(!menu.innerHTML.includes('Error 1'));
menuProject.ignoredProjectErrors=['6'];menu.dataset.content='';menuContext.updateProjectErrorsMenu();assert(!menu.innerHTML.includes('Error 6'));assert(menu.innerHTML.includes('Error 5'));
assert(source('handleProjectErrorsKeydown').includes("event.key==='Escape'"));assert(source('updateProjectErrorsPage').includes('groupedProjectErrors(visible)'));
for(const file of ['info_txt/welcome_message.json','info_txt/walkthrough.json']){const doc=JSON.parse(fs.readFileSync(root+file));assert(doc.title.includes('V47'));assert(JSON.stringify(doc).includes('Power'));assert(JSON.stringify(doc).length>300)}
console.log('PASS: V32 console-only caps/text fitting, Network routing, grouped errors, validation boundaries, recency/resolution, and current major-release JSON.');
assert.equal(menuContext.projectErrorToken("fixture-id:FOH's"),'fixture-id%3AFOH%27s');
navigation.setSheetTab('networkEquipment');assert.equal(navigation.activeNetworkSubTab,'deviceConfig');

// V32.2: independent, model-specific software and temporary shared width controls.
const versionRefs={ma:{softwareVersions:[{mode3:'2.5',mode2:'3.9'},{mode3:'2.4',mode2:'3.8'}]},avo:{softwareVersions:[{platform:'Titan',version:'19.2'},{platform:'Titan',version:'18.0'}]},empty:{softwareVersions:[]}};
const versionItems={m:{consoleId:'ma',softwareMode:'Mode 3',softwareVersionMode3:'2.4',softwareVersionMode2:'3.8'},a:{consoleId:'avo',softwareMode:'Titan',softwareVersionPlatform:'Titan',softwareVersionValue:'18.0'},u:{consoleId:'ma',softwareMode:'Mode 3',softwareVersionCustom:'Legacy 1'}};
const v=vm.createContext({consoleRefForItem:item=>versionRefs[item.consoleId],ipAddressSourceItem:(source,id)=>versionItems[id],updateCanonicalNetworkAlias:()=>null,canonicalDeviceRackPlacement:()=>null,syncRackMountedNetworkLocations:()=>{},scheduleRackPopoutWindowsSync:()=>{},escapeAttr:c.escapeAttr,escapeHtml:c.escapeHtml,controlTableCellAttrs:()=>'',subnetGlobalKeyForField:()=>''});
for(const name of ['storedConsoleVersion','consoleAvailableVersions','consoleVersionValue','consoleVersionForMode','applyConsoleVersion','controlDeviceSoftwareVersionText','consoleTableVersionSelect','updateCanonicalDeviceField','deviceConfigControlAcceptsValue','setDeviceConfigControlValue'])vm.runInContext(source(name),v);
assert.equal(v.controlDeviceSoftwareVersionText(versionItems.m),'2.4');assert.equal(v.controlDeviceSoftwareVersionText(versionItems.a),'18.0');
let softwareOptions=v.consoleTableVersionSelect({source:'console'},versionItems.m,0);
assert(softwareOptions.includes('<select'));assert(!softwareOptions.includes('<input'));assert(!softwareOptions.includes('Other'));assert(!softwareOptions.includes('19.2'));
assert.equal(v.updateCanonicalDeviceField('console','m','softwareVersion','19.2'),false);
assert.equal(v.updateCanonicalDeviceField('console','m','softwareVersion','2.5'),true);assert.equal(versionItems.m.softwareVersionMode3,'2.5');assert.equal(versionItems.m.softwareVersionMode2,'3.9');assert.equal(versionItems.a.softwareVersionValue,'18.0');
versionItems.m.softwareMode='Mode 2';assert.equal(v.controlDeviceSoftwareVersionText(versionItems.m),'3.9');assert.deepEqual(Array.from(v.consoleAvailableVersions(versionItems.m),entry=>entry.label),['3.9','3.8']);
softwareOptions=v.consoleTableVersionSelect({},versionItems.u,0);assert(softwareOptions.includes('Legacy 1 (Unavailable)'));assert(softwareOptions.includes('selected disabled'));assert.equal(versionItems.u.softwareVersionCustom,'Legacy 1');
assert(v.consoleTableVersionSelect({},{consoleId:'empty'},0).includes('No versions available'));
let writes=0;v.updateDeviceConfigField=()=>writes++;const select={dataset:{controlKey:'softwareVersion'},value:'2.4',options:[{value:'2.4',disabled:false},{value:'2.5',disabled:false},{value:'Legacy',disabled:true}]};
v.setDeviceConfigControlValue(select,'18.0');assert.equal(writes,0);assert.equal(select.value,'2.4');v.setDeviceConfigControlValue(select,'Legacy');assert.equal(writes,0);v.setDeviceConfigControlValue(select,'2.5');assert.equal(writes,1);
const protocolList={tagName:'SELECT',dataset:{},options:[{value:'sACN',disabled:false}]};assert.equal(v.deviceConfigControlAcceptsValue(protocolList,'sACN'),true);assert.equal(v.deviceConfigControlAcceptsValue(protocolList,'Art-Net'),false);
const vlanCell={style:{background:'old',color:'old'}},vlanSelect={style:{background:'old',color:'old'},closest:()=>vlanCell};
v.ipVlanById=value=>value==='1'?{colour:'#ff0000'}:null;v.contrastText=()=> '#ffffff';vm.runInContext(source('refreshDeviceConfigVlanColour'),v);
v.refreshDeviceConfigVlanColour(vlanSelect,'1');assert.equal(vlanSelect.style.background,'#ff0000');assert.equal(vlanCell.style.background,'#ff0000');v.refreshDeviceConfigVlanColour(vlanSelect,'0');assert.equal(vlanSelect.style.background,'');assert.equal(vlanCell.style.color,'');
const small=c.calculateDeviceConfigWidths(Array(16).fill(45),2400,true,[],true),large=c.calculateDeviceConfigWidths(Array(16).fill(180),2400,true,[],true);
assert(small[1]<large[1]);assert(small[2]<large[2]);assert(small[4]<large[4]);assert(small.reduce((sum,value)=>sum+value,0)<2400);
const fullDeviceConfig=c.calculateDeviceConfigWidths(Array(17).fill(45),2400,false,[],true);assert(Math.abs(fullDeviceConfig.reduce((sum,value)=>sum+value,0)-2400)<0.001);assert(fullDeviceConfig[6]>=110);assert(fullDeviceConfig[7]>=110);
assert(!html.includes('consoleWidthEditor'));
for(const removed of ['Copy Width Settings','deviceConfigWidthProfile','deviceConfigWidthEditorRow','copyDeviceConfigWidths','restoreDeviceConfigWidths'])assert(!html.includes(removed));
assert(source('renderDeviceConfigView').includes("openVlanSetup()\">VLAN Setup"));
assert(source('renderDeviceConfigView').includes('deviceConfigFiltersPanel'));assert(source('renderDeviceConfigView').includes('activeFilters'));assert(source('renderDeviceConfigView').includes('deviceConfigFiltersOpen'));
assert(source('attachDeviceConfigTableEvents').includes('deviceConfigPointerSelectionCell===cell'));assert(source('attachDeviceConfigTableEvents').includes("event.target.tagName==='SELECT'&&event.key.startsWith('Arrow')&&!event.shiftKey"));assert(source('deviceConfigControlAcceptsValue').includes("control?.tagName==='SELECT'"));
assert.match(html,/\.deviceConfigFillHandle\{[^}]*pointer-events:auto;touch-action:none;z-index:30/);assert.match(html,/\.deviceConfigCellSelected\{[^}]*overflow:visible!important/);
assert(!source('renderIpAddressView').includes('openVlanSetup'));
assert(source('closeVlanSetup').includes("activeSheetTab==='deviceConfig'"));
assert(html.includes('#vlanSetupPane,.networkDeviceConfigToolbar,.deviceConfigToolbar,#colourMenu'));
assert(!source('renderDeviceConfigView').includes('Show/Hide Columns'));
assert(html.includes("function deviceConfigColumnVisible(key){if(key==='vlan'&&!ipVlanSetup().enabled)return false"));
assert(source('measureDeviceConfigTable').includes("querySelector('.deviceConfigColumnHeadings')"));
assert(!source('controlDeviceConfigTableMarkup').includes('data-device-config-width-editor'));
assert(html.indexOf('data-sheet-tab="network"')<html.indexOf('data-sheet-tab="rackLayout"'));
assert(!source('controlDeviceSoftwareVersionText').includes('masterConsoleVersion'));assert(!source('saveConsoleFromModal').includes('syncConsoles'));
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
const vlanLegendRule=html.slice(html.indexOf('.ipVlanLegendItem{')).split('}')[0];for(const declaration of ['flex:0 0 auto','width:max-content','max-width:100%','min-height:25px','display:flex','align-items:center','justify-content:center','padding:6px 8px','background:var(--vlan-colour,#fff)',"font-family:Cochin,'Times New Roman',Times,serif",'font-size:16px','font-weight:900','text-align:center','white-space:nowrap'])assert(vlanLegendRule.includes(declaration));
console.log('PASS: independent SW selections, model/mode restrictions, invalid paste, immediate VLAN styling and shared content-based widths.');
console.log('PASS: isolated Home grid placement, responsive CSS boundaries, 90px boxes, compact onboard displays and unchanged detailed capacity guidance.');

// V33.2 Device Config full-width sizing, Control limits, complete-address fitting and project-specific removal.
const finalLimits=[[20,20],[40,60],[80,130],[60,60],[40,180],[110,110],[110,110],[40,80],[40,70],[40,90],[40,80],[40,70],[40,80],[40,85],[40,80],[40,120]];
for(const available of [500,1280,3000]){
 const widths=c.calculateDeviceConfigWidths(Array(16).fill(300),available,true,[],true);
 finalLimits.forEach(([min,max],i)=>{assert(widths[i]>=min);assert(widths[i]<=max);assert.equal(c.deviceConfigColumnLimits(i,true,true).min,min);assert.equal(c.deviceConfigColumnLimits(i,true,true).max,max)});
}
for(const available of [1280,3000])assert(Math.abs(c.calculateDeviceConfigWidths(Array(17).fill(100),available,false,[],true).reduce((sum,value)=>sum+value,0)-available)<0.001);
for(const obsolete of ['consoleWidthEditor','consoleColumnWidths','copyConsoleWidths','restoreConsoleWidths'])assert(!html.includes(obsolete));
assert(source('measureConsoleCellText').includes('[...row.cells]'));assert(source('measureConsoleCellText').includes("ipSegmentedState(segmented).parts.join('.')"));
const projectA={skipConsoleRemovalConfirmation:false},projectB={skipConsoleRemovalConfirmation:false};
let activeProject=projectA,persisted=0,rendered=0;
const modalFields={consoleRemovalSkip:{checked:false},consoleRemovalCancel:{focus:()=>{}}};
const removal=vm.createContext({app:{controlNetwork:{consoles:[{id:'one',name:'One',deviceConfigPorts:[{id:'p',ip:'1.2.3.4'}]},{id:'two',name:'Two'}],npus:[{id:'npu'}]}},ensureProjectInfo:()=>activeProject,persist:()=>persisted++,render:()=>rendered++,controlExpandedDevices:new Set(['console:one']),deviceConfigExpandedDevices:new Set(['console:one']),pendingConsoleRemoval:null,$:id=>modalFields[id],document:{removeEventListener:()=>{},querySelector:()=>null},consoleRemovalFocus:()=>{}});
for(const name of ['deleteConsoleById','closeConsoleRemoval','confirmConsoleRemoval','handleConsoleRemovalKeydown','containConsoleRemovalFocus'])vm.runInContext(source(name),removal);
removal.pendingConsoleRemoval={id:'one',project:projectA};removal.closeConsoleRemoval(false);assert.equal(removal.app.controlNetwork.consoles.length,2);assert.equal(projectA.skipConsoleRemovalConfirmation,false);
removal.pendingConsoleRemoval={id:'one',project:projectA};removal.app.controlNetwork.consoles.reverse();modalFields.consoleRemovalSkip.checked=true;removal.confirmConsoleRemoval();
assert.deepEqual(Array.from(removal.app.controlNetwork.consoles,item=>item.id),['two']);assert.equal(projectA.skipConsoleRemovalConfirmation,true);assert.equal(removal.app.controlNetwork.npus.length,1);assert.equal(persisted,1);assert.equal(rendered,1);
activeProject=projectB;assert.equal(removal.deleteConsoleById('two',projectA,true),false);assert.equal(projectB.skipConsoleRemovalConfirmation,false);
assert.equal(removal.deleteConsoleById('missing',projectB,true),false);assert.equal(projectB.skipConsoleRemovalConfirmation,false);
removal.pendingConsoleRemoval={id:'two',project:projectA};removal.confirmConsoleRemoval();assert.equal(removal.app.controlNetwork.consoles.length,1);
assert(source('clearProjectState').includes('closeConsoleRemoval(false)'));assert(source('loadProjectPayload').includes('closeConsoleRemoval(false)'));
assert(source('removeConsole').includes('role="alertdialog"'));assert(source('removeConsole').includes('Do Not Show Again for This Project'));assert(source('removeConsole').includes('project.skipConsoleRemovalConfirmation===true'));
const pctx=vm.createContext({defaultProductionVisibility:()=>({}),defaultDeviceConfigColumns:()=>({}),DEFAULT_IP_VLANS:[],vlanTemplateRows:()=>[],normaliseFanOutFormat:()=>({}),normalisePowerFormat:()=>({}),normaliseIpAddressFormat:()=>({}),normaliseDeviceConfigFormat:()=>({}),normaliseVlanSetup:()=>({}),APP_FONT_OPTIONS:[{value:'Arial,Helvetica,sans-serif'}],PROJECT_DEFAULT_FONT:'Arial,Helvetica,sans-serif'});
vm.runInContext('const PDF_TITLE_SIZES=[10,12,14,16,18,20,22,24,26,28,30],PDF_FOOTER_SIZES=[5,6,7,8,9,10];',pctx);
for(const name of ['normaliseImportMatch','fixtureOverrideKey','normaliseFixtureOverrides','normaliseLabelPreview','positionGridNumber','normalisePositionSummaryFormat','defaultPdfTextStyle','defaultProjectSettings','normaliseProjectFont','normalisePdfTextStyle','normalisePdfSize','limitPdfTemplateLines','normaliseProjectSettings','defaultProjectInfo','normaliseProjectInfo'])vm.runInContext(source(name),pctx);
assert.equal(pctx.defaultProjectInfo().skipConsoleRemovalConfirmation,false);assert.equal(pctx.normaliseProjectInfo({}).skipConsoleRemovalConfirmation,false);
assert.equal(pctx.normaliseProjectInfo({skipConsoleRemovalConfirmation:'true'}).skipConsoleRemovalConfirmation,false);
assert.equal(pctx.normaliseProjectInfo(JSON.parse(JSON.stringify({skipConsoleRemovalConfirmation:true}))).skipConsoleRemovalConfirmation,true);
assert(!source('settingsPayload').includes('skipConsoleRemovalConfirmation'));
console.log('PASS: V32.2 final bounds, editor removal, stable-ID deletion, cancel/stale-project safety and per-project preference normalization.');

// V33.3 Fixture Patch import and Position Summary preview.
const importContext=vm.createContext({});
for(const name of ['normaliseImportMatch','parsePatchImportUniAddress','patchImportMappedRows'])vm.runInContext(source(name),importContext);
for(const value of ['3/280',' 3 , 280 ','3-280','3.280'])assert.deepEqual(JSON.parse(JSON.stringify(importContext.parsePatchImportUniAddress(value))),{universe:'3',address:'280'});
for(const value of ['','3','3:280','0/280','3/0','3/513'])assert.deepEqual(JSON.parse(JSON.stringify(importContext.parsePatchImportUniAddress(value))),{universe:'',address:''});
importContext.patchImportState={headers:['Combined','Universe','Address','Fixture'],rows:[['3.280','','','Test'],['4/120','8','','Test'],['5-200','','240','Test'],['bad','','','Test']],mapping:{0:'uniAddress',1:'universe',2:'address',3:'fixture'}};
const mapped=JSON.parse(JSON.stringify(importContext.patchImportMappedRows()));
assert.deepEqual(mapped[0],{universe:'3',address:'280',fixture:'Test'});assert.deepEqual(mapped[1],{universe:'8',address:'120',fixture:'Test'});assert.deepEqual(mapped[2],{universe:'5',address:'240',fixture:'Test'});assert.deepEqual(mapped[3],{universe:'',address:'',fixture:'Test'});
const importFields=vm.runInNewContext(html.match(/const PATCH_IMPORT_FIELDS=\[(.*?)\n\];/s)[0]+';PATCH_IMPORT_FIELDS');
assert.equal(importFields.findIndex(field=>field.key==='uniAddress'),importFields.findIndex(field=>field.key==='address')+1);
assert(importFields.find(field=>field.key==='uniAddress').terms.includes('dmx address'));
const mappingContext=vm.createContext({});vm.runInContext(html.match(/const PATCH_IMPORT_FIELDS=\[(.*?)\n\];/s)[0],mappingContext);for(const name of ['normaliseImportKey','defaultPatchImportMapping'])vm.runInContext(source(name),mappingContext);
assert.deepEqual(JSON.parse(JSON.stringify(mappingContext.defaultPatchImportMapping(['Uni/Add','Universe','Address']))),{0:'uniAddress',1:'universe',2:'address'});
assert.equal(mappingContext.defaultPatchImportMapping(['DMX Address'])[0],'uniAddress');
assert(source('patchImportSuggestionResults').includes('query.length<3'));
const suggestionFilter={manufacturerSearch:'ab',fixtureSearch:'',activeSuggestion:'manufacturerSearch'},suggestionContext=vm.createContext({patchImportMatchFilter:()=>suggestionFilter,normaliseImportMatch:value=>String(value).replace(/\W/g,'').toLowerCase(),patchImportMatchManufacturers:()=>['Ayrton'],patchImportMatchFixtures:()=>[{manufacturer:'Ayrton',fixture:'Diablo'}]});vm.runInContext(source('patchImportSuggestionResults'),suggestionContext);assert.equal(suggestionContext.patchImportSuggestionResults('x','manufacturerSearch').length,0);suggestionFilter.manufacturerSearch='ayr';assert.deepEqual(Array.from(suggestionContext.patchImportSuggestionResults('x','manufacturerSearch')),['Ayrton']);suggestionFilter.activeSuggestion='fixtureSearch';suggestionFilter.fixtureSearch='dia';assert.equal(suggestionContext.patchImportSuggestionResults('x','fixtureSearch')[0].fixture,'Diablo');
assert(source('patchImportManualMatchMarkup').includes('role="combobox"'));assert(!source('patchImportManualMatchMarkup').includes('<select'));
assert(source('patchImportSuggestionKeydown').includes("'ArrowDown'"));assert(source('patchImportSuggestionKeydown').includes("'ArrowUp'"));assert(source('patchImportSuggestionKeydown').includes("'Enter'"));assert(source('patchImportSuggestionKeydown').includes("'Escape'"));
assert(source('choosePatchImportFixture').includes("filter.manufacturer+'||'+filter.fixtureSearch"));
assert(source('addPatchImportNewFixture').includes("wattsText===''?null"));assert(source('addPatchImportNewFixture').includes("weightText===''?null"));assert(!source('addPatchImportNewFixture').includes('!Number.isFinite(watts)||!Number.isFinite(weight)'));
assert(html.includes('id="positionPdfModal"'));for(const id of ['positionPdfPaperSize','positionPdfOrientation','positionPdfLayout','positionPdfPages','positionPdfInfo'])assert(html.includes('id="'+id+'"'));
assert(source('renderHomeView').includes('openPositionSummaryPreview()\">Export Summary'));
assert(source('renderPositionsView').includes('openPositionSummaryPreview()\">Export Summary'));
const geometryContext=vm.createContext({ensureProjectInfo:()=>({positionSummaryFormat:{layout:'rectangles',grids:{rectangles:{columns:2,rows:6},boxes:{columns:4,rows:4}}}})});for(const name of ['positionGridNumber','positionSummaryGrid','positionSummaryGeometry'])vm.runInContext(source(name),geometryContext);
const paper={w:297,h:210};assert.equal(geometryContext.positionSummaryGeometry(paper,'rectangles').cols,2);assert.equal(geometryContext.positionSummaryGeometry(paper,'rectangles').rowsPerPage,6);assert.equal(geometryContext.positionSummaryGeometry(paper,'boxes').cols,4);assert.equal(geometryContext.positionSummaryGeometry(paper,'boxes').rowsPerPage,4);
assert(source('downloadPositionSummary').includes("'-position-summary.pdf'"));assert(source('openPositionSummaryPreview').includes("beginPdfLogoPreview('position','positionPdfModal')"));
assert.equal(pctx.defaultProjectInfo().positionSummaryFormat.layout,'rectangles');assert.equal(pctx.normaliseProjectInfo({positionSummaryFormat:{layout:'boxes'}}).positionSummaryFormat.layout,'boxes');assert.equal(pctx.normaliseProjectInfo({positionSummaryFormat:{layout:'invalid'}}).positionSummaryFormat.layout,'rectangles');
console.log('PASS: V33.3 linked import suggestions, combined Uni/Add parsing, optional loads and Position Summary preview layouts.');

// V33.4 patch cleanup, single-distro menus, Device Config controls and rack fitting.
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
assert(source('appPayload').includes('syncPositionsFromPatch()'));
assert(html.includes('>Delete Patch</button>'));assert(html.includes('>Delete Imported Patch</button>'));
assert(html.includes('.deviceConfigFillHandle{position:absolute;right:-10px;bottom:-10px;width:20px;height:20px'));
assert(html.includes('.deviceConfigDragging,.deviceConfigDragging *{cursor:ns-resize!important;user-select:none!important}'));
assert(source('attachDeviceConfigFillHandle').includes("pointercancel"));assert(source('attachDeviceConfigFillHandle').includes("deviceConfigDragging"));assert(source('attachDeviceConfigFillHandle').includes("activeTarget||targetAt(finishEvent)"));assert(source('attachDeviceConfigFillHandle').includes("deviceConfigControlAcceptsValue(control,deviceConfigControlValue(sourceControl))"));assert(source('attachDeviceConfigFillHandle').includes("[fromPoint,fromEvent].find"));
assert(source('deviceConfigPromotedNetworkPort').includes("ports.length===1"));assert(!source('deviceConfigPromotedNetworkPort').includes('deviceConfigNetworkParentMode'));
assert(source('deviceConfigParentRow').includes('data-device-config-tree'));assert(source('handleDeviceConfigTreeKeydown').includes("ArrowRight"));assert(source('handleDeviceConfigTreeKeydown').includes("ArrowLeft"));assert(source('focusDeviceConfigCell').includes("tree.focus()"));
const v334MenuContext=vm.createContext({distroRanges:()=>v334MenuContext.ranges,ensureProjectInfo:()=>({powerSupplies:v334MenuContext.supplies}),setSheetTab:()=>{},activePowerSubTab:'calcs',activePowerDistro:0,activePatchSheetId:'master',normalisePatchSheets:()=>[],app:{controlNetwork:{npus:[],racks:[]}},supplies:[]});vm.runInContext(source('powerPhaseTotalsAvailable'),v334MenuContext);vm.runInContext(source('sheetSubMenuRoutes'),v334MenuContext);
v334MenuContext.ranges=[{idx:0,d:{name:'Main'}}];assert.deepEqual(JSON.parse(JSON.stringify(v334MenuContext.sheetSubMenuRoutes('powerSheet').map(item=>item.label))),['Power Calcs','Fan Outs']);assert.deepEqual(JSON.parse(JSON.stringify(v334MenuContext.sheetSubMenuRoutes('fanOuts'))),[]);
v334MenuContext.ranges=[{idx:0,d:{name:'Main'}},{idx:1,d:{name:'B'}}];assert.deepEqual(JSON.parse(JSON.stringify(v334MenuContext.sheetSubMenuRoutes('powerSheet').map(item=>item.label))),['Power Calcs','Fan Outs','Phase Totals']);
v334MenuContext.ranges=[{idx:0,d:{name:'Main'}}];v334MenuContext.supplies=[{},{}];assert(v334MenuContext.sheetSubMenuRoutes('powerSheet').map(item=>item.label).includes('Phase Totals'));
const deleteContext=vm.createContext({app:{fixturePatch:[{location:'FOH'}],patchSheets:[{id:'import',rows:[{location:'LX'}]}],gdtfFiles:{fixture:{}},gdtfMatches:{match:{}}},repositoryGdtfBytes:new Map([['fixture',new Uint8Array()]]),ensureProjectInfo:()=>deleteContext.project,project:{positions:[{name:'FOH'},{name:'LX'},{name:'Manual'}]},patchFixtureRows:()=>deleteContext.app.fixturePatch,normalisePatchSheets:value=>value,positionKey:value=>String(value||'').trim().toLowerCase(),confirm:message=>{deleteContext.confirmation=message;return true},clearFixturePickerThumbnails:()=>deleteContext.thumbnailsCleared=true,selectedPatchRows:new Set(['a']),selectedPatchCells:new Set(['b']),selectedUnpatchIds:new Set(['c']),selectedPatchGroupEditIds:new Set(['d']),unlockedPatchGroups:new Set(['e']),duplicatePatchRows:new Set(['f']),duplicateAddressRows:new Set(['g']),confirmedDuplicateAddressKeys:new Set(['h']),fixturePatchUndoHistory:[{}],showPatchUndoList:true,pendingPatchAdds:[{}],activePatchSheetId:'import',activePatchCellChange:{},persist:()=>deleteContext.persisted=true,render:()=>deleteContext.rendered=true});
vm.runInContext(source('fixturePatchDataSummary'),deleteContext);vm.runInContext(source('deleteFixturePatch'),deleteContext);deleteContext.deleteFixturePatch();assert(deleteContext.confirmation.includes('complete Fixture Patch'));assert.equal(deleteContext.app.fixturePatch.length,0);assert.equal(deleteContext.app.patchSheets.length,0);assert.deepEqual(JSON.parse(JSON.stringify(deleteContext.project.positions)),[{name:'Manual'}]);assert.equal(deleteContext.repositoryGdtfBytes.size,0);assert(deleteContext.thumbnailsCleared&&deleteContext.persisted&&deleteContext.rendered);assert.equal(deleteContext.activePatchSheetId,'master');
const rackContext=vm.createContext({rackViewFor:()=> 'front'});vm.runInContext(source('rackAutoZoom'),rackContext);assert.equal(rackContext.rackAutoZoom({units:6,depthMm:700},680,'front',768),Math.floor(Math.min(680/890,768/480)*1000)/1000);assert(rackContext.rackAutoZoom({units:24,depthMm:700},680,'front',768)<rackContext.rackAutoZoom({units:6,depthMm:700},680,'front',768));assert(source('observeRackCardAutoFit').includes('ResizeObserver'));assert(source('renderRackLayoutView').includes('observeRackCardAutoFit(view)'));
console.log('PASS: V33.4 complete patch deletion, single-distro menus, Device Config controls and measured rack fitting.');

// V33.5 position names merge across every project location source.
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
const v335=vm.createContext({app:{fixturePatch:[{location:'foh',colour1:'#ff0000',colour2:''}],controlNetwork:{consoles:[{location:'FOH ',deviceConfigPorts:[{location:'fOh'}]}],npus:[{location:'foh',deviceConfigPorts:[{location:'FOH'}]}],networkDevices:[{location:'FoH',portSettings:[{location:' foh '}]}],racks:[{location:'FOH',devices:[]}]}},normalisePosition:value=>({name:String(value?.name||value?.location||'').trim(),colour1:value?.colour1||'',colour2:value?.colour2||'',colour3:value?.colour3||''}),normaliseBlankColour:value=>String(value||'').trim(),ensureProjectInfo:()=>v335.project,project:{positions:[{name:'FOH',colour1:'',colour2:'#00ff00',colour3:''},{name:'foh',colour1:'#ff0000',colour2:'',colour3:'#0000ff'}]},patchFixtureRows:()=>v335.app.fixturePatch,syncRackMountedNetworkLocations:()=>v335.racksSynced=true});vm.runInContext(source('positionKey'),v335);vm.runInContext(source('positionLocationItems'),v335);vm.runInContext(source('syncPositionsFromPatch'),v335);vm.runInContext(source('updatePositionReferences'),v335);v335.syncPositionsFromPatch();assert.equal(v335.project.positions.filter(position=>position.name).length,1);assert.deepEqual(JSON.parse(JSON.stringify(v335.project.positions[0])),{name:'FOH',colour1:'#ff0000',colour2:'#00ff00',colour3:'#0000ff'});assert(v335.positionLocationItems().every(item=>!item.location||item.location==='FOH'));assert(v335.racksSynced);v335.updatePositionReferences('FOH','Front of House');assert(v335.positionLocationItems().every(item=>!item.location||item.location==='Front of House'));
console.log('PASS: V33.5 project-wide position merging and reference canonicalisation.');

// V33.6 Device Config parent deletion action.
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
assert(source('deviceConfigParentRow').includes('deviceConfigDeleteButton'));
assert(source('deviceConfigPortRow').includes('deviceConfigDeleteCol'));
assert(source('deviceConfigInterfaceTwoRow').includes('deviceConfigDeleteCol'));
assert(source('controlDeviceConfigTableMarkup').includes("view==='deviceConfig'?'<th class=\"deviceConfigDeleteCol\""));
assert(source('deleteDeviceConfigDevice').includes('rack.devices=(rack.devices||[]).filter'));
console.log('PASS: V33.6 Device Config parent delete action and rack-placement cleanup.');

// V33.6 white and uncoloured Position Summary text stays black.
assert(html.includes('color:var(--pos-text,#fff)'));
assert(html.includes('.positionPdfItem.noColour span{color:#111;text-shadow:none}'));
assert(source('controlPositionStripStyle').includes('colourSetPresentation(colours)'));
assert(source('drawPositionSummaryBlock').includes('positionSummaryColourPresentation(colours)'));
assert(source('drawPositionSummaryHeader').includes("title='Position Summary - '+projectName"));
assert(source('drawPositionSummaryHeader').includes("sideReserve=100"));
assert(source('drawPositionSummaryHeader').includes("pdfLine(doc,18,lineY,doc.w-18,lineY,1)"));
assert(html.includes('const PROJECT_LOGO_MAX_DIMENSION=800'));
assert(source('compactUploadedLogo').includes("canvas.toDataURL('image/jpeg',PROJECT_LOGO_JPEG_QUALITY)"));
assert(source('flushPersist').includes('appPayload(false)'));
assert(!html.includes('.patchPdfPreviewPage .fixturePatchTable .type{width:15%!important}'));
assert(source('applyPatchTableColumnWidths').includes('patchColumnContentWidth'));
console.log('PASS: V33.6 white and uncoloured position text uses black.');

// V33.8 keeps clean reviewed display labels separate from exact GDTF modes.
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
const modeContext=vm.createContext({normaliseImportMatch:value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'')});
for(const name of ['normalisePatchMode','normaliseFixtureGdtf','normaliseFixtureModeAliases','fixtureModeKey','fixtureDisplayMode','fixtureCanonicalMode','normaliseFixtureList'])vm.runInContext(source(name),modeContext);
const ayrtonLibrary=JSON.parse(fs.readFileSync(root+'json/fixtures/ayrton.json','utf8')).fixtures,acmeLibrary=JSON.parse(fs.readFileSync(root+'json/fixtures/acme.json','utf8')).fixtures;
const domino=modeContext.normaliseFixtureList([ayrtonLibrary.find(item=>item.fixture==='Domino LT')])[0],rivale=modeContext.normaliseFixtureList([ayrtonLibrary.find(item=>item.fixture==='Rivale Profile')])[0],pixelLine=modeContext.normaliseFixtureList([acmeLibrary.find(item=>item.fixture==='Pixel Line Ip')])[0];
assert.equal(modeContext.fixtureCanonicalMode(domino,'Extended_540'),'Extended');assert.equal(modeContext.fixtureCanonicalMode(rivale,'Extended_540'),'Extended');assert.equal(modeContext.fixtureCanonicalMode(pixelLine,'Mode11 70DMX'),'Mode 11');
assert.equal(domino.gdtf.modes.Extended.gdtfMode,'Extended_540');assert.equal(rivale.gdtf.modes.Extended.gdtfMode,'Extended_540');assert.equal(pixelLine.gdtf.modes['Mode 11'].gdtfMode,'Mode11 70DMX');
const migrationContext=vm.createContext({normaliseImportMatch:modeContext.normaliseImportMatch,fixturePatchReference:{manufacturers:{Ayrton:[domino],ACME:[pixelLine]}},app:{fixturePatch:[{manufacturer:'Ayrton',fixture:'Domino LT',mode:'Extended_540',channels:70,gdtfMode:'Extended_540'}]},fixtureGdtfReference:(fixture,mode,channels)=>({gdtfSpec:'fixture.gdtf',gdtfMode:fixture.gdtf.modes[mode].gdtfMode,gdtfPath:'gdtf/'+channels}),normalisePatchSheets:value=>value,fixturePatchSelection:{manufacturer:'',fixture:'',mode:''},selectedPatchFixture:()=>null});
for(const name of ['normalisePatchMode','fixtureModeKey','fixtureDisplayMode','fixtureCanonicalMode','libraryFixtureForPatchRow','migratePatchModeNames'])vm.runInContext(source(name),migrationContext);
assert(migrationContext.migratePatchModeNames(migrationContext.app.fixturePatch));assert.deepEqual(JSON.parse(JSON.stringify(migrationContext.app.fixturePatch[0])),{manufacturer:'Ayrton',fixture:'Domino LT',mode:'Extended',channels:70,gdtfMode:'Extended_540',gdtfSpec:'fixture.gdtf',gdtfPath:'gdtf/70'});
const importModeContext=vm.createContext({normaliseImportMatch:modeContext.normaliseImportMatch,normalisePatchMode:modeContext.normalisePatchMode});vm.runInContext(source('patchImportExactModeName'),importModeContext);assert.equal(importModeContext.patchImportExactModeName(domino,{gdtfMode:'Extended_540',channels:70}),'Extended');
console.log('PASS: V33.8 reviewed mode labels, legacy migration and raw-GDTF import matching.');


// V33.11 shared export chrome and Project Owner details.
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
assert(source('patchSheetTabsMarkup').includes("if(!sheets.length)return ''"));
assert(source('defaultProjectInfo').includes("projectOwner:''"));
assert(source('defaultProjectInfo').includes("includeOwnerDetailsInPdfFooters:false"));
assert(source('normaliseProjectInfo').includes("base.file.includeOwnerDetailsInPdfFooters=base.file.includeOwnerDetailsInPdfFooters===true"));
assert(source('renderGeneralSettings').includes('Project Owner'));
assert(source('renderGeneralSettings').includes('Include Project Owner Details in PDF Footers'));
assert(!source('renderFileInfo').includes('Project Owner'));
assert(source('updateProjectFileField').includes("el.type==='checkbox'?el.checked:el.value"));
assert(source('projectInfoRevisionNotes').includes("projectOwner:'Project owner'"));
assert(html.includes('.pdfPageFooter{'));
assert(html.includes('font:7px/1.15 Arial,sans-serif'));
assert(html.includes('color:#9A9A9A'));
assert(source('createExportPage').includes('pdfPageFooterMarkup(documentName)'));
assert(source('createExportPage').includes('pdfLaterPageHeader'));
assert(source('renderPositionSummaryPreview').includes("createExportPage(d,pageIndex,'Position Summary')"));
assert(source('createPatchPdfPage').includes("createExportPage(d,pageIndex,'Fixture Patch')"));
assert(source('appendPowerPdfPreviewPage').includes('powerPdfDocumentName'));
assert(source('makeExportPageWithSection').includes("createExportPage(d,pageIndex,'Distro Labels')"));
assert(source('renderFixturePatchPdfPreview').includes('finalisePdfPageChrome'));
assert(source('finishPowerPdfPreview').includes('finalisePdfPageChrome'));
assert(source('renderExportPages').includes('finalisePdfPageChrome(exportPages)'));
assert(source('positionSummaryGeometry').includes('footerMm=12'));
const tabContext=vm.createContext({app:{patchSheets:[]},activePatchSheetId:'master',normalisePatchSheets:value=>value,patchSheetById:()=>null,patchFixtureRows:()=>[{id:'master'}],escapeHtml:value=>String(value),escapeJsAttr:value=>String(value)});
vm.runInContext(source('patchSheetTabsMarkup'),tabContext);assert.equal(tabContext.patchSheetTabsMarkup(),'');tabContext.app.patchSheets=[{id:'import',name:'Imported',diffs:{}}];assert(tabContext.patchSheetTabsMarkup().includes('Master Patch'));
const footerProject={file:{projectName:'Arena Show',version:'2',versionDate:'',projectOwner:'Lighting Team',email:'crew@example.test',phoneNumber:'+44 7700 900000',includeOwnerDetailsInPdfFooters:true},projectSettings:{pdf:{footer:{left:'Page {page} of {pages}',centre:'{project} • Version {version}',right:'{owner}\n{email} \\ {phone}'}}}};const footerContext=vm.createContext({ensureProjectInfo:()=>footerProject,escapeHtml:value=>String(value),escapeAttr:value=>String(value),formatDisplayDate:value=>String(value||'')});
for(const name of ['pdfFooterContactMarkup','pdfTemplateValues','expandPdfTemplate','pdfPageFooterMarkup'])vm.runInContext(source(name),footerContext);
assert(footerContext.pdfFooterContactMarkup().includes('Lighting Team'));assert(footerContext.pdfFooterContactMarkup().includes('crew@example.test '+String.fromCharCode(92)+' +44 7700 900000'));assert(footerContext.pdfPageFooterMarkup().includes('Page 1 of 1'));assert(footerContext.pdfPageFooterMarkup().includes('Arena Show • Version 2'));
footerProject.file.includeOwnerDetailsInPdfFooters=false;assert.equal(footerContext.pdfFooterContactMarkup(),'');
console.log('PASS: V33.11 shared PDF chrome, owner details and single-master Patch tabs.');


// V34 Fixture Patch fixed min/max widths and responsive unlocked Mode editing.
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
assert(source('patchColumnWidthSetting').includes('PATCH_FIXED_COLUMN_WIDTHS'));
assert(source('patchColumnWidthSetting').includes('PATCH_COLUMN_WIDTHS'));
assert(source('patchColumnWidthSetting').includes('return {...setting}'));
assert(html.includes('location:{min:90,max:260}'));
assert(source('attachFixturePatchTableEvents').includes('fixturePatchCellSelected'));
assert(!source('attachFixturePatchTableEvents').includes('select[data-patch-field="mode"]'));
assert(source('updatePatchRowField').includes('patchCommittedMode'));
assert(source('repackPatchAddresses').includes('addressFreeInRows(placed,universe,address,channels)'));
assert(source('reconcilePatchModeAddress').includes('addressFreeInRows(others,universe,address,channels)'));
assert(source('applyPatchField').includes('reconcilePatchModeAddress(row)'));
assert(source('repackPatchAddresses').includes('nextPatchSlotInRows(channels,universe,placed)'));
assert(!source('repackPatchAddresses').includes('addressRangeFree(universe,address,channels,placed)'));
assert(!source('attachFixturePatchTableEvents').includes("event.target.tagName==='SELECT'&&event.key.startsWith('Arrow')&&!event.shiftKey"));
assert(source('attachFixturePatchFillHandle').includes('pointercancel'));
assert(html.includes('.fixturePatchFillHandle{position:absolute'));
assert(html.includes('.fixturePatchGroupUnlocked .fixturePatchTable input,.fixturePatchGroupUnlocked .fixturePatchTable select{'));
assert(!html.includes('fixturePatchWidthEditorRow'));
assert(!html.includes('Temporary Live Column Widths'));
assert(!html.includes('fixturePatchColumnWidths'));
assert(source('patchTableColgroup').includes('data-patch-column'));
assert(source('renderFixturePatchGroup').includes("patchTableColgroup(cols,!!sheet)"));
assert(source('patchPdfGroupElement').includes('patchTableColgroup(cols)'));
assert(source('fitPatchTableText').includes('fixturePatchEditableTable'));
assert(source('applyPatchTableColumnWidths').includes('measureContent=true'));assert(source('applyPatchTableColumnWidths').includes('):item.min'));assert(source('renderFixturePatchView').includes('applyPatchTableColumnWidths(sheet,!editable)'));assert(source('renderFixturePatchView').includes('if(!editable)fitPatchTableText(sheet)'));
assert(source('fitPatchTableText').includes('size>8'));
assert(source('fitPatchTableText').includes("el.style.whiteSpace='normal'"));
assert(source('fitPatchTableText').includes('size*1.1*3'));
assert(!source('defaultPatchViewOptions').includes('PATCH_COLUMN_WIDTHS'));
console.log('PASS: V34 Fixture Patch fixed min/max widths, responsive unlocked Mode editing, address reconciliation and three-line text fitting.');

// V34 consolidates Power navigation and summary presentation.
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
assert(html.includes("data-sheet-tab=\"powerSheet\" onclick=\"setSheetTab('powerSheet')\">Power</button>"));assert(!html.includes('data-sheet-tab="fanOuts"'));
assert(source('setSheetTab').includes("if(tab==='fanOuts'){activePowerSubTab='fanOuts';tab='powerSheet'}"));
assert(source('powerSubTabsMarkup').includes('Fan Outs'));assert(source('powerSubTabsMarkup').includes('powerPhaseTotalsAvailable'));
assert(source('powerSuppliesMarkup').includes('supply.distros||[]'));assert(!source('powerSuppliesMarkup').includes('Calculated at circuit voltage'));
assert(source('fanOutActiveUnitSlots').includes('return active.length?active:[0,1,2,3]'));
assert(source('renderPowerSheetView').includes("activePowerSubTab==='fanOuts'"));assert(source('fanOutPdfSourceViews').includes("activePowerSubTab='fanOuts'"));
assert(html.includes('.powerSheetTable:not(.powerExtraSheet) thead th{border-top:2.5px solid #000}'));assert(html.includes('.powerSheetTable:not(.powerExtraSheet) thead th:nth-child(n+4):nth-child(-n+19){font-size:11px}'));
console.log('PASS: V34 Power navigation, linked supply cards, empty Fan Outs and main-table headers.');

// V34 Navigation and Toolbar Layout.
assert(html.includes("data-sheet-tab=\"distroLabels\" onclick=\"setSheetTab('distroLabels')\">Labels</button>"));
assert(!source('sheetSubMenuRoutes').includes('Power Calcs — ${name}'));
assert(!source('sheetSubMenuRoutes').includes('Fan Outs — ${name}'));
assert(source('distroLabelTabsMarkup').includes('distroLabelDistroTabs'));
assert(source('distroLabelTabsMarkup').includes('tableDistroTabs distroLabelTabs'));
assert(!source('distroLabelTabsMarkup').includes("fixtureNameModeControl('labels')"));
assert(!source('renderTableView').includes("view.appendChild(makeDistroTabs"));
assert(source('render').includes("labelDistroHost.appendChild(makeDistroTabs"));
assert(source('setTableDistro').includes('activeLabelDistro=idx'));assert(source('setLabelDistro').includes('activeTableDistro=idx'));
assert(source('activeApplicationPageName').includes('Labels ~ ${view}'));
assert(html.includes('.powerLinkedSummaryRow{display:flex;flex-wrap:nowrap'));
assert(html.includes('.btn{border:2px solid #000;background:rgb(217, 217, 217);border-radius:7px;padding:10px 12px;cursor:pointer}'));
assert(html.includes('.projectTab,.sheetTab{border:2px solid #000;background:#fff;border-radius:7px;padding:9px 14px;cursor:pointer;font-weight:700}'));
assert(html.includes('.projectTab.active,.sheetTab.active{background:rgb(0, 96, 210);color:rgb(255, 255, 255);border:2px solid #000}'));
assert(html.includes('.tableDistroTab.active{background:rgb(0, 96, 210);color:rgb(255, 255, 255);border:2px solid #000}'));
assert(html.includes('.distroLabelNav{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:space-between;background:rgb(185, 185, 185);border:2px solid rgb(0, 0, 0);border-radius:8px;margin:0 0 10px;padding:6px 10px;width:100%}'));
assert(html.includes('.sheetTabs{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;width:100%;margin:0 0 10px;padding:10px;background:#b9b9b9;border:2px solid #000;border-radius:8px}'));
assert(html.includes('.tableDistroTabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 0}'));
assert(source('sheetSubMenuRoutes').includes("else if(tab==='distroLabels'){routes.push"));assert(!source('sheetSubMenuRoutes').includes('Front — ${name}'));
assert(source('fixtureNameMode').includes("area==='labels'?'power':area"));
assert(source('buildDistroHeading').includes('distroPreviewHeadingControls'));assert(source('buildDistroHeading').includes('event.stopPropagation()'));
assert(!source('render').includes('+ Socapex'));
assert(html.includes('.btn.primary{background:#00a61d;color:#fff;border:2px solid #000;font-weight:700}'));
assert(html.includes('.btn.add{font-weight:800;font-size:14px;line-height:1;padding:8px;background:#00a61d;color:#fff;border:2px solid #000}'));
assert(html.includes('.projectTab,.sheetTab{border:2px solid #000;background:#fff;border-radius:7px;padding:9px 14px;cursor:pointer;font-weight:700}'));
console.log('PASS: V34 Power and Labels navigation, horizontal summary cards and shared toolbar styling.');

// V35 generated Labels remain deliberately separate from live Power data.
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
assert(source('defaultProjectInfo').includes('labelPreview:null'));
assert(source('normaliseProjectInfo').includes('base.labelPreview=normaliseLabelPreview(info.labelPreview)'));
assert(source('distroLabelTabsMarkup').includes("Generate Labels"));
assert(source('distroLabelTabsMarkup').includes("Update Labels"));
assert(!source('distroLabelTabsMarkup').includes('+ Distro'));
assert(source('setSheetTab').includes("tab==='distroLabels'&&!labelsHaveBeenGenerated()"));
assert(source('render').includes('Generate Labels to create this preview.'));
assert(source('syncPowerRowToRcboLabel').includes('labelsHaveBeenGenerated()&&!force'));assert(source('updatePowerAuxLabel').includes('if(!labelsHaveBeenGenerated())'));assert(source('updatePowerOutputLabel').includes('if(!labelsHaveBeenGenerated())'));
assert(source('generateLabels').includes('generatedAt:new Date().toISOString()'));assert(source('generateLabels').includes('data:generatedLabelData()'));assert(source('withGeneratedLabelPreview').includes('Object.assign(app,cloneProjectValue(preview.data))'));
assert(source('openExportLayout').includes("Generate Labels before exporting."));
assert(source('buildDistroHeading').includes('distroPreviewGeneratedAt'));
assert(!source('buildDistroHeading').includes('distroSummaryMeta'));
assert(html.includes('.networkDeviceConfigToolbar{display:flex;align-items:center;justify-content:space-between'));
assert(source('renderDeviceConfigView').includes('networkDeviceConfigToolbar'));
assert(!source('networkSubTabsMarkup').includes("['ipAddresses','IP Address’']"));
assert(!source('sheetSubMenuRoutes').includes("label:'IP Address’'"));
console.log('PASS: V35 generated Labels, frozen Power updates, headings and Network toolbar.');

// V35.1 Labels sizing, fixed rear Socapex presentation and active navigation styles.
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
assert(html.includes(".powerSocaNameText{position:absolute;inset:3px 6px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:normal;overflow-wrap:normal;word-break:normal;text-align:center;line-height:1;cursor:text;-webkit-text-stroke-width:1.3mm}"));
assert(html.includes(".rearLabelText{position:relative;z-index:1;max-width:100%;overflow:hidden;white-space:normal;overflow-wrap:normal;word-break:normal;-webkit-text-stroke-width:1.3mm!important}"));
assert(html.includes(".rearLabel{width:var(--rear-soca-w);height:var(--rear-aux-h);border:1.2mm solid rgb(17, 17, 17);border-radius:2mm;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;text-align:center;font-family:var(--top-font);font-weight:800;font-size:14pt;line-height:1;padding:1mm;box-sizing:border-box}"));
assert(source('rearSocaBackground').includes('rearSocaColours(meta)')&&source('rearSocaBackground').includes('7+(index-1)*9')&&source('rearSocaBackground').includes('10+index*9'));
assert(source('makeRearLabel').includes('rearSocaBackground(meta)'));
assert(source('updateRearSocaLabel').includes('rearSocaBackground(meta)'));
assert(source('fitRearText').includes('fitTextToBox(el,8)'));
assert(html.includes('.tableDistroTabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 0}'));
assert(html.includes('.tableDistroTabs.distroLabelTabs{display:flex;justify-content:center;gap:8px;align-items:center;flex-wrap:wrap;width:100%;margin:0 0 14px;padding:10px;background:rgb(185, 185, 185);border:2px solid rgb(0, 0, 0);border-radius:8px}'));
assert(html.includes('.distroLabelNav{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:space-between;background:rgb(185, 185, 185);border:2px solid rgb(0, 0, 0);border-radius:8px;margin:0 0 10px;padding:6px 10px;width:100%}'));
assert(html.includes('.tableDistroTab.active{background:rgb(0, 96, 210);color:rgb(255, 255, 255);border:2px solid #000}'));
assert(html.includes('.projectTab.active,.sheetTab.active{background:rgb(0, 96, 210);color:rgb(255, 255, 255);border:2px solid #000}'));
assert(html.includes('.btn{border:2px solid #000;background:rgb(217, 217, 217);border-radius:7px;padding:10px 12px;cursor:pointer}'));
console.log('PASS: V35.1 Labels presentation, per-Socapex rear colours and navigation styling.');

// V35.5 Power PDF and Fixture Patch colour-bubble corrections, plus V35.3 styling.
assert.equal(appVersion,'47.7');
assert(html.includes(`<title>Lampy Paperwork V${appVersion}</title>`));
assert(html.includes(".powerSheetTable{table-layout:auto!important;border-collapse:collapse;font-family:Georgia,'Times New Roman',serif;font-size:14px;border:2px solid #000}"));
assert(html.includes('.powerSocaColourCol{width:50px!important;min-width:50px!important;max-width:50px!important}.powerSheetTable .fixIdCol{width:70px!important;min-width:70px!important;max-width:70px!important}'));
assert(html.includes('.powerSheetTable .fixIdCol{width:70px!important;min-width:70px!important;max-width:70px!important;font-weight:800;font-size:16px}'));
assert(html.includes('.powerSocaColourInput{-webkit-text-stroke:.6px var(--colour-text-outline);text-shadow:none}'));
assert(source('colourInputStyle').includes('colourFieldPresentation(value)'));
assert(source('powerSocaColourCellMarkup').includes("'color powerSocaColourInput'")&&source('powerSocaColourCellMarkup').includes(',true,true)'));
assert(html.includes('.fixturePatchColour{font-weight:900;text-transform:uppercase;border:1px solid #000}'));
assert(source('labelGenerationTimestamp').includes('Labels Generated At - ${two(date.getHours())}:${two(date.getMinutes())}, on ${two(date.getDate())}/${two(date.getMonth()+1)}/${String(date.getFullYear()).slice(-2)}'));
assert(source('powerSocaColourCellMarkup').includes('rowspan=\"2\"'));
assert(source('powerSheetRowMarkup').includes('powerSocaColourCellMarkup(socaIndex,way)'));
assert(source('renderPowerSheetView').includes('<th class=\"powerSocaColourCol powerHeaderTooltip\" scope=\"col\" aria-label=\"Colour\" data-column-label=\"Colour\" tabindex=\"0\"></th>'));
assert(source('updatePowerSocaColour').includes('updateSocaMeta(inp)'));
assert(source('automaticSocaName').includes("'Soca '"));
assert(source('cleanSocaName').includes("'Socapex '+(idx+1)"));
assert(source('normaliseSocaMeta').includes('nameCustom:m.nameCustom===true'));
assert(!html.includes('id=\"labelFormatModal\"'));
assert(html.includes('id=\"labelFormatPane\" class=\"frontEditorPane labelFormatPane\"'));
assert(source('openLabelFormat').includes("$('labelFormatPane')?.classList.add('open')"));
assert(html.includes('.showHideColumnsButton{display:inline-flex!important;align-items:center;justify-content:center;text-align:center;line-height:1.1}'));
assert(source('drawPdfRearSocaStripeCanvas').includes('(index?12:7)*mm'));
assert(source('preparePdfSocaColourLayers').includes('.rearLabel[data-rear-soca-colours]'));
assert(source('preparePowerPdfView').includes('.powerSocaColourCol'));
assert(!source('hideEmptyPowerPdfColumns').includes("header.classList.contains('powerSocaColourCol')"));
assert(html.includes('.fixturePatchTable .fixturePatchColour{height:35px!important;box-sizing:border-box;border:1px solid #000!important}'));
assert(source('distroPdfProjectHeader').includes('Distro Labels - ${escapeHtml(project)}'));
assert(source('makeExportSection').includes('.distroPreviewHeadingControls'));
assert(source('makeExportPageWithSection').includes('distroPdfProjectHeader()'));
console.log('PASS: V35.5 Power PDF and Fixture Patch bubble corrections, plus prior Labels PDF styling.');

// V35.6 keeps routine editing responsive as project size grows.
assert(html.includes("const AUTOSAVE_DELAY=700"));
assert(html.includes("const BACKGROUND_VALIDATION_DELAY=180"));
assert(source('persist').includes('AUTOSAVE_DELAY'));
assert(source('scheduleProjectValidation').includes('BACKGROUND_VALIDATION_DELAY'));
assert(source('scheduleDuplicateIpWarnings').includes('BACKGROUND_VALIDATION_DELAY'));
assert(source('normalisePatchFixture').includes('PATCH_FIXTURE_NORMALISED'));
assert(source('patchFixtureRows').includes("some(row=>!row?.[PATCH_FIXTURE_NORMALISED])"));
console.log('PASS: V35.6 cached Fixture Patch normalisation and debounced background work.');

// V35.7 Power colour-cell width, clean outline and blank empty state.
assert(source('powerSocaColourCellMarkup').includes("'color powerSocaColourInput','',true,true"));
console.log('PASS: V35.7 Power colour-cell width, readable outline and blank empty state.');

// V35.8 colours remain independent when Colour 1 is blank, including Rear Labels.
assert(source('rearSocaColours').includes('if(meta?.useC3===true)add(meta?.c3)'));
assert(source('makeRearLabel').includes('rearSocaColours(meta).join'));
assert(source('updateRearSocaLabel').includes('rearSocaColours(meta).join'));
assert(source('cssStripe').includes("if(!colours.length)return '#ffffff'"));
assert(source('drawPdfRearSocaStripeCanvas').includes('bands.forEach'));
const v358=vm.createContext({$:()=>({value:'4'})});
vm.runInContext(source('rearSocaColours'),v358);vm.runInContext(source('rearSocaBackground'),v358);vm.runInContext(source('cssStripe'),v358);
const independentColours={c1:'',c2:'#ff0000',c3:'#0000ff',useC2:true,useC3:true};
assert.deepEqual(JSON.parse(JSON.stringify(v358.rearSocaColours(independentColours))),['#ff0000','#0000ff']);
assert(v358.rearSocaBackground(independentColours).includes('#ff0000')&&v358.rearSocaBackground(independentColours).includes('#0000ff'));
assert(v358.cssStripe('',independentColours.c2,true,independentColours.c3,true).includes('#ff0000')&&v358.cssStripe('',independentColours.c2,true,independentColours.c3,true).includes('#0000ff'));
console.log('PASS: V35.8 independent Colour 2/3 rendering and Rear Label Colour 3 output.');

// V35.9 applies the Position Summary text rule to every editable colour field.
const v359=vm.createContext({colourTextToHex:value=>String(value||''),normaliseHex:value=>String(value||'')});
vm.runInContext(source('colourSetPresentation'),v359);
vm.runInContext(source('colourFieldPresentation'),v359);
assert.deepEqual(JSON.parse(JSON.stringify(v359.colourFieldPresentation(''))),{background:'#ffffff',text:'#111111',outline:'transparent',shadow:'none'});
assert.equal(v359.colourFieldPresentation('#ffffff').text,'#111111');
assert.equal(v359.colourFieldPresentation('#ffff00').text,'#111111');
assert.equal(v359.colourFieldPresentation('#ffff00').outline,'#ffffff');
assert(source('setColourTextInput').includes('applyColourFieldPresentation'));
assert(source('styleColourTextInput').includes('applyColourFieldPresentation'));
assert(source('stylePositionColourInput').includes('applyColourFieldPresentation'));
assert(source('colourInputControl').includes('text-shadow:none;--colour-text-outline:transparent'));
assert(source('patchColourCss').includes('colourFieldPresentation'));
assert(source('patchPdfColourMarkup').includes('colourFieldPresentation'));
console.log('PASS: V35.9 shared colour-field text and outline rule.');

// V35.10 applies the same contrast rule to position references and Labels.
const v3510=vm.createContext({colourTextToHex:value=>String(value||''),normaliseHex:value=>String(value||'')});
vm.runInContext(source('colourSetPresentation'),v3510);
assert.equal(v3510.colourSetPresentation([]).text,'#111111');
assert.equal(v3510.colourSetPresentation(['#ffffff']).outline,'transparent');
assert.equal(v3510.colourSetPresentation(['#ffffff','#ff0000']).text,'#ffffff');
assert.equal(v3510.colourSetPresentation(['#ffffff','#ff0000']).outline,'#000000');
assert(source('controlPositionStripStyle').includes('colourSetPresentation(colours)'));
assert(source('controlLocationCellStyle').includes('color:var(--pos-text,#111)'));
assert(source('powerPositionCellStyle').includes('colourSetPresentation(colours)'));
assert(source('powerSheetSlotResult').includes('savedPosition?.colour3'));
assert(source('networkPortPositionStyle').includes('--pos-text:#111;--pos-text-shadow:none'));
assert(source('networkPortLocationOptions').includes('colourSetPresentation(colours)'));
assert(source('makeLabel').includes('applyLabelColourRule(el,style)'));
assert(source('makeRearLabel').includes("applyBackgroundColourTextPresentation(text,rearSocaColours(meta),'1.3mm')"));
assert(source('makeRearAuxLabel').includes('applyBackgroundColourTextPresentation'));
assert(source('makeRearOutputLabel').includes('applyBackgroundColourTextPresentation'));
assert(source('applyFixIdColoursToLabel').includes('label.useC3'));
console.log('PASS: V35.10 shared position-reference and Labels contrast rule.');

// V35.11 unifies live page toolbars and uses Fixture Patch Home Stats in Control.
assert(html.includes('.sheetWrap .homeDashboardToolbar,.sheetWrap .fixturePatchToolbar,.sheetWrap .powerSheetToolbar,.sheetWrap .fanOutToolbar,.sheetWrap .controlNetworkToolbar,.sheetWrap .networkDeviceConfigToolbar,.sheetWrap .ipAddressToolbar,.sheetWrap .distroLabelNav,.sheetWrap .positionsToolbar,.sheetWrap .universeDetailToolbar,.sheetWrap .rackWorkspaceHeader{background:rgb(185,185,185);border:2px solid #000}'));
assert(html.includes('.controlParameterStats{display:flex;align-items:center;gap:6px;flex-wrap:wrap}'));
assert(source('controlParameterSummaryMarkup').includes('homeStat controlParameterStat'));
assert(source('controlParameterSummaryMarkup').includes("row.mode+' Parameters'"));
console.log('PASS: V35.11 shared live-page toolbars and Control capacity Home Stats.');

// V35.12 keeps Power colour and position text legible without layered shadows.
assert(html.includes('.powerSocaColourInput{-webkit-text-stroke:.35px var(--colour-text-outline);text-shadow:none!important;paint-order:stroke fill;text-align:center}'));
assert(html.includes('.powerSheetTable .positionCol .powerPositionText,.fanOutTable .positionCol .powerPositionText{-webkit-text-stroke-width:var(--power-position-stroke-width,0);-webkit-text-stroke-color:var(--power-position-outline,transparent);paint-order:stroke fill;text-shadow:none!important}'));
assert(source('colourSetPresentation').includes("shadow:'none'"));
assert(source('powerPositionCellStyle').includes('--power-position-outline:${powerWhiteTextOutline(presentation.text)}'));
console.log('PASS: V35.12 Power colour and position text use one thin contrast outline without shadows.');

// V35.13 gives every multi-colour value a black outline.
assert.equal(v359.colourSetPresentation(['#ffff00','#a855f7']).outline,'#000000');
assert(source('controlPositionStripStyle').includes('--pos-text-outline:${presentation.outline}'));
assert(html.includes('.controlPositionName{-webkit-text-stroke:.35px var(--pos-text-outline,transparent);paint-order:stroke fill;text-shadow:none!important}'));
console.log('PASS: V35.13 multi-colour values use a black text outline.');

// V35.14 scopes the 1.3 mm black outline to Position Summary only.
assert(html.includes('.homePositionStrip .controlPositionName,.positionPdfItem span{-webkit-text-stroke-width:1.3mm;-webkit-text-stroke-color:var(--pos-text-outline,transparent);paint-order:stroke fill;text-shadow:none!important}'));
assert(source('applyBackgroundColourTextPresentation').includes("outlineWidth='.45mm'"));
assert(source('pdfDrawPositionText').includes("outlined?'2':'0'} Tr"));
assert(!source('pdfDrawPositionText').includes('pdfDrawCellText'));
console.log('PASS: V35.14 scopes the 1.3 mm black outline to Position Summary.');

// V35.14 keeps Power Calcs white text readable with its own 0.5 mm black outline.
assert(html.includes('.powerSheetTable .powerSocaColourInput{-webkit-text-stroke-width:.5mm;-webkit-text-stroke-color:var(--colour-text-outline)}'));
assert(html.includes('.powerSheetTable .positionCol .powerPositionText,.fanOutTable .positionCol .powerPositionText{-webkit-text-stroke-width:var(--power-position-stroke-width,0);-webkit-text-stroke-color:var(--power-position-outline,transparent);paint-order:stroke fill;text-shadow:none!important}'));
assert(html.includes('.powerSheetTable tbody .ampsCol,.powerSheetTable tbody .ampsCol input{-webkit-text-stroke-width:.5mm;-webkit-text-stroke-color:#000;paint-order:stroke fill}'));
assert(source('powerSheetRowMarkup').includes('--power-soca-outline:${powerWhiteTextOutline(rearFormat.textColor)}'));
console.log('PASS: V35.14 Power Calcs white text uses a 0.5 mm black outline.');

// V36 uses JSON VLAN templates without replacing customised project settings.
assert.equal(appVersion,'47.7');
const vlanTemplateJson=JSON.parse(fs.readFileSync(root+'json/vlan_colour_options.json','utf8'));
const vlanContext=vm.createContext({
 DEFAULT_IP_VLANS:Array.from({length:11},(_,index)=>({id:String(index),name:['Untagged/MGMT','sACN','Art-Net','RoboCam'][index]||'',colour:['#ffffff','#e5b7b7','#b7cbe4','#ffd5b3'][index]||'#ffffff',selected:false})),
 vlanColourReference:[],vlanTemplateReference:{},
 normaliseVlanNumber:(value,fallback='0')=>String(value??fallback).trim()||String(fallback),
 normaliseHex:(value,fallback='#ffffff')=>/^#[0-9a-f]{6}$/i.test(String(value||'').trim())?String(value).trim():fallback,
 colourTextToHex:(value,fallback='#ffffff')=>/^#[0-9a-f]{6}$/i.test(String(value||'').trim())?String(value).trim():fallback,
 normaliseIpAddressValue:value=>String(value||''),app:{controlNetwork:{networkDevices:[]}}
});
for(const name of ['normaliseVlanColourReference','vlanTemplateName','vlanTemplateRows','vlanRowsEqual','vlanSetupCanAutoApply','normaliseVlanSetup','detectedVlanTemplateBrands'])vm.runInContext(source(name),vlanContext);
const vlanReference=vlanContext.normaliseVlanColourReference(vlanTemplateJson);vlanContext.vlanTemplateReference=vlanReference.templates;
assert.equal(vlanReference.templates.Generic.length,11);assert.equal(vlanReference.templates.Luminex.length,21);assert.equal(vlanReference.templates.Pathway.length,10);assert(vlanReference.colours.some(colour=>colour.hex.toLowerCase()==='#ff40ff'));
vlanContext.app.controlNetwork.networkDevices=[{manufacturer:'luminex'}];assert.deepEqual(JSON.parse(JSON.stringify(vlanContext.detectedVlanTemplateBrands())),['Luminex']);
vlanContext.app.controlNetwork.networkDevices=[{manufacturer:'Luminex'},{manufacturer:'Pathway'}];assert.deepEqual(JSON.parse(JSON.stringify(vlanContext.detectedVlanTemplateBrands())),['Luminex','Pathway']);
const retained=vlanContext.normaliseVlanSetup({enabled:true,templateSource:'Luminex',templateCustomised:false,vlans:[{id:'0',name:'ISL',colour:'#ffffff',selected:true}]});assert.equal(retained.enabled,true);assert.equal(retained.vlans[0].selected,true);assert(vlanContext.vlanSetupCanAutoApply(retained));
const custom=vlanContext.normaliseVlanSetup({enabled:false,templateSource:'Pathway',templateCustomised:true,vlans:[{id:'1',name:'Tour VLAN',colour:'#123456',selected:true}]});assert.equal(custom.vlans[0].name,'Tour VLAN');assert.equal(custom.vlans[0].colour,'#123456');assert(!vlanContext.vlanSetupCanAutoApply(custom));
assert(source('applyVlanTemplate').includes('selectedById'));assert(source('applyVlanTemplate').includes('...setup'));assert(source('updateVlanSetupField').includes('templateCustomised=true'));assert(source('selectVlanColour').includes('templateCustomised=true'));assert(source('saveNetworkDeviceFromModal').includes('syncVlanTemplateDefaults()'));assert(source('removeNetworkEquipmentDevice').includes('syncVlanTemplateDefaults()'));assert(source('removeIpNetworkDevice').includes('syncVlanTemplateDefaults()'));assert(source('loadNetworkExpansionReference').includes('syncVlanTemplateDefaults()'));assert(!source('vlanTemplateControlsMarkup').includes("['automatic','Automatic']"));
console.log('PASS: V36 JSON VLAN templates, vendor detection, edit protection and retained VLAN state.');

// V36.1 keeps VLAN templates and Power text readable.
assert.equal(appVersion,'47.7');
assert(!source('vlanTemplateControlsMarkup').includes("['automatic','Automatic']"));assert(!source('setVlanTemplateChoice').includes("value==='automatic'"));assert(source('automaticVlanTemplate').includes("brands.length===1?brands[0]:'Generic'"));assert(!source('renderVlanSetupPane').includes('A non-empty Global Subnet is used for new devices'));
assert(source('powerPositionCellStyle').includes('powerWhiteTextOutline(presentation.text)'));assert(source('powerPositionCellStyle').includes("presentation.text==='#ffffff'?'.5mm':'0'"));assert(html.includes('.powerSheetTable .positionCol .powerPositionText,.fanOutTable .positionCol .powerPositionText{-webkit-text-stroke-width:var(--power-position-stroke-width,0);-webkit-text-stroke-color:var(--power-position-outline,transparent);paint-order:stroke fill;text-shadow:none!important}'));
assert(source('fitPowerSocaColourText').includes('size>8'));assert(source('fitPowerSocaColourText').includes('powerSheetTextWidth'));assert(source('renderPowerSheetView').includes('fitPowerSocaColourText(view)'));assert(source('powerPdfSourceViews').includes('fitPowerSocaColourText(view)'));assert(html.includes('outline=powerWhiteTextOutline(presentation.text)'));
console.log('PASS: V36.1 always-visible VLAN template selection and Power text fitting.');

// V36.2 keeps VLAN Setup compact without template helper text.
assert.equal(appVersion,'47.7');
assert(html.includes('#vlanSetupPane label{display:block;font-size:13px;color:#333;font-weight:700;border:none;margin:0px;padding:0px}'));
assert(html.includes('.vlanSetupTable .vlanNumberCol{width:72px}'));
assert(html.includes('.vlanSetupTable .vlanColourCol{width:55px}'));
assert(html.includes('.vlanSetupTable .vlanUseCol{width:60px}'));
assert(html.includes('.vlanSetupTable th,.vlanSetupTable td{height:40px;'));
assert(html.includes('.vlanSetupTable input{height:32px!important;text-align:center}'));
assert(html.includes('.vlanSetupTable .vlanColourPicker summary{width:35px;height:25px}'));
assert(!source('vlanTemplateControlsMarkup').includes('Template changes preserve'));
console.log('PASS: V36.2 VLAN Setup labels, compact rows and column widths.');

// V36.3 refines VLAN Setup controls without changing VLAN data.
assert.equal(appVersion,'47.7');
assert(html.includes('.logoTitleRow{margin-bottom:0px}'));
assert(html.includes('.vlanGlobalSubnetCard .ipSegmentedField{border:none;border-radius:6px;background:#fff;padding:2px 5px}'));
assert(html.includes('#vlanSetupPane label{display:block;font-size:13px;color:#333;font-weight:700;border:none;margin:0px;padding:0px}'));
assert(html.includes('#vlanSetupPane #vlanTemplateChoice{height:30px}'));
assert(html.includes('.vlanSetupTable .vlanColourCol{width:55px}'));
assert(html.includes('.vlanSetupTable .vlanColourPicker summary{width:35px;height:25px}'));
assert(html.includes('.vlanSetupTable .vlanUseCol{width:60px}'));
assert(html.includes('.vlanSetupToggle{width:40px;height:30px;max-width:100%;box-sizing:border-box;display:inline-flex!important;align-items:center;justify-content:center;padding:2px 4px;font-size:16px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:900;vertical-align:middle}'));
assert(html.includes('.vlanSetupTable .vlanNumberCol input{-moz-appearance:textfield;appearance:textfield}'));
assert(html.includes('.vlanTemplateCard{margin:0}.vlanTemplateCard .row{margin:0}'));
assert(source('vlanTemplateControlsMarkup').includes('vlanTemplateCard'));
console.log('PASS: V36.3 VLAN Setup selector, input and table controls.');

assert(html.includes('.deviceConfigDeleteButton{width:32px;height:20px;border:0;border-radius:4px;background:transparent;color:#c00000;font:900 18px/1 Arial,sans-serif;cursor:pointer}'));
console.log('PASS: V36.3 Device Config delete control dimensions.');

// V36.4 corrects Device Config's full trailing-column map so Mode is not starved by Role.
assert.equal(appVersion,'47.7');
assert(html.includes("const DEVICE_CONFIG_WIDTH_DEFAULTS=[[30,30],[45,70],[40,60],[100,130],[60,60],[100,180],[110,110],[110,110],[40,100],[40,100],[40,150],[80,120],[80,90],[110,180],[70,110],[80,120],[90,220],[34,34]];"));
console.log('PASS: V36.4 Device Config Role and Mode width allocation.');

// V36.5 keeps Control Table View focused and permits VLAN assignment on every switch port.
assert.equal(appVersion,'47.7');
assert(!source('renderConsolesTab').includes('openDeviceConfigColumns()'));
assert(!source('renderConsolesTab').includes('openDeviceConfigFormat()'));
assert(source('renderConsolesTab').includes('expandAllControlDevices()'));
assert(source('deviceConfigPortRow').includes("parentMode==='network-switch'"));
assert(source('deviceConfigParentRow').includes("parentMode!=='network-switch'||!!singlePort"));
console.log('PASS: V36.5 Control Table controls and Network Switch VLAN assignment.');

// V36.6 centres Home statistics, simplifies Power actions, and keeps locations on Device Config parents.
assert.equal(appVersion,'47.7');
assert(html.includes('.homeStats{grid-template-columns:repeat(auto-fit,115px)!important;justify-content:center}'));
assert(source('homeStatsMarkup').includes("'Universes Patched'"));
assert(html.includes('.btn.unpatch{border:2px solid #000}'));
const powerToolbarSource=source('powerSheetToolbarMarkup');
assert(powerToolbarSource.includes("totals=mode==='totals'"));
assert(!powerToolbarSource.includes('openFanOutFormat()'));
assert(!powerToolbarSource.includes('openPowerFormat()'));
assert(source('deviceConfigTableMarkup').includes('deviceConfigRowWithEmptyLocation(interfaceRow)'));
assert(source('deviceConfigTableMarkup').includes('deviceConfigRowWithEmptyLocation(deviceConfigPortRow'));
assert(source('deviceConfigRowWithEmptyLocation').includes('deviceConfigLocationCol"></td>'));
assert(html.includes('.controlNetworkView>.controlNetworkTabs{background:rgb(185,185,185);border:2px solid #000}'));
assert(html.includes('.rackWorkspaceHeader{background:#fff;border:2px solid #000}'));
console.log('PASS: V36.6 Home, Power, Device Config and Rack Layout updates.');

// V36.7 hides shared VLAN columns whenever the VLAN feature is disabled.
assert.equal(appVersion,'47.7');
assert(source('deviceConfigColumnVisible').includes("key==='vlan'&&!ipVlanSetup().enabled"));
assert(html.includes('.deviceConfigTable [hidden]{display:none!important}'));
assert(source('deviceConfigPortRow').includes("parentMode==='dmx-node'&&deviceConfigIsLuminex(device)"));
assert(source('deviceConfigVisiblePorts').includes("sort((a,b)=>(a.category==='network'?0:1)-(b.category==='network'?0:1))"));
console.log('PASS: V36.7 hides Device Config and Control VLAN columns when disabled.');

// V36.7 removes the redundant IP Address route while retaining a safe legacy redirect.
assert.equal(appVersion,'47.7');
assert(source('setSheetTab').includes("tab==='networkEquipment'||tab==='ipAddresses'"));
assert(!source('setSheetTab').includes("'deviceConfig','ipAddresses','distroLabels'"));
console.log('PASS: V36.7 removes the IP Address tab and redirects legacy routes.');

// V37 moves Global Subnet to Device Config and makes locations actionable groups.
assert.equal(appVersion,'47.7');
const deviceConfigViewSource=source('renderDeviceConfigView');
assert(!deviceConfigViewSource.includes('expandAllDeviceConfig()'));
assert(!deviceConfigViewSource.includes('collapseAllDeviceConfig()'));
assert(!deviceConfigViewSource.includes('openDeviceConfigFormat()'));
assert(deviceConfigViewSource.includes('deviceConfigGlobalSubnetMarkup()'));
assert(deviceConfigViewSource.includes('deviceConfigLocationGroup'));
assert(!deviceConfigViewSource.includes('cell.hidden=false'));
assert(source('renderVlanSetupPane').includes("if(!setup.enabled){body.innerHTML='<div class=\"settingsCard full vlanSetupIntro\""));
assert(!source('renderVlanSetupPane').includes('globalSubnet='));
assert(source('deviceConfigGlobalSubnetMarkup').includes('Apply to All Devices'));
assert(source('deleteDeviceConfigLocation').includes('Their rack placements will also be removed.'));
assert(source('deviceConfigLocationIsOpen').includes('deviceConfigOpenLocations.add(key)'));
assert(html.includes('.deviceConfigGlobalSubnetMenu{position:absolute'));
assert(html.includes('.sheetWrap.deviceConfigSubnetOpen{overflow:visible}'));
assert(!html.includes('.networkDeviceConfigToolbar{position:relative;z-index:50'));
assert(html.includes('.deviceConfigGlobalSubnetMenu{position:absolute;right:0;bottom:calc(100% + 8px);z-index:1000'));
assert(fs.readFileSync(root+'tests/BROWSER-CHECKLIST.md','utf8').startsWith('# V47 browser release checks'));
console.log('PASS: V37 Device Config locations, Global Subnet and disabled VLAN controls.');

// V37.3 Pathway devices expose protocols without Luminex-only processing-engine metadata.
const pathwayReference=JSON.parse(fs.readFileSync(root+'json/rack_devices/pathway.json','utf8'));
assert(pathwayReference.devices.every(device=>!Object.hasOwn(device,'processingEngines')));
assert(pathwayReference.devices.every(device=>Array.isArray(device.protocols)&&device.protocols.length));
console.log('PASS: V37.3 Pathway protocols are independent of Luminex processing engines.');

// V37.4 keeps VLAN controls in the pane header and removes the Automatic choice.
assert(source('vlanSetupPane').includes('vlanSetupHeadActions'));
assert(source('renderVlanSetupPane').includes("headerActions.innerHTML=setup.enabled?'<button class=\"btn danger\""));
assert(!source('vlanTemplateControlsMarkup').includes("['automatic','Automatic']"));
assert(source('vlanTemplateControlsMarkup').includes("[['Generic','Generic'],['Luminex','Luminex'],['Pathway','Pathway']]"));
console.log('PASS: V37.4 VLAN header control and Generic template choice.');

// V37.5 fixes pane layering, Global Subnet clipping, list drag-fill and Pathway protocol fallback.
assert.equal(appVersion,'47.7');
assert(source('renderDeviceConfigView').includes("classList.toggle('deviceConfigSubnetOpen',deviceConfigGlobalSubnetOpen)"));
assert(source('deviceConfigParentRow').includes('singlePort?.protocols?.length?singlePort.protocols:null'));
assert(source('attachDeviceConfigFillHandle').indexOf("const fromPoint=document.elementFromPoint")<source('attachDeviceConfigFillHandle').indexOf("fromEvent=pointerEvent.target"));
console.log('PASS: V37.5 Device Config overlays, list filling and Pathway protocols.');

// V37.6 shares DMX port positions between Device Config and Port Configuration.
assert.equal(appVersion,'47.7');
assert(source('deviceConfigPortsFor').includes("base.location=legacy?.location||''"));
assert(source('saveDeviceConfigPorts').includes('location:port.location'));
assert(source('deviceConfigTableMarkup').includes('deviceConfigRowWithPortLocation'));
assert(source('deviceConfigPortLocationSelect').includes('networkPortLocationOptions(port.location)'));
assert(source('deviceConfigPortLocationSelect').includes('updateDeviceConfigPortLocation(this)'));
assert(source('deviceConfigGlobalSubnetMarkup').includes('openDeviceConfigPortConfiguration()'));
assert(source('rackPortConfigurationNavigationMarkup').includes('&lt; Previous'));
assert(source('rackPortConfigurationNavigationMarkup').includes('Next &gt;'));
assert(source('saveRackPortConfiguration').includes('location:setting.location'));
assert(!source('saveRackPortConfiguration').includes('deviceConfigPorts=[]'));
console.log('PASS: V37.6 Device Config DMX port positions and Port Configuration navigation.');

// V37.7 loads Generic on first VLAN activation and tracks native list cells by geometry.
assert.equal(appVersion,'47.7');
assert(source('enableVlans').includes("templateSource:'Generic'"));
assert(source('enableVlans').includes('await loadVlanColourReference()'));
assert(source('enableVlans').includes("templateMode:'manual'"));
assert(source('enableVlans').includes("vlanTemplateRows('Generic',selectedById)"));
assert(source('attachDeviceConfigFillHandle').includes('getBoundingClientRect()'));
assert(source('attachDeviceConfigFillHandle').includes("document.addEventListener('pointermove',move,true)"));
assert(source('attachDeviceConfigFillHandle').includes("document.removeEventListener('pointermove',move,true)"));
console.log('PASS: V37.7 Generic VLAN activation and native list-cell fill targeting.');

// V38 adds sequential DMX-port configuration and inline network-device setup.
assert.equal(appVersion,'47.7');
add('networkPortUniverseRange','shiftedNetworkPortUniverse');
assert.deepEqual(JSON.parse(JSON.stringify(c.networkPortUniverseRange(20,4))),{start:20,end:23,values:['20','21','22','23']});
assert.deepEqual(JSON.parse(JSON.stringify(c.networkPortUniverseRange('',3))),{start:1,end:3,values:['1','2','3']});
assert.equal(c.shiftedNetworkPortUniverse('',5),'6');
assert.equal(c.shiftedNetworkPortUniverse('',-10),'1');
assert.equal(c.shiftedNetworkPortUniverse('4',-5),'1');
assert.equal(c.shiftedNetworkPortUniverse('4',10),'14');
add('networkPortConfigurationRoot','updateNetworkPortQuickEnd','applyNetworkPortQuickConfig','updateNetworkPortSelectAll','toggleNetworkPortSelection','shiftSelectedNetworkPortUniverses');
const quickStart={value:'7'},quickEnd={value:''},quickAll={checked:false,indeterminate:false},quickUniverses=['','',''].map(value=>({value})),quickChecks=[false,false,false].map(checked=>({checked}));
const quickRows=quickUniverses.map((input,index)=>({querySelector:selector=>selector==='[data-network-port-select]'?quickChecks[index]:input}));
const quickRoot={querySelector:selector=>selector==='[data-network-port-quick-start]'?quickStart:selector==='[data-network-port-quick-end]'?quickEnd:selector==='[data-network-port-select-all]'?quickAll:null,querySelectorAll:selector=>selector==='[data-network-port-row]'?quickRows:selector==='[data-network-port-select]'?quickChecks:[]};
const quickControl={closest:()=>quickRoot};
c.applyNetworkPortQuickConfig(quickControl);assert.deepEqual(quickUniverses.map(input=>input.value),['7','8','9']);assert.equal(quickEnd.value,'9');
quickAll.closest=()=>quickRoot;quickAll.checked=true;c.toggleNetworkPortSelection(quickAll);assert(quickChecks.every(box=>box.checked));c.shiftSelectedNetworkPortUniverses(quickControl,5);assert.deepEqual(quickUniverses.map(input=>input.value),['12','13','14']);
quickChecks[1].checked=false;c.updateNetworkPortSelectAll(quickControl);assert.equal(quickAll.checked,false);assert.equal(quickAll.indeterminate,true);
const portMarkup=source('networkPortSettingsMarkup');
for(const required of ['Quick Config','data-network-port-quick-start','data-network-port-quick-end','Select All','data-network-port-select','&lt;&lt;&lt; 10','10 &gt;&gt;&gt;'])assert(portMarkup.includes(required));
assert(source('applyNetworkPortQuickConfig').includes('networkPortUniverseRange(start.value,rows.length)'));
assert(source('shiftSelectedNetworkPortUniverses').includes('selected?.checked'));
assert(source('deviceConfigGlobalSubnetMarkup').includes('>+ Device<'));
assert(source('networkDevicePickerMarkup').includes('Info &amp; Setup'));
assert(source('networkDevicePickerMarkup').includes('networkDeviceConfigurationMarkup(item,ref,false)'));
assert(source('networkDeviceConfigurationMarkup').includes("includePortConfiguration?networkPortSettingsMarkup(item,ref):''"));
assert(source('renderNetworkDeviceModal').includes('onclick="saveNetworkDeviceFromModal()">Add Device'));
assert(!source('renderNetworkDeviceModal').includes('openSelectedNetworkDeviceConfiguration()'));
const rackVlanDevice={source:'network',id:'node-1',ports:[{id:'net-front',category:'network',sub:'Network 1',facing:'front',vlan:'2'},{id:'net-rear',category:'network',sub:'Network 2',facing:'rear',vlan:'3'}]},savedRackVlans={};
const rackVlanContext=vm.createContext({normaliseVlan:value=>String(value||'0'),selectedIpVlans:()=>[{id:'2',name:'Control',colour:'#fff'},{id:'3',name:'Data',colour:'#fff'}],escapeAttr:value=>String(value??''),escapeHtml:value=>String(value??''),ipVlanCellStyle:()=>'',rackReferenceHasNetworkPort:()=>true,ipVlanSetup:()=>({enabled:true}),compiledDeviceConfigDevices:()=>[rackVlanDevice],deviceConfigNetworkPorts:device=>device.ports.filter(port=>port.category==='network'),deviceConfigFacingText:value=>value.charAt(0).toUpperCase()+value.slice(1),saveDeviceConfigPorts:(device,item,ports)=>{savedRackVlans.ports=ports}});
for(const name of ['rackVlanOptionsMarkup','rackDeviceNetworkPorts','rackDeviceVlanMarkup','saveRackDevicePortVlans'])vm.runInContext(source(name),rackVlanContext);
const rackVlanMarkup=rackVlanContext.rackDeviceVlanMarkup({kind:'network',item:{id:'node-1'},ref:{type:'DMX Node',portDetails:[{}]}});assert.equal((rackVlanMarkup.match(/data-rack-device-vlan-port=/g)||[]).length,2);assert(rackVlanMarkup.includes('Network 1 (Front)'));assert(rackVlanMarkup.includes('Network 2 (Rear)'));assert(!rackVlanMarkup.includes('data-rack-device-setting="vlan"'));
const rackVlanFields=[{dataset:{rackDeviceVlanPort:'net-front'},value:'3'},{dataset:{rackDeviceVlanPort:'net-rear'},value:'2'}];assert(rackVlanContext.saveRackDevicePortVlans({kind:'network',item:{id:'node-1'}},{querySelectorAll:()=>rackVlanFields}));assert.deepEqual(savedRackVlans.ports.map(port=>port.vlan),['3','2']);
console.log('PASS: V38 DMX Quick Config and inline Add Device setup.');

// V38.2 applies the supplied compact Add Device segmented fields and field order.
assert(html.includes('.ipSegmentedField{display:flex;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr);gap:3px;align-items:center;width:80%;font-family:inherit}'));
assert(html.includes('.consoleFormGrid .ipSegmentedField{height:45px;border:none;border-radius:6px;background:#fff;padding:2px 5px}'));
assert(html.includes('.ipSegmentedField input{min-width:0;width:80%!important;height:30px!important;border-radius:6px;background:transparent!important;padding:4px 1px!important;text-align:center!important;font-family:inherit;font-size:14px;font-weight:900}'));
const addDeviceSetupMarkup=source('networkDeviceConfigurationMarkup');
const addDeviceNetworkFieldOrder=['networkDeviceIp1','networkDeviceSubnet1','networkDeviceProtocol'].map(id=>addDeviceSetupMarkup.indexOf(id));
assert(addDeviceNetworkFieldOrder.every(index=>index>=0));
assert.deepEqual([...addDeviceNetworkFieldOrder].sort((a,b)=>a-b),addDeviceNetworkFieldOrder);
assert(addDeviceSetupMarkup.includes('networkDeviceLocationOptions\" value=\"${escapeAttr(item.location)}\" placeholder=\"Position\"></div>${networkFields}${notesField}'));
for(const id of ['networkDeviceName','networkDeviceLocation','networkDeviceProtocol','networkDeviceNotes'])assert(addDeviceSetupMarkup.includes(`for="${id}"`));
console.log('PASS: V38.2 Add Device form sizing and field order.');

// V38.3 keeps Notes for existing-device editing only and applies the supplied form styles.
assert(html.includes('input[type=text],input[type=number],select,textarea{width:100%;height:35px;border:2px solid rgb(128,128,128);border-radius:6px;padding:8px;background:rgb(255,255,255);font-weight:800}textarea{min-height:35px}'));
assert(html.includes('.consoleLibraryInfoCard{border:1px solid #d9dee7;border-radius:7px;background:#fff;padding:9px;margin-bottom:10px}'));
assert(addDeviceSetupMarkup.includes("notesField=includePortConfiguration?`<div class=\"full\"><label for=\"networkDeviceNotes\">Notes</label>"));
assert(addDeviceSetupMarkup.includes('${networkFields}${notesField}${includePortConfiguration?networkPortSettingsMarkup(item,ref):\'\'}'));
console.log('PASS: V38.3 Add Device Notes visibility and supplied styles.');

// Guard against page CSS being written into a JavaScript export template.
const activeStyleStart=html.indexOf('<style'),activeStyleEnd=html.indexOf('</style>'),bodyStart=html.indexOf('<body'),sharedToolbarCss='/* V34 shared navigation and toolbar layout. */';
assert(activeStyleStart>=0&&activeStyleEnd>activeStyleStart&&activeStyleEnd<bodyStart,'Active stylesheet must precede the page body');
assert(html.slice(activeStyleStart,activeStyleEnd).includes(sharedToolbarCss),'Shared toolbar CSS must be in the active stylesheet');
assert.equal(html.split(sharedToolbarCss).length-1,1,'Shared toolbar CSS must occur exactly once');
console.log('PASS: shared toolbar CSS remains in the active stylesheet.');

// V39 Looms stores independent project data and offers vendor-aware catalogue editing.
assert.equal(appVersion,'47.7');
assert(html.includes('data-sheet-tab="looms"')&&html.indexOf('data-sheet-tab="rackLayout"')<html.indexOf('data-sheet-tab="looms"')&&html.indexOf('data-sheet-tab="looms"')<html.indexOf('data-sheet-tab="distroLabels"'));
assert(html.includes("const CABLE_CATALOGUE_MANIFEST_URL='json/cable/manifest.json';"));
const loomManifest=JSON.parse(fs.readFileSync(root+'json/cable/manifest.json','utf8'));
assert.deepEqual(loomManifest.catalogues,[{vendor:'Christie Lites UK',file:'json/cable/christie_lites_cable.json'}]);
const loomContext=vm.createContext({Date,Math,normaliseBlankColour:value=>String(value||'').trim(),crypto:{randomUUID:()=> 'uuid'}});
for(const name of ['loomId','normaliseLoomUnit','normaliseLoomLength','loomLengthText','normaliseLoomCable','normaliseLoom','normaliseLooms'])vm.runInContext(source(name),loomContext);
assert.deepEqual(JSON.parse(JSON.stringify(loomContext.normaliseLooms(undefined))),[]);
assert.equal(loomContext.loomLengthText('24','ft'),"24'");assert.equal(loomContext.loomLengthText('24','m'),'24m');
const expanded=loomContext.normaliseLoom({name:'Data',cables:[{cableType:'XLR-5',length:"24'",unit:'ft'},{cableType:'XLR-5',length:'24m',unit:'m'}]});
assert.equal(expanded.cables.length,2);assert.equal(expanded.cables[0].unit,'ft');assert.equal(expanded.cables[1].unit,'m');
assert(source('blankLoomDraft').includes('length:5'));
assert(source('saveLoomEditor').includes('Array.from({length:parseInt(row.quantity,10)}'));
assert(source('renderLoomEditor').includes('Add Loom &amp; Build More'));
assert(source('loomCardMarkup').includes('openLoomEditor')&&source('loomCardMarkup').includes('deleteLoom'));
assert(source('deleteLoomCable').includes('confirm('));
assert(source('attachLoomTableEvents').includes("'copy'")&&source('attachLoomTableEvents').includes("'paste'")&&source('attachLoomTableEvents').includes("'keydown'"));
assert(source('startLoomFill').includes('pointermove')&&source('startLoomFill').includes('persist()'));
assert(source('appPayload').includes('looms:normaliseLooms(app.looms)'));
assert(source('loadProjectPayload').includes('looms:normaliseLooms(candidate.looms)'));
assert(source('render').includes("if(activeSheetTab==='looms'){renderLoomsView();return}"));
console.log('PASS: V39 Looms catalogue, project migration, quantity expansion, editor actions and spreadsheet interactions.');

// V39.1 keeps Loom builder styling and the category-to-cable picker transition stable.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomBuildTable th{background:rgb(185,185,185);color:#000;font-family:var(--project-subheader-font);font-weight:800}'));
assert(html.includes('.btn.add{font-weight:800;font-size:14px;line-height:1;padding:8px;background:#00a61d;color:#fff;border:2px solid #000}'));
assert(source('renderLoomEditor').includes('>+ Cable</button>'));
assert(html.includes('.loomTable th:last-child,.loomTable td:last-child{width:30px;min-width:30px;max-width:30px;padding:1px;border-right:none}'));
assert(html.includes('-webkit-text-stroke-width:var(--loom-title-stroke-width,.8mm);-webkit-text-stroke-color:#000;paint-order:stroke fill'));
const loomStyleContext=vm.createContext({Array,escapeAttr:value=>String(value),normaliseHex:value=>String(value||'').toLowerCase()});vm.runInContext(source('outlinedStripeBandStops'),loomStyleContext);vm.runInContext(source('loomHeadingBackground'),loomStyleContext);
assert.equal(loomStyleContext.loomHeadingBackground(['#00b311']),'#00b311');
assert(loomStyleContext.loomHeadingBackground(['#00b311','#ff0000']).includes('repeating-linear-gradient(135deg, #00b311 -2mm,#00b311 7mm, #ff0000 7mm,#ff0000 16mm)'));
assert(loomStyleContext.loomHeadingBackground(['#00b311','#ff0000','#0060d2']).includes('#0060d2 10mm,#0060d2 16mm'));
assert(source('chooseLoomCableOption').includes("showLoomCableMenu(input);return"));
assert(source('showLoomCableMenu').includes('event.stopPropagation();chooseLoomCableOption(button)'));
console.log('PASS: V39.1 Loom styling, three-colour headings and persistent catalogue selection.');

// V39.2 edits grouped Loom cables without discarding retained cable labels or notes.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomCard.loomCardCollapsed .loomTable{display:none}'));
assert(html.includes('.loomBuildTable th:last-child,.loomBuildTable td:last-child{width:34px;padding:1px}'));
assert(source('renderLoomEditor').includes('style="margin-bottom:10px;"'));
assert(source('loomEditorRowMarkup').includes('loomBuilderDelete'));
assert(source('openLoomEditor').includes('rows:loomBuildRowsForLoom(loom)'));
assert(source('loomBuildRowsForLoom').includes('existingCableIds'));
assert(source('removeLoomBuilderRow').includes('splice'));
assert(source('reconcileLoomBuilderRows').includes('b.label||b.notes'));
assert(source('reconcileLoomBuilderRows').includes('loomCableFromBuilderRow(row)'));
assert(source('saveLoomEditor').includes('reconcileLoomBuilderRows(loom,rows)'));
assert(source('toggleLoomCard').includes('collapsedLoomCards'));
assert(source('loomCardMarkup').includes('onclick="toggleLoomCard'));
assert(source('loomCardMarkup').includes('onclick="event.stopPropagation()"'));
console.log('PASS: V39.2 grouped Loom editing, retained cable data and collapsible viewer cards.');

// V40 keeps Looms compact and provides a derived, category-organised Cable List.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomGroup{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start;border-bottom:4px solid #9b9b9b;padding-bottom:10px}'));assert(html.includes('.loomCard{width:100%;border:2px solid #000'));
assert(html.includes('.loomTable{width:100%;border-collapse:collapse;table-layout:fixed;font-family:var(--project-body-font)}'));
assert(html.includes('.loomTable tbody td{height:20px;border:0}.loomTable tbody td[data-loom-cell],.loomTable tbody td.loomDeleteCell{border-bottom:1px dashed #9b9b9b}'));
assert(html.includes('font:800 12px/1 var(--project-body-font)'));
assert(html.includes('.loomCableMenuBack{border:1px solid #667085!important'));
assert(source('showLoomCableMenu').includes('data-loom-cable-back'));
assert(source('returnToLoomCableCategories').includes("input.dataset.loomCategory=''"));
assert(source('setLoomSubTab').includes("tab==='cableList'"));
assert(source('renderLoomsView').includes('Cable List'));
assert(source('loomCableListGroups').includes("'Uncategorised'"));
assert(source('loomCableListGroups').includes('loomCableGroupKey(cable)'));
assert(source('loomCableListMarkup').includes('<th>Quantity</th><th>Looms</th>'));
assert(source('activeApplicationPageName').includes("'Looms ~ Cable List'"));
console.log('PASS: V40 compact Loom styling, category Back navigation and aggregate Cable List.');

// V40.1 places Loom navigation in its toolbar and compacts Loom card actions.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomCardActions{grid-column:3;align-self:center;justify-self:end;display:flex;flex-direction:row;flex-wrap:nowrap;gap:4px;align-items:center;width:max-content;max-width:100%;white-space:nowrap;transform:scale(.8);transform-origin:right center}'));
assert(html.includes('.loomTable th{background:#8d8d8d;color:#fff'));
assert(html.includes('.loomCableListTable{width:100%;border-collapse:collapse;table-layout:fixed'));
assert(html.includes('.loomCableListTable th,.loomCableListTable td{width:25%;'));
assert(!source('renderLoomsView').includes('tableDistroTabs distroLabelTabs loomSubTabs'));
console.log('PASS: V40.1 Loom toolbar tabs, equal Cable List columns and compact card actions.');

// V40.2 keeps Loom navigation consistent between the page toolbar and main-tab hover menu.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomsToolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;border:2px solid #000;border-radius:8px;background:rgb(185,185,185);padding:2px 12px}'));
assert(html.includes('.loomSubTabs{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px}'));
assert(source('renderLoomsView').includes('<div class="loomsToolbar"><div>${tabs}</div>${activeLoomSubTab'));
assert(source('sheetSubMenuRoutes').includes("else if(tab==='looms'){routes.push({label:'Looms'"));
assert(source('sheetSubMenuRoutes').includes("label:'Cable List'"));
console.log('PASS: V40.2 Loom toolbar matches shared sub-tab navigation and main-tab hover routes.');

// V40.3 keeps extension Looms linked, ordered beside their parent and safely deletable.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomsToolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;border:2px solid #000;border-radius:8px;background:rgb(185,185,185);padding:2px 12px}'));
assert(html.includes('.loomCardHeading{cursor:pointer;position:relative;display:grid;grid-template-columns:minmax(0,160px) minmax(0,1fr) minmax(0,160px);align-items:center;gap:4px;height:40px;min-height:40px;max-height:55px;padding:0 4px'));
assert(html.includes('.loomGroup{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start;border-bottom:4px solid #9b9b9b;padding-bottom:10px}'));
assert(source('normaliseLoom').includes('parentLoomId'));
assert(source('normaliseLooms').includes('byId.has(loom.parentLoomId)'));
assert(source('openLoomExtensionEditor').includes('activeLoomExtensionParentId=parent.id'));
assert(source('saveLoomEditor').includes('parentLoomId=loomById(activeLoomExtensionParentId)?.id'));
assert(source('loomCardMarkup').includes('+ Ext')&&source('loomCardMarkup').includes('loomCardSubheading'));
assert(source('loomDisplayGroups').includes('flatMap(child=>[child,...expand(child)])'));
assert(source('deleteLoom').includes('linked extension')&&source('deleteLoom').includes("parentLoomId=''"));
console.log('PASS: V40.3 linked Loom extensions, grouped cards and delete choices.');

// V40.4 adds saved Loom end orientation and keeps every Extension in its Feeder's right-side stack.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomCardSubheading{grid-column:1;align-self:center;justify-self:start;min-width:0;max-width:100%;flex:0 0 auto;white-space:nowrap;margin:0;padding:0 6px;text-align:left;font-family:var(--project-subheader-font);font-size:18px;font-weight:900;color:#000;background:#fefefe;border:1px solid #000;border-radius:30px}'));
assert(html.includes('.loomCardExtensionButton{flex:0 0 auto;inline-size:max-content;white-space:nowrap;padding:4px 6px;font-size:18px;font-weight:800}'));
assert(html.includes('.loomEndsTogetherRow td{color:#c00000;font-weight:900'));
assert(source('normaliseLoom').includes("endsTogether=['male','female']"));
assert(source('blankLoomDraft').includes("endsTogether:''"));
assert(source('renderLoomEditor').includes('Male Ends Together')&&source('renderLoomEditor').includes('Female Ends Together'));
assert(source('toggleLoomEndsTogether').includes("===value?'':value"));
assert(source('loomEndsTogetherRowMarkup').includes('loomEndsTogetherRow'));
assert(source('loomCardMarkup').includes("extension?'EXT':'Feeder'"));
assert(source('loomCardMarkup').includes("extension?'':`<button"));
assert(source('renderLoomsView').includes('loomExtensionStack'));
assert(source('saveLoomEditor').includes('loomDescendantIds(parentLoomId).forEach'));
assert(source('toggleLoomCard').includes('loomDescendantIds(id).forEach'));
console.log('PASS: V40.4 Loom end settings, Feeder/Extension layout and focussed extension creation.');

// V40.5 refines Loom cards and makes every supply warning a navigable Project Error.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomCardHeading{cursor:pointer;position:relative;display:grid;grid-template-columns:minmax(0,160px) minmax(0,1fr) minmax(0,160px);align-items:center;gap:4px;height:40px;min-height:40px;max-height:55px;padding:0 4px'));
assert(html.includes('.loomCardActions{grid-column:3;align-self:center;justify-self:end;display:flex;flex-direction:row;flex-wrap:nowrap;gap:4px;align-items:center;width:max-content;max-width:100%;white-space:nowrap;transform:scale(.8);transform-origin:right center}'));
assert(html.includes('.loomCardActions .btn.danger{width:30px;height:30px;padding:4px;font-size:12px;line-height:1}'));
assert(html.includes('.loomTable tbody td{height:20px;border:0}.loomTable tbody td[data-loom-cell],.loomTable tbody td.loomDeleteCell{border-bottom:1px dashed #9b9b9b}'));
assert(html.includes('.loomEndsTogetherRow td{color:#c00000;font-weight:900;border-top:2px solid #000!important}'));
assert(source('loomCardMarkup').includes('aria-label="Delete Loom"')&&source('loomCardMarkup').includes('>Edit</button>'));
assert(source('powerSupplyWarningEntries').includes('incomplete-load')&&source('powerSupplyWarningEntries').includes('invalid-rating')&&source('powerSupplyWarningEntries').includes('overload'));
assert(source('collectProjectErrors').includes('collectPowerSupplyErrors(distroRanges())'));
assert(source('openProjectError').includes("target.kind==='power'")&&source('openProjectError').includes("activePowerSubTab='calcs'")&&source('openProjectError').includes('openPowerSupplyPane(supply.id)'));
console.log('PASS: V40.5 Loom refinement and Power supply Project Errors.');

// V40.6 reserves white outlined text for the project Yellow in Position Summary and Loom headings.
assert.equal(appVersion,'47.7');
const v406=vm.createContext({normaliseHex:value=>String(value||''),colourSetPresentation:values=>({text:'#111111',outline:'#ffffff'}),colourTextToHex:value=>String(value||''),loomHeadingBackground:()=>'#ffff3d'});
for(const name of ['projectYellowTextPresentation','positionSummaryColourPresentation','loomHeadingStyle'])vm.runInContext(source(name),v406);
assert.deepEqual(JSON.parse(JSON.stringify(v406.positionSummaryColourPresentation(['#FFFF3D']))),{text:'#ffffff',outline:'#000000'});
assert.deepEqual(JSON.parse(JSON.stringify(v406.positionSummaryColourPresentation(['#FFFFFF']))),{text:'#111111',outline:'#ffffff'});
assert(v406.loomHeadingStyle({colour1:'#FFFF3D'}).includes('--loom-text:#ffffff'));
assert(v406.loomHeadingStyle({colour1:'#ffff3d',colour2:'#ff0000'}).includes('--loom-text:#111111'));
assert(source('positionSummaryMarkup').includes('controlPositionStripStyle(position,true)'));
assert(source('positionPdfItemMarkup').includes('controlPositionStripStyle(row,true)'));
assert(source('drawPositionSummaryBlock').includes('positionSummaryColourPresentation(colours)'));
assert(source('controlPositionStripStyle').includes('positionSummary?positionSummaryColourPresentation(colours)'));
assert(html.includes('.loomCardHeading{cursor:pointer;position:relative;display:grid;grid-template-columns:minmax(0,160px) minmax(0,1fr) minmax(0,160px);align-items:center;gap:4px;height:40px;min-height:40px;max-height:55px;padding:0 4px'));
assert(html.includes('.loomCardSubheading{grid-column:1;align-self:center;justify-self:start;min-width:0;max-width:100%;flex:0 0 auto;white-space:nowrap;margin:0;padding:0 6px;text-align:left;font-family:var(--project-subheader-font);font-size:18px;font-weight:900;color:#000;background:#fefefe;border:1px solid #000;border-radius:30px}'));
assert(html.includes('.loomEndsTogetherRow td{color:#c00000;font-weight:900;border-top:2px solid #000!important}'));
const loomCardSource=source('loomCardMarkup');assert(loomCardSource.includes('>+ Ext</button>')&&loomCardSource.indexOf('>+ Ext</button>')<loomCardSource.indexOf('>Edit</button>'));assert(loomCardSource.includes('extension?\'EXT\':\'Feeder\''));
console.log('PASS: V40.6 Yellow Position Summary and Loom heading layout.');

// V40.7 refines Loom pane controls, outside closing and full-height cable choices.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomCardSubheading{grid-column:1;align-self:center;justify-self:start;min-width:0;max-width:100%;flex:0 0 auto;white-space:nowrap;margin:0;padding:0 6px;text-align:left;font-family:var(--project-subheader-font);font-size:18px;font-weight:900;color:#000;background:#fefefe;border:1px solid #000;border-radius:30px}'));
assert(html.includes('.loomBuildTable{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12px}'));
assert(html.includes('.loomBuildTable th:nth-child(1),.loomBuildTable td:nth-child(1){width:120px}'));
assert(html.includes('.loomBuildTable th:nth-child(3),.loomBuildTable td:nth-child(3){width:70px}'));
assert(html.includes('.loomBuildTable input[type=number]{appearance:textfield;-moz-appearance:textfield}'));
assert(html.includes('.loomEndsChoices{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px;transform:scale(.8)'));
assert(html.includes('.loomCableMenu{position:absolute;z-index:30001;width:min(290px,calc(100vw - 24px));max-height:none;overflow:visible'));
const loomEditorSource=source('renderLoomEditor');
assert(loomEditorSource.indexOf('>+ Cable</button>')<loomEditorSource.indexOf('loomEndsChoices'));
assert(!loomEditorSource.includes("'<><button"));
assert(source('loomCardMarkup').includes("extension?'EXT':'Feeder'"));
assert(source('showLoomCableMenu').includes('window.scrollY+rect.bottom+4'));
assert(source('renderLoomsView').includes('data-open-loom-editor'));
assert(html.includes('data-open-loom-editor]'));
assert(html.includes("const loomEditorPane=$('loomEditorPane'),loomClickPath=e.composedPath?.()||[]"));
assert(html.includes('!loomClickPath.includes(loomEditorPane)'));
console.log('PASS: V40.7 Loom pane controls, full cable picker and outside close.');

// V40.7 keeps Fan Out body text readable independently of the saved table format.
assert.equal(appVersion,'47.7');
assert(html.includes('.fanOutTable tbody .fixIdCol .fanOutCellText{font-size:18px!important}'));
assert(html.includes('.fanOutTable tbody .fixTypeCol .fanOutCellText,.fanOutTable tbody .positionCol .fanOutCellText{font-size:14px!important}'));
console.log('PASS: V40.7 Fan Out body-cell font sizes.');

// V40.9 retains Control outlines and preserves valid Loom parent relationships when changing type.
assert.equal(appVersion,'47.7');
assert(html.includes('.controlNetworkView .consolePositionName{-webkit-text-stroke-width:1mm;-webkit-text-stroke-color:#000;paint-order:stroke fill}'));
assert(html.includes('.controlLocationCell.positionStyled{font-family:Cochin'));
assert(html.includes('-webkit-text-stroke-width:.1mm;-webkit-text-stroke-color:#000;paint-order:stroke fill}.controlLocationCell.positionStyled input'));
assert(source('controlPositionStripMarkup').includes('controlPositionName consolePositionName'));
assert(source('loomEditorEligibleFeeders').includes('loomDescendantIds(loomId)'));
assert(source('renderLoomTypeControls').includes("['feeder','Feeder'],['ext','EXT']"));
assert(source('openLoomEditor').includes("loomType:loom.parentLoomId?'ext':'feeder'"));
assert(source('setLoomEditorType').includes("loomEditorDraft.loomType==='feeder'"));
assert(source('saveLoomEditor').includes("alert('Select a valid Feeder Loom.')"));
assert(source('saveLoomEditor').includes('loom.parentLoomId=parentLoomId'));
console.log('PASS: V40.9 Control outlines and Loom type editing.');

// V40.9 spaces the Loom editor consistently and orders Extension Looms by name.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomsList{display:grid;gap:10px}'));
assert(html.includes('.loomGroup{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start;border-bottom:4px solid #9b9b9b;padding-bottom:10px}'));
assert(html.includes('.loomPaneActions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:16px}'));
assert(html.includes('.loomTypeTabs{display:flex;gap:10px;flex-wrap:wrap;border-bottom:2px solid #9b9b9b;margin-bottom:10px}.loomTypeTabs .projectTab{padding:6px;margin-bottom:6px}'));
assert(source('loomNameCompare').includes("sensitivity:'base'"));
assert(source('loomDisplayGroups').includes('expand(parent).sort(loomNameCompare)'));
console.log('PASS: V40.9 Loom editor spacing and alphabetical Extension ordering.');

// V40.10 refines Loom borders, replaces the Home Socapex stat and makes Position colours authoritative.
assert.equal(appVersion,'47.7');
assert(html.includes('.tourLogoSlot{display:flex;align-items:center;justify-content:center;width:165px'));
assert(html.includes('.loomCardHeading{cursor:pointer;position:relative;display:grid;grid-template-columns:minmax(0,160px) minmax(0,1fr) minmax(0,160px);align-items:center;gap:4px;height:40px;min-height:40px;max-height:55px;padding:0 4px;background:var(--loom-background,#fff)'));
assert(html.includes('.loomTable th:first-child,.loomTable td:first-child{border-left:none}'));
assert(html.includes('.loomTable th:last-child,.loomTable td:last-child{width:30px;min-width:30px;max-width:30px;padding:1px;border-right:none}'));
assert(html.includes('.loomEndsTogetherRow td{color:#c00000;font-weight:900;border-top:2px solid #000!important}'));
assert(html.includes('.loomTable tbody td[data-loom-cell],.loomTable tbody td.loomDeleteCell{border-bottom:1px dashed #9b9b9b}'));
assert(html.includes('.powerSocaColourInput:not(:focus){color:transparent!important;-webkit-text-stroke-color:transparent!important;text-shadow:none!important}'));
assert(html.includes("const HOME_STAT_LAYOUT_IDS=['fixtures','universes','consoles','parameters-required','channel-count','parameters-available','universes-available','distros','looms','data-racks']"));
assert(source('normaliseHomeLayout').includes("==='socapexes'?'looms'"));
assert(source('homeStatsMarkup').includes("looms:[normaliseLooms(app.looms).length,'Looms','looms']"));
assert(source('renderHomeView').includes("'fixture-info':{title:'Fixture Summary'"));
const v4010layout=vm.createContext({});
vm.runInContext("const HOME_STAT_LAYOUT_IDS=['fixtures','universes','consoles','parameters-required','channel-count','parameters-available','universes-available','distros','looms','data-racks'];const HOME_SUMMARY_LAYOUT_IDS=['fixture-info','position-summary','dmx-universes','console-network-summary','revision-summary'];",v4010layout);
vm.runInContext(source('normaliseHomeLayout'),v4010layout);
const migratedLoomLayout=JSON.parse(JSON.stringify(v4010layout.normaliseHomeLayout({stats:[{id:'socapexes',size:'wide',visible:false}],summaries:[]})));
assert.equal(migratedLoomLayout.stats.find(item=>item.id==='looms').size,'standard');assert.equal(migratedLoomLayout.stats.find(item=>item.id==='looms').visible,false);
const v4010=vm.createContext({app:{fixturePatch:[{location:'FOH',colour1:'#ff0000',colour2:'#0000ff'}],controlNetwork:{consoles:[],npus:[],networkDevices:[],racks:[]}},project:{positions:[{name:'foh',colour1:'',colour2:'#00ff00',colour3:''}]},normalisePosition:value=>({name:String(value?.name||value?.location||'').trim(),colour1:String(value?.colour1||''),colour2:String(value?.colour2||''),colour3:String(value?.colour3||'')}),normaliseBlankColour:value=>String(value||'').trim(),ensureProjectInfo:()=>v4010.project,patchFixtureRows:()=>v4010.app.fixturePatch,syncRackMountedNetworkLocations:()=>{}});
for(const name of ['positionKey','positionLocationItems','syncPositionsFromPatch'])vm.runInContext(source(name),v4010);
v4010.syncPositionsFromPatch();
assert.equal(v4010.app.fixturePatch[0].colour1,'');
assert.equal(v4010.app.fixturePatch[0].colour2,'#00ff00');
assert.equal(v4010.app.fixturePatch[0].location,'foh');
const v4010new=vm.createContext({app:{fixturePatch:[{location:'Deck',colour1:'#ff0000',colour2:'#0000ff'}],controlNetwork:{consoles:[],npus:[],networkDevices:[],racks:[]}},project:{positions:[]},normalisePosition:value=>value,normaliseBlankColour:value=>String(value||'').trim(),ensureProjectInfo:()=>v4010new.project,patchFixtureRows:()=>v4010new.app.fixturePatch,syncRackMountedNetworkLocations:()=>{}});
for(const name of ['positionKey','positionLocationItems','syncPositionsFromPatch'])vm.runInContext(source(name),v4010new);
v4010new.syncPositionsFromPatch();
assert.deepEqual(JSON.parse(JSON.stringify(v4010new.project.positions[0])),{name:'Deck',colour1:'#ff0000',colour2:'#0000ff',colour3:''});
assert(source('updatePatchRowField').includes("field==='address'||field==='universe'||field==='location'"));
console.log('PASS: V40.10 Loom borders, Home Loom summary, Position colour syncing and centred tour logo.');

// V41 retains unpatched fixtures and adds saved Active/Ignored error management.
assert.equal(appVersion,'47.7');
assert(source('loomViewerRowMarkup').includes('class="loomDeleteCell"'));
assert(source('fitLoomCardTitle').includes('size>22'));
assert(source('fitLoomCardTitle').includes('Math.min(55'));
assert(source('observeLoomCardTitles').includes('ResizeObserver'));
assert(html.includes('.fixturePatchDuplicateActions{display:flex;gap:12px'));
assert(source('showDuplicateFixWarning').includes('action.hidden=true'));
assert(source('updatePatchOptionsAfterAdd').includes('action.hidden=false'));
assert(source('buildPendingPatchAdds').includes("universe:universe===null?'':String(universe)"));
assert(!source('buildPatchImportRows').includes('assignNextAddresses'));
assert(source('applyPatchField').includes("row.universe=String(value||'').trim()?"));
assert(!source('updatePatchRowField').includes('assignNextAddresses'));
assert(!source('schedulePatchAddressValidation').includes('fillBlankPatchAddresses'));
assert(!source('updatePatchAddressSuggestion').includes('nextPatchSlot'));
assert(source('clearPatchFixtureAddresses').includes("row.universe='';row.address=''"));
assert(source('confirmUnpatchFixtures').includes('clearPatchFixtureAddresses'));
assert(source('renderPatchGroupEditModal').includes('Unpatch Fixtures'));
assert(source('renderPatchGroupEditModal').includes('Delete Fixtures'));
assert(source('deleteSelectedPatchGroupFixtures').includes('app.fixturePatch=patchFixtureRows().filter'));
assert(source('normaliseProjectInfo').includes('ignoredProjectErrors'));
assert(source('refreshProjectErrors').includes('retained=(project.ignoredProjectErrors||[]).filter'));
assert(source('updateProjectErrorsMenu').includes('activeProjectErrorList().slice(0,5)'));
assert(source('renderProjectErrorsPage').includes('Active'));
assert(source('renderProjectErrorsPage').includes('Ignored'));
assert(source('projectErrorGroupMarkup').includes('Select All'));
assert(source('applyProjectErrorBulkAction').includes("if(activeProjectErrorsTab==='ignored')"));
const v41patch=vm.createContext({modeMetaFor:()=>({}),fixtureGdtfReference:()=>({}),patchFixturesFor:()=>[],reconcilePatchModeAddress:()=>{}});vm.runInContext(source('applyPatchField'),v41patch);
const blankAddressRow={universe:'1',address:'1'};v41patch.applyPatchField(blankAddressRow,'universe','');v41patch.applyPatchField(blankAddressRow,'address','');assert.equal(blankAddressRow.universe,'');assert.equal(blankAddressRow.address,'');
const v41groups=vm.createContext({});for(const name of ['projectErrorPage','groupedProjectErrors'])vm.runInContext(source(name),v41groups);
const grouped=JSON.parse(JSON.stringify(v41groups.groupedProjectErrors([{id:'p',targets:[{kind:'power'}]},{id:'f',targets:[{kind:'patch'}]},{id:'i',targets:[{kind:'ip'}]}])));assert.deepEqual(grouped.map(item=>item[0]),['Fixture Patch','Device Config','Power']);
console.log('PASS: V41 Loom title fitting, retained unpatched fixtures and grouped Active/Ignored errors.');

// V41.1 keeps Loom titles centred without allowing title fitting to resize the side controls.
assert.equal(appVersion,'47.7');
assert(html.includes('.loomCardHeading{cursor:pointer;position:relative;display:grid;grid-template-columns:minmax(0,160px) minmax(0,1fr) minmax(0,160px);align-items:center;gap:4px;height:40px;min-height:40px;max-height:55px;padding:0 4px'));
assert(html.includes('.loomCardTitle{grid-column:2;align-self:stretch;min-width:0;max-width:100%;overflow:hidden;display:flex;align-items:center;justify-content:center}'));
assert(html.includes('.loomCardSubheading{grid-column:1;align-self:center;justify-self:start;min-width:0;max-width:100%;flex:0 0 auto;white-space:nowrap'));
assert(html.includes('.loomCardActions{grid-column:3;align-self:center;justify-self:end;display:flex;flex-direction:row;flex-wrap:nowrap;gap:4px;align-items:center;width:max-content;max-width:100%;white-space:nowrap'));
assert(html.includes('.loomCardExtensionButton{flex:0 0 auto;inline-size:max-content;white-space:nowrap;padding:4px 6px;font-size:18px;font-weight:800}'));
assert(html.includes('.loomCardActions .btn{flex:0 0 auto;white-space:nowrap;padding:4px 6px}'));
assert(source('fitLoomCardTitle').includes("heading.style.height='40px'"));
assert(source('fitLoomCardTitle').includes("title.style.fontSize='30px'"));
assert(source('fitLoomCardTitle').includes('size>22'));
assert(source('fitLoomCardTitle').includes('Math.min(55'));
assert(!source('fitLoomCardTitle').includes('loomCardActions'));
assert(!source('fitLoomCardTitle').includes('loomCardSubheading'));
console.log('PASS: V41.1 stable centred Loom headings and fixed side controls.');

// V41.1 groups fixture issues into selectable rows and places error controls in the tab toolbar.
assert(html.includes('.projectErrorsTabs .projectErrorsBulkActions{margin-left:auto}'));
assert(html.includes('.projectErrorsTabBadge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px'));
assert(html.includes('.projectErrorGroupHead{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:14px;border-bottom:2px solid #9b9b9b;padding:0 12px 8px 16px}'));
assert(html.includes('.projectErrorGroupSelect input,.projectErrorSelect input{width:auto;transform:scale(1.5)'));
assert(html.includes('.projectErrorGroupBody[hidden]{display:none!important}'));
assert(source('renderProjectErrorsPage').includes('projectErrorsActiveTabBadge'));
assert(source('renderProjectErrorsPage').includes('<div id="projectErrorsBulkActions" class="projectErrorsBulkActions"></div></div>'));
assert(source('projectErrorGroupMarkup').includes('projectErrorGroupToggle'));
assert(source('projectErrorGroupMarkup').includes('projectErrorDisplayRows(errors)'));
assert(source('toggleProjectErrorGroupCollapsed').includes('collapsedProjectErrorGroups'));
assert(source('updateProjectErrorsPage').includes('badge.textContent=String(active.length)'));
const v411errors=vm.createContext({});vm.runInContext(source('projectErrorDisplayRows'),v411errors);
const displayRows=JSON.parse(JSON.stringify(v411errors.projectErrorDisplayRows([
  {id:'missing:a:universe',targets:[{kind:'patch',id:'a'}]},
  {id:'missing:a:address',targets:[{kind:'patch',id:'a'}]},
  {id:'missing:b:address',targets:[{kind:'patch',id:'b'}]},
  {id:'power:x',targets:[{kind:'power',supplyId:'x'}]}
])));
assert.deepEqual(displayRows.map(row=>row.map(error=>error.id)),[['missing:a:universe','missing:a:address'],['missing:b:address'],['power:x']]);
console.log('PASS: V41.1 collapsible grouped Project Errors and toolbar bulk actions.');

// V41.1 gives every unlocked Fixture Patch field Loom-style keyboard navigation.
const patchTableEventsSource=source('attachFixturePatchTableEvents');
assert(patchTableEventsSource.includes("['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Tab']"));
assert(!patchTableEventsSource.includes('select[data-patch-field="mode"]'));
assert(!patchTableEventsSource.includes("event.target.tagName==='SELECT'"));
assert(source('focusFixturePatchCell').includes('field.select?.()'));
assert(source('focusFixturePatchCell').includes('fixturePatchKeyboardNavigating=true'));
assert(source('focusFixturePatchCell').includes('finally{fixturePatchKeyboardNavigating=false}'));
assert(source('updatePatchRowField').includes('finalise&&!fixturePatchKeyboardNavigating'));
let patchFocused='',patchSelected='',patchExtended=false;
const patchNavCells=[];
for(let row=0;row<2;row++)for(let col=0;col<2;col++){const key=`${row}:${col}`,control={dataset:{patchGridRow:String(row),patchGridCol:String(col),patchField:col===0?'left':'right'},focus:()=>{patchFocused=key},select:()=>{patchSelected=key}};patchNavCells.push({key,querySelector:()=>control})}
const patchNavContext=vm.createContext({fixturePatchKeyboardNavigating:false,fixturePatchEditableCells:()=>patchNavCells,selectFixturePatchCell:(cell,extend)=>{patchExtended=extend;patchSelected='cell:'+cell.key}});
vm.runInContext(source('focusFixturePatchCell'),patchNavContext);
patchNavContext.focusFixturePatchCell({},patchNavCells[0],'ArrowRight',false);assert.equal(patchFocused,'0:1');assert.equal(patchSelected,'0:1');assert.equal(patchExtended,false);
patchNavContext.focusFixturePatchCell({},patchNavCells[0],'ArrowDown',true);assert.equal(patchFocused,'1:0');assert.equal(patchSelected,'1:0');assert.equal(patchExtended,true);
assert.equal(patchNavContext.fixturePatchKeyboardNavigating,false);
console.log('PASS: V41.1 Loom-style Fixture Patch keyboard navigation across text and list cells.');

// V42 shares Fixture Summary, persists project fixture overrides and uses a compact Patch grid.
assert.equal(appVersion,'47.7');
assert(!source('renderProjectErrorsPage').includes('projectErrorsHeader'));
assert(!html.includes('.projectErrorsHeader{'));
assert(source('openProjectErrorsPage').includes('data-project-errors-tab'));
assert(!html.includes('function returnFromProjectErrors('));
assert(source('renderFixturePatchView').includes('data-open-fixture-summary'));
assert(source('renderHomeView').includes("fixtureBody=fixtureSummaryMarkup(fixtureItem?.size==='wide')"));
assert(source('openFixtureSummaryPane').includes("pane.classList.add('open')"));
assert(source('closeFixtureSummaryPane').includes("pane.classList.remove('open')"));
assert(source('fixtureSummaryMarkup').includes('fixtureGdtfAvailableForRow'));
assert(source('attachFixturePatchTableEvents').includes('let editableColumn=0'));
assert(source('attachFixturePatchTableEvents').includes('control.dataset.patchGridCol=editableColumn++'));
assert(source('focusFixturePatchCell').includes('next.dataset.patchField===fieldName'));
assert(source('focusFixturePatchCell').includes('.sort((a,b)=>parseInt'));
assert(source('defaultProjectInfo').includes('fixtureOverrides:{}'));
assert(source('normaliseProjectInfo').includes('base.fixtureOverrides=normaliseFixtureOverrides'));
assert(source('revisionTrackedState').includes('fixtureOverrides:project.fixtureOverrides'));
assert(source('loadProjectPayload').includes('applyFixtureOverridesToProjectRows()'));
assert(source('saveFixtureInfoEditor').includes('normalisePatchSheets(app.patchSheets)'));
assert(source('saveFixtureInfoEditor').includes('project.fixtureOverrides[key]'));
assert(source('readFixtureInfoGdtfFile').includes('gdtfFileMatchesPatchFixture(parsed,row)'));
assert(source('readFixtureInfoGdtfFile').includes('storeGdtfFile(parsed)'));
assert(source('openFixtureInfoModal').includes('fixtureInfoHeroMarkup'));
assert(source('fixtureInfoHeroMarkup').includes('Add GDTF File'));
const v42Overrides=vm.createContext({normaliseImportMatch:value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'')});
for(const name of ['fixtureOverrideKey','normaliseFixtureOverrides'])vm.runInContext(source(name),v42Overrides);
const normalisedOverrides=JSON.parse(JSON.stringify(v42Overrides.normaliseFixtureOverrides({legacy:{manufacturer:'Robe',fixture:'Mega Pointe',shortName:'MP',weight:'22.5',watts:'470'}})));
assert.deepEqual(normalisedOverrides['robe|megapointe'],{manufacturer:'Robe',fixture:'Mega Pointe',shortName:'MP',weight:22.5,watts:470});
console.log('PASS: V42 Fixture Summary, project fixture overrides, direct GDTF attachment and compact Patch navigation.');

// V42 keeps display controls with the Patch filters and gives every primary toolbar action one size.
const fixturePatchViewSource=source('renderFixturePatchView');
const patchControlsSource=source('patchControlsMarkup');
assert(!fixturePatchViewSource.includes("fixtureNameModeControl('patch')"));
assert(!fixturePatchViewSource.includes('openPatchFormatModal()'));
assert(patchControlsSource.includes("fixtureNameModeControl('patch')"));
assert(!patchControlsSource.includes('openPatchFormatModal()'));
assert(html.includes('.fixturePatchToolbarActions>.btn{display:inline-flex;align-items:center;justify-content:center;width:128px;height:42px;min-width:128px'));
console.log('PASS: V42 Fixture Patch controls and uniform toolbar actions.');

// V42.1 shares the Power Position presentation with Fan Out Position cells.
assert.equal(appVersion,'47.7');
assert(source('fanOutSlotCellsMarkup').includes('fanOutCellText powerFixTypeText powerPositionText'));
assert(source('fanOutSlotCellsMarkup').includes('powerPositionCellStyle(result)'));
assert(html.includes('.powerSheetTable .positionCol .powerPositionText,.fanOutTable .positionCol .powerPositionText{-webkit-text-stroke-width:var(--power-position-stroke-width,0);-webkit-text-stroke-color:var(--power-position-outline,transparent);paint-order:stroke fill;text-shadow:none!important}'));
assert(!html.includes('.fanOutTable .positionCol .fanOutCellText{-webkit-text-stroke:.35px'));
console.log('PASS: V42.1 Fan Out positions match Power Calculations.');

// V42.1 commits Patch positions once instead of creating one Position Summary entry per keystroke.
const patchPositionCommitSource=source('updatePatchRowField');
assert(patchPositionCommitSource.includes("if(field==='location'&&!finalise)return"));
assert(patchPositionCommitSource.includes("(field==='location'&&finalise)||field==='colour1'||field==='colour2'"));
const patchPositionRow={id:'fixture-1',location:'Existing Position'};
const patchPositionContext=vm.createContext({patchFixtureRows:()=>[patchPositionRow],patchGroupUnlocked:()=>true});
vm.runInContext(source('updatePatchRowField'),patchPositionContext);
patchPositionContext.updatePatchRowField({dataset:{patchId:'fixture-1',patchField:'location'},value:'N'},false);
assert.equal(patchPositionRow.location,'Existing Position');
console.log('PASS: V42.1 Fixture Patch position creation waits for a committed value.');


// V43 fixes Home customisation and adds saved Position ordering and PDF grids.
assert.equal(appVersion,'47.7');
assert(html.includes('.projectSettingsView{width:min(1300px,100%)'));
assert(html.includes('.projectProductionFieldRow{display:grid;grid-template-columns:350px 160px'));
assert(source('homeStat').includes('draggable="false"'));
assert(!source('homeStat').includes('homeLayoutControlsMarkup'));
assert(source('homeLayoutControlsMarkup').includes("id==='revision-summary'"));
assert(source('homeLayoutControlsMarkup').includes("'Small':'Big'"));
assert(source('renderHomeView').includes("headerAction:homeCustomising?'':"));
assert(source('fixtureSummaryMarkup').includes('homeFixtureSummaryColumns'));
assert(source('renderPositionsView').includes('Sort By'));
assert(source('renderPositionsView').includes('movePositionRow'));
assert(!source('renderPositionsView').includes('closePositionMenu'));
assert(source('positionColourSortPart').includes('red:1,orange:2,yellow:3,gray:4'));
assert(source('movePositionRow').includes("sortBy='manual'"));
assert(source('normalisePositionSummaryFormat').includes("sortBy:['name','colour','manual']"));
assert(source('normalisePositionSummaryFormat').includes("rectangles:{columns:positionGridNumber(grids.rectangles?.columns,2,8),rows:positionGridNumber(grids.rectangles?.rows,6,12)}"));
assert(source('normalisePositionSummaryFormat').includes("boxes:{columns:positionGridNumber(grids.boxes?.columns,4,8),rows:positionGridNumber(grids.boxes?.rows,4,12)}"));
assert(html.includes('.positionPdfGrid.rectangles .positionPdfItem{aspect-ratio:3/.5}'));
assert(html.includes('.positionPdfGrid.boxes .positionPdfItem{aspect-ratio:2/1}'));
assert(source('positionSummaryGeometry').includes('footerMm=12'));
assert(source('renderPositionSummaryPreview').includes('geometry.leftMm'));
assert(source('positionSummaryPdfBytes').includes("#positionPdfPages .exportPage"));
assert(source('positionSummaryPdfBytes').includes('patchPdfPageToJpeg(page)'));
assert(source('positionSummaryPdfBytes').includes('buildPdfImageFile(images,d.ptW,d.ptH)'));
assert(source('pdfPageCaptureScale').includes('#positionPdfPages'));
assert(source('positionSummaryPdfTextLayout').includes('baseSize=24,minSize=12'));
assert(source('pdfDrawPositionText').includes("outlined?'2':'0'} Tr"));
assert(!source('pdfDrawPositionText').includes('forEach(([dx,dy])'));
assert(source('drawPositionSummaryBlock').includes("pdfRoundRect(doc,x,y,w,h,radius,'S')"));
assert(source('positionPdfHeaderMarkup').includes("join(' - ')"));
const positionPdfTextContext=vm.createContext({pdfMeasuredTextWidth:(text,size)=>String(text).length*size*.5});vm.runInContext(source('positionSummaryPdfTextLayout'),positionPdfTextContext);
assert.equal(positionPdfTextContext.positionSummaryPdfTextLayout('FRONT TRUSS',250,150).lines.length,1);
assert.equal(positionPdfTextContext.positionSummaryPdfTextLayout('SR TOWER/LX 3',120,150).lines.length,2);
assert.deepEqual([...source('syncPdfPreviewLogoControls').matchAll(/\['(vendor|secondary)'/g)].map(match=>match[1]),['vendor','secondary']);
assert(source('exportRightLogoMarkup').includes('logoSource(project.logo)'));
assert(!source('exportRightLogoMarkup').includes('logos.tour'));
const v43Position=vm.createContext({colourDisplayName:value=>String(value||''),ensureProjectInfo:()=>({positionSummaryFormat:{layout:'rectangles',sortBy:'colour',grids:{rectangles:{columns:2,rows:6},boxes:{columns:4,rows:4}}}})});for(const name of ['positionGridNumber','positionSummaryGrid','positionColourSortPart','comparePositionColours','positionSummaryGeometry'])vm.runInContext(source(name),v43Position);
const greenOrder=[{name:'Green White',colour1:'Green',colour2:'White'},{name:'Green',colour1:'Green',colour2:''},{name:'Green Yellow',colour1:'Green',colour2:'Yellow'}].sort(v43Position.comparePositionColours).map(item=>item.name);assert.deepEqual(greenOrder,['Green','Green Yellow','Green White']);
const rectangleGeometry=v43Position.positionSummaryGeometry({w:297,h:210},'rectangles');assert.equal(rectangleGeometry.perPage,12);assert(rectangleGeometry.topMm>=rectangleGeometry.headerMm);assert(rectangleGeometry.topMm+rectangleGeometry.gridH<=210-rectangleGeometry.footerMm+0.001);
const boxGeometry=v43Position.positionSummaryGeometry({w:297,h:210},'boxes');assert.equal(boxGeometry.perPage,16);assert(boxGeometry.topMm+boxGeometry.gridH<=210-boxGeometry.footerMm+0.001);
assert.equal(pctx.normaliseProjectInfo({exportLogos:{tour:false}}).exportLogos.tour,true);
console.log('PASS: V43 Home customisation, mandatory Tour Logo, Position ordering and PDF grids.');

// V43.1 outlines white bands in every shared multi-colour Position background.
assert.equal(appVersion,'47.7');
const positionStripeContext=vm.createContext({escapeAttr:value=>String(value),normaliseHex:value=>String(value||'').toLowerCase()});
vm.runInContext(source('outlinedStripeBandStops'),positionStripeContext);
vm.runInContext(source('positionStripeBands'),positionStripeContext);
const outlinedWhiteBands=positionStripeContext.positionStripeBands(['#00b311','#ffffff','#ff0000']);
assert(outlinedWhiteBands.includes('#000 30px,#000 calc(30px + .5mm)'));
assert(outlinedWhiteBands.includes('#ffffff calc(30px + .5mm),#ffffff calc(60px - .5mm)'));
assert(source('controlPositionStripStyle').includes('positionStripeBands(colours)'));
assert(source('drawPositionSummaryStripeFill').includes("colour==='#ffffff'"));
assert(source('drawPositionSummaryStripeFill').includes('whiteOutlineMm=.5'));
assert(source('drawPositionSummaryStripeFill').includes('whiteOutlineMm*PDF_MM_TO_PT'));
assert(source('drawPositionSummaryStripeFill').includes("whiteBands.forEach(points=>pdfPoly(doc,points,'S'))"));
console.log('PASS: V43.1 multi-colour Position white bands use a 0.5 mm black outline.');

// V43.2 applies the shared white-band outline to Loom headings.
assert.equal(appVersion,'47.7');
const outlinedLoomHeading=loomStyleContext.loomHeadingBackground(['#ff0000','#ffffff','#0060d2']);
assert(outlinedLoomHeading.includes('#000 4mm,#000 calc(4mm + .5mm)'));
assert(outlinedLoomHeading.includes('#ffffff calc(4mm + .5mm),#ffffff calc(10mm - .5mm)'));
console.log('PASS: V43.2 Looms outline white multi-colour bands.');

// V43.3 uses a 0.3 mm white-band outline for Power, Fan Outs and Socapex cells.
assert.equal(appVersion,'47.7');
const powerStripeContext=vm.createContext({escapeAttr:value=>String(value),normaliseHex:value=>String(value||'').toLowerCase(),$:()=>({value:'4'})});
vm.runInContext(source('outlinedStripeBandStops'),powerStripeContext);
vm.runInContext(source('positionStripeBands'),powerStripeContext);
vm.runInContext(source('powerMultiColourBackground'),powerStripeContext);
const powerWhiteBands=powerStripeContext.powerMultiColourBackground(['#ff0000','#ffffff','#0060d2']);
assert(powerWhiteBands.includes('#000 4mm,#000 calc(4mm + .3mm)'));
assert(powerWhiteBands.includes('#ffffff calc(4mm + .3mm),#ffffff calc(8mm - .3mm)'));
assert(source('powerPositionCellStyle').includes('powerMultiColourBackground(colours)'));
assert(source('powerSheetRowMarkup').includes('powerMultiColourBackground(socaColourValues)'));
assert(source('fanOutRowMarkup').includes('powerMultiColourBackground(socaColourValues)'));
assert(source('fanOutSlotCellsMarkup').includes('powerPositionCellStyle(result)'));
assert(source('drawPdfSocaStripeCanvas').includes('(.3*96/25.4)*scale'));
assert(source('powerPdfDomPdfBytes').includes('stripeWidth,0,.3'));
console.log('PASS: V43.3 Power Calcs, Fan Outs and Socapex cells use 0.3 mm white-band outlines.');

// V43.4 renders every Power and Fan Out Position background through a PDF colour layer.
assert.equal(appVersion,'47.7');
assert(source('preparePdfSocaColourLayers').includes(".positionCol[data-power-position-colours]"));
assert(source('preparePdfSocaColourLayers').includes("drawPdfSocaStripeCanvas,'.powerPositionText'"));
assert(source('preparePdfSocaColourLayers').includes("!text.matches('.powerSocaNameText')"));
assert(source('powerCalculationsPreviewPdfBytes').includes('patchPdfPageToJpeg(page)'));
assert(source('fanOutPreviewPdfBytes').includes('patchPdfPageToJpeg(page)'));
console.log('PASS: V43.4 Power Calcs and Fan Out PDFs retain every Position colour background.');

// V43.5 removes the Fixture Patch Format button while retaining the other filter actions.
assert.equal(appVersion,'47.7');
assert(!source('patchControlsMarkup').includes('openPatchFormatModal()'));
assert(source('patchControlsMarkup').includes("fixtureNameModeControl('patch')"));
assert(source('patchControlsMarkup').includes('openPatchColumnsModal()'));
assert(source('patchControlsMarkup').includes('clearPatchFilters()'));
assert(source('patchControlsMarkup').indexOf('clearPatchFilters()')<source('patchControlsMarkup').indexOf('openPatchColumnsModal()'));
const v435LoomContext=vm.createContext({colourTextToHex:value=>String(value||''),normaliseHex:value=>String(value||''),projectYellowTextPresentation:(colours,presentation)=>presentation,colourSetPresentation:()=>({text:'#111111'}),loomHeadingBackground:()=>''});
vm.runInContext(source('loomHeadingStyle'),v435LoomContext);
assert(v435LoomContext.loomHeadingStyle({colour1:'#ffffff'}).includes('--loom-title-stroke-width:0'));
assert(v435LoomContext.loomHeadingStyle({colour1:'#ff0000'}).includes('--loom-title-stroke-width:.8mm'));
assert(v435LoomContext.loomHeadingStyle({colour1:'#ffffff',colour2:'#ff0000'}).includes('--loom-title-stroke-width:.8mm'));
assert(html.includes('-webkit-text-stroke-width:var(--loom-title-stroke-width,.8mm)'));
console.log('PASS: V43.5 Fixture Patch controls and single-white Loom title presentation.');

// V45 Global Project Settings refinement.
assert(html.includes("openProjectSettings('general')"));
assert(source('setSheetTab').includes("'projectSettings'"));
assert(source('renderProjectSettingsView').includes("['general','file','production','logo','exports']"));
assert(source('defaultProjectInfo').includes('projectSettings:'));
assert(source('normaliseProjectInfo').includes('normaliseProjectSettings(info.projectSettings)'));
assert(source('defaultProjectSettings').includes("dpi:450"));
assert(source('defaultProjectSettings').includes("left:'Page {page} of {pages}'"));
assert(source('beginPdfLogoPreview').includes('project.projectSettings?.pdf'));
assert(source('patchPdfPageToJpeg').includes('document.fonts?.ready'));
assert(source('addDistroCard').includes("String(projectDefaultVoltage())+'V'"));
assert(source('normaliseLoomLength').includes("normaliseLoomUnit"));
assert(html.includes('--project-header-font'));
assert(html.includes('table thead th{font-family:var(--project-subheader-font)}'));
assert(html.includes('table tbody td,table tbody th,table tbody input,table tbody select,table tbody textarea{font-family:var(--project-body-font)}'));
assert(source('patchColumnDefaultFormat').includes("font:'var(--project-body-font)'"));
assert(source('patchHeaderFormatCss').includes("font:'var(--project-subheader-font)'"));
assert(source('fanOutFormatCss').includes('font-family:var(--project-body-font)'));
assert.equal(source('powerFormatCss').includes("fontFamily:'var(--project-body-font)'"),true);
assert(source('applyIpAddressFormat').includes("fontFamily='var(--project-subheader-font)'"));
assert(source('fontOptionsMarkup').includes('data-font-option="1"'));
assert(source('fontOptionsMarkup').includes('style="font-family:${escapeAttr(font.value)}"'));
assert(source('styleFontSelects').includes('select.style.fontFamily=select.value'));
assert(html.includes('projectSettingsPreview'));
assert(!html.includes('id="projectInfoModal"'));
for(const font of ['American Typewriter','Baskerville','Audiowide','Comic Sans MS','Noteworthy'])assert(html.includes(font));
assert(source('renderGeneralSettings').includes('Project Font'));
assert(!source('renderGeneralSettings').includes('Header Font'));
assert(!source('renderGeneralSettings').includes('Sub-header Font'));
assert(source('renderGeneralSettings').includes('Project Owner'));
assert(!source('renderFileInfo').includes('Project Owner'));
assert(source('updateProjectFont').includes('settings.typography.headerFont=font'));
assert(source('updateProjectFont').includes('settings.typography.subheaderFont=font'));
assert(source('updateProjectFont').includes('settings.typography.bodyFont=font'));
assert(source('normaliseProjectSettings').includes('typography.bodyFont'));
assert(source('renderProductionInfo').includes('Shown on Documents'));
assert(html.includes('.vendorLogoPreview{display:flex;align-items:center;justify-content:center'));
assert(html.includes('margin-inline:auto'));
assert(html.includes('--app-font:Arial,Helvetica,sans-serif'));
assert(html.includes('button,label,input,select,textarea,.projectTab,.sheetTab,.menuButton,.actionSidebar,.frontEditorPane,.modalCard,.projectSettingsView,.projectSettingsToolbar,[class*="Toolbar"]{font-family:var(--app-font)}'));
assert(html.includes('a.reportIssueBtn,.homeHero,.homeHero *,.homeGrid,.homeGrid *,.powerSupplyCard,.powerSupplyCard *,.consoleControlCard,.consoleControlCard *,.npuControlCard,.npuControlCard *,.rackDeviceLibraryCard,.rackDeviceLibraryCard *,.rackSettingsCard,.rackSettingsCard *{font-family:var(--app-font)}'));
assert(source('npuCardMarkup').includes('controlCard npuControlCard'));
assert(!source('networkEquipmentCardMarkup').includes('npuControlCard'));
assert(source('renderExportSettings').includes("logoToggleButton('Vendor Logo'"));
assert(source('renderExportSettings').includes("logoToggleButton('2nd Logo'"));
assert(source('renderExportSettings').includes('pdfPageTitleControlsMarkup(first.title)'));
assert(source('renderExportSettings').includes('Remaining-page Header'));
assert(source('renderExportSettings').includes('headerTemplateControlMarkup'));
assert(source('renderExportSettings').includes('footerTemplateControlMarkup'));
assert(source('pdfTemplateControlMarkup').includes('Custom'));
assert(source('applyPdfProjectSettings').includes('size:Math.max(8,first.title.size-2)'));
assert(source('applyPdfProjectSettings').includes("set('--pdf-later-font',footer.font)"));
assert(html.includes('padding:5mm 5mm 14mm'));
assert.equal(appVersion,'47.7');
console.log('PASS: V45 Project Font, Arial application controls, owner relocation, production layout and simplified PDF chrome.');

// V46 Fixture Patch update.
assert.equal(appVersion,'47.7');
assert(html.includes('.fixturePatchView{width:1400px;min-width:1400px;margin:0 auto}'));
assert(html.includes('.fixturePatchToolbar,.fixturePatchControlBody,.fixturePatchPage{width:1400px'));
assert(html.includes('.fixturePatchToolbarActions{scale:.9'));
assert(html.includes('.fixturePatchToolbarActions>.fixturePatchActionButton{width:110px!important'));
assert(source('renderFixturePatchView').includes('fixturePatchActionButton fixturePatchActionStrong'));
assert(source('defaultPatchViewOptions').includes('headerMainSize:18'));
assert(source('defaultPatchViewOptions').includes('headerSubSize:16'));
assert(source('defaultPatchViewOptions').includes('showSummary:true'));
assert(source('defaultPatchViewOptions').includes('showRevisionNotes:true'));
assert(source('normalisePatchViewOptions').includes('PATCH_LEGACY_DEFAULT_FONT'));
assert(source('normalisePatchViewOptions').includes('PATCH_TITLE_DEFAULT_FONT'));
assert(source('renderPatchOptionsModal').includes("confirmPatchFixture('close')"));
assert(source('renderPatchOptionsModal').includes("confirmPatchFixture('more')"));
assert(source('finishPatchAdd').includes("action==='more'"));
assert(source('showDuplicateFixWarning').includes('pendingPatchAddAction'));
assert(html.includes('<summary>Output Options</summary>'));
assert(html.includes('id="patchPdfHeaderMainSize"'));
assert(html.includes('id="patchPdfHeaderSubSize"'));
assert(html.includes('id="patchPdfShowSummary"'));
assert(html.includes('id="patchPdfShowRevisionNotes"'));
assert(source('patchPdfGroupElement').includes('patchPdfExportColumns(group.items)'));
assert(source('fitPatchPdfScaledGroup').includes('transform=`scale(${scale})`'));
assert(html.includes('.patchPdfScaledWrap{position:absolute;top:0;left:0;width:max-content;min-width:100%;transform-origin:top left}'));
assert(source('renderFixturePatchPdfPreview').includes("appendPatchSupplementPages(pages,d,'summary'"));
assert(source('renderFixturePatchPdfPreview').includes('groups.forEach(group=>{let state=appendPatchPdfPage'));
assert(source('renderFixturePatchPdfPreview').includes("appendPatchSupplementPages(pages,d,'revision'"));
assert(source('patchPdfRevisionRows').includes("revisionNoteCategory(note)==='Fixture Patch'"));
assert(source('patchPdfSupplementElement').includes('No Fixture Patch revision notes have been saved.'));
assert(source('renderFixturePatchPdfPreview').includes('finalisePdfPageChrome'));
console.log('PASS: V46 Fixture Patch layout, add workflows, saved output options and paginated PDF supplements.');

// V47 Power update.
assert.equal(appVersion,'47.7');
assert(html.includes('.powerSheetView{width:min(1400px,100%);max-width:1400px;min-width:0'));
assert(html.includes('.powerSheetToolbar{width:min(1400px,100%);max-width:1400px'));
assert(html.includes('.powerSheetToolbarActions>.powerPrimaryAction{font-size:14px;font-weight:800;padding:8px}'));
assert(html.includes('.powerSheetTable:not(.powerExtraSheet) .powerSocaColourCol{width:var(--power-colour-width,30px)!important'));
assert(html.includes('.powerPhaseSummary .phaseTotals{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important'));
assert(source('powerSheetToolbarMarkup').includes('powerPrimaryAction'));
const v47PowerContext=vm.createContext({patchFixtureRows:()=>[
  {fixId:'1',fixture:'Wash',shortName:'W',location:'Stage',colour1:'#ff0000',watts:100},
  {fixId:'2',fixture:'Wash',shortName:'W',location:'Stage',colour1:'#ff0000',watts:120},
  {fixId:'FX-1',fixture:'Spot',shortName:'S',location:'Truss',colour1:'#0000ff',watts:200}
],ensureProjectInfo:()=>({positions:[]}),positionKey:value=>String(value||'').toLowerCase(),colourTextToHex:(value,fallback)=>value||fallback,fixtureWatts:row=>row?.watts??null});
for(const name of ['powerFixIdTokens','fixturePatchByFixId','powerSheetSlotResult'])vm.runInContext(source(name),v47PowerContext);
for(const entry of ['1 & 2','1 + 2','1, 2','1 / 2','1 > 2','1 - 2'])assert.deepEqual(JSON.parse(JSON.stringify(v47PowerContext.powerFixIdTokens(entry))),['1','2']);
assert.deepEqual(JSON.parse(JSON.stringify(v47PowerContext.powerFixIdTokens('FX-1'))),['FX-1']);
let compound=v47PowerContext.powerSheetSlotResult('1 + 2',new Map([['1',1],['2',1]]));
assert.equal(compound.type,'Wash');assert.equal(compound.shortName,'W');assert.equal(compound.position,'Stage');assert.equal(compound.watts,220);assert.equal(compound.error,'');
compound=v47PowerContext.powerSheetSlotResult('1 / FX-1',new Map([['1',1],['fx-1',1]]));
assert.equal(compound.type,'Wash\nSpot');assert.equal(compound.position,'Stage\nTruss');assert.equal(compound.watts,300);
assert.equal(v47PowerContext.powerSheetSlotResult('1, 99',new Map()).error,'Fix ID 99 not found');
assert.equal(v47PowerContext.powerSheetSlotResult('1 & 1',new Map([['1',2]])).error,'Duplicate Fix ID');
assert(source('powerSheetDuplicateFixIds').includes('powerFixIdTokens(value)'));
assert(source('powerUsedFixIds').includes('powerFixIdTokens(value)'));
assert(source('updatePowerSheetFixId').includes('powerFixIdTokens(inp.value)'));
assert(source('fanOutSlotCellsMarkup').includes('powerSheetSlotResult(value)'));
assert(source('powerPdfHeaderMarkup').includes("documentName+' - '+projectName"));
assert(source('powerPdfHeaderMarkup').includes("supplyName+' - '+inputSupply"));
assert(source('renderFanOutPdfPreview').includes('fullHeader:start===0'));
assert(source('renderPowerPdfPreview').includes('appendPowerPdfDistroSummary'));
assert(source('renderPowerPdfPreview').includes('preparePowerPdfTotals(ranges)'));
assert(source('renderPowerPdfPreview').includes("extraClass:'powerPdfTotalsPage'"));
assert(source('createPowerPdfPage').includes('appendExportLogo(page,0)'));
assert(source('powerPdfContentLayout').includes('widthScale=maxW/naturalW'));
assert(source('powerPdfContentLayout').includes('heightScale=maxH/naturalH'));
assert(fs.readFileSync(root+'tests/BROWSER-CHECKLIST.md','utf8').startsWith('# V47 browser release checks'));
console.log('PASS: V47 compound Power Fix IDs, constrained layout, per-distro PDF headers and final Totals page.');

// V47.1 Power width distribution and compact Supply summary cards.
assert.equal(appVersion,'47.7');
const widthDefaultsSource=html.slice(html.indexOf('const POWER_COLUMN_WIDTH_DEFAULTS='),html.indexOf('let powerColumnWidthSettings=',html.indexOf('const POWER_COLUMN_WIDTH_DEFAULTS=')));
for(const key of ['colour','socapex','way','fixId','fixType','position','watts','amps'])assert(widthDefaultsSource.includes(`${key}:{label:`));
assert(!html.includes('function powerColumnWidthAdjusterMarkup'));
assert(!html.includes('function updatePowerColumnWidth'));
assert(!html.includes('function resetPowerColumnWidths'));
assert(!source('renderPowerSheetView').includes('powerColumnWidthAdjusterMarkup()'));
assert(source('renderPowerSheetView').includes('powerColumnWidthColgroup()'));
assert(!source('preparePowerPdfView').includes('.powerColumnWidthAdjuster'));
assert(source('powerPdfSourceViews').includes('view.cloneNode(true)'));
assert(!source('revisionTrackedState').includes('powerColumnWidthSettings'));
const powerWidthContext=vm.createContext({showPowerWatts:true,Object,Number,Math,Array});
vm.runInContext(widthDefaultsSource,powerWidthContext);
for(const name of ['powerDefaultColumnWidths','powerColumnTypeOrder','powerColumnTypeCount','normalisePowerColumnWidthSetting','distributePowerColumnWidths'])vm.runInContext(source(name),powerWidthContext);
const requestedPowerWidthLimits={colour:[30,40],socapex:[75,180],way:[20,30],fixId:[50,80],fixType:[60,190],position:[85,180],watts:[40,45],amps:[66,75]};
const configuredPowerWidths=powerWidthContext.powerDefaultColumnWidths();
for(const [key,[min,max]] of Object.entries(requestedPowerWidthLimits)){assert.equal(configuredPowerWidths[key].min,min);assert.equal(configuredPowerWidths[key].max,max)}
const distributed=powerWidthContext.distributePowerColumnWidths(powerWidthContext.powerDefaultColumnWidths(),1400,'fixType'),counts={colour:1,socapex:1,way:1,fixId:4,fixType:4,position:4,watts:4,amps:1};
const distributedTotal=Object.entries(counts).reduce((sum,[key,count])=>sum+(distributed[key].current*count),0);
assert(distributedTotal<=1410);for(const [key,item] of Object.entries(distributed)){assert(item.current>=item.min);assert(item.current<=item.max)}
const supplyCardContext=vm.createContext({escapeAttr:value=>String(value),escapeHtml:value=>String(value),supplyDistroNames:()=>['Distro A'],powerSupplyTotals:()=>({p1:1,p2:2,p3:3}),formatPhaseAmps:value=>value+' A'});
for(const name of ['distroCardPhaseTotalsMarkup','supplyCardPhaseTotalsMarkup','powerSupplyCardMarkup'])vm.runInContext(source(name),supplyCardContext);
const compactSupply=supplyCardContext.powerSupplyCardMarkup({id:'s1',name:'Supply',input:'63A 3ø'},[]);
assert(compactSupply.includes('height:auto!important'));assert(compactSupply.includes('width:auto!important'));assert(compactSupply.includes('flex:0 0 auto!important'));assert(!compactSupply.includes('height:100px'));assert(!compactSupply.includes('width:275px'));assert(compactSupply.includes('Distro A'));assert(!compactSupply.includes('Phase 1'));assert(!compactSupply.includes('Phase 2'));assert(!compactSupply.includes('Phase 3'));
assert(source('powerPhaseTotalsOverviewMarkup').includes('powerSupplyCardMarkup(supply,ranges)'));
assert(source('powerPdfDistroSummaryMarkup').includes('powerPdfSupplyCardMarkup(supply,ranges)'));
console.log('PASS: V47.2 requested Power width limits and matched Supply/Distro summary cards.');

// V47.3 automatic phase summaries, labelled blank headers and Power body typography.
assert.equal(appVersion,'47.7');
assert(html.includes('.powerPhaseSummary{width:auto!important;height:auto!important;min-height:0!important;padding:8px!important}'));
assert(html.includes('.powerSupplySummary{width:auto!important;min-width:0!important;padding-right:12px!important;border-right:2px solid #9b9b9b'));
const phaseSummarySource=source('phaseTotalsMarkup');
assert(phaseSummarySource.includes('width:auto;height:auto;padding:8px'));
assert(!phaseSummarySource.includes('height:100px'));
assert(!phaseSummarySource.includes('width:275px'));
assert(phaseSummarySource.includes('padding-right:12px;border-right:2px solid #9b9b9b'));
const powerRenderSource=source('renderPowerSheetView');
assert(powerRenderSource.includes('class="powerSocaColourCol powerHeaderTooltip" scope="col" aria-label="Colour" data-column-label="Colour" tabindex="0"></th>'));
assert(powerRenderSource.includes('class="wayCol powerHeaderTooltip" scope="col" aria-label="Way" data-column-label="Way" tabindex="0"></th>'));
assert(!powerRenderSource.includes('class="powerSocaColourCol">Colour</th>'));
assert(!powerRenderSource.includes('class="wayCol">Way</th>'));
const powerFormatSource=source('applyPowerTableFormat');
assert(powerFormatSource.includes("tbody .wayCol').forEach(element=>element.style.setProperty('font-size','12px','important')"));
assert(powerFormatSource.includes("tbody .fixIdCol input').forEach(element=>{element.style.setProperty('font-size','16px','important')"));
assert(powerFormatSource.includes("tbody .fixTypeCol .powerFixTypeText').forEach(element=>{element.style.setProperty('font-size','14px','important')"));
assert(powerFormatSource.includes("tbody .positionCol .powerFixTypeText').forEach(element=>{element.style.setProperty('font-size','14px','important')"));
assert(source('fitPowerFixTypeText').includes(".powerSheetTable .fixTypeCol .powerFixTypeText:not(.powerPositionText)"));
assert(source('fitPowerFixTypeText').includes(".powerSheetTable .positionCol .powerPositionText"));
for(const [key,[min,max]] of Object.entries(requestedPowerWidthLimits)){assert.equal(configuredPowerWidths[key].min,min);assert.equal(configuredPowerWidths[key].max,max)}
console.log('PASS: V47.3 Power summary dimensions, hidden labelled headers and exact body typography.');

// V47.4 three-position later-page headers and two-line page chrome.
assert.equal(appVersion,'47.7');
assert(html.includes('#projectExportsTab .settingsCard{margin-bottom:12px}'));
assert(html.includes('#projectExportsTab .vendorLogoControls{margin-bottom:8px;scale:.8;transform-origin:left center}'));
assert(html.includes('.projectSettingsHeaderTemplates,.projectSettingsFooterTemplates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}'));
assert(html.includes('.footerTemplateControl textarea{height:54px!important;min-height:54px!important;resize:none}'));
const exportSettingsSource=source('renderExportSettings');
assert(exportSettingsSource.includes('Remaining-page Header'));
assert(exportSettingsSource.includes('projectSettingsHeaderTemplates'));
assert(exportSettingsSource.includes("headerTemplateControlMarkup('left','Left',later.left)"));
assert(exportSettingsSource.includes("headerTemplateControlMarkup('centre','Centre',later.centre)"));
assert(exportSettingsSource.includes("headerTemplateControlMarkup('right','Right',later.right)"));
assert(!exportSettingsSource.includes('Header line 2 uses the Page Title style at 2 pt smaller.'));
assert(source('pdfTemplateControlMarkup').includes('textarea rows="2"'));
assert(source('pdfTemplateControlMarkup').includes('data-pdf-template-group'));
const v474SettingsContext=vm.createContext({APP_FONT_OPTIONS:[{value:'Arial,Helvetica,sans-serif'}],PROJECT_DEFAULT_FONT:'Arial,Helvetica,sans-serif'});
vm.runInContext('const PDF_TITLE_SIZES=[10,12,14,16,18,20,22,24,26,28,30],PDF_FOOTER_SIZES=[5,6,7,8,9,10];',v474SettingsContext);
for(const name of ['defaultPdfTextStyle','defaultProjectSettings','normaliseProjectFont','normalisePdfTextStyle','normalisePdfSize','limitPdfTemplateLines','normaliseProjectSettings'])vm.runInContext(source(name),v474SettingsContext);
assert.equal(v474SettingsContext.limitPdfTemplateLines('one\ntwo\nthree'),'one\ntwo');
const v474Defaults=JSON.parse(JSON.stringify(v474SettingsContext.normaliseProjectSettings({})));
assert.equal(v474Defaults.pdf.laterHeader.left,'');assert.equal(v474Defaults.pdf.laterHeader.centre,'{document}');assert.equal(v474Defaults.pdf.laterHeader.right,'');
const v474LegacyLeft=JSON.parse(JSON.stringify(v474SettingsContext.normaliseProjectSettings({pdf:{laterHeader:{align:'left'}}})));
assert.equal(v474LegacyLeft.pdf.laterHeader.left,'{document}');assert.equal(v474LegacyLeft.pdf.laterHeader.centre,'');
const v474LegacyRight=JSON.parse(JSON.stringify(v474SettingsContext.normaliseProjectSettings({pdf:{laterHeader:{align:'right'}}})));
assert.equal(v474LegacyRight.pdf.laterHeader.right,'{document}');assert.equal(v474LegacyRight.pdf.laterHeader.centre,'');
const v474Trimmed=JSON.parse(JSON.stringify(v474SettingsContext.normaliseProjectSettings({pdf:{laterHeader:{left:'a\nb\nc',centre:'centre',right:''},footer:{left:'1\n2\n3',centre:'',right:''}}})));
assert.equal(v474Trimmed.pdf.laterHeader.left,'a\nb');assert.equal(v474Trimmed.pdf.footer.left,'1\n2');
assert(source('pdfLaterPageHeaderMarkup').includes('data-pdf-header="left"'));
assert(source('pdfLaterPageHeaderMarkup').includes('data-pdf-header="centre"'));
assert(source('pdfLaterPageHeaderMarkup').includes('data-pdf-header="right"'));
assert(source('createExportPage').includes('if(pageIndex>0)'));
assert(source('createExportPage').includes("page.classList.add('pdfLaterPage')"));
assert(source('finalisePdfPageChrome').includes('settings.laterHeader.left'));
assert(source('finalisePdfPageChrome').includes('settings.laterHeader.centre'));
assert(source('finalisePdfPageChrome').includes('settings.laterHeader.right'));
assert(source('createPowerPdfPage').includes('createExportPage(d,pageIndex,documentName)'));
assert(source('createPowerPdfPage').includes("querySelector('.pdfLaterPageHeader')?.remove()"));
assert(source('fixturePatchDomPdfBytes').includes('.pdfLaterPageHeader span'));
assert(source('fixturePatchDomPdfBytes').includes('maxLines:isPageChrome?2:1'));
assert(source('powerPdfDomPdfBytes').includes('.pdfLaterPageHeader span'));
assert(source('powerPdfDomPdfBytes').includes('maxLines:2'));
console.log('PASS: V47.4 Export spacing, later-page headers, migration and two-line DOM/vector PDF chrome.');

// V47.5 reviewed Power widths and intrinsic Supply-card sizing.
assert.equal(appVersion,'47.7');
const v475WidthCurrent={colour:30,socapex:112,way:26,fixId:59,fixType:117,position:115,watts:45,amps:72};
for(const [key,current] of Object.entries(v475WidthCurrent))assert.equal(configuredPowerWidths[key].current,current);
for(const [css,current] of Object.entries({'--power-colour-width':30,'--power-socapex-width':112,'--power-way-width':26,'--power-fix-id-width':59,'--power-fix-type-width':117,'--power-position-width':115,'--power-watts-width':45,'--power-amps-width':72}))assert(html.includes(`var(${css},${current}px)`));
assert(source('powerPdfSourceViews').includes('view.cloneNode(true)'));
assert(html.includes('.powerSupplyCard{width:auto!important;height:auto!important;flex:0 0 auto!important'));
assert(!html.includes('.powerSupplyCard{width:275px!important;height:100px!important;min-height:100px!important'));
assert(html.includes('.powerSupplyCard .powerSupplySummary strong{font-size:18px!important;line-height:1;overflow:hidden;text-overflow:ellipsis;padding-bottom:4px}'));
assert(source('powerSupplyCardMarkup').includes('height:auto!important;width:auto!important'));
assert(source('powerSupplyCardMarkup').includes('flex:0 0 auto!important'));
assert(!source('powerSupplyCardMarkup').includes('height:100px'));
assert(!source('powerSupplyCardMarkup').includes('width:275px'));
assert(source('powerPdfDistroSummaryMarkup').includes('height:auto!important;width:auto!important'));
assert(source('powerPdfDistroSummaryMarkup').includes('flex:0 0 auto!important'));
console.log('PASS: V47.5 Power width defaults, PDF propagation and content-sized Supply cards.');

// V47.6 removes temporary controls and exposes reliable Colour/Way header labels.
assert.equal(appVersion,'47.7');
assert(!html.includes('powerColumnWidthAdjuster'));
assert(!source('renderPowerSheetView').includes('Temporary'));
assert(source('renderPowerSheetView').includes('powerSocaColourCol powerHeaderTooltip'));
assert(source('renderPowerSheetView').includes('wayCol powerHeaderTooltip'));
assert(source('renderPowerSheetView').includes('data-column-label="Colour"'));
assert(source('renderPowerSheetView').includes('data-column-label="Way"'));
assert(source('renderPowerSheetView').includes('aria-label="Colour"'));
assert(source('renderPowerSheetView').includes('aria-label="Way"'));
assert(source('renderPowerSheetView').includes('tabindex="0"'));
assert(html.includes('.powerHeaderTooltip::after{content:attr(data-column-label)'));
assert(html.includes('.powerHeaderTooltip:hover::after'));
assert(html.includes('.powerHeaderTooltip:focus-visible::after'));
console.log('PASS: V47.6 fixed Power widths and hover/focus labels for hidden Colour and Way headings.');

// V47.7 expands sparse Power tables and keeps full-title pages free of later-page chrome.
assert.equal(appVersion,'47.7');
assert(html.includes('.powerPdfDocumentHeader{display:grid!important;grid-auto-flow:row;row-gap:2px'));
assert(source('powerPdfContentLayout').includes("view?.style.setProperty('width','max-content','important')"));
assert(source('powerPdfContentLayout').includes("table.style.setProperty('width','max-content','important')"));
assert(source('fitPowerPdfContent').includes('layout.tablePage?layout.widthScale'));
assert(source('powerPdfContentWouldOverflow').includes('layout.tablePage?layout.widthScale'));
assert(source('createPowerPdfPage').includes("page.querySelector('.pdfLaterPageHeader')?.remove()"));
assert(source('createPowerPdfPage').includes("page.classList.remove('pdfLaterPage')"));
assert(source('createPowerPdfPage').includes('appendExportLogo(page,0)'));
console.log('PASS: V47.7 Power PDF heading spacing, sparse-table scaling and Distro-page header cleanup.');
