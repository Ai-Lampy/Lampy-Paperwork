/* Catalogue validation, saved Distro configuration and feed-tree rules. */
(function(root){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const id=()=>root.crypto.randomUUID();
  const positive=value=>Number.isInteger(value)&&value>0;
  const rating=value=>{const m=/^\s*(\d+(?:\.\d+)?)\s*A\b/i.exec(String(value||''));return m?Number(m[1]):null};
  const connectorKey=value=>String(value||'').toLowerCase().replace(/power\s*lock/g,'powerlock').replace(/\s+/g,' ').trim();
  function normalise(data){
    if(!data||!Array.isArray(data.socapexWayMappings)||!Array.isArray(data.distroType))throw Error('Invalid Distro catalogue structure.');
    const mappings=clone(data.socapexWayMappings),ids=new Set();
    for(const m of mappings){
      if(!m.id||ids.has(m.id)||!m.name)throw Error('Missing or duplicate phase mapping.');ids.add(m.id);
      for(const phase of ['L1','L2','L3']){const r=m.mapping?.[phase];if(!r||!Array.isArray(r.ways)||r.ways.some(w=>!positive(w)||w>6)||!(r.socas==='all'||positive(r.socaPattern?.start)&&positive(r.socaPattern?.step)))throw Error('Invalid phase mapping: '+m.id)}
      for(let s=1;s<=12;s++)for(let w=1;w<=6;w++)if(['L1','L2','L3'].filter(p=>matches(m.mapping[p],s,w)).length!==1)throw Error('Phase mapping must assign every circuit exactly once: '+m.id);
    }
    const names=new Set(),types=data.distroType.map(raw=>{
      if(!raw.name||names.has(raw.name)||!Array.isArray(raw.outputs))throw Error('Missing or duplicate Distro type.');names.add(raw.name);
      const t=clone(raw),soca=t.outputs.find(o=>o.id==='socapex');
      if(!soca||!positive(soca.quantity)||soca.circuitsPerConnector!==6)throw Error('Invalid Socapex output: '+t.name);
      const refs=new Set(t.outputs.map(o=>o.id).filter(Boolean));
      t.outputs.forEach((o,index)=>{
        o.catalogueKey=o.id||'output_'+index;
        if(!positive(o.quantity)||(!o.connector&&!o.connectorOptions?.length))throw Error('Invalid output: '+t.name);
        if(o.circuitsPerConnector!=null&&(!positive(o.circuitsPerConnector)||o.totalCircuits!==o.quantity*o.circuitsPerConnector))throw Error('Invalid circuit total: '+t.name);
        if(o.phaseSource&&(!refs.has(o.phaseSource.reference)||o.phaseSource.type!=='wayMapping'))throw Error('Invalid Aux phase reference: '+t.name);
        if(o.phaseSource&&o.quantity%3!==0)throw Error('Aux quantity must be a multiple of three.');
        if(o.supportedWayMappings&&(!o.supportedWayMappings.every(v=>ids.has(v))||!o.supportedWayMappings.includes(o.defaultWayMapping)))throw Error('Invalid mapping reference: '+t.name);
      });
      const inputs=t.inputConnectorOptions||[t.inputConnector];if(!inputs.length||inputs.some(v=>typeof v!=='string'||!v.trim()))throw Error('Missing input connector: '+t.name);
      return {...t,value:t.name,socapexes:soca.quantity,weightKg:Number.isFinite(t.weight_kg??t.weight)?Number(t.weight_kg??t.weight):null};
    });
    function options(key){const list=data[key];if(!Array.isArray(list)||!list.length||list.some(o=>!o.value)||new Set(list.map(o=>o.value)).size!==list.length||list.filter(o=>o.default).length>1)throw Error('Invalid '+key+' options.');return clone(list)}
    if(!types.length)throw Error('No Distro types in catalogue.');
    return {distroType:types,socapexWayMappings:mappings,outputVoltage:options('outputVoltage'),inputSupply:options('inputSupply')};
  }
  function matches(rule,soca,way){return rule.ways.includes(way)&&(rule.socas==='all'||soca>=rule.socaPattern.start&&(soca-rule.socaPattern.start)%rule.socaPattern.step===0)}
  function phaseIndex(d,index,aux=false){
    const key=d.wayMapping||(/single\s*phase/i.test(d.phasing||'')?'soca_per_phase':'alternating');
    if(aux&&key==='soca_per_phase')return index%3;
    const map=d.catalogue?.mappings?.find(m=>m.id===key);
    if(map){const way=index%6+1,soca=aux?1:Math.floor(index/6)+1;return ['L1','L2','L3'].findIndex(p=>matches(map.mapping[p],soca,way))}
    return key==='paired'?Math.floor(index%6/2):key==='soca_per_phase'&&!aux?Math.floor(index/6)%3:index%3;
  }
  function availableMappings(d){return (d.catalogue?.type?.outputs.find(o=>o.id==='socapex')?.supportedWayMappings||[]).filter(key=>{const m=d.catalogue.mappings.find(m=>m.id===key);return m&&(!m.availability?.quantityMultipleOf||d.count%m.availability.quantityMultipleOf===0)})}
  function configure(d,type,catalogue){
    const result={...d,type:type.name,count:type.socapexes,catalogue:{type:clone(type),mappings:clone(catalogue.socapexWayMappings)},wayMapping:type.outputs.find(o=>o.id==='socapex').defaultWayMapping,inputConnector:type.inputConnector||(type.inputConnectorOptions||[])[0]};
    return result;
  }
  function savedFields(d){return {wayMapping:d.wayMapping||(/single\s*phase/i.test(d.phasing||'')?'soca_per_phase':'alternating'),inputConnector:String(d.inputConnector||''),catalogue:d.catalogue?clone(d.catalogue):null,feed:d.feed?.distroId&&d.feed?.outletId?{distroId:String(d.feed.distroId),outletId:String(d.feed.outletId),adaptor:d.feed.adaptor===true}:null}}
  function outlets(d){return (d.outputGroups||[]).flatMap(g=>(g.labels||[]).filter(l=>l.outlet?.feedSupply).map(l=>({...l.outlet,id:l.outlet.id,connector:l.outlet.connector||g.type,label:l.outlet.name||l.text||g.type})))}
  function parent(d,distros){return d.feed?distros.find(p=>p.id===d.feed.distroId):null}
  function children(d,distros){return distros.filter(c=>c.feed?.distroId===d.id)}
  function rootDistro(d,distros){const seen=new Set();while(d?.feed){if(seen.has(d.id))return null;seen.add(d.id);d=parent(d,distros)}return d||null}
  function connectionError(d,feed,distros){
    if(!feed)return '';
    const p=distros.find(p=>p.id===feed.distroId),outlet=p&&outlets(p).find(o=>o.id===feed.outletId);
    if(!p||!outlet)return 'The feed output is missing or is not feed-capable.';
    if(d.id===p.id)return 'A Distro cannot feed itself.';
    let cursor=p;const seen=new Set();while(cursor){if(cursor.id===d.id||seen.has(cursor.id))return 'This connection would create a circular feed.';seen.add(cursor.id);cursor=parent(cursor,distros)}
    if(distros.some(c=>c.id!==d.id&&c.feed?.distroId===p.id&&c.feed?.outletId===outlet.id))return 'This output already feeds another Distro.';
    if(parseFloat(d.voltage)!==parseFloat(p.voltage))return 'Feed and receiving Distro circuit voltages must match.';
    if(connectorKey(d.inputConnector)!==connectorKey(outlet.connector)&&!feed.adaptor)return 'Confirm the adaptor for the different input and output connectors.';
    return '';
  }
  function totals(d,distros,own,seen=new Set()){
    if(seen.has(d.id))return {p1:NaN,p2:NaN,p3:NaN};
    const visited=new Set(seen);visited.add(d.id);const total={...own(d)};
    for(const child of children(d,distros)){const next=connectionError(child,child.feed,distros)?{p1:NaN,p2:NaN,p3:NaN}:totals(child,distros,own,visited);for(const phase of ['p1','p2','p3'])total[phase]+=next[phase]}
    return total;
  }
  function warnings(d,distros,total){
    const warnings=[],error=connectionError(d,d.feed,distros);if(error)warnings.push(error);
    const p=parent(d,distros),outlet=p&&outlets(p).find(o=>o.id===d.feed.outletId),limits=[rating(d.input),rating(d.inputConnector),rating(outlet?.connector)].filter(n=>n>0),limit=limits.length?Math.min(...limits):null;
    if(Object.values(total).some(n=>!Number.isFinite(n)))warnings.push('Incomplete load data — check this Distro and its downstream feeds.');
    if(limit&&Object.values(total).some(n=>n>limit))warnings.push('Load exceeds the limiting '+limit+' A input/feed rating.');
    return warnings;
  }
  function addOptional(d,definition,connector,makeAux,makeLabel){
    if(!definition?.optional)throw Error('Select an optional catalogue output.');
    if(!(definition.connectorOptions||[definition.connector]).includes(connector))throw Error('Select a supported connector.');
    if(definition.phaseSource){
      d.auxGroups=d.auxGroups||[];let number=Math.max(definition.outputNaming?.start||1,...d.auxGroups.map((g,index)=>(g.startNumber||index*3+1)+g.labels.length));
      for(let n=0;n<definition.quantity;n+=3){const group=makeAux();group.connector=connector;group.catalogueKey=definition.catalogueKey;group.startNumber=number;group.labels.forEach(l=>{l.top=(definition.outputNaming?.prefix||'Aux Out')+' '+number++});d.auxGroups.push(group)}
    }else{
      d.outputGroups=d.outputGroups||[];const type=connector.match(/^(\d+)A\s+3Ph/i)?.[1];const display=type?type+'/3ø':connector;
      let group=d.outputGroups.find(g=>g.connector===connector&&g.catalogueKey===definition.catalogueKey);
      if(!group){group={type:display,connector,catalogueKey:definition.catalogueKey,qty:0,labels:[]};d.outputGroups.push(group)}
      let number=Math.max(0,...d.outputGroups.flatMap(g=>g.labels.map(l=>l.outlet?.connector===connector?l.outlet.number||0:0)))+(definition.outputNaming?.start||1);
      for(let n=0;n<definition.quantity;n++){const name=(definition.outputNaming?.prefix||display+' Output')+' '+number,l=makeLabel(name);l.outlet={id:id(),connector,feedSupply:definition.feedSupply===true,number,name,phases:definition.phases||1};group.labels.push(l);number++}group.qty=group.labels.length;
    }
  }
  function validateSaved(distros){
    const linked=distros.filter(d=>d.feed);if(!linked.length)return;
    const ids=distros.map(d=>d.id);if(new Set(ids).size!==ids.length)throw Error('Duplicate Distro IDs in feed graph.');
    const outputIds=distros.flatMap(d=>outlets(d).map(o=>o.id));if(outputIds.some(v=>!v)||new Set(outputIds).size!==outputIds.length)throw Error('Missing or duplicate feed output IDs.');
    for(const d of linked){const error=connectionError(d,d.feed,distros);if(error)throw Error((d.name||'Distro')+': '+error)}
  }
  root.LampyDistro={validateSaved,normalise,phaseIndex,availableMappings,configure,savedFields,outlets,parent,children,rootDistro,connectionError,totals,warnings,addOptional,connectorKey};
  if(typeof module!=='undefined')module.exports=root.LampyDistro;
})(globalThis);
