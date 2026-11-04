'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.indexOf('function '+name+'(');assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
const c=vm.createContext({normaliseVlan:v=>String(v||'0'),networkDmxPortDefinitions:ref=>ref?.dmx?[{}]:[]});
for(const name of ['managedSwitchReference','deviceHasPortConfiguration','switchPartnerDeviceKey','normaliseDeviceConfigPort','normaliseDeviceConfigPorts','planManagedSwitchPorts','commitManagedSwitchPortConfiguration'])vm.runInContext(source(name),c);
assert(c.deviceHasPortConfiguration({type:'Network Switch',managed:true}));assert(!c.deviceHasPortConfiguration({type:'Network Switch',managed:false}));assert(c.deviceHasPortConfiguration({dmx:true}));
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
let saves=0;const errors=[],items=new Map(devices.map(d=>[d.source+':'+d.id,{id:d.id,ip1:'10.0.0.2',subnet1:'255.0.0.0',deviceConfigPorts:[]}]));
c.compiledDeviceConfigDevices=()=>devices;c.ipAddressSourceItem=(s,id)=>items.get(s+':'+id);c.persist=()=>saves++;c.alert=m=>errors.push(m);
const panel={dataset:{switchSnapshot:'[]'},querySelectorAll:()=>rows.map(row=>({dataset:{switchPort:row.id},querySelector:selector=>({value:selector==='[data-switch-vlan]'?row.vlan:selector==='[data-switch-partner-device]'?JSON.stringify([row.partner.source,row.partner.deviceId]):row.partner.portId})}))},host={querySelector:()=>panel},item=items.get('network:s');
assert(c.commitManagedSwitchPortConfiguration(host,item));assert.equal(saves,1);assert.equal(item.ip1,'10.0.0.2');assert.equal(item.subnet1,'255.0.0.0');assert.equal(items.get('console:c').deviceConfigPorts[0].partner.deviceId,'s');
panel.dataset.switchSnapshot='[]';const saved=JSON.stringify([...items]);assert.equal(c.commitManagedSwitchPortConfiguration(host,item),false);assert.equal(saves,1);assert.equal(JSON.stringify([...items]),saved);
assert(!source('managedSwitchPortSettingsMarkup').includes('persist('));assert(!source('cancelDeviceConfigPortConfiguration').includes('commit'));assert(source('rackSettingsCardMarkup').includes('deviceHasPortConfiguration(linkedRef)'));assert(source('renderRackPortConfiguration').includes('managedSwitchPortSettingsMarkup'));assert(source('renderDeviceConfigPortConfigurationView').includes('managedSwitchPortSettingsMarkup'));
console.log('PASS: managed switch eligibility, per-port VLANs, reciprocal stable partners, duplicate/occupied/self/stale rejection, disconnect/reassignment, round trip and save-once without IP changes.');

// Render the real switch editor with separate device/port selectors and saved selection.
{
 const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 const r=vm.createContext({compiledDeviceConfigDevices:()=>linked,escapeHtml:esc,escapeAttr:esc,normaliseVlan:v=>String(v||'0'),ipVlanCellStyle:()=>'',rackVlanOptionsMarkup:v=>`<option value="${v}" selected>${v}</option>`});
 for(const name of ['switchPartnerDeviceKey','switchPartnerPortOptions','managedSwitchPortSettingsMarkup'])vm.runInContext(source(name),r);
 const markup=r.managedSwitchPortSettingsMarkup({id:'s',deviceConfigPorts:[]},devices[0].reference);
 assert.equal((markup.match(/<tr data-switch-port=/g)||[]).length,2);assert.equal((markup.match(/select data-switch-vlan/g)||[]).length,2);assert.equal((markup.match(/select data-switch-partner-device/g)||[]).length,2);assert.equal((markup.match(/select data-switch-partner-port/g)||[]).length,2);assert(markup.includes('value="eth1" selected'));
 assert(source('selectDeviceConfigPortDevice').includes('if(!commitDeviceConfigPortConfiguration())return'));
}
