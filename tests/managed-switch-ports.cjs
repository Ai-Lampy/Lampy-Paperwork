'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.indexOf('function '+name+'(');assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
const c=vm.createContext({normaliseVlan:v=>String(v||'0'),networkDmxPortDefinitions:ref=>ref?.dmx?[{}]:[]});
for(const name of ['unmanagedSwitchReference','setUnmanagedSwitchVlan','managedSwitchReference','switchPortConfigurationReference','deviceHasPortConfiguration','switchPartnerDeviceKey','normaliseDeviceConfigPort','normaliseDeviceConfigPorts','planManagedSwitchPorts','commitManagedSwitchPortConfiguration'])vm.runInContext(source(name),c);
assert(c.deviceHasPortConfiguration({type:'Network Switch',managed:true}));assert(c.deviceHasPortConfiguration({type:'Network Switch',managed:false}));assert(c.deviceHasPortConfiguration({dmx:true}));
const port=id=>({id,sub:id,category:'network',name:'',vlan:'0',partner:null});
const devices=[{source:'network',id:'s',reference:{type:'Network Switch',managed:true},ports:[port('1'),port('2')]},{source:'console',id:'c',ports:[port('eth1'),port('eth2')]},{source:'network',id:'unmanaged',ports:[port('eth1')]}];
const rows=[{id:'1',vlan:'3',partner:{source:'console',deviceId:'c',portId:'eth1'}},{id:'2',vlan:'4',partner:{source:'network',deviceId:'unmanaged',portId:'eth1'}}],before=JSON.stringify(devices);
const plan=c.planManagedSwitchPorts(devices,'s',rows);assert(!plan.error);assert.equal(plan.updates.length,3);assert.equal(JSON.stringify(devices),before);
const own=plan.updates.find(d=>d.id==='s'),consoleUpdate=plan.updates.find(d=>d.id==='c');assert.equal(own.ports[0].vlan,'3');assert.equal(consoleUpdate.ports[0].partner.deviceId,'s');assert.equal(consoleUpdate.ports[0].partner.portId,'1');
const roundTrip=c.normaliseDeviceConfigPorts(JSON.parse(JSON.stringify(own.ports)));assert.equal(roundTrip[0].partner.deviceId,'c');assert.equal(roundTrip[0].partner.portId,'eth1');
assert(c.planManagedSwitchPorts(devices,'s',[rows[0],{...rows[1],partner:rows[0].partner}]).error);
assert(c.planManagedSwitchPorts(devices,'s',[{...rows[0],partner:{source:'network',deviceId:'s',portId:'2'}},rows[1]]).error);
assert(c.planManagedSwitchPorts(devices,'s',[{...rows[0],partner:{source:'console',deviceId:'missing',portId:'eth1'}},rows[1]]).error);
assert(c.planManagedSwitchPorts(devices,'s',[rows[0]]).error);
const busy=JSON.parse(before);busy.push({source:'network',id:'other',ports:[port('1')]});busy[1].ports[0].partner={source:'network',deviceId:'other',portId:'1'};assert(c.planManagedSwitchPorts(busy,'s',rows).error);busy.pop();assert(!c.planManagedSwitchPorts(busy,'s',rows).error);
const linked=devices.map(d=>({...d,ports:plan.updates.find(u=>u.id===d.id)?.ports||d.ports}));
const disconnect=c.planManagedSwitchPorts(linked,'s',rows.map(row=>({...row,partner:null})));assert(!disconnect.error);assert.equal(disconnect.updates.find(d=>d.id==='c').ports[0].partner,null);
const reassigned=c.planManagedSwitchPorts(linked,'s',[{...rows[0],partner:{source:'console',deviceId:'c',portId:'eth2'}},rows[1]]);assert(!reassigned.error);assert.equal(reassigned.updates.find(d=>d.id==='c').ports[0].partner,null);assert.equal(reassigned.updates.find(d=>d.id==='c').ports[1].partner.portId,'1');
// Save stages every row before mutation, persists once and leaves management IP/subnet intact.
let saves=0,rackRefreshes=0;const errors=[],items=new Map(devices.map(d=>[d.source+':'+d.id,{id:d.id,ip1:'10.0.0.2',subnet1:'255.0.0.0',deviceConfigPorts:[]}]));
c.compiledDeviceConfigDevices=()=>devices;c.ipAddressSourceItem=(s,id)=>items.get(s+':'+id);c.persist=()=>saves++;c.scheduleRackPopoutWindowsSync=()=>rackRefreshes++;c.alert=m=>errors.push(m);
const panel={dataset:{switchSnapshot:'[]'},querySelectorAll:()=>rows.map(row=>({dataset:{switchPort:row.id},querySelector:selector=>({value:selector==='[data-switch-vlan]'?row.vlan:selector==='[data-switch-partner-device]'?JSON.stringify([row.partner.source,row.partner.deviceId]):row.partner.portId})}))},host={querySelector:()=>panel},item=items.get('network:s');
assert(c.commitManagedSwitchPortConfiguration(host,item));assert.equal(saves,1);assert.equal(rackRefreshes,1);assert.equal(item.ip1,'10.0.0.2');assert.equal(item.subnet1,'255.0.0.0');assert.equal(items.get('console:c').deviceConfigPorts[0].partner.deviceId,'s');
panel.dataset.switchSnapshot='[]';const saved=JSON.stringify([...items]);assert.equal(c.commitManagedSwitchPortConfiguration(host,item),false);assert.equal(saves,1);assert.equal(JSON.stringify([...items]),saved);assert.equal(rackRefreshes,1);
assert(!source('managedSwitchPortSettingsMarkup').includes('persist('));assert(!source('cancelDeviceConfigPortConfiguration').includes('commit'));assert(source('rackSettingsCardMarkup').includes('deviceHasPortConfiguration(linkedRef)'));assert(source('renderRackPortConfiguration').includes('managedSwitchPortSettingsMarkup'));assert(source('renderDeviceConfigPortConfigurationView').includes('managedSwitchPortSettingsMarkup'));
console.log('PASS: managed switch eligibility, per-port VLANs, reciprocal stable partners, duplicate/occupied/self/stale rejection, disconnect/reassignment, round trip and save-once without IP changes.');

// Render the real switch editor with separate device/port selectors and saved selection.
{
 const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 const r=vm.createContext({compiledDeviceConfigDevices:()=>linked,escapeHtml:esc,escapeAttr:esc,normaliseVlan:v=>String(v||'0'),ipVlanCellStyle:()=>'',rackVlanOptionsMarkup:v=>`<option value="${v}" selected>${v}</option>`});
 for(const name of ['managedSwitchReference','switchPartnerDeviceKey','availableSwitchPartnerPorts','switchPartnerDeviceOptions','switchPartnerPortOptions','managedSwitchPortSettingsMarkup'])vm.runInContext(source(name),r);
 const markup=r.managedSwitchPortSettingsMarkup({id:'s',deviceConfigPorts:[]},devices[0].reference);
 assert.equal((markup.match(/<tr data-switch-port=/g)||[]).length,2);assert.equal((markup.match(/select data-switch-vlan/g)||[]).length,2);assert.equal((markup.match(/select data-switch-partner-device/g)||[]).length,2);assert.equal((markup.match(/select data-switch-partner-port/g)||[]).length,2);assert(markup.includes('value="eth1" selected'));
 assert(source('selectDeviceConfigPortDevice').includes('if(!commitDeviceConfigPortConfiguration())return'));
}
// One physical network port is selected automatically; multiple ports require a choice.
{
 const esc=v=>String(v??'');
 const r=vm.createContext({escapeHtml:esc,escapeAttr:esc,compiledDeviceConfigDevices:()=>devices,rackReferenceHasNetworkPort:()=>true,networkDeviceProtocolOptions:()=>'<option>Art-Net</option>',rackDefaultProtocol:()=>'',rackDeviceVlanMarkup:()=>'<vlan>'});
 for(const name of ['unmanagedSwitchReference','setUnmanagedSwitchVlan','managedSwitchReference','switchPortConfigurationReference','switchPartnerDeviceKey','availableSwitchPartnerPorts','switchPartnerDeviceOptions','switchPartnerPortOptions','refreshSwitchPartnerPorts','updateSwitchPartnerDevice','rackDeviceProtocolVlanMarkup'])vm.runInContext(source(name),r);
 const one=r.switchPartnerPortOptions(JSON.stringify(['network','unmanaged']));assert(one.includes('value="eth1" selected'));
 const multiple=r.switchPartnerPortOptions(JSON.stringify(['console','c']));assert(!multiple.includes(' selected'));
 assert(!r.switchPartnerPortOptions('').includes(' selected'));
 assert(r.switchPartnerPortOptions(JSON.stringify(['console','c']),'eth2').includes('value="eth2" selected'));

 assert.equal(r.rackDeviceProtocolVlanMarkup({ref:{type:'Network Switch',managed:true}}),'');assert(r.rackDeviceProtocolVlanMarkup({ref:{type:'DMX Node'}}).includes('Protocol'));
 assert(html.includes('#rackReplacementModal .rackDeviceLibraryCard{height:auto;min-height:0;overflow:visible;display:block}'));
 assert(html.includes('#rackReplacementModal .modalCard{height:auto;min-height:0;max-height:90vh;overflow:auto}'));
 assert(source('saveRackDeviceSettingsCard').includes("if(protocolField)updateCanonicalDeviceField"));assert(source('saveRackDeviceSettingsCard').includes("if(card.querySelector('[data-rack-device-setting=\"ip\"]')"));
 console.log('PASS: auto-height replacement, managed settings without protocol/VLAN and single-port automatic selection.');
}

// Saving keeps the current device, sub-tab and DOM/scroll intact, including rejected saves.
{
 let commits=0,renders=0,success=true;
 const r=vm.createContext({activeNetworkSubTab:'portConfiguration',activeDeviceConfigPortId:'switch-1',commitDeviceConfigPortConfiguration:()=>{commits++;return success},render:()=>renders++});
 vm.runInContext(source('saveDeviceConfigPortConfiguration'),r);
 assert.equal(r.saveDeviceConfigPortConfiguration(),true);assert.equal(commits,1);assert.equal(r.activeNetworkSubTab,'portConfiguration');assert.equal(r.activeDeviceConfigPortId,'switch-1');assert.equal(renders,0);
 success=false;assert.equal(r.saveDeviceConfigPortConfiguration(),false);assert.equal(commits,2);assert.equal(r.activeNetworkSubTab,'portConfiguration');assert.equal(r.activeDeviceConfigPortId,'switch-1');assert.equal(renders,0);
 console.log('PASS: Port Configuration Save retains current page, device and DOM without duplicate commits.');
}

// Conflict messages name both endpoints and the existing connection, including draft duplicates.
{
 const named=JSON.parse(before);named[0].name='FOH Switch';named[0].type='GigaCore 10';named[0].ports[0].sub='Port 1';named[0].ports[1].sub='Port 2';named[1].name='Main Console';named[1].ports[0].sub='Network 1';
 named.push({source:'network',id:'other',name:'Stage Switch',ports:[{...port('8'),sub:'Port 8'}]});named[1].ports[0].partner={source:'network',deviceId:'other',portId:'8'};
 const original=JSON.stringify(named),error=c.planManagedSwitchPorts(named,'s',rows).error;
 for(const text of ['FOH Switch','Port 1','Main Console / Network 1','Stage Switch / Port 8','already connected to','only one connection','No changes have been saved'])assert(error.includes(text),text);
 assert.equal(JSON.stringify(named),original);named[1].ports[0].partner=null;
 const duplicate=c.planManagedSwitchPorts(named,'s',[rows[0],{...rows[1],partner:rows[0].partner}]).error;
 for(const text of ['Port 2','Port 1','Main Console / Network 1','already selected for','unsaved changes','Change one of these selections'])assert(duplicate.includes(text),text);
 console.log('PASS: occupied-port errors identify attempted, selected and existing endpoints and distinguish unsaved duplicate selections.');
}

// Unmanaged switches have one device VLAN; old per-port values cannot override it.
{
 const ref={id:'unmanaged-test',type:'Network Switch',managed:false},item={id:'u',referenceId:ref.id,vlan1:'7',protocol:'sACN',deviceConfigPorts:[{...port('1'),vlan:'2',protocol:'Art-Net',partner:{source:'console',deviceId:'c',portId:'eth1'}},{...port('2'),vlan:'3'}]},device={source:'network',id:'u',reference:ref,interfaces:[]};
 const r=vm.createContext({normaliseVlan:v=>String(v||'0'),ipAddressSourceItem:()=>item,deviceConfigDeviceByKey:()=>device,networkDeviceReference:()=>ref,deviceConfigReference:()=>ref,normaliseNetworkPortSettings:()=>[],deviceConfigPortDefinitions:()=>[port('1'),port('2')].map(p=>({...p,protocols:[],directions:[]})),rackReferenceHasNetworkPort:()=>true,rackDeviceVlanMarkup:()=>'<vlan>',syncRackMountedNetworkLocations:()=>{},scheduleRackPopoutWindowsSync:()=>{}});
 for(const name of ['unmanagedSwitchReference','managedSwitchReference','switchPortConfigurationReference','setUnmanagedSwitchVlan','networkDeviceAllowsIp','networkDeviceDefaultProtocol','normaliseDeviceConfigPort','normaliseDeviceConfigPorts','deviceConfigPortsFor','updateDeviceConfigPortField','updateCanonicalDeviceField','rackDeviceProtocolVlanMarkup'])vm.runInContext(source(name),r);
 assert.equal(r.networkDeviceDefaultProtocol(ref,'Art-Net'),'');assert.equal(r.rackDeviceProtocolVlanMarkup({ref,item,kind:'network'}),'<vlan>');
 let ports=r.deviceConfigPortsFor(device);assert(ports.every(p=>p.vlan==='7'&&p.protocol===''&&p.ip===''&&p.subnet===''));
 assert.equal(r.updateCanonicalDeviceField('network','u','protocol','Art-Net'),false);
 assert.equal(r.updateDeviceConfigPortField('network','u','1','protocol','Art-Net'),false);
 assert(r.updateCanonicalDeviceField('network','u','vlan1','9'));assert.equal(item.vlan1,'9');assert(item.deviceConfigPorts.every(p=>p.vlan==='9'&&p.protocol===''));assert.equal(item.deviceConfigPorts[0].partner.deviceId,'c');
 assert(r.updateDeviceConfigPortField('network','u','2','vlan','4'));assert.equal(item.vlan1,'4');assert(item.deviceConfigPorts.every(p=>p.vlan==='4'));
 const saved=JSON.stringify(item);Object.assign(item,JSON.parse(saved));assert(r.deviceConfigPortsFor(device).every(p=>p.vlan==='4'));
 assert.equal(r.unmanagedSwitchReference({...ref,managed:true}),false);
 console.log('PASS: unmanaged protocol rejection, switch-wide VLAN edits, inherited port values, retained connections and save/load.');
}

// Partner options exclude occupied ports and draft reservations, but retain this row's connection.
{
 const target={source:'console',id:'target',ports:[{...port('a'),partner:{source:'network',deviceId:'s',portId:'1'}},port('b')]},other={source:'network',id:'other',ports:[port('x')]},list=[devices[0],target,other],key=JSON.stringify(['console','target']);
 const r=vm.createContext({escapeHtml:v=>String(v??''),escapeAttr:v=>String(v??''),compiledDeviceConfigDevices:()=>list});
 for(const name of ['switchPartnerDeviceKey','availableSwitchPartnerPorts','switchPartnerDeviceOptions','switchPartnerPortOptions','refreshSwitchPartnerPorts','updateSwitchPartnerDevice'])vm.runInContext(source(name),r);
 assert(!r.switchPartnerPortOptions(key,'',list,{switchId:'s',portId:'2'}).includes('value="a"'));
 assert(r.switchPartnerPortOptions(key,'a',list,{switchId:'s',portId:'1'}).includes('value="a" selected'));
 target.ports[0].partner={source:'network',deviceId:'other',portId:'x'};
 assert(!r.switchPartnerPortOptions(key,'a',list,{switchId:'s',portId:'1'}).includes('value="a"'));
 assert(!r.switchPartnerPortOptions(key,'',list,{switchId:'s',portId:'1',drafts:[{id:'2',deviceKey:key,portId:'b'}]}).includes('value="b"'));
 target.ports[0].partner={source:'network',deviceId:'s',portId:'1'};
 assert(r.switchPartnerPortOptions(key,'',list,{switchId:'s',portId:'2',drafts:[{id:'1',deviceKey:'',portId:''}]}).includes('value="a"'));
 // Real change handler refreshes all rows and reserves the auto-selected sole port.
 target.ports=[port('only')];
 const fields=[0,1].map(()=>({value:'',markup:'',set innerHTML(value){this.markup=value;this.value=/value="([^"]*)" selected/.exec(value)?.[1]||''},get innerHTML(){return this.markup}}));
 const rows=fields.map((field,i)=>({dataset:{switchPort:String(i+1)},querySelector:selector=>selector==='[data-switch-partner-device]'?{value:key}:field}));
 const panel={dataset:{switchId:'s'},querySelectorAll:()=>rows},control={closest:selector=>selector==='.managedSwitchPortConfiguration'?panel:rows[0]};
 r.updateSwitchPartnerDevice(control);assert.equal(fields[0].value,'only');assert(!fields[1].innerHTML.includes('value="only"'));
 fields[0].value='';r.refreshSwitchPartnerPorts(control);assert(fields[1].innerHTML.includes('value="only"'));assert.equal(fields[1].value,'');
 console.log('PASS: occupied and draft-selected partner ports hidden, current link retained, released ports restored and single-port auto-selection reserved.');
}

// A full single-port device is hidden everywhere except its existing connection.
{
 const r=vm.createContext({escapeHtml:v=>String(v??''),escapeAttr:v=>String(v??'')});
 for(const name of ['switchPartnerDeviceKey','availableSwitchPartnerPorts','switchPartnerDeviceOptions'])vm.runInContext(source(name),r);
 const octo={source:'network',id:'octo',name:'SPARE Octo',ports:[{...port('eth'),partner:{source:'network',deviceId:'stage2',portId:'1'}}]},stage2={source:'network',id:'stage2',name:'Stage 2',ports:[port('1'),port('2')]},list=[octo,stage2],key=JSON.stringify(['network','octo']);
 assert(!r.switchPartnerDeviceOptions('',list,{switchId:'stage1',portId:'1'}).includes('SPARE Octo'));
 assert(r.switchPartnerDeviceOptions(key,list,{switchId:'stage2',portId:'1'}).includes('SPARE Octo'));
 assert(!r.switchPartnerDeviceOptions('',list,{switchId:'stage2',portId:'2'}).includes('SPARE Octo'));
 assert(r.switchPartnerDeviceOptions('',list,{switchId:'stage2',portId:'2',drafts:[{id:'1',deviceKey:'',portId:''}]}).includes('SPARE Octo'));
 octo.ports[0].partner=null;
 assert(r.switchPartnerDeviceOptions('',list,{switchId:'stage1',portId:'1'}).includes('SPARE Octo'));
 assert(!r.switchPartnerDeviceOptions('',list,{switchId:'stage1',portId:'2',drafts:[{id:'1',deviceKey:key,portId:'eth'}]}).includes('SPARE Octo'));
 octo.ports.push(port('eth2'));
 assert(r.switchPartnerDeviceOptions('',list,{switchId:'stage1',portId:'2',drafts:[{id:'1',deviceKey:key,portId:'eth'}]}).includes('SPARE Octo'));
 console.log('PASS: Connected Device excludes full devices, retains current links and free multi-port devices, and respects draft assignments/disconnections.');
}

// Clear modifies only the current form; applying it uses the existing save workflow.
{
 let refreshes=0,styles=0,saves=0;
 const r=vm.createContext({refreshSwitchPartnerPorts:()=>refreshes++,updateNetworkPortPositionStyle:()=>styles++,persist:()=>saves++});
 vm.runInContext(source('clearDevicePortConfiguration'),r);
 const fields=[{value:'device'},{value:'port'}],switchPanel={classList:{contains:()=>true},querySelectorAll:selector=>{assert.equal(selector,'[data-switch-partner-device], [data-switch-partner-port]');return fields}};
 r.clearDevicePortConfiguration({closest:()=>switchPanel});assert(fields.every(field=>field.value===''));assert.equal(refreshes,1);assert.equal(saves,0);
 const dmxFields=['name','universe','location'].map(key=>({value:'old',hasAttribute:attr=>attr==='data-network-port-'+key})),dmxPanel={classList:{contains:()=>false},querySelectorAll:selector=>{assert.equal(selector,'[data-network-port-name], [data-network-port-universe], [data-network-port-location]');return dmxFields}};
 r.clearDevicePortConfiguration({closest:()=>dmxPanel});assert(dmxFields.every(field=>field.value===''));assert.equal(styles,1);assert.equal(saves,0);
 assert(source('networkPortSettingsMarkup').includes('onclick="clearDevicePortConfiguration(this)"'));
 assert(source('managedSwitchPortSettingsMarkup').includes('onclick="clearDevicePortConfiguration(this)"'));
 // Both DMX save routes retain blank names, clear only the requested fields and save once.
 for(const route of ['commitDeviceConfigPortConfiguration','saveRackPortConfiguration']){
  let count=0;const item={id:'node',deviceConfigPorts:[{id:'dmx',category:'dmx',legacyDmxIndex:0,name:'Old',patch:'12',location:'Stage',direction:'input',vlan:'7',protocol:'sACN',notes:'Keep'},{id:'eth',category:'network',ip:'10.0.0.1',partner:{source:'network',deviceId:'s',portId:'1'}}]},settings=[{name:'',universe:'',location:'',direction:'input',vlan:'7',protocol:'sACN',notes:'Keep'}],ref={type:'DMX Node'};
  const ctx=vm.createContext({normaliseVlan:v=>String(v||'0'),managedSwitchReference:()=>false,switchPortConfigurationReference:()=>false,deviceConfigPortConfigurationDevices:()=>[{id:'node',source:'network',reference:ref}],ipAddressSourceItem:()=>item,networkDmxPortDefinitions:()=>[{}],normaliseNetworkPortSettings:value=>value,readNetworkPortSettings:()=>settings,persist:()=>count++,rackPortConfigurationContext:()=>({network:item,ref}),$:()=>({}),render:()=>{},closeRackPortConfiguration:()=>{}});
  for(const name of ['normaliseDeviceConfigPort','normaliseDeviceConfigPorts',route])vm.runInContext(source(name),ctx);
  if(route==='saveRackPortConfiguration')ctx[route](false);else ctx[route]({},'node');
  assert.equal(count,1);const port=item.deviceConfigPorts[0];for(const key of ['name','patch','location'])assert.equal(port[key],'');assert.equal(port.direction,'input');assert.equal(port.vlan,'7');assert.equal(port.notes,'Keep');assert.equal(item.deviceConfigPorts[1].partner.deviceId,'s');assert.equal(item.deviceConfigPorts[1].ip,'10.0.0.1');
 }
 console.log('PASS: device Clear is draft-only, switch VLANs and DMX directions remain untouched, and both DMX save routes preserve blank names with one save.');
}

// Unmanaged switches expose partner mapping, but never per-port VLAN or network settings.
{
 const ref={type:'Network Switch',managed:false},sw={source:'network',id:'u',name:'Unmanaged',reference:ref,ports:Array.from({length:8},(_,i)=>({...port(String(i+1)),vlan:'7'}))},peer={source:'network',id:'peer',name:'Node',ports:[port('eth')]},list=[sw,peer],proposals=sw.ports.map((p,i)=>({id:p.id,vlan:'99',partner:i===0?{source:'network',deviceId:'peer',portId:'eth'}:null}));
 const plan=c.planManagedSwitchPorts(list,'u',proposals);assert(!plan.error);assert(plan.updates.find(d=>d.id==='u').ports.every(p=>p.vlan==='7'));assert.equal(plan.updates.find(d=>d.id==='peer').ports[0].partner.deviceId,'u');
 const esc=v=>String(v??'').replaceAll('"','&quot;'),items=new Map([['u',{id:'u',vlan1:'7',ip1:'',subnet1:'',deviceConfigPorts:[]}],['peer',{id:'peer',deviceConfigPorts:[]}]]);let count=0;
 const r=vm.createContext({compiledDeviceConfigDevices:()=>list,escapeHtml:esc,escapeAttr:esc,normaliseVlan:v=>String(v||'0'),ipVlanCellStyle:()=>'',rackVlanOptionsMarkup:()=>{throw Error('No per-port VLAN editor expected')},ipAddressSourceItem:(_,id)=>items.get(id),persist:()=>count++,scheduleRackPopoutWindowsSync:()=>{},alert:msg=>{throw Error(msg)}});
 for(const name of ['unmanagedSwitchReference','managedSwitchReference','switchPortConfigurationReference','switchPartnerDeviceKey','availableSwitchPartnerPorts','switchPartnerDeviceOptions','switchPartnerPortOptions','managedSwitchPortSettingsMarkup','normaliseDeviceConfigPort','normaliseDeviceConfigPorts','planManagedSwitchPorts','commitManagedSwitchPortConfiguration'])vm.runInContext(source(name),r);
 const markup=r.managedSwitchPortSettingsMarkup(items.get('u'),ref);assert.equal((markup.match(/<tr data-switch-port=/g)||[]).length,8);assert(!markup.includes('data-switch-vlan'));assert(!markup.includes('<th>VLAN</th>'));assert(markup.includes('clearDevicePortConfiguration(this)'));
 const panel={dataset:{switchSnapshot:'[]'},querySelectorAll:()=>proposals.map(row=>({dataset:{switchPort:row.id},querySelector:selector=>selector==='[data-switch-vlan]'?null:{value:selector==='[data-switch-partner-device]'?(row.partner?JSON.stringify([row.partner.source,row.partner.deviceId]):''):(row.partner?.portId||'')}}))};
 assert(r.commitManagedSwitchPortConfiguration({querySelector:()=>panel},items.get('u')));assert.equal(count,1);assert.equal(items.get('u').vlan1,'7');assert(items.get('u').deviceConfigPorts.every(p=>p.vlan==='7'));assert.equal(items.get('peer').deviceConfigPorts[0].partner.deviceId,'u');
 for(const name of ['renderRackPortConfiguration','renderDeviceConfigPortConfigurationView','saveRackPortConfiguration','commitDeviceConfigPortConfiguration'])assert(source(name).includes('switchPortConfigurationReference('),name);
 console.log('PASS: unmanaged eight-port editor, reciprocal save-once mapping, Clear availability, shared routing and unchanged whole-switch VLAN.');
}
