/* Pure, reviewed project transfers. Work on clones; never mutate either project. */
(function(root,factory){const api=factory(root.LampyCore||(typeof require==='function'?require('./project-core.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.LampyProjectTransfer=api;})(globalThis,function(Core){
 'use strict';
 const AREAS=Object.freeze({fixtures:'Fixture Patch',positions:'Positions and colours',power:'Distros and Supplies',looms:'Looms',devices:'Control/Network devices',racks:'Rack Layouts',contacts:'Contacts',logos:'Logos',pdf:'PDF settings',settings:'Project and label settings'});
 const CONTACT_KEYS=['production','productionContacts','productionVisible','productionOrder','customProductionFields'];
 const OWNER_KEYS=['projectOwner','email','phoneNumber','includeOwnerDetailsInPdfFooters'];
 const LOGO_KEYS=['logo','secondaryLogo','vendorLogoOverride','logoVisibility','exportLogoMode','exportLogos'];
 const PDF_KEYS=['fixtureNameDisplay','fanOutFormat','powerFormat','ipAddressFormat','deviceConfigFormat','deviceConfigPdf','positionSummaryFormat'];
 const clone=value=>structuredClone(value),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const basis=value=>{const data=clone(value);delete data.savedAt;return JSON.stringify(data)};
 const arr=value=>Array.isArray(value)?value:[];
 function envelope(input){Core.validateProject(input);const data=clone(input);return data.app?data:{fileType:'Lampy Paperwork Project',app:data.project||data}}
 function empty(){return {fileType:'Lampy Paperwork Project',app:{labels:[],socaNames:[],socaMeta:[],distros:[],fixturePatch:[],patchSheets:[],looms:[],gdtfFiles:{},gdtfMatches:{},controlNetwork:{consoles:[],npus:[],networkDevices:[],racks:[]},projectInfo:{file:{},positions:[],powerSupplies:[],powerSheets:{},powerAuxSheets:{},projectSettings:{}}}}}
 function areaData(app,area){
  const p=app.projectInfo||{},n=app.controlNetwork||{},pick=(object,keys)=>Object.fromEntries(keys.map(k=>[k,object[k]]));
  switch(area){
   case 'fixtures':return pick(app,['fixturePatch','patchSheets','gdtfFiles','gdtfMatches']);
   case 'positions':return pick(p,['positions']);
   case 'power':return {...pick(app,['distros','labels','socaNames','socaMeta']),...pick(p,['powerSupplies','powerSheets','powerAuxSheets'])};
   case 'looms':return pick(app,['looms']);
   case 'devices':return {...pick(n,['consoles','npus','networkDevices']),...pick(p,['vlanSetup','ipDeviceOrder','ipLocationOrder','deviceConfigTableSorts'])};
   case 'racks':return pick(n,['racks']);
   case 'contacts':return {...pick(p,CONTACT_KEYS),owner:pick(p.file||{},OWNER_KEYS)};
   case 'logos':return pick(p,LOGO_KEYS);
   case 'pdf':return {pdf:p.projectSettings?.pdf,...pick(p,PDF_KEYS)};
   case 'settings':return {...pick(p.projectSettings||{},Object.keys(p.projectSettings||{}).filter(k=>k!=='pdf')),...pick(p,['skipConsoleRemovalConfirmation','customFields']),...pick(p.file||{},['jobType','jobSubtype'])};
   default:return {};
  }
 }
 function describeChanges(before,after){
  const changes=[];
  function visible(value){if(typeof value==='string'&&value.length>300)return `Stored content (${value.length.toLocaleString()} characters)`;if(Array.isArray(value))return value.map(visible);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,visible(item)]));return value}
  const describe=value=>value===undefined?'Not set':typeof value==='string'?visible(value):JSON.stringify(visible(value),null,2);
  function walk(a,b,path){if(equal(a,b))return;
   if(Array.isArray(a)||Array.isArray(b)){changes.push({path,before:describe(a),after:describe(b)});return}
   const object=value=>value!==null&&typeof value==='object';
   if((object(a)||a===undefined)&&(object(b)||b===undefined)){for(const key of new Set([...Object.keys(a||{}),...Object.keys(b||{})]))walk(a?.[key],b?.[key],path?path+'.'+key:key);return}
   changes.push({path,before:describe(a),after:describe(b)});
  }
  walk(before,after,'');return changes;
 }
 function review(destination,source,choices){
  const result=envelope(destination),incoming=envelope(source),target=result.app,src=incoming.app;
  target.projectInfo||={};src.projectInfo||={};target.controlNetwork||={};src.controlNetwork||={};
  const info=target.projectInfo,si=src.projectInfo,net=target.controlNetwork,snet=src.controlNetwork,issues=[],summaries=[];
  const selected=Object.keys(choices||{}).filter(k=>choices[k]);
  if(!selected.length)throw Error('Choose at least one area.');
  for(const area of selected)if(!AREAS[area]||!['add','replace'].includes(choices[area]))throw Error('Invalid import choice.');
  const warn=(area,message,blocking=false)=>issues.push({area,message,blocking});
  const isAdd=area=>choices[area]==='add';
  const issueDuplicates=(area,items,existing,label='name')=>{const seen=new Set(existing.map(x=>String(x?.[label]||'').trim()).filter(Boolean));for(const item of items){const name=String(item?.[label]||'').trim();if(name&&seen.has(name))warn(area,`Duplicate ${label}: ${name}. Both entries will remain.`);seen.add(name)}};
  function count(area,a){const p=a.projectInfo||{},n=a.controlNetwork||{};switch(area){case 'fixtures':return arr(a.fixturePatch).length;case 'positions':return arr(p.positions).length;case 'power':return arr(a.distros).length;case 'looms':return arr(a.looms).length;case 'devices':return ['consoles','npus','networkDevices'].reduce((sum,k)=>sum+arr(n[k]).length,0);case 'racks':return arr(n.racks).length;case 'contacts':return Object.values(p.production||{}).filter(Boolean).length+Object.values(p.productionContacts||{}).filter(Boolean).length;case 'logos':return ['logo','secondaryLogo','vendorLogoOverride'].filter(k=>p[k]?.dataUrl).length;case 'pdf':return p.projectSettings?.pdf?1:0;case 'settings':return Object.keys(p.projectSettings||{}).filter(k=>k!=='pdf').length;default:return 0}}
  const before=clone(target);
  const idMaps=new Map();
  function remap(category,id){if(!id)return id;const key=category+':'+id;if(!idMaps.has(key))idMaps.set(key,category+'_'+crypto.randomUUID());return idMaps.get(key)}
  function copyFields(area,from,to,keys){for(const key of keys){if(from[key]===undefined){if(!isAdd(area))delete to[key];continue}
   if(isAdd(area)&&to[key]!==undefined&&to[key]!==''&&to[key]!==null&&(typeof to[key]!=='object'||Object.keys(to[key]).length)){
    if(from[key]&&typeof from[key]==='object'&&!Array.isArray(from[key])&&typeof to[key]==='object'&&!Array.isArray(to[key])){
     for(const [field,value] of Object.entries(from[key])){if(to[key][field]===undefined||to[key][field]==='')to[key][field]=clone(value);else if(!equal(to[key][field],value))warn(area,`${key}.${field}: existing value retained. Choose Replace to use the imported value.`)}
    }else if(!equal(from[key],to[key]))warn(area,`${key}: existing value retained. Choose Replace to use the imported value.`);
   }else to[key]=clone(from[key]);
  }}
  const fixIdMap=new Map();
  if(choices.fixtures){
   const existing=isAdd('fixtures')?arr(target.fixturePatch):[],used=new Set(existing.map(r=>String(r.fixId||'')).filter(Boolean));let next=[...used].filter(x=>/^\d+$/.test(x)).reduce((n,x)=>Math.max(n,Number(x)),0)+1;
   const incomingByFix=new Map();for(const row of arr(src.fixturePatch)){const id=String(row.fixId||'');if(id){if(incomingByFix.has(id))warn('fixtures',`Source Fix ID ${id} occurs more than once. Correct it before importing linked fixture data.`,true);incomingByFix.set(id,row)}}
   for(const id of incomingByFix.keys()){
    let value=id;if(used.has(id)){while(used.has(String(next))||incomingByFix.has(String(next)))next++;value=String(next++);warn('fixtures',`Imported Fix ID ${id} becomes ${value}; imported power assignments will follow it.`)}
    fixIdMap.set(id,value);used.add(value);
   }
   const files=clone(src.gdtfFiles||{}),fileNames=new Map();
   for(const [name,file] of Object.entries(files)){let assigned=name;if(target.gdtfFiles?.[name]&&!equal(target.gdtfFiles[name],file)){assigned='import_'+crypto.randomUUID()+'_'+name;warn('fixtures',`Imported GDTF ${name} is kept separately as ${assigned}.`)}fileNames.set(name,assigned)}
   const mvrIds=new Map();
   const rowCopy=row=>{const copy=clone(row);copy.id=remap('patch',copy.id||crypto.randomUUID());if(fixIdMap.has(String(copy.fixId)))copy.fixId=fixIdMap.get(String(copy.fixId));const spec=String(copy.gdtfSpec||'').split('/').pop();if(fileNames.has(spec))copy.gdtfSpec=fileNames.get(spec);if(isAdd('fixtures')&&copy.mvrUuid){if(!mvrIds.has(copy.mvrUuid))mvrIds.set(copy.mvrUuid,crypto.randomUUID());copy.mvrUuid=mvrIds.get(copy.mvrUuid)}return copy};
   const rows=arr(src.fixturePatch).map(rowCopy);issueDuplicates('fixtures',rows,existing,'name');target.fixturePatch=[...existing,...rows];
   target.patchSheets=[...(isAdd('fixtures')?arr(target.patchSheets):[]),...arr(src.patchSheets).map(sheet=>({...clone(sheet),id:remap('sheet',sheet.id||crypto.randomUUID()),rows:arr(sheet.rows).map(rowCopy),diffs:Object.fromEntries(Object.entries(sheet.diffs||{}).map(([key,value])=>[remap('patch',key),clone(value)]))}))];
   target.gdtfFiles=isAdd('fixtures')?(target.gdtfFiles||{}):{};for(const [name,file] of Object.entries(files)){const assigned=fileNames.get(name);target.gdtfFiles[assigned]={...file,fileName:assigned}}
   const matches=Object.fromEntries(Object.entries(src.gdtfMatches||{}).map(([k,v])=>[k,{...v,fileName:fileNames.get(v.fileName)||v.fileName}]));
   target.gdtfMatches=isAdd('fixtures')?{...matches,...target.gdtfMatches}:matches;
   info.fixtureOverrides=isAdd('fixtures')?{...si.fixtureOverrides,...info.fixtureOverrides}:clone(si.fixtureOverrides||{});
   if(!isAdd('fixtures'))target.activePatchSheetId='master';
   const assignments=Object.values(before.projectInfo?.powerSheets||{}).flatMap(arr).flatMap(r=>arr(r.fixIds)).filter(Boolean);
   if(!isAdd('fixtures')&&!choices.power&&assignments.length)warn('fixtures','Replacing Fixture Patch would change retained power assignments. Include Distros and Supplies in the review.',true);
   const addresses=new Map();for(const row of target.fixturePatch){if(!row.universe||!row.address)continue;const k=row.universe+':'+row.address;if(addresses.has(k))warn('fixtures',`Patch address ${k} is used more than once. Review the resulting patch before use.`);addresses.set(k,row)}
  }
  if(choices.positions){
   const positions=isAdd('positions')?clone(arr(info.positions)):[];
   for(const pos of arr(si.positions)){const match=positions.find(p=>p.name===pos.name);if(match){if(!equal(match,pos))warn('positions',`${pos.name}: existing position colours retained. Choose Replace to use imported colours.`)}else positions.push(clone(pos))}info.positions=positions;
  }
  if(choices.power){
   const offset=isAdd('power')?arr(target.distros).length:0,existing=isAdd('power')?arr(target.distros):[];
   const distros=arr(src.distros).map(d=>{const copy=clone(d);copy.id=remap('distro',d.id||crypto.randomUUID());for(const group of [...arr(copy.auxGroups),...arr(copy.outputGroups)]){if(group.id)group.id=remap('outputgroup',group.id);for(const label of arr(group.labels))if(label.outlet?.id)label.outlet.id=remap('outlet',label.outlet.id)}if(copy.feed){copy.feed.distroId=remap('distro',copy.feed.distroId);copy.feed.outletId=remap('outlet',copy.feed.outletId)}return copy});
   issueDuplicates('power',distros,existing);target.distros=[...existing,...distros];
   for(const field of ['labels','socaNames'])target[field]=[...(isAdd('power')?arr(target[field]):[]),...clone(arr(src[field]))];
   target.socaMeta=[...(isAdd('power')?arr(target.socaMeta):[]),...arr(src.socaMeta).map(m=>({...clone(m),id:remap('soca',m.id||crypto.randomUUID()),distroId:remap('distro',m.distroId)}))];
   const sourceFixtures=new Map(arr(src.fixturePatch).map(r=>[String(r.fixId),r])),destFixtures=new Map(arr(target.fixturePatch).map(r=>[String(r.fixId),r]));
   for(const field of ['powerSheets','powerAuxSheets']){
    const sheets=isAdd('power')?clone(info[field]||{}):{};
    for(const [index,rows] of Object.entries(si[field]||{})){
     if(!/^\d+$/.test(index)||Number(index)>=distros.length){warn('power',`Source ${field} contains an invalid distro index.`,true);continue}
     sheets[String(Number(index)+offset)]=clone(rows).map(row=>{if(row.fixIds)row.fixIds=row.fixIds.map(value=>{const id=String(value||'');if(!id)return '';if(choices.fixtures)return fixIdMap.get(id)||id;const s=sourceFixtures.get(id),d=destFixtures.get(id);if(!s||!d||s.id!==d.id)warn('power',`Power uses Fix ID ${id}. Include Fixture Patch so the correct fixture is imported.`,true);return id});return row});
    }info[field]=sheets;
   }
   info.powerSupplies=[...(isAdd('power')?arr(info.powerSupplies):[]),...arr(si.powerSupplies).map(s=>({...clone(s),id:remap('supply',s.id||crypto.randomUUID()),distros:arr(s.distros).map(i=>{if(!Number.isInteger(i)||i<0||i>=distros.length)warn('power','A source supply has an invalid distro assignment.',true);return i+offset})}))];
  }
  if(choices.looms){
   const existing=isAdd('looms')?arr(target.looms):[],looms=arr(src.looms).map(l=>({...clone(l),id:remap('loom',l.id||crypto.randomUUID()),parentLoomId:remap('loom',l.parentLoomId),cables:arr(l.cables).map(c=>({...clone(c),id:remap('cable',c.id||crypto.randomUUID())}))}));issueDuplicates('looms',looms,existing);target.looms=[...existing,...looms];
   const ids=new Set(target.looms.map(l=>l.id));for(const l of looms)if(l.parentLoomId&&!ids.has(l.parentLoomId))warn('looms',`${l.name}: the parent loom is missing from the source.`,true);
  }
  const groups={console:'consoles',npu:'npus',network:'networkDevices'};
  function remapDevice(source,id){return remap(source+'device',id)}
  if(choices.devices){
   for(const [source,field] of Object.entries(groups)){
    const existing=isAdd('devices')?arr(net[field]):[],devices=arr(snet[field]).map(d=>{
     const copy=clone(d);copy.id=remapDevice(source,d.id||crypto.randomUUID());copy.deviceConfigPorts=arr(d.deviceConfigPorts).map(port=>{const p=clone(port);p.id=remap('port',source+':'+d.id+':'+port.id);if(p.partner){const partner=p.partner;p.partner={...partner,deviceId:remapDevice(partner.source,partner.deviceId),portId:remap('port',partner.source+':'+partner.deviceId+':'+partner.portId)}}return p});return copy;
    });issueDuplicates('devices',devices,existing);net[field]=[...existing,...devices];
   }
   if(!isAdd('devices')&&!choices.racks&&arr(net.racks).some(r=>arr(r.devices).some(d=>d.sourceKey)))warn('devices','Existing racks contain linked devices. Include Rack Layouts when replacing those devices.',true);
   copyFields('devices',si,info,['vlanSetup','deviceConfigTableSorts']);
   // Display ordering uses typed device source keys; remap imported order entries only.
   const remapSourceKey=value=>{const colon=value.indexOf(':'),source=value.slice(0,colon);return groups[source]?source+':'+remapDevice(source,value.slice(colon+1)):value};
   info.ipDeviceOrder=[...(isAdd('devices')?arr(info.ipDeviceOrder):[]),...arr(si.ipDeviceOrder).map(remapSourceKey)];
   info.ipLocationOrder=[...new Set([...(isAdd('devices')?arr(info.ipLocationOrder):[]),...arr(si.ipLocationOrder)])];
   const ips=new Set();for(const field of Object.values(groups))for(const d of arr(net[field]))for(const ip of [d.ip,d.ip1,d.ip2].filter(Boolean)){if(ips.has(ip))warn('devices',`IP address ${ip} is used more than once.`);ips.add(ip)}
  }
  if(choices.racks){
   const existing=isAdd('racks')?arr(net.racks):[],racks=arr(snet.racks).map(r=>({...clone(r),id:remap('rack',r.id||crypto.randomUUID()),devices:arr(r.devices).map(d=>{const copy={...clone(d),id:remap('rackitem',d.id||crypto.randomUUID())};if(copy.sourceKey){const colon=copy.sourceKey.indexOf(':'),source=copy.sourceKey.slice(0,colon),id=copy.sourceKey.slice(colon+1),field=groups[source];if(field){if(choices.devices)copy.sourceKey=source+':'+remapDevice(source,id);else if(!arr(net[field]).some(device=>device.id===id))warn('racks',`${r.name}: ${d.label||d.sourceKey} requires Control/Network devices.`,true)}}return copy})}));issueDuplicates('racks',racks,existing);net.racks=[...existing,...racks];
  }
  if(choices.devices||choices.racks){
   const mounted=new Set();for(const rack of arr(net.racks))for(const device of arr(rack.devices)){if(!device.sourceKey)continue;if(mounted.has(device.sourceKey))warn('racks',`${device.sourceKey} would be mounted in more than one rack. Include a copy of its device or resolve the duplicate mount.`,true);mounted.add(device.sourceKey)}
   for(const field of Object.values(groups))for(const device of arr(net[field]))for(const port of arr(device.deviceConfigPorts))if(port.partner){const partner=port.partner,other=arr(net[groups[partner.source]]).find(d=>d.id===partner.deviceId);if(!other||!arr(other.deviceConfigPorts).some(p=>p.id===partner.portId))warn('devices',`${device.name||device.id}: port ${port.name||port.id} links to a missing device or port.`,true)}
  }
  if(choices.contacts){copyFields('contacts',si,info,CONTACT_KEYS);info.file||={};copyFields('contacts',si.file||{},info.file,OWNER_KEYS)}
  if(choices.logos)copyFields('logos',si,info,LOGO_KEYS);
  if(choices.pdf){info.projectSettings||={};copyFields('pdf',si.projectSettings||{},info.projectSettings,['pdf']);copyFields('pdf',si,info,PDF_KEYS);result.fixturePatchViewOptions||={};copyFields('pdf',incoming.fixturePatchViewOptions||{},result.fixturePatchViewOptions,['page','titleFormat','pdf','tableFormats','columns'])}
  if(choices.settings){info.projectSettings||={};copyFields('settings',si.projectSettings||{},info.projectSettings,[...new Set([...Object.keys(si.projectSettings||{}),...Object.keys(info.projectSettings)])].filter(k=>k!=='pdf'));copyFields('settings',si,info,['skipConsoleRemovalConfirmation','customFields']);info.file||={};copyFields('settings',si.file||{},info.file,['jobType','jobSubtype']);copyFields('settings',incoming,result,['settings'])}
  // Retained fixtures still require their named positions; state this in the review.
  if(choices.positions==='replace')for(const row of arr(target.fixturePatch)){const name=String(row.location||'').trim();if(name&&!arr(info.positions).some(p=>p.name===name)){const original=arr(before.projectInfo?.positions).find(p=>p.name===name);info.positions.push(clone(original||{name,colour1:row.colour1||'',colour2:row.colour2||'',colour3:''}));warn('positions',`${name} is retained because a fixture still uses this position.`)}}
  for(const area of selected){const changes=describeChanges(areaData(before,area),areaData(target,area));if(area==='settings')changes.push(...describeChanges({labelSettings:destination.settings},{labelSettings:result.settings}));if(area==='pdf')changes.push(...describeChanges({fixturePatchExport:destination.fixturePatchViewOptions},{fixturePatchExport:result.fixturePatchViewOptions}));summaries.push({area,label:AREAS[area],action:choices[area],before:count(area,before),source:count(area,src),after:count(area,target),removed:choices[area]==='replace'&&changes.length?count(area,before):0,changes})}
  try{Core.validateProject(result)}catch(error){warn('project',error.message,true)}
  return {schema:1,basis:basis(destination),result,areas:summaries,issues,canApply:!issues.some(x=>x.blocking)};
 }
 function applyReviewed(preview,current){if(!preview?.canApply)throw Error('Resolve the import issues before applying.');if(basis(current)!==preview.basis)throw Error('The destination project changed after this review. Review the import again.');Core.validateProject(preview.result);return clone(preview.result)}
 function createTemplate(source,areas,{name='Template',id=crypto.randomUUID(),revision=1,isDefault=false}={}){
  if(!Array.isArray(areas)||!areas.length||new Set(areas).size!==areas.length||areas.some(a=>!AREAS[a]))throw Error('Choose valid template areas.');
  const preview=review(empty(),source,Object.fromEntries(areas.map(a=>[a,'replace'])));if(!preview.canApply)throw Error(preview.issues.filter(i=>i.blocking).map(i=>i.message).join(' '));
  return {schema:1,type:'Lampy Project Template',id,name:String(name).slice(0,200),revision,isDefault:!!isDefault,areas:[...areas],project:applyReviewed(preview,empty())};
 }
 function validateTemplate(template){if(template?.schema!==1||template.type!=='Lampy Project Template'||!Array.isArray(template.areas)||!template.areas.length||template.areas.some(a=>!AREAS[a])||!Number.isInteger(template.revision)||template.revision<1)throw Error('Invalid project template.');Core.validateProject(template.project);return template}
 return {AREAS,empty,review,applyReviewed,createTemplate,validateTemplate};
});
