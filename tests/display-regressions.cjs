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
add('deviceConfigNetworkPorts','deviceConfigNetworkParentMode','deviceConfigPromotedNetworkPort','deviceConfigVisiblePorts','deviceConfigHasSecondaryInterface','deviceConfigHasChildren','deviceConfigFacingText','deviceConfigInput','deviceConfigLocationControl','deviceConfigRowWithLocation','deviceConfigParentRow','deviceConfigPortRow','deviceConfigInterfaceTwoRow','deviceConfigTableMarkup','controlTableCellAttrs','controlTableParentExtraCells','controlTableAppendCells','controlTableBlankExtraCells','controlDeviceConfigTableMarkup');
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
const nodeParent=c.deviceConfigParentRow(dmxNode,0),switchParent=c.deviceConfigParentRow(networkSwitch,0),nodePort=c.deviceConfigPortRow(dmxNode,dmxNode.ports[0],1);assert(nodeParent.includes('<seg data-key="ip1">'));assert(nodeParent.includes('<protocol>'));assert(nodeParent.includes('<vlan>'));assert(switchParent.includes('<seg data-key="ip1">'));assert(!switchParent.includes('<protocol>'));assert(!switchParent.includes('<vlan>'));assert(!nodePort.includes('<seg'));assert(!nodePort.includes('<protocol>'));assert(!nodePort.includes('<vlan>'));assert(nodePort.includes('>Front<'));
c.deviceConfigSegmentedInput=oldSegmented;c.deviceConfigProtocolSelect=oldProtocol;c.deviceConfigVlanSelect=oldVlan;
for(const [markup,count] of [[control,16],[config,13]])for(const [,row] of markup.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g))assert.equal((row.match(/<t[dh]\b/g)||[]).length,count);
assert(config.includes('>Location<'));assert(config.includes('deviceConfigFacingCol'));assert(config.includes('data-dc-key="location"'));assert(config.includes('data-dc-col="11"'));assert(config.includes('data-dc-col="12"'));
assert(!config.includes('minimum width'));assert(!config.includes('maximum width'));
const rackLocation=c.canonicalDeviceRackPlacement;c.canonicalDeviceRackPlacement=()=>({rack:{location:'Rack Room'}});assert(c.deviceConfigLocationControl(dev,'Ignored',0,11,'',true).includes('Managed by Rack Layout'));assert(c.deviceConfigLocationControl(dev,'Port Location',0,11,'eth-1',false).includes('data-dc-port-id="eth-1"'));c.canonicalDeviceRackPlacement=rackLocation;
const portContext=vm.createContext({normaliseVlan:value=>String(value||'0')});vm.runInContext(source('normaliseDeviceConfigPort'),portContext);assert.equal(portContext.normaliseDeviceConfigPort({id:'p',location:'Dimmer City'}).location,'Dimmer City');assert.equal(portContext.normaliseDeviceConfigPort({id:'p'}).location,'');
assert(source('deviceConfigPortsFor').includes("if(!Object.hasOwn(raw,'location'))base.location=device.location||''"));
assert(source('updateDeviceConfigField').includes("if(key==='location'&&!portId)render()"));
assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('DEVICE_CONFIG_WIDTH_DEFAULTS',c))),[[30,30],[45,70],[40,60],[100,130],[60,60],[100,180],[110,110],[110,110],[40,100],[40,100],[40,150],[80,120],[200,400]]);
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
const deviceLimits=[[30,30],[45,70],[40,60],[100,130],[60,60],[100,180],[110,110],[110,110],[40,100],[40,100],[40,150],[80,120],[200,400]];
deviceLimits.forEach(([min,max],index)=>assert.deepEqual(JSON.parse(JSON.stringify(c.deviceConfigColumnLimits(index,false))),{min,max}));
c.deviceConfigExpandedDevices.add('console:a');c.controlExpandedDevices.clear();
const dcConsole=c.controlDeviceConfigTableMarkup([dev],'deviceConfig');
assert(dcConsole.includes('data-table-view="deviceConfig"'));assert(dcConsole.includes("'console:a','deviceConfig'"));assert(dcConsole.includes("setDeviceConfigSort('name')"));
for(const [,row]of dcConsole.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g))assert.equal((row.match(/<t[dh]\b/g)||[]).length,17);
assert(dcConsole.includes('data-dc-col="16"'));assert(dcConsole.includes('deviceConfigFacingCol'));
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
console.log('PASS: V32 manufacturer Masters/version isolation, summaries/order, mixed table context, Device Config limits, statistic removal and duplicate-IP identity/alias checks.');
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
const navigation=vm.createContext({activeNetworkSubTab:'deviceConfig',activeSheetTab:'home',activeControlNetworkTab:'consoles',controlViewMode:'card',activeDistroLabelTab:'labels',render:()=>{},closeProjectErrorsMenu:()=>{},closeFrontEditorPane:()=>{},closeFanOutFormat:()=>{},closePatchFormatModal:()=>{},closeDeviceConfigFormat:()=>{},closeDeviceConfigColumns:()=>{},closeRackEditor:()=>{},closeSheetSubMenus:()=>{}});
for(const name of ['setSheetTab','activeApplicationPageName'])vm.runInContext(source(name),navigation);
navigation.setSheetTab('network');assert.equal(navigation.activeSheetTab,'deviceConfig');assert.equal(navigation.activeApplicationPageName(),'Network ~ Device Config');
navigation.setSheetTab('ipAddresses');navigation.setSheetTab('home');navigation.setSheetTab('network');assert.equal(navigation.activeSheetTab,'ipAddresses');assert.equal(navigation.activeApplicationPageName(),'Network ~ IP Address’');
const menu={dataset:{},innerHTML:'',contains:()=>false},menuContext=vm.createContext({projectErrors:new Map(),document:{activeElement:null},$:()=>menu,escapeAttr:c.escapeAttr,escapeHtml:c.escapeHtml});
for(const name of ['projectErrorToken','orderedProjectErrors','updateProjectErrorsMenu'])vm.runInContext(source(name),menuContext);
menuContext.updateProjectErrorsMenu();assert(menu.innerHTML.includes('No project errors'));assert(menu.innerHTML.includes('Show All Errors'));
for(let i=0;i<7;i++)menuContext.projectErrors.set(String(i),{id:String(i),description:'Error '+i,order:i});
menuContext.updateProjectErrorsMenu();assert.equal((menu.innerHTML.match(/data-error-key=/g)||[]).length,5);assert(menu.innerHTML.indexOf('Error 6')<menu.innerHTML.indexOf('Error 5'));assert(!menu.innerHTML.includes('Error 1'));
assert(source('handleProjectErrorsKeydown').includes("event.key==='Escape'"));assert(source('updateProjectErrorsPage').includes('host.dataset.content===content'));
for(const file of ['info_txt/welcome_message.json','info_txt/walkthrough.json']){const doc=JSON.parse(fs.readFileSync(root+file));assert(doc.title.includes('V33'));assert(JSON.stringify(doc).includes('Errors'));assert(JSON.stringify(doc).includes('Network'))}
console.log('PASS: V32 console-only caps/text fitting, Network routing, grouped errors, validation boundaries, recency/resolution, five-item menu and major-release JSON.');
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
for(const removed of ['Copy Width Settings','Restore Starting Widths','deviceConfigWidthProfile','deviceConfigWidthEditorRow','copyDeviceConfigWidths','restoreDeviceConfigWidths'])assert(!html.includes(removed));
assert(source('renderDeviceConfigView').includes("openVlanSetup()\">VLAN Setup"));
assert(source('renderDeviceConfigView').includes('deviceConfigFiltersPanel'));assert(source('renderDeviceConfigView').includes('activeFilters'));assert(source('renderDeviceConfigView').includes('deviceConfigFiltersOpen'));
assert(source('attachDeviceConfigTableEvents').includes('deviceConfigPointerSelectionCell===cell'));assert(source('attachDeviceConfigTableEvents').includes("event.target.tagName==='SELECT'&&event.key.startsWith('Arrow')&&!event.shiftKey"));assert(source('deviceConfigControlAcceptsValue').includes("control?.tagName==='SELECT'"));
assert.match(html,/\.deviceConfigFillHandle\{[^}]*pointer-events:auto;touch-action:none;z-index:30/);assert.match(html,/\.deviceConfigCellSelected\{[^}]*overflow:visible!important/);
assert(!source('renderIpAddressView').includes('openVlanSetup'));
assert(source('closeVlanSetup').includes("activeSheetTab==='deviceConfig'"));
assert(html.includes('#vlanSetupPane,.deviceConfigToolbar,#colourMenu'));
assert(!source('renderDeviceConfigView').includes('Show/Hide Columns'));
assert(source('renderDeviceConfigView').includes("[data-device-config-width-table] [data-device-config-hidden]"));
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
const pctx=vm.createContext({defaultProductionVisibility:()=>({}),defaultDeviceConfigColumns:()=>({}),DEFAULT_IP_VLANS:[],normaliseFanOutFormat:()=>({}),normalisePowerFormat:()=>({}),normaliseIpAddressFormat:()=>({}),normaliseDeviceConfigFormat:()=>({}),normaliseVlanSetup:()=>({})});
for(const name of ['defaultProjectInfo','normaliseProjectInfo'])vm.runInContext(source(name),pctx);
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
const geometryContext=vm.createContext({});vm.runInContext(source('positionSummaryGeometry'),geometryContext);
const paper={w:297,h:210};assert.equal(geometryContext.positionSummaryGeometry(paper,'rectangles').cols,2);assert.equal(geometryContext.positionSummaryGeometry(paper,'boxes').cols,4);
assert(source('downloadPositionSummary').includes("'-position-summary.pdf'"));assert(source('openPositionSummaryPreview').includes("beginPdfLogoPreview('position','positionPdfModal')"));
assert.equal(pctx.defaultProjectInfo().positionSummaryFormat.layout,'rectangles');assert.equal(pctx.normaliseProjectInfo({positionSummaryFormat:{layout:'boxes'}}).positionSummaryFormat.layout,'boxes');assert.equal(pctx.normaliseProjectInfo({positionSummaryFormat:{layout:'invalid'}}).positionSummaryFormat.layout,'rectangles');
console.log('PASS: V33.3 linked import suggestions, combined Uni/Add parsing, optional loads and Position Summary preview layouts.');

// V33.4 patch cleanup, single-distro menus, Device Config controls and rack fitting.
assert(html.includes('<title>Lampy Paperwork V33.5</title>'));
assert(source('appPayload').includes('syncPositionsFromPatch()'));
assert(html.includes('>Delete Patch</button>'));assert(html.includes('>Delete Imported Patch</button>'));
assert(html.includes('.deviceConfigFillHandle{position:absolute;right:-10px;bottom:-10px;width:20px;height:20px'));
assert(html.includes('.deviceConfigDragging,.deviceConfigDragging *{cursor:ns-resize!important;user-select:none!important}'));
assert(source('attachDeviceConfigFillHandle').includes("pointercancel"));assert(source('attachDeviceConfigFillHandle').includes("deviceConfigDragging"));
assert(source('deviceConfigPromotedNetworkPort').includes("ports.length===1"));assert(!source('deviceConfigPromotedNetworkPort').includes('deviceConfigNetworkParentMode'));
assert(source('deviceConfigParentRow').includes('data-device-config-tree'));assert(source('handleDeviceConfigTreeKeydown').includes("ArrowRight"));assert(source('handleDeviceConfigTreeKeydown').includes("ArrowLeft"));assert(source('focusDeviceConfigCell').includes("tree.focus()"));
const v334MenuContext=vm.createContext({distroRanges:()=>v334MenuContext.ranges,setSheetTab:()=>{},activePowerSubTab:'calcs',activePowerDistro:0,activeFanOutDistro:0,activePatchSheetId:'master',normalisePatchSheets:()=>[],app:{controlNetwork:{npus:[],racks:[]}}});vm.runInContext(source('sheetSubMenuRoutes'),v334MenuContext);
v334MenuContext.ranges=[{idx:0,d:{name:'Main'}}];assert.deepEqual(JSON.parse(JSON.stringify(v334MenuContext.sheetSubMenuRoutes('powerSheet').map(item=>item.label))),['Power Calcs','Phase Totals']);assert.deepEqual(JSON.parse(JSON.stringify(v334MenuContext.sheetSubMenuRoutes('fanOuts'))),[]);
v334MenuContext.ranges=[{idx:0,d:{name:'Main'}},{idx:1,d:{name:'B'}}];assert.deepEqual(JSON.parse(JSON.stringify(v334MenuContext.sheetSubMenuRoutes('powerSheet').map(item=>item.label))),['Power Calcs','Phase Totals','Power Calcs — Main','Power Calcs — B']);assert.deepEqual(JSON.parse(JSON.stringify(v334MenuContext.sheetSubMenuRoutes('fanOuts').map(item=>item.label))),['Main','B']);
const deleteContext=vm.createContext({app:{fixturePatch:[{location:'FOH'}],patchSheets:[{id:'import',rows:[{location:'LX'}]}],gdtfFiles:{fixture:{}},gdtfMatches:{match:{}}},repositoryGdtfBytes:new Map([['fixture',new Uint8Array()]]),ensureProjectInfo:()=>deleteContext.project,project:{positions:[{name:'FOH'},{name:'LX'},{name:'Manual'}]},patchFixtureRows:()=>deleteContext.app.fixturePatch,normalisePatchSheets:value=>value,positionKey:value=>String(value||'').trim().toLowerCase(),confirm:message=>{deleteContext.confirmation=message;return true},clearFixturePickerThumbnails:()=>deleteContext.thumbnailsCleared=true,selectedPatchRows:new Set(['a']),selectedPatchCells:new Set(['b']),selectedUnpatchIds:new Set(['c']),selectedPatchGroupEditIds:new Set(['d']),unlockedPatchGroups:new Set(['e']),duplicatePatchRows:new Set(['f']),duplicateAddressRows:new Set(['g']),confirmedDuplicateAddressKeys:new Set(['h']),fixturePatchUndoHistory:[{}],showPatchUndoList:true,pendingPatchAdds:[{}],activePatchSheetId:'import',activePatchCellChange:{},persist:()=>deleteContext.persisted=true,render:()=>deleteContext.rendered=true});
vm.runInContext(source('fixturePatchDataSummary'),deleteContext);vm.runInContext(source('deleteFixturePatch'),deleteContext);deleteContext.deleteFixturePatch();assert(deleteContext.confirmation.includes('complete Fixture Patch'));assert.equal(deleteContext.app.fixturePatch.length,0);assert.equal(deleteContext.app.patchSheets.length,0);assert.deepEqual(JSON.parse(JSON.stringify(deleteContext.project.positions)),[{name:'Manual'}]);assert.equal(deleteContext.repositoryGdtfBytes.size,0);assert(deleteContext.thumbnailsCleared&&deleteContext.persisted&&deleteContext.rendered);assert.equal(deleteContext.activePatchSheetId,'master');
const rackContext=vm.createContext({rackViewFor:()=> 'front'});vm.runInContext(source('rackAutoZoom'),rackContext);assert.equal(rackContext.rackAutoZoom({units:6,depthMm:700},680,'front',768),Math.floor(Math.min(680/890,768/480)*1000)/1000);assert(rackContext.rackAutoZoom({units:24,depthMm:700},680,'front',768)<rackContext.rackAutoZoom({units:6,depthMm:700},680,'front',768));assert(source('observeRackCardAutoFit').includes('ResizeObserver'));assert(source('renderRackLayoutView').includes('observeRackCardAutoFit(view)'));
console.log('PASS: V33.4 complete patch deletion, single-distro menus, Device Config controls and measured rack fitting.');

// V33.5 position names merge across every project location source.
assert(html.includes('<title>Lampy Paperwork V33.5</title>'));
const v335=vm.createContext({app:{fixturePatch:[{location:'foh',colour1:'#ff0000',colour2:''}],controlNetwork:{consoles:[{location:'FOH ',deviceConfigPorts:[{location:'fOh'}]}],npus:[{location:'foh',deviceConfigPorts:[{location:'FOH'}]}],networkDevices:[{location:'FoH',portSettings:[{location:' foh '}]}],racks:[{location:'FOH',devices:[]}]}},normalisePosition:value=>({name:String(value?.name||value?.location||'').trim(),colour1:value?.colour1||'',colour2:value?.colour2||'',colour3:value?.colour3||''}),normaliseBlankColour:value=>String(value||'').trim(),ensureProjectInfo:()=>v335.project,project:{positions:[{name:'FOH',colour1:'',colour2:'#00ff00',colour3:''},{name:'foh',colour1:'#ff0000',colour2:'',colour3:'#0000ff'}]},patchFixtureRows:()=>v335.app.fixturePatch,syncRackMountedNetworkLocations:()=>v335.racksSynced=true});vm.runInContext(source('positionKey'),v335);vm.runInContext(source('positionLocationItems'),v335);vm.runInContext(source('syncPositionsFromPatch'),v335);vm.runInContext(source('updatePositionReferences'),v335);v335.syncPositionsFromPatch();assert.equal(v335.project.positions.filter(position=>position.name).length,1);assert.deepEqual(JSON.parse(JSON.stringify(v335.project.positions[0])),{name:'FOH',colour1:'#ff0000',colour2:'#00ff00',colour3:'#0000ff'});assert(v335.positionLocationItems().every(item=>!item.location||item.location==='FOH'));assert(v335.racksSynced);v335.updatePositionReferences('FOH','Front of House');assert(v335.positionLocationItems().every(item=>!item.location||item.location==='Front of House'));
console.log('PASS: V33.5 project-wide position merging and reference canonicalisation.');
